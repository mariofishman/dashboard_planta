#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd "$(dirname "$0")" && pwd)"
source "$script_dir/test-database-common.sh"

mode="${1:---foreground}"
if [[ "$mode" == "--background" ]]; then
  mkdir -p "$test_db_evidence/standby"
  if [[ -d "$test_db_preparation_lock" ]]; then
    echo "Standby preparation is already running"
    exit 0
  fi
  background_id="$(date -u +%Y%m%dT%H%M%SZ)-$$"
  log="$test_db_evidence/standby/background-$background_id.log"
  if command -v launchctl >/dev/null 2>&1; then
    launch_label="com.monitor.test-database.prepare"
    launch_domain="gui/$(id -u)"
    launch_plist="$test_db_state/standby-preparation.plist"
    launchctl bootout "$launch_domain/$launch_label" >/dev/null 2>&1 || true
    umask 077
    printf '%s\n' \
      '<?xml version="1.0" encoding="UTF-8"?>' \
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">' \
      '<plist version="1.0"><dict>' \
      '<key>Label</key><string>com.monitor.test-database.prepare</string>' \
      '<key>ProgramArguments</key><array>' \
      '<string>/usr/bin/nice</string><string>-n</string><string>10</string>' \
      "<string>$script_dir/test-database-prepare-standby.sh</string><string>--foreground</string>" \
      '</array>' \
      '<key>EnvironmentVariables</key><dict>' \
      "<key>PATH</key><string>$PATH</string>" \
      '</dict>' \
      '<key>RunAtLoad</key><true/>' \
      '<key>KeepAlive</key><false/>' \
      '<key>ProcessType</key><string>Background</string>' \
      "<key>StandardOutPath</key><string>$log</string>" \
      "<key>StandardErrorPath</key><string>$log</string>" \
      '</dict></plist>' > "$launch_plist"
    plutil -lint "$launch_plist" >/dev/null
    launchctl bootstrap "$launch_domain" "$launch_plist"
  else
    nohup nice -n 10 "$0" --foreground </dev/null >>"$log" 2>&1 &
  fi
  echo "Standby preparation started in the background: $log"
  exit 0
fi
[[ "$mode" == "--foreground" || "$mode" == "--during-reset" ]] || die "usage: $0 [--foreground|--background|--during-reset]"

require_safe_target
require_docker_context
[[ "$TEST_DB_TEMPLATE_MANIFEST_SHA256" =~ ^[a-f0-9]{64}$ ]] || die "physical template manifest trust anchor is not captured"
[[ "$TEST_DB_TEMPLATE_ARCHIVE_SHA256" =~ ^[a-f0-9]{64}$ ]] || die "physical template archive trust anchor is not captured"
[[ "$TEST_DB_TEMPLATE_CERTIFICATION_SHA256" =~ ^[a-f0-9]{64}$ ]] || die "physical template certification trust anchor is not captured"
[[ ! -e "$test_db_prepared_state" ]] || die "a sealed standby is already prepared"
[[ -f "$test_db_certified_source_manifest" && ! -L "$test_db_certified_source_manifest" ]] || die "certified source manifest is missing"
[[ "$(shasum -a 256 "$test_db_certified_source_manifest" | awk '{print $1}')" == "$TEST_DB_DUMP_MANIFEST_SHA256" ]] || die "certified source manifest differs from its trust anchor"

if [[ "$mode" == "--foreground" ]]; then
  for _ in $(seq 1 120); do
    [[ ! -e "$test_db_reset_lock" ]] && break
    sleep 1
  done
  [[ ! -e "$test_db_reset_lock" ]] || die "reset lock did not clear before standby preparation"
else
  [[ -e "$test_db_reset_lock" ]] || die "during-reset preparation requires the reset lock"
fi
if ! mkdir "$test_db_preparation_lock" 2>/dev/null; then
  die "template or standby preparation is already active"
fi

attempt="$(date -u +%Y%m%dT%H%M%SZ)-$$"
volume="monitor-test-standby-$attempt"
container="monitor-test-standby-validator-$attempt"
attempt_root="$test_db_evidence/standby/$attempt"
candidate_evidence="$attempt_root/validation"
sealed=false

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  docker rm -f "$container" >/dev/null 2>&1 || true
  if [[ "$sealed" != "true" ]]; then
    docker volume rm "$volume" >/dev/null 2>&1 || true
  fi
  rmdir "$test_db_preparation_lock" 2>/dev/null || true
  if [[ $exit_code -ne 0 ]]; then
    echo "test-database: standby preparation failed; active database was not modified; diagnostics: $attempt_root" >&2
  fi
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

require_protected_dump
mkdir -p "$candidate_evidence"
node "$repo_root/scripts/test-database-physical-manifest.mjs" verify-template \
  --manifest "$test_db_template_manifest" \
  --archive "$test_db_template_archive" \
  --expected-manifest-sha256 "$TEST_DB_TEMPLATE_MANIFEST_SHA256" \
  --expected-archive-sha256 "$TEST_DB_TEMPLATE_ARCHIVE_SHA256" >/dev/null
node "$repo_root/scripts/test-database-physical-manifest.mjs" verify-certification \
  --certification "$test_db_template_certification" \
  --expected-certification-sha256 "$TEST_DB_TEMPLATE_CERTIFICATION_SHA256" \
  --expected-manifest-sha256 "$TEST_DB_TEMPLATE_MANIFEST_SHA256" \
  --expected-archive-sha256 "$TEST_DB_TEMPLATE_ARCHIVE_SHA256" >/dev/null

available_kb="$(colima ssh --profile "$TEST_DB_COLIMA_PROFILE" -- df -Pk /var/lib/docker | tail -1 | tr -s ' ' | cut -d ' ' -f4)"
[[ "$available_kb" =~ ^[0-9]+$ && "$available_kb" -ge 7340032 ]] || die "at least 7 GiB free is required to prepare a standby"
docker volume create \
  --label monitor.test-database=true \
  --label monitor.test-database.role=standby-candidate \
  --label "monitor.test-database.attempt=$attempt" \
  --label "monitor.test-database.template-sha256=$TEST_DB_TEMPLATE_ARCHIVE_SHA256" \
  "$volume" >/dev/null

"$repo_root/scripts/test-database-physical-volume.sh" unpack "$volume" "$test_db_physical_root"
"$repo_root/scripts/test-database-physical-volume.sh" inventory "$volume" "$attempt_root"
node "$repo_root/scripts/test-database-physical-manifest.mjs" verify-inventory \
  --manifest "$test_db_template_manifest" \
  --inventory "$attempt_root/inventory.tsv" >/dev/null

TEST_DB_CONTAINER="$container"
TEST_DB_VOLUME="$volume"
TEST_DB_EXPECT_PUBLISHED_PORT=no
TEST_DB_EXPECT_LOG_BIN_OFF=yes
TEST_DB_BUFFER_POOL_SIZE=1G
create_mysql_container "$container" "$volume" no no
wait_for_mysql_container "$container"
env TEST_DB_CONTAINER="$container" TEST_DB_VOLUME="$volume" TEST_DB_EXPECT_PUBLISHED_PORT=no TEST_DB_EXPECT_LOG_BIN_OFF=yes TEST_DB_BUFFER_POOL_SIZE=1G TEST_DB_EVIDENCE_DIR="$candidate_evidence" TEST_DB_READY_FILE="$attempt_root/ready" "$repo_root/scripts/test-database-validate.sh" pre-unlock
mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT UNLOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT UNLOCK;"
env TEST_DB_CONTAINER="$container" TEST_DB_VOLUME="$volume" TEST_DB_EXPECT_PUBLISHED_PORT=no TEST_DB_EXPECT_LOG_BIN_OFF=yes TEST_DB_BUFFER_POOL_SIZE=1G TEST_DB_EVIDENCE_DIR="$candidate_evidence" TEST_DB_READY_FILE="$attempt_root/ready" TEST_DB_SOURCE_MANIFEST="$test_db_certified_source_manifest" "$repo_root/scripts/test-database-validate.sh" baseline
mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT LOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT LOCK;"
validation_digest="$(find "$candidate_evidence" -type f -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256 | shasum -a 256 | awk '{print $1}')"
stop_mysql_cleanly "$container"
docker rm "$container" >/dev/null
[[ "$(docker ps --all --filter "volume=$volume" --format '{{.ID}}')" == "" ]] || die "prepared standby remains mounted"

seal_tmp="$test_db_state/.prepared-standby-$attempt.json"
node "$repo_root/scripts/test-database-physical-manifest.mjs" write-seal \
  --output "$seal_tmp" \
  --volume "$volume" \
  --source physical-template \
  --manifest-sha256 "$TEST_DB_TEMPLATE_MANIFEST_SHA256" \
  --archive-sha256 "$TEST_DB_TEMPLATE_ARCHIVE_SHA256" \
  --validation-sha256 "$validation_digest" \
  --shutdown-at "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
mv "$seal_tmp" "$test_db_prepared_state"
sealed=true
echo "Prepared and sealed standby volume: $volume"
