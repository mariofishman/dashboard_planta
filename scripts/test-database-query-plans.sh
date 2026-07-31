#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/test-database-common.sh"

require_safe_target
require_running_attested_runtime
[[ -s "$test_db_ready" ]] || die "database is not marked ready"
mkdir -p "$test_db_evidence"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
report="$test_db_evidence/query-plans-$timestamp.txt"
: > "$report"

cutoff="$(mysql_query monitor "SELECT DATE_FORMAT(DATE_SUB(MAX(source_time), INTERVAL 30 MINUTE),'%Y-%m-%d %H:%i:%s.%f') FROM (SELECT MAX(fecha_creacion) source_time FROM $TEST_DB_NAME.flujo_materiales_detalles UNION ALL SELECT MAX(fecha_creacion) FROM $TEST_DB_NAME.articulo_serial) times")"
[[ -n "$cutoff" && "$cutoff" != "NULL" ]] || die "could not derive the backup-relative polling cutoff"
echo "cutoff_basis=latest A02/A05 source timestamp minus 30 minutes" >> "$report"

for code in a02 a05; do
  case "$code" in
    a02) file="a02-reserved-material-in-transit.v1.sql"; expected=1249 ;;
    a05) file="a05-reel-handling.v1.sql"; expected=838 ;;
  esac
  result="$test_db_evidence/$code-result-$timestamp.tsv"
  : > "$result"
  after_id=0
  pages=0
  elapsed_ms=0
  while (( pages < 20 )); do
    rendered="$test_db_evidence/$code-rendered-$timestamp.sql"
    page_result="$test_db_evidence/$code-page-$timestamp.tsv"
    sed -e "s/:after_id/$after_id/g" -e "s/:cutoff/'$cutoff'/g" -e 's/:result_limit/1000/g' "$repo_root/config/detection/queries/$file" > "$rendered"
    started="$(date +%s%N)"
    mysql_in_container monitor --database="$TEST_DB_NAME" --batch --skip-column-names < "$rendered" > "$page_result"
    finished="$(date +%s%N)"
    elapsed_ms="$((elapsed_ms + (finished - started) / 1000000))"
    page_rows="$(wc -l < "$page_result" | tr -d ' ')"
    cat "$page_result" >> "$result"
    pages=$((pages + 1))
    (( page_rows > 0 )) && after_id="$(tail -1 "$page_result" | cut -f1)"
    (( page_rows < 1000 )) && break
  done
  rows="$(wc -l < "$result" | tr -d ' ')"
  unique="$(cut -f1 "$result" | sort -u | wc -l | tr -d ' ')"
  [[ "$rows" == "$expected" && "$unique" == "$expected" ]] || die "$code polling query expected $expected unique rows, found $rows rows/$unique unique keys"
  echo "$code.rows=$rows" >> "$report"
  echo "$code.unique_natural_keys=$unique" >> "$report"
  echo "$code.pages_at_1000=$pages" >> "$report"
  echo "$code.full_cycle_ms=$elapsed_ms" >> "$report"
  { echo "EXPLAIN FORMAT=JSON"; sed '$s/;[[:space:]]*$/;/' "$rendered"; } |
    mysql_in_container monitor --database="$TEST_DB_NAME" --batch --skip-column-names > "$test_db_evidence/$code-explain-$timestamp.json"
  explain="$test_db_evidence/$code-explain-$timestamp.json"
  ! grep -q '"access_type": "ALL"' "$explain" || die "$code query plan contains a full table scan"
  grep -q '"key": "PRIMARY"' "$explain" || die "$code query plan does not use the primary key for keyset pagination"
done

cp "$report" "$test_db_evidence/latest-query-plans.txt"
echo "MySQL polling-query validation passed: $test_db_evidence/latest-query-plans.txt"
