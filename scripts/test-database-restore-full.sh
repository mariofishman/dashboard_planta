#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/test-database-common.sh"

require_safe_target
require_protected_dump
require_matching_compressed_dump
require_running_attested_runtime
mkdir -p "$test_db_evidence"

manifest="${TEST_DB_SOURCE_MANIFEST_OUTPUT:-$test_db_evidence/source-manifest.json}"
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
printf 'manifest=%s\nmanifest_sha256=%s\n' "$manifest" "$manifest_digest" > "$test_db_evidence/full-restore-result-$timestamp.txt"
