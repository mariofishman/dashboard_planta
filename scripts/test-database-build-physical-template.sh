#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/test-database-common.sh"

require_safe_target
require_protected_dump
require_matching_compressed_dump
require_docker_context
[[ "${ALLOW_TEST_DATABASE_TEMPLATE_BUILD:-}" == "yes" ]] || die "set ALLOW_TEST_DATABASE_TEMPLATE_BUILD=yes to authorize the one-time template build"
[[ ! -e "$test_db_physical_root" ]] || die "certified physical template already exists"
[[ ! -e "$test_db_prepared_state" ]] || die "prepared standby state already exists"
[[ ! -e "$test_db_reset_lock" ]] || die "a reset is active"
mkdir -p "$test_db_state" "$(dirname "$test_db_physical_root")"
if ! mkdir "$test_db_preparation_lock" 2>/dev/null; then
  die "template or standby preparation is already active"
fi

attempt="$(date -u +%Y%m%dT%H%M%SZ)-$$"
build_dir="$(mktemp -d "$(dirname "$test_db_physical_root")/.building-$attempt-XXXXXX")"
source_volume="monitor-test-template-source-$attempt"
source_container="monitor-test-template-source-$attempt"
verify_volume="monitor-test-standby-$attempt"
verify_container="monitor-test-template-verify-$attempt"
source_manifest="$build_dir/source-manifest.json"
source_evidence="$build_dir/source-evidence"
verify_evidence="$build_dir/verification-evidence"
published=false
sealed=false

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  docker rm -f "$source_container" "$verify_container" >/dev/null 2>&1 || true
  if [[ "$published" != "true" ]]; then
    docker volume rm "$source_volume" >/dev/null 2>&1 || true
  fi
  if [[ "$sealed" != "true" ]]; then
    docker volume rm "$verify_volume" >/dev/null 2>&1 || true
  fi
  rmdir "$test_db_preparation_lock" 2>/dev/null || true
  if [[ $exit_code -ne 0 ]]; then
    echo "test-database: physical template build failed; live database was not modified; diagnostics: $build_dir" >&2
  fi
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

available_kb="$(colima ssh --profile "$TEST_DB_COLIMA_PROFILE" -- df -Pk /var/lib/docker | tail -1 | tr -s ' ' | cut -d ' ' -f4)"
[[ "$available_kb" =~ ^[0-9]+$ && "$available_kb" -ge 8388608 ]] || die "at least 8 GiB free is required to build the physical template"
generate_test_db_secrets

mkdir -p "$source_evidence" "$verify_evidence"
docker volume create \
  --label monitor.test-database=true \
  --label monitor.test-database.role=template-source \
  --label "monitor.test-database.attempt=$attempt" \
  "$source_volume" >/dev/null

TEST_DB_CONTAINER="$source_container"
TEST_DB_VOLUME="$source_volume"
TEST_DB_EXPECT_PUBLISHED_PORT=no
TEST_DB_EXPECT_LOG_BIN_OFF=yes
TEST_DB_BUFFER_POOL_SIZE=1G
create_mysql_container "$source_container" "$source_volume" no no
wait_for_mysql_container "$source_container"
bootstrap_test_db_accounts

env \
  TEST_DB_CONTAINER="$source_container" \
  TEST_DB_VOLUME="$source_volume" \
  TEST_DB_EXPECT_PUBLISHED_PORT=no \
  TEST_DB_EXPECT_LOG_BIN_OFF=yes \
  TEST_DB_BUFFER_POOL_SIZE=1G \
  TEST_DB_EVIDENCE_DIR="$source_evidence" \
  TEST_DB_READY_FILE="$build_dir/source-ready" \
  TEST_DB_SOURCE_MANIFEST_OUTPUT="$source_manifest" \
  "$repo_root/scripts/test-database-restore-full.sh"

env TEST_DB_CONTAINER="$source_container" TEST_DB_VOLUME="$source_volume" TEST_DB_EXPECT_PUBLISHED_PORT=no TEST_DB_EXPECT_LOG_BIN_OFF=yes TEST_DB_BUFFER_POOL_SIZE=1G TEST_DB_EVIDENCE_DIR="$source_evidence" TEST_DB_READY_FILE="$build_dir/source-ready" "$repo_root/scripts/test-database-validate.sh" pre-unlock
mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT UNLOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT UNLOCK;"
env TEST_DB_CONTAINER="$source_container" TEST_DB_VOLUME="$source_volume" TEST_DB_EXPECT_PUBLISHED_PORT=no TEST_DB_EXPECT_LOG_BIN_OFF=yes TEST_DB_BUFFER_POOL_SIZE=1G TEST_DB_EVIDENCE_DIR="$source_evidence" TEST_DB_READY_FILE="$build_dir/source-ready" TEST_DB_SOURCE_MANIFEST="$source_manifest" "$repo_root/scripts/test-database-validate.sh" baseline
mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT LOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT LOCK;"
stop_mysql_cleanly "$source_container"
docker rm "$source_container" >/dev/null

"$repo_root/scripts/test-database-physical-volume.sh" pack "$source_volume" "$build_dir"
mysql_version="$(docker run --rm --network none "$TEST_DB_IMAGE" mysql --version | awk '{print $3}')"
manifest_digest="$(node "$repo_root/scripts/test-database-physical-manifest.mjs" build-template \
  --inventory "$build_dir/inventory.tsv" \
  --archive "$build_dir/template.tar.zst" \
  --output "$build_dir/manifest.json" \
  --mysql-version "$mysql_version" \
  --image "$TEST_DB_IMAGE" \
  --server-args "$(expected_server_args)" \
  --source-sha256 "$TEST_DB_DUMP_SHA256" \
  --schema-sha256 "$TEST_DB_SCHEMA_METADATA_DIGEST" \
  --checksums-sha256 "$TEST_DB_TABLE_CHECKSUM_DIGEST")"
archive_digest="$(shasum -a 256 "$build_dir/template.tar.zst" | awk '{print $1}')"
[[ "$manifest_digest" =~ ^[a-f0-9]{64}$ && "$archive_digest" =~ ^[a-f0-9]{64}$ ]] || die "physical template digest generation failed"

docker volume rm "$source_volume" >/dev/null
docker volume create \
  --label monitor.test-database=true \
  --label monitor.test-database.role=standby-candidate \
  --label "monitor.test-database.attempt=$attempt" \
  --label "monitor.test-database.template-sha256=$archive_digest" \
  "$verify_volume" >/dev/null
"$repo_root/scripts/test-database-physical-volume.sh" unpack "$verify_volume" "$build_dir"
"$repo_root/scripts/test-database-physical-volume.sh" inventory "$verify_volume" "$build_dir"
node "$repo_root/scripts/test-database-physical-manifest.mjs" verify-inventory --manifest "$build_dir/manifest.json" --inventory "$build_dir/inventory.tsv" >/dev/null

TEST_DB_CONTAINER="$verify_container"
TEST_DB_VOLUME="$verify_volume"
create_mysql_container "$verify_container" "$verify_volume" no no
wait_for_mysql_container "$verify_container"
env TEST_DB_CONTAINER="$verify_container" TEST_DB_VOLUME="$verify_volume" TEST_DB_EXPECT_PUBLISHED_PORT=no TEST_DB_EXPECT_LOG_BIN_OFF=yes TEST_DB_BUFFER_POOL_SIZE=1G TEST_DB_EVIDENCE_DIR="$verify_evidence" TEST_DB_READY_FILE="$build_dir/verify-ready" "$repo_root/scripts/test-database-validate.sh" pre-unlock
mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT UNLOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT UNLOCK;"
env TEST_DB_CONTAINER="$verify_container" TEST_DB_VOLUME="$verify_volume" TEST_DB_EXPECT_PUBLISHED_PORT=no TEST_DB_EXPECT_LOG_BIN_OFF=yes TEST_DB_BUFFER_POOL_SIZE=1G TEST_DB_EVIDENCE_DIR="$verify_evidence" TEST_DB_READY_FILE="$build_dir/verify-ready" TEST_DB_SOURCE_MANIFEST="$source_manifest" "$repo_root/scripts/test-database-validate.sh" baseline
mysql_query root "ALTER USER 'alertas_fake'@'%' ACCOUNT LOCK; ALTER USER 'monitor_source_ro'@'%' ACCOUNT LOCK;"

validation_digest="$(find "$verify_evidence" -type f -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256 | shasum -a 256 | awk '{print $1}')"
[[ "$validation_digest" =~ ^[a-f0-9]{64}$ ]] || die "validation evidence digest generation failed"
stop_mysql_cleanly "$verify_container"
docker rm "$verify_container" >/dev/null
[[ "$(docker ps --all --filter "volume=$verify_volume" --format '{{.ID}}')" == "" ]] || die "verified standby volume remains mounted"

node "$repo_root/scripts/test-database-physical-manifest.mjs" write-certification \
  --output "$build_dir/certification.json" \
  --manifest-sha256 "$manifest_digest" \
  --archive-sha256 "$archive_digest" \
  --validation-sha256 "$validation_digest" \
  --attempt "$attempt"
certification_digest="$(shasum -a 256 "$build_dir/certification.json" | awk '{print $1}')"
unlink "$build_dir/inventory.tsv"
template_evidence_root="$test_db_evidence/template-build/$attempt"
mkdir -p "$template_evidence_root"
cp "$source_manifest" "$test_db_certified_source_manifest"
chmod 600 "$test_db_certified_source_manifest"
mv "$source_evidence" "$verify_evidence" "$source_manifest" "$template_evidence_root/"
chmod 700 "$build_dir"
chmod 600 "$build_dir/template.tar.zst" "$build_dir/manifest.json" "$build_dir/certification.json"
mv "$build_dir" "$test_db_physical_root"
published=true

seal_tmp="$test_db_state/.prepared-standby-$attempt.json"
node "$repo_root/scripts/test-database-physical-manifest.mjs" write-seal \
  --output "$seal_tmp" \
  --volume "$verify_volume" \
  --source physical-template \
  --manifest-sha256 "$manifest_digest" \
  --archive-sha256 "$archive_digest" \
  --validation-sha256 "$validation_digest" \
  --shutdown-at "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
mv "$seal_tmp" "$test_db_prepared_state"
sealed=true

printf 'template_manifest_sha256=%s\ntemplate_archive_sha256=%s\ntemplate_certification_sha256=%s\nprepared_volume=%s\n' "$manifest_digest" "$archive_digest" "$certification_digest" "$verify_volume"
