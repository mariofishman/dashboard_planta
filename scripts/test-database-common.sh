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
TEST_DB_DUMP_SHA256="a6feb0d0a5619d06b03c6af0a532d93a17cd13ded14f9985e089a8e1c2e36f73"
TEST_DB_DUMP_BYTES="2903569374"
TEST_DB_TABLE_CHECKSUM_DIGEST="a5df7f866bd4aad0f253fe0b7ee86801af3cf93b145d308fbd29a7036ddf5654"
TEST_DB_SCHEMA_METADATA_DIGEST="f53b654d62104eb94261f2ee9e397cd5ca883df8eac07bc93cbc196267e74fb6"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_db_local="$repo_root/local-data/test-database"
test_db_secrets="$test_db_local/secrets"
test_db_evidence="$test_db_local/evidence"
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

require_protected_dump() {
  [[ -f "$TEST_DB_DUMP" && -r "$TEST_DB_DUMP" ]] || die "protected dump is missing or unreadable"
  [[ "$TEST_DB_DUMP" == /Users/mariofishman/projects/dashboard_planta/local-data/database/staging_emusa_core-20260723-025548.sql ]] || die "unexpected dump path"
  [[ "$(stat -f '%z' "$TEST_DB_DUMP")" == "$TEST_DB_DUMP_BYTES" ]] || die "protected dump byte count changed"
  [[ "$(shasum -a 256 "$TEST_DB_DUMP" | awk '{print $1}')" == "$TEST_DB_DUMP_SHA256" ]] || die "protected dump checksum changed"
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
