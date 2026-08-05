#!/usr/bin/env bash
set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
run_id="${STAGE5A_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
evidence_dir="$repo_root/local-data/test-database/evidence/stage5a/$run_id"
mkdir -p "$evidence_dir"

overall_status=0
restored=0
declare -a check_names=()
declare -a check_statuses=()
declare -a check_logs=()

restore_source() {
  local status=0
  ALLOW_TEST_DATABASE_RESET=yes "$repo_root/scripts/test-database-reset.sh" >"$evidence_dir/restore.log" 2>&1 || status=$?
  if [[ $status -eq 0 ]]; then
    "$repo_root/scripts/test-database-validate.sh" baseline >>"$evidence_dir/restore.log" 2>&1 || status=$?
  fi
  restored=1
  return "$status"
}

restore_on_exit() {
  if [[ $restored -eq 0 ]]; then restore_source || true; fi
}
trap restore_on_exit EXIT INT TERM

run_check() {
  local name="$1"
  shift
  local log="$evidence_dir/$name.log"
  local status=0
  (cd "$repo_root" && "$@") >"$log" 2>&1 || status=$?
  check_names+=("$name")
  check_statuses+=("$status")
  check_logs+=("$log")
  if [[ $status -ne 0 ]]; then overall_status=1; fi
  printf '%s=%s\n' "$name" "$status"
}

run_check baseline_reset env ALLOW_TEST_DATABASE_RESET=yes "$repo_root/scripts/test-database-reset.sh"
if [[ $overall_status -eq 0 ]]; then run_check baseline_validation "$repo_root/scripts/test-database-validate.sh" baseline; fi
if [[ $overall_status -eq 0 ]]; then run_check database_tests npm run test --workspace=@monitor/database; fi
if [[ $overall_status -eq 0 ]]; then run_check detection_tests npm run test --workspace=@monitor/detection; fi
if [[ $overall_status -eq 0 ]]; then run_check api_black_box_tests npm run test --workspace=@monitor/api; fi
if [[ $overall_status -eq 0 ]]; then run_check web_tests npm run test --workspace=@monitor/web; fi
if [[ $overall_status -eq 0 ]]; then run_check boundary_typechecks npm run typecheck --workspace=@monitor/database --workspace=@monitor/detection --workspace=@monitor/api --workspace=@monitor/web; fi
if [[ $overall_status -eq 0 ]]; then run_check laboratory_build npm run build --workspace=@monitor/web; fi
if [[ $overall_status -eq 0 ]]; then run_check diff_check git diff --check; fi

restore_status=0
restore_source || restore_status=$?
if [[ $restore_status -ne 0 ]]; then overall_status=1; fi

checks_json=""
for index in "${!check_names[@]}"; do
  [[ -z "$checks_json" ]] || checks_json+=","
  checks_json+="{\"name\":\"${check_names[$index]}\",\"exitCode\":${check_statuses[$index]},\"log\":\"${check_logs[$index]#$repo_root/}\"}"
done

cat >"$evidence_dir/evidence.json" <<JSON
{
  "schemaVersion": "1.0.0",
  "gate": "phase6-stage5a-source-boundary",
  "runId": "$run_id",
  "authority": "docs/delivery/phases/phase6/stage5_corrective_execution_plan.md#step-4--complete-stage-5a-connected-laboratory-source-boundary",
  "scope": "Every Step 4 exit assertion exercised by the complete boundary suites",
  "officialStep9RepeatabilityRun": false,
  "accepted": $([[ $overall_status -eq 0 ]] && printf true || printf false),
  "sourceRestoration": { "exitCode": $restore_status, "validatedBaseline": $([[ $restore_status -eq 0 ]] && printf true || printf false), "log": "local-data/test-database/evidence/stage5a/$run_id/restore.log" },
  "checks": [$checks_json]
}
JSON

printf 'evidence=%s\n' "$evidence_dir/evidence.json"
exit "$overall_status"
