#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/test-database-common.sh"

require_safe_target
require_protected_dump
require_matching_compressed_dump
require_docker_context
[[ "${ALLOW_TEST_DATABASE_RESET:-}" == "yes" ]] || die "SQL recovery requires reset authorization"
[[ -e "$test_db_reset_lock" ]] || die "SQL recovery requires the reset lock"
[[ ! -e "$test_db_prepared_state" ]] || die "prepared standby state must be absent before SQL recovery"
[[ "$TEST_DB_TEMPLATE_MANIFEST_SHA256" =~ ^[a-f0-9]{64}$ && "$TEST_DB_TEMPLATE_ARCHIVE_SHA256" =~ ^[a-f0-9]{64}$ ]] || die "physical baseline trust anchors are not captured"

attempt="$(date -u +%Y%m%dT%H%M%SZ)-$$"
volume="monitor-test-sql-recovery-$attempt"
container="monitor-test-sql-recovery-$attempt"
attempt_root="$test_db_evidence/sql-recovery/$attempt"
candidate_evidence="$attempt_root/validation"
source_manifest="$attempt_root/source-manifest.json"
sealed=false

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  docker rm -f "$container" >/dev/null 2>&1 || true
  if [[ "$sealed" != "true" ]]; then docker volume rm "$volume" >/dev/null 2>&1 || true; fi
  if [[ $exit_code -ne 0 ]]; then
    echo "test-database: SQL candidate preparation failed; preserved dirty volume was not modified; diagnostics: $attempt_root" >&2
  fi
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

mkdir -p "$candidate_evidence"
docker volume create \
  --label monitor.test-database=true \
  --label monitor.test-database.role=sql-recovery-candidate \
  --label "monitor.test-database.attempt=$attempt" \
  "$volume" >/dev/null
TEST_DB_CONTAINER="$container"
TEST_DB_VOLUME="$volume"
TEST_DB_EXPECT_PUBLISHED_PORT=no
TEST_DB_EXPECT_LOG_BIN_OFF=yes
TEST_DB_BUFFER_POOL_SIZE=1G
create_mysql_container "$container" "$volume" no no
wait_for_mysql_container "$container"
bootstrap_test_db_accounts
env TEST_DB_CONTAINER="$container" TEST_DB_VOLUME="$volume" TEST_DB_EXPECT_PUBLISHED_PORT=no TEST_DB_EXPECT_LOG_BIN_OFF=yes TEST_DB_BUFFER_POOL_SIZE=1G TEST_DB_EVIDENCE_DIR="$candidate_evidence" TEST_DB_READY_FILE="$attempt_root/ready" TEST_DB_SOURCE_MANIFEST_OUTPUT="$source_manifest" "$repo_root/scripts/test-database-restore-full.sh"
env TEST_DB_CONTAINER="$container" TEST_DB_VOLUME="$volume" TEST_DB_EXPECT_PUBLISHED_PORT=no TEST_DB_EXPECT_LOG_BIN_OFF=yes TEST_DB_BUFFER_POOL_SIZE=1G TEST_DB_EVIDENCE_DIR="$candidate_evidence" TEST_DB_READY_FILE="$attempt_root/ready" "$repo_root/scripts/test-database-validate.sh" pre-unlock
mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT UNLOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT UNLOCK;"
env TEST_DB_CONTAINER="$container" TEST_DB_VOLUME="$volume" TEST_DB_EXPECT_PUBLISHED_PORT=no TEST_DB_EXPECT_LOG_BIN_OFF=yes TEST_DB_BUFFER_POOL_SIZE=1G TEST_DB_EVIDENCE_DIR="$candidate_evidence" TEST_DB_READY_FILE="$attempt_root/ready" TEST_DB_SOURCE_MANIFEST="$source_manifest" "$repo_root/scripts/test-database-validate.sh" baseline
mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT LOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT LOCK;"
validation_digest="$(find "$candidate_evidence" -type f -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256 | shasum -a 256 | awk '{print $1}')"
stop_mysql_cleanly "$container"
docker rm "$container" >/dev/null
[[ "$(docker ps --all --filter "volume=$volume" --format '{{.ID}}')" == "" ]] || die "SQL recovery volume remains mounted"

seal_tmp="$test_db_state/.prepared-standby-$attempt.json"
node "$repo_root/scripts/test-database-physical-manifest.mjs" write-seal \
  --output "$seal_tmp" \
  --volume "$volume" \
  --source protected-sql \
  --manifest-sha256 "$TEST_DB_TEMPLATE_MANIFEST_SHA256" \
  --archive-sha256 "$TEST_DB_TEMPLATE_ARCHIVE_SHA256" \
  --validation-sha256 "$validation_digest" \
  --shutdown-at "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
mv "$seal_tmp" "$test_db_prepared_state"
sealed=true
echo "Prepared SQL recovery volume: $volume"
