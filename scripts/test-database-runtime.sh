#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/test-database-common.sh"

command_name="${1:-status}"
require_safe_target
if [[ "$command_name" == "start" ]]; then
  command -v colima >/dev/null || die "Colima is required"
  if ! colima status --profile "$TEST_DB_COLIMA_PROFILE" >/dev/null 2>&1; then
    colima start --profile "$TEST_DB_COLIMA_PROFILE" --cpu 4 --memory 8 --disk 40 --vm-type vz --mount-type virtiofs
  fi
fi
require_docker_context

start_runtime() {
  require_protected_dump
  if docker inspect "$TEST_DB_CONTAINER" >/dev/null 2>&1; then
    [[ -s "$test_db_secrets/root.password" && -s "$test_db_secrets/root.cnf" ]] || die "existing runtime has no matching local root secret; recovery is required"
    generate_test_db_secrets
    docker start "$TEST_DB_CONTAINER" >/dev/null
  else
    if docker volume inspect "$TEST_DB_VOLUME" >/dev/null 2>&1 && [[ ! -s "$test_db_secrets/root.password" ]]; then
      die "existing database volume has no matching local root secret; refusing to generate incompatible credentials"
    fi
    generate_test_db_secrets
    docker volume create "$TEST_DB_VOLUME" >/dev/null
    create_mysql_container "$TEST_DB_CONTAINER" "$TEST_DB_VOLUME" yes yes
  fi
  wait_for_mysql_container "$TEST_DB_CONTAINER"
  require_running_attested_runtime
  bootstrap_test_db_accounts
  mysql_query root "SELECT VERSION(), @@lower_case_table_names, @@global.time_zone, @@global.transaction_isolation, @@global.sql_mode;"
}

case "$command_name" in
  start) start_runtime ;;
  stop) docker stop "$TEST_DB_CONTAINER" >/dev/null ;;
  status)
    docker ps --all --filter "name=^/${TEST_DB_CONTAINER}$" --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'
    if docker inspect "$TEST_DB_CONTAINER" >/dev/null 2>&1; then
      if [[ -f "$test_db_ready" ]]; then echo 'readiness=ready'; else echo 'readiness=not-ready'; fi
      if [[ "$(docker inspect --format '{{.State.Running}}' "$TEST_DB_CONTAINER")" == "true" ]]; then
        require_running_attested_runtime
        mysql_query root "SELECT user,account_locked FROM mysql.user WHERE user IN ('alertas_fake','monitor_source_ro') ORDER BY user;"
      fi
    fi
    ;;
  *) die "usage: $0 {start|stop|status}" ;;
esac
