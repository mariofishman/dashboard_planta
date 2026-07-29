#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/test-database-common.sh"

require_safe_target
require_protected_dump
require_matching_compressed_dump
require_running_attested_runtime
[[ "${ALLOW_TEST_DATABASE_RESET:-}" == "yes" ]] || die "set ALLOW_TEST_DATABASE_RESET=yes to authorize the disposable reset"

mkdir -p "$test_db_state" "$test_db_evidence"
if ! mkdir "$test_db_reset_lock" 2>/dev/null; then
  die "another reset is already active ($test_db_reset_lock)"
fi

completed=false
cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  if [[ "$completed" != "true" ]]; then
    rm -f "$test_db_ready"
    mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT LOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT LOCK;" >/dev/null 2>&1 || true
    echo "test-database: rebuild failed; application accounts remain locked and readiness is absent" >&2
  fi
  rmdir "$test_db_reset_lock" 2>/dev/null || true
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

available_kb="$(docker exec "$TEST_DB_CONTAINER" sh -c "df -Pk /var/lib/mysql | tail -1 | tr -s ' ' | cut -d ' ' -f4")"
[[ "$available_kb" =~ ^[0-9]+$ && "$available_kb" -ge 8388608 ]] || die "at least 8 GiB free is required on the database volume"

rm -f "$test_db_ready"
mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT LOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT LOCK;"
mysql_query root "SELECT CONCAT('KILL ',id,';') FROM information_schema.processlist WHERE user IN ('alertas_fake','monitor_source_ro')" |
  mysql_in_container root >/dev/null

manifest="$test_db_evidence/source-manifest.json"
manifest_digest="$(generate_dump_manifest "$manifest")"

echo "Dropping and recreating only local $TEST_DB_NAME"
mysql_in_container reset <<SQL
DROP DATABASE IF EXISTS \`$TEST_DB_NAME\`;
CREATE DATABASE \`$TEST_DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SQL

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
import_log="$test_db_evidence/import-$timestamp.log"
echo "Streaming the read-only protected backup into $TEST_DB_NAME"
docker exec -i "$TEST_DB_CONTAINER" sh -c "cat /protected-backup/$test_db_dump_name" |
  sed \
    -e 's/`staging_emusa_core`\./`test_database`./g' \
    -e 's/staging_emusa_core\.`/test_database.`/g' \
    -e 's#DEFINER=`migbk`@`%` SQL SECURITY DEFINER#SQL SECURITY INVOKER#g' |
  mysql_in_container reset --show-warnings --database="$TEST_DB_NAME" >"$import_log" 2>&1

require_protected_dump
grep -E '^(Warning|ERROR)' "$import_log" | sed -E 's/ at row [0-9]+.*$/ at row <redacted>/' > "$test_db_evidence/import-warnings-$timestamp.txt" || true
if grep -q '^ERROR' "$import_log"; then
  die "restore log contains MySQL errors: $import_log"
fi
warning_summary="$(awk '/^Warning \(Code / {gsub(/\):.*/,"",$3); counts[$3]++} END {for (code in counts) print code "=" counts[code]}' "$import_log" | sort)"
expected_warning_summary=$'1265=163\n1681=460\n1831=1'
[[ "$warning_summary" == "$expected_warning_summary" ]] || die "restore warning profile changed; inspect $import_log"
printf '%s\n' "$warning_summary" > "$test_db_evidence/import-warning-summary-$timestamp.txt"

"$repo_root/scripts/test-database-validate.sh" pre-unlock
mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT UNLOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT UNLOCK;"
TEST_DB_SOURCE_MANIFEST="$manifest" "$repo_root/scripts/test-database-validate.sh" baseline

printf 'validated_at=%s\ndump_sha256=%s\nsource_manifest_sha256=%s\n' "$timestamp" "$TEST_DB_DUMP_SHA256" "$manifest_digest" > "$test_db_ready"
chmod 600 "$test_db_ready"
completed=true
echo "Rebuild passed; application accounts are unlocked and readiness is present"
