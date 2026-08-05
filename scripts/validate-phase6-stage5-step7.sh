#!/usr/bin/env bash
set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
run_id="${STEP7_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
evidence_dir="$repo_root/local-data/test-database/evidence/stage5-step7/$run_id"
started_at="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
mkdir -p "$evidence_dir"

overall_status=0
restored=0
reset_status=1
baseline_before_status=1
restore_status=1
baseline_after_status=1
checks_file="$evidence_dir/checks.tsv"
: >"$checks_file"

record_check() {
  local name="$1"
  local status="$2"
  local log="$3"
  printf '%s\t%s\t%s\n' "$name" "$status" "${log#$repo_root/}" >>"$checks_file"
  printf '%s=%s\n' "$name" "$status"
  if [[ $status -ne 0 ]]; then overall_status=1; fi
}

run_check() {
  local name="$1"
  shift
  local log="$evidence_dir/$name.log"
  local status=0
  (cd "$repo_root" && "$@") >"$log" 2>&1 || status=$?
  record_check "$name" "$status" "$log"
}

restore_source() {
  restore_status=0
  env ALLOW_TEST_DATABASE_RESET=yes "$repo_root/scripts/test-database-reset.sh" >"$evidence_dir/restore.log" 2>&1 || restore_status=$?
  baseline_after_status=0
  if [[ $restore_status -eq 0 ]]; then
    "$repo_root/scripts/test-database-validate.sh" baseline >>"$evidence_dir/restore.log" 2>&1 || baseline_after_status=$?
  else
    baseline_after_status=1
  fi
  restored=1
  record_check source_restore "$restore_status" "$evidence_dir/restore.log"
  record_check baseline_after "$baseline_after_status" "$evidence_dir/restore.log"
}

finalize_on_exit() {
  local entry_status=$?
  trap - EXIT INT TERM
  if [[ $entry_status -ne 0 ]]; then overall_status=1; fi
  if [[ $restored -eq 0 ]]; then restore_source || true; fi
  if [[ $overall_status -eq 0 ]]; then
    node "$repo_root/scripts/build-stage5-step7-aggregate.mjs" \
      "$run_id" "$evidence_dir" "$started_at" "$reset_status" true "$restore_status" true || overall_status=1
  fi
  printf 'evidence_dir=%s\n' "$evidence_dir"
  exit "$overall_status"
}
trap finalize_on_exit EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

run_check baseline_reset env ALLOW_TEST_DATABASE_RESET=yes "$repo_root/scripts/test-database-reset.sh"
reset_status=$([[ $overall_status -eq 0 ]] && printf 0 || printf 1)
if [[ $overall_status -eq 0 ]]; then
  run_check baseline_before "$repo_root/scripts/test-database-validate.sh" baseline
  baseline_before_status=$([[ $overall_status -eq 0 ]] && printf 0 || printf 1)
fi
if [[ $overall_status -eq 0 ]]; then run_check evidence_contract npm run validate:phase6-stage5-step7-evidence; fi
if [[ $overall_status -eq 0 ]]; then
  run_check scheduling env STEP7_RUN_ID="$run_id" STEP7_EVIDENCE_PATH="$evidence_dir/scheduling.json" npm run validate:phase6-stage5-scheduling
fi
if [[ $overall_status -eq 0 ]]; then
  run_check recovery env STEP7_RUN_ID="$run_id" STEP7_EVIDENCE_PATH="$evidence_dir/recovery.json" npm run validate:phase6-stage5-recovery
fi
if [[ $overall_status -eq 0 ]]; then run_check database_tests npm test --workspace packages/database; fi
if [[ $overall_status -eq 0 ]]; then run_check detection_tests npm test --workspace packages/detection; fi
if [[ $overall_status -eq 0 ]]; then run_check incident_tests npm test --workspace packages/incidents; fi
if [[ $overall_status -eq 0 ]]; then run_check conversation_tests npm test --workspace packages/conversations; fi
if [[ $overall_status -eq 0 ]]; then run_check api_tests npm test --workspace apps/api; fi
if [[ $overall_status -eq 0 ]]; then
  run_check boundary_typechecks npm run typecheck --workspace packages/database --workspace packages/detection --workspace packages/incidents --workspace packages/conversations --workspace apps/api
fi
if [[ $overall_status -eq 0 ]]; then run_check diff_check git diff --check; fi

exit "$overall_status"
