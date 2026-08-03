#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/test-database-common.sh"

require_safe_target
require_docker_context
require_running_attested_runtime
[[ "${ALLOW_TEST_DATABASE_RESET:-}" == "yes" ]] || die "set ALLOW_TEST_DATABASE_RESET=yes to authorize the disposable reset"
reset_mode="${TEST_DB_RESET_MODE:-auto}"
[[ "$reset_mode" == "auto" || "$reset_mode" == "full" ]] || die "TEST_DB_RESET_MODE must be auto or full"

mkdir -p "$test_db_state" "$test_db_evidence/recovery"
if ! mkdir "$test_db_reset_lock" 2>/dev/null; then
  die "another reset is already active ($test_db_reset_lock)"
fi

completed=false
start_background=false
preserved_volume=""
active_candidate_volume=""
selected_source="unknown"
recovery_used=false
reset_touched_runtime=false
monotonic_ms() { python3 -c 'import time; print(time.monotonic_ns() // 1000000)'; }
reset_started_ms="$(monotonic_ms)"
promotion_switch_ms=0
promotion_mysql_ready_ms=0
promotion_quick_locked_ms=0
promotion_quick_capability_ms=0
promotion_ready_ms=0
restore_preserved_runtime() {
  [[ -n "$preserved_volume" ]] || return 1
  require_safe_docker_name "$preserved_volume" "preserved volume name"
  docker volume inspect "$preserved_volume" >/dev/null 2>&1 || return 1

  local mounted_volume=""
  if docker inspect "$TEST_DB_CONTAINER" >/dev/null 2>&1; then
    mounted_volume="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Name}}{{end}}{{end}}' "$TEST_DB_CONTAINER" 2>/dev/null || true)"
    if [[ "$mounted_volume" != "$preserved_volume" ]]; then
      docker rm -f "$TEST_DB_CONTAINER" >/dev/null 2>&1 || return 1
    fi
  fi

  if ! docker inspect "$TEST_DB_CONTAINER" >/dev/null 2>&1; then
    TEST_DB_VOLUME="$preserved_volume"
    TEST_DB_EXPECT_PUBLISHED_PORT=yes
    TEST_DB_EXPECT_LOG_BIN_OFF=yes
    TEST_DB_BUFFER_POOL_SIZE=4G
    create_mysql_container "$TEST_DB_CONTAINER" "$preserved_volume" yes yes || return 1
  elif [[ "$(docker inspect --format '{{.State.Running}}' "$TEST_DB_CONTAINER")" != "true" ]]; then
    docker start "$TEST_DB_CONTAINER" >/dev/null || return 1
  fi

  wait_for_mysql_container "$TEST_DB_CONTAINER" || return 1
  TEST_DB_VOLUME="$preserved_volume"
  TEST_DB_EXPECT_PUBLISHED_PORT=yes
  TEST_DB_EXPECT_LOG_BIN_OFF=yes
  TEST_DB_BUFFER_POOL_SIZE=4G
  mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT UNLOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT UNLOCK;" || return 1
  env TEST_DB_VOLUME="$preserved_volume" TEST_DB_EXPECT_PUBLISHED_PORT=yes TEST_DB_EXPECT_LOG_BIN_OFF=yes TEST_DB_BUFFER_POOL_SIZE=4G "$repo_root/scripts/test-database-validate.sh" quick-capability || return 1

  local active_tmp ready_tmp
  active_tmp="$test_db_state/.active-volume-restore-$$"
  ready_tmp="$test_db_state/.ready-restore-$$"
  printf '%s\n' "$preserved_volume" > "$active_tmp"
  printf 'restored_after_failed_reset_at=%s\nvolume=%s\n' "$(date -u +%Y%m%dT%H%M%SZ)" "$preserved_volume" > "$ready_tmp"
  chmod 600 "$active_tmp" "$ready_tmp"
  mv "$active_tmp" "$test_db_active_volume_state"
  mv "$ready_tmp" "$test_db_ready"
}
cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  if [[ "$completed" != "true" ]]; then
    unlink "$test_db_ready" 2>/dev/null || true
    mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT LOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT LOCK;" >/dev/null 2>&1 || true
    if [[ "$reset_touched_runtime" == "true" ]] && restore_preserved_runtime; then
      echo "test-database: reset failed; the previous working database was restored" >&2
    elif [[ "$reset_touched_runtime" != "true" ]]; then
      mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT UNLOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT UNLOCK;" >/dev/null 2>&1 || true
      if env TEST_DB_EXPECT_PUBLISHED_PORT=yes TEST_DB_EXPECT_LOG_BIN_OFF=yes TEST_DB_BUFFER_POOL_SIZE=4G "$repo_root/scripts/test-database-validate.sh" quick-capability >/dev/null 2>&1; then
        printf 'restored_after_failed_reset_at=%s\nvolume=%s\n' "$(date -u +%Y%m%dT%H%M%SZ)" "$preserved_volume" > "$test_db_ready"
        chmod 600 "$test_db_ready"
        echo "test-database: reset failed before switching; the previous working database remains available" >&2
      else
        echo "test-database: reset failed; the previous volume is preserved, but runtime restoration also failed" >&2
      fi
    else
      echo "test-database: reset failed; the previous volume is preserved, but runtime restoration also failed" >&2
    fi
  fi
  rmdir "$test_db_reset_lock" 2>/dev/null || true
  if [[ "$completed" == "true" && "$start_background" == "true" ]]; then
    "$repo_root/scripts/test-database-prepare-standby.sh" --background || true
  fi
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

seal_field() {
  local field="$1"
  node "$repo_root/scripts/test-database-physical-manifest.mjs" seal-field     --seal "$test_db_prepared_state"     --field "$field"     --expected-manifest-sha256 "$TEST_DB_TEMPLATE_MANIFEST_SHA256"     --expected-archive-sha256 "$TEST_DB_TEMPLATE_ARCHIVE_SHA256"
}

validate_prepared_standby() {
  [[ -f "$test_db_prepared_state" && ! -L "$test_db_prepared_state" ]] || return 1
  local volume source role template_label references
  volume="$(seal_field volume)" || return 1
  source="$(seal_field source)" || return 1
  require_safe_docker_name "$volume" "prepared volume name"
  docker volume inspect "$volume" >/dev/null 2>&1 || return 1
  role="$(docker volume inspect --format '{{index .Labels "monitor.test-database.role"}}' "$volume")" || return 1
  template_label="$(docker volume inspect --format '{{index .Labels "monitor.test-database.template-sha256"}}' "$volume")" || true
  if [[ "$source" == "physical-template" ]]; then
    [[ "$role" == "standby-candidate" && "$template_label" == "$TEST_DB_TEMPLATE_ARCHIVE_SHA256" ]] || return 1
  else
    [[ "$source" == "protected-sql" && "$role" == "sql-recovery-candidate" ]] || return 1
  fi
  references="$(docker ps --all --filter "volume=$volume" --format '{{.ID}}')"
  [[ -z "$references" ]] || return 1
  active_candidate_volume="$volume"
}

discard_prepared_standby() {
  local volume="" quarantine
  if [[ -f "$test_db_prepared_state" && ! -L "$test_db_prepared_state" ]]; then
    volume="$(seal_field volume 2>/dev/null || true)"
    quarantine="$test_db_evidence/recovery/rejected-standby-$(date -u +%Y%m%dT%H%M%SZ)-$$.json"
    mv "$test_db_prepared_state" "$quarantine"
  fi
  if [[ -n "$volume" && "$volume" != "$preserved_volume" ]]; then
    while IFS= read -r container_id; do
      [[ -n "$container_id" ]] && docker rm -f "$container_id" >/dev/null 2>&1 || true
    done < <(docker ps --all --filter "volume=$volume" --format '{{.ID}}')
    if [[ -z "$(docker ps --all --filter "volume=$volume" --format '{{.ID}}')" ]]; then
      docker volume rm "$volume" >/dev/null 2>&1 || true
    fi
  fi
  active_candidate_volume=""
}

prepare_recovery_standby() {
  recovery_used=true
  discard_prepared_standby
  if "$repo_root/scripts/test-database-prepare-standby.sh" --during-reset; then
    validate_prepared_standby
    return
  fi
  discard_prepared_standby
  echo "Physical standby recovery failed; using the protected SQL fallback" >&2
  "$repo_root/scripts/test-database-prepare-sql-candidate.sh"
  validate_prepared_standby
}

promote_prepared_standby() {
  validate_prepared_standby || return 1
  local new_volume="$active_candidate_volume"
  selected_source="$(seal_field source)" || return 1
  # These two milestones are consumed by the existing API coordinator.
  echo "Dropping and recreating only local $TEST_DB_NAME"
  echo "Streaming the read-only protected backup into $TEST_DB_NAME"
  echo "Promoting the sealed $selected_source candidate; no SQL is streamed on this path"
  promotion_switch_ms="$(monotonic_ms)"
  reset_touched_runtime=true
  if docker inspect "$TEST_DB_CONTAINER" >/dev/null 2>&1; then
    docker stop --time 60 "$TEST_DB_CONTAINER" >/dev/null || return 1
    docker rm "$TEST_DB_CONTAINER" >/dev/null || return 1
  fi

  TEST_DB_VOLUME="$new_volume"
  TEST_DB_EXPECT_PUBLISHED_PORT=yes
  TEST_DB_EXPECT_LOG_BIN_OFF=yes
  TEST_DB_BUFFER_POOL_SIZE=4G
  create_mysql_container "$TEST_DB_CONTAINER" "$new_volume" yes yes || return 1
  wait_for_mysql_container "$TEST_DB_CONTAINER" || return 1
  promotion_mysql_ready_ms="$(monotonic_ms)"

  env TEST_DB_VOLUME="$new_volume" TEST_DB_EXPECT_PUBLISHED_PORT=yes TEST_DB_EXPECT_LOG_BIN_OFF=yes TEST_DB_BUFFER_POOL_SIZE=4G "$repo_root/scripts/test-database-validate.sh" quick-locked || return 1
  promotion_quick_locked_ms="$(monotonic_ms)"
  mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT UNLOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT UNLOCK;" || return 1
  env TEST_DB_VOLUME="$new_volume" TEST_DB_EXPECT_PUBLISHED_PORT=yes TEST_DB_EXPECT_LOG_BIN_OFF=yes TEST_DB_BUFFER_POOL_SIZE=4G "$repo_root/scripts/test-database-validate.sh" quick-capability || return 1
  promotion_quick_capability_ms="$(monotonic_ms)"

  active_tmp="$test_db_state/.active-volume-$$"
  physical_tmp="$test_db_state/.physical-enabled-$$"
  ready_tmp="$test_db_state/.ready-$$"
  printf '%s\n' "$new_volume" > "$active_tmp"
  printf 'manifest_sha256=%s\narchive_sha256=%s\n' "$TEST_DB_TEMPLATE_MANIFEST_SHA256" "$TEST_DB_TEMPLATE_ARCHIVE_SHA256" > "$physical_tmp"
  printf 'validated_at=%s\nmanifest_sha256=%s\narchive_sha256=%s\nvolume=%s\n' "$(date -u +%Y%m%dT%H%M%SZ)" "$TEST_DB_TEMPLATE_MANIFEST_SHA256" "$TEST_DB_TEMPLATE_ARCHIVE_SHA256" "$new_volume" > "$ready_tmp"
  chmod 600 "$active_tmp" "$physical_tmp" "$ready_tmp"
  mv "$active_tmp" "$test_db_active_volume_state"
  mv "$physical_tmp" "$test_db_physical_enabled"
  mv "$ready_tmp" "$test_db_ready"
  promotion_ready_ms="$(monotonic_ms)"
  unlink "$test_db_prepared_state"
  active_candidate_volume=""
  return 0
}

unlink "$test_db_ready" 2>/dev/null || true
mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT LOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT LOCK;"
mysql_query root "SELECT CONCAT('KILL ',id,';') FROM information_schema.processlist WHERE user IN ('alertas_fake','monitor_source_ro')" |
  mysql_in_container root >/dev/null
preserved_volume="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Name}}{{end}}{{end}}' "$TEST_DB_CONTAINER")"
require_safe_docker_name "$preserved_volume" "active volume name"

if [[ -d "$test_db_preparation_lock" ]]; then
  echo "Waiting for the in-progress standby validation to finish"
  for _ in $(seq 1 900); do
    [[ ! -d "$test_db_preparation_lock" ]] && break
    sleep 1
  done
  [[ ! -d "$test_db_preparation_lock" ]] || die "standby preparation did not finish within 15 minutes"
fi

if [[ "$reset_mode" == "full" ]]; then
  recovery_used=true
  discard_prepared_standby
  "$repo_root/scripts/test-database-prepare-sql-candidate.sh"
fi

if ! validate_prepared_standby; then
  echo "No valid sealed standby is ready; preparing one before reset" >&2
  prepare_recovery_standby
fi

if ! promote_prepared_standby; then
  echo "Prepared standby promotion failed; rebuilding a clean candidate" >&2
  discard_prepared_standby
  prepare_recovery_standby
  if ! promote_prepared_standby; then
    discard_prepared_standby
    echo "Physical retry failed; preparing the protected SQL fallback" >&2
    "$repo_root/scripts/test-database-prepare-sql-candidate.sh"
    promote_prepared_standby || die "all physical and SQL recovery paths failed"
  fi
fi

if [[ "$preserved_volume" != "$TEST_DB_VOLUME" ]]; then
  if ! docker volume rm "$preserved_volume" >/dev/null 2>&1; then
    printf '%s\n' "$preserved_volume" > "$test_db_state/cleanup-pending-volume"
    chmod 600 "$test_db_state/cleanup-pending-volume"
    echo "Previous dirty volume retained for later cleanup: $preserved_volume" >&2
  else
    unlink "$test_db_state/cleanup-pending-volume" 2>/dev/null || true
  fi
fi

completed=true
start_background=true
reset_finished_ms="$(monotonic_ms)"
duration_ms="$((reset_finished_ms - reset_started_ms))"
timing_file="$test_db_evidence/reset-timing-$(date -u +%Y%m%dT%H%M%SZ)-$$.json"
printf '{\n  "source": "%s",\n  "recoveryUsed": %s,\n  "totalMs": %s,\n  "waitBeforeSwitchMs": %s,\n  "mysqlStartupMs": %s,\n  "quickLockedMs": %s,\n  "quickCapabilityMs": %s,\n  "readinessMs": %s\n}\n' \
  "$selected_source" "$recovery_used" "$duration_ms" \
  "$((promotion_switch_ms - reset_started_ms))" \
  "$((promotion_mysql_ready_ms - promotion_switch_ms))" \
  "$((promotion_quick_locked_ms - promotion_mysql_ready_ms))" \
  "$((promotion_quick_capability_ms - promotion_quick_locked_ms))" \
  "$((promotion_ready_ms - promotion_quick_capability_ms))" > "$timing_file"
chmod 600 "$timing_file"
echo "Rebuild passed; application accounts are unlocked and readiness is present"
echo "Physical reset completed in ${duration_ms}ms"
