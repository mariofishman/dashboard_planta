#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/test-database-common.sh"

require_safe_target
require_docker_context
require_protected_dump
[[ "${ALLOW_TEST_DATABASE_RESET:-}" == "yes" ]] || die "set ALLOW_TEST_DATABASE_RESET=yes to authorize the disposable reset"
[[ "$(docker inspect --format '{{.State.Running}}' "$TEST_DB_CONTAINER" 2>/dev/null)" == "true" ]] || die "runtime container is not running"
[[ "$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/protected-backup"}}{{.RW}}{{end}}{{end}}' "$TEST_DB_CONTAINER")" == "false" ]] || die "protected backup mount is not read-only"

echo "Dropping and recreating only local $TEST_DB_NAME"
mysql_in_container reset <<SQL
DROP DATABASE IF EXISTS \`$TEST_DB_NAME\`;
CREATE DATABASE \`$TEST_DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SQL

echo "Streaming immutable backup into $TEST_DB_NAME"
# The dump already provides temporary placeholder views before final definitions,
# which resolves view-to-view dependencies. Only schema qualifiers and the unusable
# production definer/security clause are adapted; business SELECT text is preserved.
sed \
  -e 's/`staging_emusa_core`\./`test_database`./g' \
  -e 's/staging_emusa_core\.`/test_database.`/g' \
  -e 's#DEFINER=`migbk`@`%` SQL SECURITY DEFINER#SQL SECURITY INVOKER#g' \
  "$TEST_DB_DUMP" |
  mysql_in_container reset --database="$TEST_DB_NAME"

"$repo_root/scripts/test-database-validate.sh" "${1:-}"
