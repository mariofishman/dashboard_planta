#!/usr/bin/env python3
"""Compare exact restored counts and AUTO_INCREMENT state with a dump manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


def read_tsv(path: Path) -> dict[str, int | None]:
    result: dict[str, int | None] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        name, value = line.split("\t", 1)
        result[name] = None if value in {"NULL", "<NULL>"} else int(value)
    return result


def mysql_batch_unescape(value: str) -> str:
    output: list[str] = []
    index = 0
    replacements = {"0": "\0", "n": "\n", "t": "\t", "r": "\r", "Z": "\x1a", "\\": "\\"}
    while index < len(value):
        if value[index] == "\\" and index + 1 < len(value) and value[index + 1] in replacements:
            output.append(replacements[value[index + 1]])
            index += 2
        else:
            output.append(value[index])
            index += 1
    return "".join(output)


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def normalized_ddl(text: str) -> str:
    normalized = re.sub(r"\s+AUTO_INCREMENT=\d+", "", text.rstrip(";\n"))
    return normalized.replace(" CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", " COLLATE utf8mb4_unicode_ci")


def read_show_create(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        name, create, *_ = line.split("\t")
        result[mysql_batch_unescape(name)] = mysql_batch_unescape(create)
    return result


def write_reconciliation_sql(manifest: dict, tables_path: Path, views_path: Path, enums_path: Path) -> None:
    quote = lambda name: "`" + name.replace("`", "``") + "`"
    tables_path.write_text("\n".join(f"SHOW CREATE TABLE {quote(name)};" for name in manifest["tables"]) + "\n", encoding="utf-8")
    views_path.write_text("\n".join(f"SHOW CREATE VIEW {quote(name)};" for name in manifest["views"]) + "\n", encoding="utf-8")
    enum_statements = []
    for table_name, table in manifest["tables"].items():
        for column_name in table["enum_audit"]:
            key = f"{table_name}.{column_name}".replace("'", "''")
            enum_statements.append(
                f"SELECT '{key}',COUNT(*) FROM {quote(table_name)} WHERE {quote(column_name)}='';"
            )
    enums_path.write_text("\n".join(enum_statements) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--counts", type=Path)
    parser.add_argument("--auto-increments", type=Path)
    parser.add_argument("--show-create-tables", type=Path)
    parser.add_argument("--show-create-views", type=Path)
    parser.add_argument("--enum-counts", type=Path)
    parser.add_argument("--write-tables-sql", type=Path)
    parser.add_argument("--write-views-sql", type=Path)
    parser.add_argument("--write-enums-sql", type=Path)
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    if args.write_tables_sql or args.write_views_sql or args.write_enums_sql:
        if not (args.write_tables_sql and args.write_views_sql and args.write_enums_sql):
            raise SystemExit("all three --write-*-sql paths are required together")
        write_reconciliation_sql(manifest, args.write_tables_sql, args.write_views_sql, args.write_enums_sql)
        return
    if not (args.counts and args.auto_increments and args.show_create_tables and args.show_create_views and args.enum_counts):
        raise SystemExit("counts, AUTO_INCREMENT, SHOW CREATE table/view, and enum files are required for comparison")
    counts = read_tsv(args.counts)
    auto_increments = read_tsv(args.auto_increments)
    expected_names = set(manifest["tables"])
    if set(counts) != expected_names or set(auto_increments) != expected_names:
        raise SystemExit("restored table-name set differs from protected dump")
    problems = []
    for name, source in manifest["tables"].items():
        if counts[name] != source["rows"]:
            problems.append(f"{name}: rows source={source['rows']} restored={counts[name]}")
        source_auto_increment = source["source_auto_increment"]
        restored_auto_increment = auto_increments[name]
        # Explicit dump counters are lower bounds. MySQL advances them when an
        # inserted explicit key is greater, including rows written during a
        # non-transactional mysqldump snapshot.
        if (
            source_auto_increment is not None
            and (restored_auto_increment is None or restored_auto_increment < source_auto_increment)
        ):
            problems.append(
                f"{name}: AUTO_INCREMENT source={source_auto_increment} restored={restored_auto_increment}"
            )

    restored_tables = read_show_create(args.show_create_tables)
    if set(restored_tables) != expected_names:
        problems.append("restored SHOW CREATE TABLE name set differs from protected dump")
    else:
        for name, source in manifest["tables"].items():
            if sha256(normalized_ddl(restored_tables[name])) != source["normalized_ddl_sha256"]:
                problems.append(f"{name}: restored CREATE TABLE differs from protected dump")

    restored_views = read_show_create(args.show_create_views)
    expected_views = set(manifest["views"])
    if set(restored_views) != expected_views:
        problems.append("restored SHOW CREATE VIEW name set differs from protected dump")
    else:
        for name, source in manifest["views"].items():
            marker = f" VIEW `{name}` AS "
            create = restored_views[name]
            if marker not in create:
                problems.append(f"{name}: could not isolate restored view business SQL")
                continue
            definition = create.split(marker, 1)[1].strip()
            if sha256(definition) != source["definition_sha256"]:
                problems.append(f"{name}: restored view business SQL differs from protected dump")

    restored_enum_counts = read_tsv(args.enum_counts)
    expected_enum_counts = {
        f"{table_name}.{column_name}": audit["expected_restored_empty_rows"]
        for table_name, table in manifest["tables"].items()
        for column_name, audit in table["enum_audit"].items()
    }
    if restored_enum_counts != expected_enum_counts:
        differing = sorted(set(restored_enum_counts) | set(expected_enum_counts))
        for key in differing:
            if restored_enum_counts.get(key) != expected_enum_counts.get(key):
                problems.append(
                    f"{key}: restored empty-enum rows source-expected={expected_enum_counts.get(key)} restored={restored_enum_counts.get(key)}"
                )
    if problems:
        raise SystemExit("source reconciliation failed:\n" + "\n".join(problems))
    print(f"source_table_names={len(expected_names)}")
    print(f"source_exact_row_counts={len(expected_names)}")
    print(f"source_auto_increments={len(expected_names)}")
    print(f"source_table_definitions={len(expected_names)}")
    print(f"source_view_definitions={len(expected_views)}")
    enum_audits = [
        (table_name, column_name, audit)
        for table_name, table in manifest["tables"].items()
        for column_name, audit in table["enum_audit"].items()
    ]
    print(f"source_enum_columns={len(enum_audits)}")
    print(f"source_invalid_enum_rows={sum(int(audit['invalid_rows']) for _, _, audit in enum_audits)}")
    affected = [(table, column, audit) for table, column, audit in enum_audits if audit["invalid_rows"]]
    print(f"source_affected_enum_columns={len(affected)}")
    for table, column, audit in affected:
        alert_codes = ",".join(audit["alert_codes"]) or "none"
        print(f"enum_coercion.{table}.{column}={audit['invalid_rows']};alerts={alert_codes}")


if __name__ == "__main__":
    main()
