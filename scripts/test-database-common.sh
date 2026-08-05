#!/usr/bin/env bash
set -euo pipefail

TEST_DB_NAME="${TEST_DB_NAME:-test_database}"
TEST_DB_HOST="${TEST_DB_HOST:-127.0.0.1}"
TEST_DB_PORT="${TEST_DB_PORT:-3307}"
TEST_DB_CONTAINER="${TEST_DB_CONTAINER:-monitor-test-mysql}"
TEST_DB_COLIMA_PROFILE="${TEST_DB_COLIMA_PROFILE:-monitor-test-db}"
TEST_DB_CONTEXT="${TEST_DB_CONTEXT:-colima-monitor-test-db}"
TEST_DB_EXPECT_PUBLISHED_PORT="${TEST_DB_EXPECT_PUBLISHED_PORT:-yes}"
TEST_DB_EXPECT_LOG_BIN_OFF="${TEST_DB_EXPECT_LOG_BIN_OFF:-auto}"
TEST_DB_BUFFER_POOL_SIZE="${TEST_DB_BUFFER_POOL_SIZE:-4G}"
TEST_DB_IMAGE="${TEST_DB_IMAGE:-mysql@sha256:3e646bcda0d9448ffa3d2024eef04e1bca95528ec19b9e8b76749da9d97d4a10}"
TEST_DB_DUMP="${TEST_DB_DUMP:-/Users/mariofishman/projects/dashboard_planta/local-data/database/staging_emusa_core-20260723-025548.sql}"
TEST_DB_DUMP_GZIP="${TEST_DB_DUMP_GZIP:-/Users/mariofishman/projects/dashboard_planta/local-data/database/staging_emusa_core-20260723-025548.sql.gz}"
TEST_DB_DUMP_SHA256="a6feb0d0a5619d06b03c6af0a532d93a17cd13ded14f9985e089a8e1c2e36f73"
TEST_DB_DUMP_BYTES="2903569374"
TEST_DB_DUMP_MANIFEST_SHA256="57fd1829dead0eb9078c19ddb00162bb3591782bc5bfdf02ba94742eef8cc939"
TEST_DB_TABLE_CHECKSUM_DIGEST="a5df7f866bd4aad0f253fe0b7ee86801af3cf93b145d308fbd29a7036ddf5654"
TEST_DB_SCHEMA_METADATA_DIGEST="6d4207d4d036cf9fdf91d35cd10667684c625efa710bae8e59c02e83ad96cdb9"
TEST_DB_TEMPLATE_MANIFEST_SHA256="${TEST_DB_TEMPLATE_MANIFEST_SHA256:-dad05948a29ce4412708d22c45acdd2939c5c1827d44efe738effc1ad9c974d0}"
TEST_DB_TEMPLATE_ARCHIVE_SHA256="${TEST_DB_TEMPLATE_ARCHIVE_SHA256:-2ce88ab7488a8f2aa72a94ab7d5c0380a1b7bc19442573181550890a39b5c797}"
TEST_DB_TEMPLATE_CERTIFICATION_SHA256="${TEST_DB_TEMPLATE_CERTIFICATION_SHA256:-db1d0848e2717b23704172b29c785522fc1d9af507df0d97418f06f131877ccb}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_db_local="$(dirname "$(dirname "$TEST_DB_DUMP")")/test-database"
test_db_secrets="$test_db_local/secrets"
test_db_evidence="${TEST_DB_EVIDENCE_DIR:-$test_db_local/evidence}"
test_db_certified_source_manifest="$test_db_local/evidence/physical-source-manifest.json"
test_db_state="$test_db_local/state"
test_db_ready="${TEST_DB_READY_FILE:-$test_db_state/ready}"
test_db_reset_lock="$test_db_state/reset.lock"
test_db_preparation_lock="$test_db_state/preparation.lock"
test_db_prepared_state="$test_db_state/prepared-standby.json"
test_db_active_volume_state="$test_db_state/active-volume"
test_db_physical_enabled="$test_db_state/physical-enabled"
if [[ -z "${TEST_DB_VOLUME:-}" ]]; then
  if [[ -s "$test_db_active_volume_state" ]]; then
    TEST_DB_VOLUME="$(<"$test_db_active_volume_state")"
    [[ "$TEST_DB_VOLUME" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$ ]] || { echo "test-database: unsafe active volume state" >&2; exit 1; }
  else
    TEST_DB_VOLUME="monitor-test-database-data"
  fi
fi
test_db_physical_root="$(dirname "$TEST_DB_DUMP")/derived/test-database-physical-v1"
test_db_template_archive="$test_db_physical_root/template.tar.zst"
test_db_template_manifest="$test_db_physical_root/manifest.json"
test_db_template_certification="$test_db_physical_root/certification.json"
test_db_dump_name="$(basename "$TEST_DB_DUMP")"
export DOCKER_CONTEXT="$TEST_DB_CONTEXT"

die() { echo "test-database: $*" >&2; exit 1; }

require_safe_target() {
  [[ "$TEST_DB_NAME" == "test_database" ]] || die "database name must be exactly test_database"
  [[ "$TEST_DB_HOST" == "127.0.0.1" ]] || die "host must be exactly 127.0.0.1"
  [[ "$TEST_DB_PORT" == "3307" ]] || die "port must be exactly 3307"
  case "$TEST_DB_NAME" in
    soft_database|backup_database|staging_emusa_core|prod*|production*) die "protected or production target refused" ;;
  esac
}

require_docker_context() {
  command -v docker >/dev/null || die "Docker CLI is required"
  [[ "$(docker context show)" == "$TEST_DB_CONTEXT" ]] || die "Docker context must be $TEST_DB_CONTEXT"
}

generate_test_db_secrets() {
  command -v openssl >/dev/null || die "openssl is required"
  mkdir -p "$test_db_secrets" "$test_db_evidence"
  chmod 700 "$test_db_secrets"
  local account password user
  for account in root reset writer monitor; do
    if [[ ! -s "$test_db_secrets/$account.password" ]]; then
      umask 077
      openssl rand -hex 24 > "$test_db_secrets/$account.password"
    fi
  done
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

bootstrap_test_db_accounts() {
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

expected_server_args() {
  local log_bin_off="$TEST_DB_EXPECT_LOG_BIN_OFF"
  if [[ "$log_bin_off" == "auto" ]]; then
    if [[ -f "$test_db_physical_enabled" ]]; then log_bin_off=yes; else log_bin_off=no; fi
  fi
  local args="--bind-address=0.0.0.0 --character-set-server=utf8mb4 --collation-server=utf8mb4_0900_ai_ci --default-time-zone=+00:00 --innodb-buffer-pool-size=$TEST_DB_BUFFER_POOL_SIZE --innodb-redo-log-capacity=2G --local-infile=OFF --lower-case-table-names=0 --max-allowed-packet=1G --skip-name-resolve=ON --sql-mode= --transaction-isolation=REPEATABLE-READ"
  if [[ "$log_bin_off" == "yes" ]]; then
    args="$args --skip-log-bin"
  elif [[ "$log_bin_off" != "no" ]]; then
    die "invalid TEST_DB_EXPECT_LOG_BIN_OFF value"
  fi
  printf '%s\n' "$args"
}

wait_for_mysql_container() {
  local container="$1" attempt
  for attempt in $(seq 1 90); do
    if docker exec "$container" mysqladmin --defaults-extra-file=/run/test-db-secrets/root.cnf ping --silent >/dev/null 2>&1; then
      return
    fi
    sleep 2
  done
  die "MySQL did not become ready in $container"
}

require_safe_docker_name() {
  local value="$1" label="$2"
  [[ "$value" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$ ]] || die "unsafe $label"
}

create_mysql_container() {
  local container="$1" volume="$2" publish="$3" restart_policy="$4"
  require_safe_docker_name "$container" "container name"
  require_safe_docker_name "$volume" "volume name"
  [[ "$publish" == "yes" || "$publish" == "no" ]] || die "invalid publish mode"
  [[ "$restart_policy" == "yes" || "$restart_policy" == "no" ]] || die "invalid restart policy"
  local -a run_args server_args
  run_args=(
    --detach
    --name "$container"
    --label monitor.test-database=true
    --mount "type=volume,src=$volume,dst=/var/lib/mysql"
    --mount "type=bind,src=$(dirname "$TEST_DB_DUMP"),dst=/protected-backup,readonly"
    --mount "type=bind,src=$test_db_secrets,dst=/run/test-db-secrets,readonly"
    --env MYSQL_ROOT_PASSWORD_FILE=/run/test-db-secrets/root.password
  )
  if [[ "$publish" == "yes" ]]; then
    run_args+=(--publish "$TEST_DB_HOST:$TEST_DB_PORT:3306")
  fi
  if [[ "$restart_policy" == "yes" ]]; then
    run_args+=(--restart unless-stopped)
  fi
  read -r -a server_args <<<"$(expected_server_args)"
  docker run "${run_args[@]}" "$TEST_DB_IMAGE" "${server_args[@]}" >/dev/null
}

stop_mysql_cleanly() {
  local container="$1"
  if [[ "$(docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null || true)" == "true" ]]; then
    docker exec "$container" mysqladmin --defaults-extra-file=/run/test-db-secrets/root.cnf shutdown >/dev/null
  fi
  local attempt
  for attempt in $(seq 1 60); do
    [[ "$(docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null || true)" == "false" ]] && return
    sleep 1
  done
  die "MySQL did not shut down cleanly in $container"
}

mysql_in_named_container() {
  local container="$1" credentials="$2"
  shift 2
  docker exec -i "$container" mysql --defaults-extra-file="/run/test-db-secrets/$credentials.cnf" "$@"
}

mysql_query_named() {
  local container="$1" credentials="$2" sql="$3"
  docker exec "$container" mysql --defaults-extra-file="/run/test-db-secrets/$credentials.cnf" --batch --skip-column-names --execute="$sql"
}

require_running_attested_runtime() {
  require_docker_context
  local running
  if ! running="$(docker inspect --format '{{.State.Running}}' "$TEST_DB_CONTAINER" 2>&1)"; then
    case "$running" in
      *"No such object"*) die "runtime container is not running" ;;
      *) die "unable to inspect runtime container: $running" ;;
    esac
  fi
  [[ "$running" == "true" ]] || die "runtime container is not running"
  [[ "$(docker inspect --format '{{.Config.Image}}' "$TEST_DB_CONTAINER")" == "$TEST_DB_IMAGE" ]] || die "container image reference differs from the pinned image"
  local published
  published="$(docker inspect --format '{{with (index .NetworkSettings.Ports "3306/tcp")}}{{(index . 0).HostIp}}:{{(index . 0).HostPort}}{{end}}' "$TEST_DB_CONTAINER")"
  if [[ "$TEST_DB_EXPECT_PUBLISHED_PORT" == "yes" ]]; then
    [[ "$published" == "$TEST_DB_HOST:$TEST_DB_PORT" ]] || die "container is not published only on $TEST_DB_HOST:$TEST_DB_PORT"
  else
    [[ "$TEST_DB_EXPECT_PUBLISHED_PORT" == "no" && -z "$published" ]] || die "isolated container unexpectedly publishes MySQL"
  fi
  [[ "$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Name}}:{{.RW}}{{end}}{{end}}' "$TEST_DB_CONTAINER")" == "$TEST_DB_VOLUME:true" ]] || die "database volume attestation failed"
  [[ "$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/protected-backup"}}{{.Source}}:{{.RW}}{{end}}{{end}}' "$TEST_DB_CONTAINER")" == "$(dirname "$TEST_DB_DUMP"):false" ]] || die "protected backup mount attestation failed"
  [[ "$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/run/test-db-secrets"}}{{.Source}}:{{.RW}}{{end}}{{end}}' "$TEST_DB_CONTAINER")" == "$test_db_secrets:false" ]] || die "secrets mount attestation failed"
  local expected_args actual_args
  expected_args="$(expected_server_args)"
  actual_args="$(docker inspect --format '{{join .Args " "}}' "$TEST_DB_CONTAINER")"
  [[ "$actual_args" == "$expected_args" ]] || die "container server arguments differ from the attested configuration"
  docker exec "$TEST_DB_CONTAINER" mysqladmin --defaults-extra-file=/run/test-db-secrets/root.cnf ping --silent >/dev/null 2>&1 || die "MySQL is not ready"
  local log_bin
  log_bin="$(mysql_query_named "$TEST_DB_CONTAINER" root 'SELECT @@global.log_bin')"
  if [[ "$TEST_DB_EXPECT_LOG_BIN_OFF" == "yes" || ( "$TEST_DB_EXPECT_LOG_BIN_OFF" == "auto" && -f "$test_db_physical_enabled" ) ]]; then
    [[ "$log_bin" == "0" ]] || die "binary logging must be disabled"
  fi
  [[ "$(mysql_query_named "$TEST_DB_CONTAINER" root "SHOW GLOBAL STATUS LIKE 'Innodb_redo_log_enabled'" | awk '{print $2}')" == "ON" ]] || die "InnoDB redo logging must remain enabled"
}

require_protected_dump() {
  [[ -f "$TEST_DB_DUMP" && -r "$TEST_DB_DUMP" ]] || die "protected dump is missing or unreadable"
  [[ "$TEST_DB_DUMP" == /Users/mariofishman/projects/dashboard_planta/local-data/database/staging_emusa_core-20260723-025548.sql ]] || die "unexpected dump path"
  [[ "$(stat -f '%z' "$TEST_DB_DUMP")" == "$TEST_DB_DUMP_BYTES" ]] || die "protected dump byte count changed"
  [[ "$(shasum -a 256 "$TEST_DB_DUMP" | awk '{print $1}')" == "$TEST_DB_DUMP_SHA256" ]] || die "protected dump checksum changed"
}

require_matching_compressed_dump() {
  [[ -f "$TEST_DB_DUMP_GZIP" && -r "$TEST_DB_DUMP_GZIP" ]] || die "protected compressed dump is missing or unreadable"
  [[ "$TEST_DB_DUMP_GZIP" == /Users/mariofishman/projects/dashboard_planta/local-data/database/staging_emusa_core-20260723-025548.sql.gz ]] || die "unexpected compressed dump path"
  [[ "$(gzip -cd "$TEST_DB_DUMP_GZIP" | shasum -a 256 | awk '{print $1}')" == "$TEST_DB_DUMP_SHA256" ]] || die "compressed and uncompressed protected dumps differ"
}

generate_dump_manifest() {
  local output="$1"
  python3 "$repo_root/scripts/test-database-dump-manifest.py" --dump "$TEST_DB_DUMP" --output "$output"
  local digest
  digest="$(shasum -a 256 "$output" | awk '{print $1}')"
  [[ "$TEST_DB_DUMP_MANIFEST_SHA256" == "TO_BE_CAPTURED" || "$digest" == "$TEST_DB_DUMP_MANIFEST_SHA256" ]] || die "independent dump manifest differs from the approved source manifest"
  echo "$digest"
}

mysql_in_container() {
  local credentials="$1"
  shift
  mysql_in_named_container "$TEST_DB_CONTAINER" "$credentials" "$@"
}

mysql_query() {
  local credentials="$1"
  local sql="$2"
  mysql_query_named "$TEST_DB_CONTAINER" "$credentials" "$sql"
}
