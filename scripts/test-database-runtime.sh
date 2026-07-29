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

generate_secrets() {
  command -v openssl >/dev/null || die "openssl is required"
  mkdir -p "$test_db_secrets" "$test_db_evidence"
  chmod 700 "$test_db_secrets"
  for account in root reset writer monitor; do
    if [[ ! -s "$test_db_secrets/$account.password" ]]; then
      umask 077
      openssl rand -hex 24 > "$test_db_secrets/$account.password"
    fi
  done

  local account password user
  for account in root reset writer monitor; do
    password="$(<"$test_db_secrets/$account.password")"
    case "$account" in
      root) user=root ;;
      reset) user=test_database_admin ;;
      writer) user=alertas_fake ;;
      monitor) user=monitor_source_ro ;;
    esac
    umask 077
    {
      echo '[client]'
      echo "user=$user"
      echo "password=$password"
      echo 'protocol=TCP'
      echo 'host=127.0.0.1'
      echo 'port=3306'
      echo 'default-character-set=utf8mb4'
    } > "$test_db_secrets/$account.cnf"
    {
      echo '[client]'
      echo "user=$user"
      echo "password=$password"
      echo 'protocol=TCP'
      echo "host=$TEST_DB_HOST"
      echo "port=$TEST_DB_PORT"
      echo 'default-character-set=utf8mb4'
    } > "$test_db_secrets/$account.host.cnf"
  done
  chmod 600 "$test_db_secrets"/*
}

wait_for_mysql() {
  local attempt
  for attempt in $(seq 1 90); do
    if docker exec "$TEST_DB_CONTAINER" mysqladmin --defaults-extra-file=/run/test-db-secrets/root.cnf ping --silent >/dev/null 2>&1; then
      return
    fi
    sleep 2
  done
  die "MySQL did not become ready"
}

bootstrap_accounts() {
  local reset_password writer_password monitor_password
  reset_password="$(<"$test_db_secrets/reset.password")"
  writer_password="$(<"$test_db_secrets/writer.password")"
  monitor_password="$(<"$test_db_secrets/monitor.password")"
  mysql_in_container root <<SQL
CREATE USER IF NOT EXISTS 'test_database_admin'@'%' IDENTIFIED BY '$reset_password';
CREATE USER IF NOT EXISTS 'alertas_fake'@'%' IDENTIFIED BY '$writer_password' ACCOUNT LOCK;
CREATE USER IF NOT EXISTS 'monitor_source_ro'@'%' IDENTIFIED BY '$monitor_password' ACCOUNT LOCK;
ALTER USER 'test_database_admin'@'%' IDENTIFIED BY '$reset_password';
ALTER USER 'alertas_fake'@'%' IDENTIFIED BY '$writer_password';
ALTER USER 'monitor_source_ro'@'%' IDENTIFIED BY '$monitor_password';
GRANT CREATE, DROP, ALTER, INDEX, REFERENCES, SELECT, INSERT, UPDATE, DELETE, LOCK TABLES, CREATE VIEW, SHOW VIEW ON \`test_database\`.* TO 'test_database_admin'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`test_database\`.* TO 'alertas_fake'@'%';
GRANT SELECT, SHOW VIEW ON \`test_database\`.* TO 'monitor_source_ro'@'%';
FLUSH PRIVILEGES;
SQL
}

start_runtime() {
  require_protected_dump
  if docker inspect "$TEST_DB_CONTAINER" >/dev/null 2>&1; then
    [[ -s "$test_db_secrets/root.password" && -s "$test_db_secrets/root.cnf" ]] || die "existing runtime has no matching local root secret; recovery is required"
    generate_secrets
    docker start "$TEST_DB_CONTAINER" >/dev/null
  else
    if docker volume inspect "$TEST_DB_VOLUME" >/dev/null 2>&1 && [[ ! -s "$test_db_secrets/root.password" ]]; then
      die "existing database volume has no matching local root secret; refusing to generate incompatible credentials"
    fi
    generate_secrets
    docker volume create "$TEST_DB_VOLUME" >/dev/null
    docker run --detach \
      --name "$TEST_DB_CONTAINER" \
      --restart unless-stopped \
      --publish "$TEST_DB_HOST:$TEST_DB_PORT:3306" \
      --mount "type=volume,src=$TEST_DB_VOLUME,dst=/var/lib/mysql" \
      --mount "type=bind,src=$(dirname "$TEST_DB_DUMP"),dst=/protected-backup,readonly" \
      --mount "type=bind,src=$test_db_secrets,dst=/run/test-db-secrets,readonly" \
      --env MYSQL_ROOT_PASSWORD_FILE=/run/test-db-secrets/root.password \
      "$TEST_DB_IMAGE" \
      --bind-address=0.0.0.0 \
      --character-set-server=utf8mb4 \
      --collation-server=utf8mb4_0900_ai_ci \
      --default-time-zone=+00:00 \
      --innodb-buffer-pool-size=4G \
      --innodb-redo-log-capacity=2G \
      --local-infile=OFF \
      --lower-case-table-names=0 \
      --max-allowed-packet=1G \
      --skip-name-resolve=ON \
      --sql-mode= \
      --transaction-isolation=REPEATABLE-READ >/dev/null
  fi
  wait_for_mysql
  require_running_attested_runtime
  bootstrap_accounts
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
