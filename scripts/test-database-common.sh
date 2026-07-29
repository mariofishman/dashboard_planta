#!/usr/bin/env bash
set -euo pipefail

TEST_DB_NAME="${TEST_DB_NAME:-test_database}"
TEST_DB_HOST="${TEST_DB_HOST:-127.0.0.1}"
TEST_DB_PORT="${TEST_DB_PORT:-3307}"
TEST_DB_CONTAINER="${TEST_DB_CONTAINER:-monitor-test-mysql}"
TEST_DB_COLIMA_PROFILE="${TEST_DB_COLIMA_PROFILE:-monitor-test-db}"
TEST_DB_CONTEXT="${TEST_DB_CONTEXT:-colima-monitor-test-db}"
TEST_DB_VOLUME="${TEST_DB_VOLUME:-monitor-test-database-data}"
TEST_DB_IMAGE="${TEST_DB_IMAGE:-mysql@sha256:3e646bcda0d9448ffa3d2024eef04e1bca95528ec19b9e8b76749da9d97d4a10}"
TEST_DB_DUMP="${TEST_DB_DUMP:-/Users/mariofishman/projects/dashboard_planta/local-data/database/staging_emusa_core-20260723-025548.sql}"
TEST_DB_DUMP_GZIP="${TEST_DB_DUMP_GZIP:-/Users/mariofishman/projects/dashboard_planta/local-data/database/staging_emusa_core-20260723-025548.sql.gz}"
TEST_DB_DUMP_SHA256="a6feb0d0a5619d06b03c6af0a532d93a17cd13ded14f9985e089a8e1c2e36f73"
TEST_DB_DUMP_BYTES="2903569374"
TEST_DB_DUMP_MANIFEST_SHA256="57fd1829dead0eb9078c19ddb00162bb3591782bc5bfdf02ba94742eef8cc939"
TEST_DB_TABLE_CHECKSUM_DIGEST="a5df7f866bd4aad0f253fe0b7ee86801af3cf93b145d308fbd29a7036ddf5654"
TEST_DB_SCHEMA_METADATA_DIGEST="6d4207d4d036cf9fdf91d35cd10667684c625efa710bae8e59c02e83ad96cdb9"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_db_local="$repo_root/local-data/test-database"
test_db_secrets="$test_db_local/secrets"
test_db_evidence="$test_db_local/evidence"
test_db_state="$test_db_local/state"
test_db_ready="$test_db_state/ready"
test_db_reset_lock="$test_db_state/reset.lock"
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

require_running_attested_runtime() {
  require_docker_context
  [[ "$(docker inspect --format '{{.State.Running}}' "$TEST_DB_CONTAINER" 2>/dev/null)" == "true" ]] || die "runtime container is not running"
  [[ "$(docker inspect --format '{{.Config.Image}}' "$TEST_DB_CONTAINER")" == "$TEST_DB_IMAGE" ]] || die "container image reference differs from the pinned image"
  [[ "$(docker inspect --format '{{(index (index .NetworkSettings.Ports "3306/tcp") 0).HostIp}}:{{(index (index .NetworkSettings.Ports "3306/tcp") 0).HostPort}}' "$TEST_DB_CONTAINER")" == "$TEST_DB_HOST:$TEST_DB_PORT" ]] || die "container is not published only on $TEST_DB_HOST:$TEST_DB_PORT"
  [[ "$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/mysql"}}{{.Name}}:{{.RW}}{{end}}{{end}}' "$TEST_DB_CONTAINER")" == "$TEST_DB_VOLUME:true" ]] || die "database volume attestation failed"
  [[ "$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/protected-backup"}}{{.Source}}:{{.RW}}{{end}}{{end}}' "$TEST_DB_CONTAINER")" == "$(dirname "$TEST_DB_DUMP"):false" ]] || die "protected backup mount attestation failed"
  [[ "$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/run/test-db-secrets"}}{{.Source}}:{{.RW}}{{end}}{{end}}' "$TEST_DB_CONTAINER")" == "$test_db_secrets:false" ]] || die "secrets mount attestation failed"
  local expected_args actual_args
  expected_args='--bind-address=0.0.0.0 --character-set-server=utf8mb4 --collation-server=utf8mb4_0900_ai_ci --default-time-zone=+00:00 --innodb-buffer-pool-size=4G --innodb-redo-log-capacity=2G --local-infile=OFF --lower-case-table-names=0 --max-allowed-packet=1G --skip-name-resolve=ON --sql-mode= --transaction-isolation=REPEATABLE-READ'
  actual_args="$(docker inspect --format '{{join .Args " "}}' "$TEST_DB_CONTAINER")"
  [[ "$actual_args" == "$expected_args" ]] || die "container server arguments differ from the attested configuration"
  docker exec "$TEST_DB_CONTAINER" mysqladmin --defaults-extra-file=/run/test-db-secrets/root.cnf ping --silent >/dev/null 2>&1 || die "MySQL is not ready"
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
  docker exec -i "$TEST_DB_CONTAINER" mysql --defaults-extra-file="/run/test-db-secrets/$credentials.cnf" "$@"
}

mysql_query() {
  local credentials="$1"
  local sql="$2"
  docker exec "$TEST_DB_CONTAINER" mysql --defaults-extra-file="/run/test-db-secrets/$credentials.cnf" --batch --skip-column-names --execute="$sql"
}
