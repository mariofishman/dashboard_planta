#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/test-database-common.sh"

command_name="${1:-}"
volume="${2:-}"
output_dir="${3:-}"
[[ "$command_name" == "pack" || "$command_name" == "unpack" || "$command_name" == "inventory" ]] || die "usage: $0 {pack|unpack|inventory} volume output-directory"
require_safe_docker_name "$volume" "volume name"
require_docker_context
[[ -d "$output_dir" && ! -L "$output_dir" ]] || die "physical output directory must be an existing real directory"
output_dir="$(cd "$output_dir" && pwd -P)"
derived_parent="$(dirname "$test_db_physical_root")"
case "$command_name:$output_dir" in
  pack:"$derived_parent"/.building-*|unpack:"$derived_parent"/.building-*|unpack:"$test_db_physical_root"|inventory:"$derived_parent"/.building-*|inventory:"$test_db_evidence"/standby/*) ;;
  *) die "physical output directory is outside the approved command root" ;;
esac
docker volume inspect "$volume" >/dev/null 2>&1 || die "physical volume does not exist"

inventory_volume() {
  docker run --rm --network none \
    --mount "type=volume,src=$volume,dst=/source,readonly" \
    --mount "type=bind,src=$output_dir,dst=/output" \
    --env HOST_UID="$(id -u)" --env HOST_GID="$(id -g)" \
    "$TEST_DB_IMAGE" bash -euo pipefail -c '
      cd /source
      : > /output/inventory.tsv
      while IFS= read -r -d "" path; do
        if [[ "$path" == "./mysql.sock" ]]; then
          [[ -L "$path" && "$(readlink "$path")" == "/var/run/mysqld/mysqld.sock" ]] || { echo "unexpected mysql.sock entry" >&2; exit 1; }
          continue
        fi
        if [[ "$path" == *$'"'"'\t'"'"'* || "$path" == *$'"'"'\n'"'"'* ]]; then
          echo "unsafe tab or newline in physical path" >&2
          exit 1
        fi
        read -r mode uid gid size < <(stat -c "%a %u %g %s" -- "$path")
        if [[ -d "$path" ]]; then
          printf "directory\t%s\t%s\t%s\t%s\t-\t%s\n" "$mode" "$uid" "$gid" "$size" "$path" >> /output/inventory.tsv
        elif [[ -f "$path" ]]; then
          read -r digest _ < <(sha256sum -- "$path")
          printf "file\t%s\t%s\t%s\t%s\t%s\t%s\n" "$mode" "$uid" "$gid" "$size" "$digest" "$path" >> /output/inventory.tsv
        else
          echo "unsupported physical entry: $path" >&2
          exit 1
        fi
      done < <(find . -xdev -print0 | LC_ALL=C sort -z)
      chown "$HOST_UID:$HOST_GID" /output/inventory.tsv
      chmod 600 /output/inventory.tsv
    '
}

case "$command_name" in
  inventory)
    inventory_volume
    ;;
  pack)
    [[ ! -e "$output_dir/template.tar.zst" ]] || die "template archive output already exists"
    inventory_volume
    docker run --rm --network none \
      --mount "type=volume,src=$volume,dst=/source,readonly" \
      --mount "type=bind,src=$output_dir,dst=/output" \
      --env HOST_UID="$(id -u)" --env HOST_GID="$(id -g)" \
      "$TEST_DB_IMAGE" bash -euo pipefail -c '
        cd /source
        tar --exclude=./mysql.sock --sort=name --numeric-owner --xattrs --acls -cpf - . | zstd -T1 -3 -o /output/template.tar.zst
        zstd -t /output/template.tar.zst
        chown "$HOST_UID:$HOST_GID" /output/template.tar.zst
        chmod 600 /output/template.tar.zst
      '
    ;;
  unpack)
    [[ -f "$output_dir/template.tar.zst" && ! -L "$output_dir/template.tar.zst" ]] || die "approved template archive is missing"
    docker run --rm --network none \
      --mount "type=volume,src=$volume,dst=/target" \
      --mount "type=bind,src=$output_dir,dst=/input,readonly" \
      "$TEST_DB_IMAGE" bash -euo pipefail -c '
        [[ -z "$(find /target -mindepth 1 -print -quit)" ]] || { echo "target volume is not empty" >&2; exit 1; }
        zstd -dc /input/template.tar.zst | tar --numeric-owner --same-owner --xattrs --acls -xpf - -C /target
      '
    ;;
esac
