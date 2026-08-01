#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
evidence_dir="$repo_root/local-data/test-database/evidence/stage5"
run_id="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$evidence_dir"

restore_baseline() {
  ALLOW_TEST_DATABASE_RESET=yes "$repo_root/scripts/test-database-reset.sh" >"$evidence_dir/$run_id-restore.log" 2>&1
  "$repo_root/scripts/test-database-validate.sh" baseline >>"$evidence_dir/$run_id-restore.log" 2>&1
}
trap restore_baseline EXIT

ALLOW_TEST_DATABASE_RESET=yes "$repo_root/scripts/test-database-reset.sh" >"$evidence_dir/$run_id-reset.log" 2>&1
"$repo_root/scripts/test-database-validate.sh" baseline >>"$evidence_dir/$run_id-reset.log" 2>&1
STAGE5_RUN_ID="$run_id" npx tsx "$repo_root/scripts/validate-phase6-stage5.ts" | tee "$evidence_dir/$run_id-connected.log"
