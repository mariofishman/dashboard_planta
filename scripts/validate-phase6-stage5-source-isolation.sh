#!/usr/bin/env bash
set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
run_id="${STAGE6_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
evidence_dir="$repo_root/local-data/test-database/evidence/stage6/$run_id"
mkdir -p "$evidence_dir"

overall_status=0
core_status=0
restored=0
declare -a check_names=()
declare -a check_statuses=()
declare -a check_logs=()

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
  return "$status"
}

run_core_check() {
  if [[ $core_status -ne 0 ]]; then return; fi
  run_check "$@" || core_status=1
}

verify_cleanup() {
  [[ ! -e "$repo_root/local-data/test-database/state/reset.lock" ]] || {
    echo "reset safety lock remains after validation" >&2
    return 1
  }
}

restore_on_exit() {
  local exit_status=$?
  trap - EXIT INT TERM
  if [[ $restored -eq 0 ]]; then
    env ALLOW_TEST_DATABASE_RESET=yes "$repo_root/scripts/test-database-reset.sh" >"$evidence_dir/emergency_restore.log" 2>&1 || true
  fi
  exit "$exit_status"
}
trap restore_on_exit EXIT INT TERM

run_core_check baseline_reset_and_denials env ALLOW_TEST_DATABASE_RESET=yes "$repo_root/scripts/test-database-reset.sh"
run_core_check focused_source_isolation npm run validate:phase6-stage5-source-isolation:focused
run_core_check browser_storage_authority node --experimental-strip-types --test apps/web/src/browserStorageAuthority.test.mjs
run_core_check detection_tests npm run test --workspace=@monitor/detection
run_core_check api_tests npm run test --workspace=@monitor/api
run_core_check web_tests npm run test --workspace=@monitor/web
run_core_check boundary_typechecks npm run typecheck --workspace=@monitor/database --workspace=@monitor/detection --workspace=@monitor/api --workspace=@monitor/web

if run_check final_baseline_restore env ALLOW_TEST_DATABASE_RESET=yes "$repo_root/scripts/test-database-reset.sh"; then restored=1; fi
run_check final_source_health "$repo_root/scripts/test-database-validate.sh" health || true
run_check cleanup_check verify_cleanup || true
run_check diff_check git diff --check || true

checks_json=""
for index in "${!check_names[@]}"; do
  [[ -z "$checks_json" ]] || checks_json+=","
  checks_json+="{\"name\":\"${check_names[$index]}\",\"exitCode\":${check_statuses[$index]},\"log\":\"${check_logs[$index]#$repo_root/}\"}"
done

cat >"$evidence_dir/evidence.json" <<JSON
{
  "schemaVersion": "1.0.0",
  "gate": "phase6-stage5-source-isolation",
  "runId": "$run_id",
  "authority": "docs/delivery/phases/phase6/stage5_corrective_execution_plan.md#step-6--prove-isolation-negative-source-behavior-and-authority-boundaries",
  "accepted": $([[ $overall_status -eq 0 ]] && printf true || printf false),
  "checks": [$checks_json]
}
JSON

printf 'evidence=%s\n' "$evidence_dir/evidence.json"
exit "$overall_status"
