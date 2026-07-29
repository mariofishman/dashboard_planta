#!/usr/bin/env python3
"""Build a value-free structural manifest directly from the protected MySQL dump."""

from __future__ import annotations

import argparse
import hashlib
import json
import mmap
import re
from pathlib import Path


CREATE_MARKER = b"CREATE TABLE `"
INSERT_MARKER = b"INSERT INTO `"
VIEW_MARKER = b"/*!50001 VIEW `"
MYSQL_STRING_OR_SEPARATOR = re.compile(rb"'(?:\\.|[^'\\])*'|(?P<separator>\),\()")
MYSQL_VALUE_TOKEN = re.compile(rb"'(?:\\.|[^'\\])*'|(?P<row>\),\()|(?P<field>,)")

ALERT_TABLES = {
    "A02": {"flujo_materiales_detalles", "ordenes_trabajo", "orden_trabajo_materiales"},
    "A03": {"orden_trabajo_materiales", "ordenes_trabajo"},
    "A05": {"articulo_serial", "ordenes_trabajo", "balanza_carga_detalle_registros", "almacenes"},
}


def sha256(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()


def normalized_ddl(blob: bytes) -> bytes:
    normalized = re.sub(rb"\s+AUTO_INCREMENT=\d+", b"", blob.rstrip(b";\n"))
    return normalized.replace(b" CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", b" COLLATE utf8mb4_unicode_ci")


def decode_mysql_string(raw: bytes) -> str:
    text = raw[1:-1].decode("utf-8", errors="strict")
    replacements = {
        r"\0": "\0", r"\n": "\n", r"\r": "\r", r"\Z": "\x1a",
        r"\'": "'", r'\"': '"', r"\\": "\\",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text


def table_enum_columns(ddl: bytes) -> tuple[list[str], dict[int, tuple[str, list[str]]]]:
    columns: list[str] = []
    enum_columns: dict[int, tuple[str, list[str]]] = {}
    for line in ddl.splitlines()[1:]:
        match = re.match(rb"\s*`([^`]+)`\s+(.+?)(?:,)?$", line)
        if not match:
            continue
        name = match.group(1).decode("utf-8")
        definition = match.group(2)
        index = len(columns)
        columns.append(name)
        enum_match = re.match(rb"enum\((.*?)\)(?:\s|$)", definition, re.IGNORECASE)
        if enum_match:
            allowed = [decode_mysql_string(token.group(0)) for token in re.finditer(rb"'(?:\\.|[^'\\])*'", enum_match.group(1))]
            enum_columns[index] = (name, allowed)
    return columns, enum_columns


def audit_enum_values(blob: bytes, enum_columns: dict[int, tuple[str, list[str]]], audits: dict[str, dict[str, object]]) -> None:
    if not enum_columns or not blob:
        return
    column = 0
    field_start = 1
    row_number = 0

    def inspect(raw: bytes, column_index: int, current_row: int) -> None:
        if column_index not in enum_columns:
            return
        name, allowed = enum_columns[column_index]
        audit = audits[name]
        value = raw.strip()
        if value == b"NULL":
            return
        audit["source_non_null_rows"] = int(audit["source_non_null_rows"]) + 1
        valid = False
        resolves_empty = False
        if value.startswith(b"'") and value.endswith(b"'"):
            decoded = decode_mysql_string(value)
            valid = decoded in allowed
            resolves_empty = decoded == ""
        elif re.fullmatch(rb"\d+", value):
            enum_index = int(value)
            valid = 1 <= enum_index <= len(allowed)
            resolves_empty = enum_index == 0 or (valid and allowed[enum_index - 1] == "")
        if not valid:
            audit["invalid_rows"] = int(audit["invalid_rows"]) + 1
            digest = audit["invalid_token_digest"]
            digest.update(str(current_row).encode("ascii") + b":" + value + b"\n")  # type: ignore[union-attr]
            resolves_empty = True
        if resolves_empty:
            audit["expected_restored_empty_rows"] = int(audit["expected_restored_empty_rows"]) + 1

    for match in MYSQL_VALUE_TOKEN.finditer(blob):
        if match.lastgroup not in {"field", "row"}:
            continue
        inspect(blob[field_start:match.start()], column, row_number)
        if match.lastgroup == "row":
            row_number += 1
            column = 0
            field_start = match.end()
        else:
            column += 1
            field_start = match.end()
    inspect(blob[field_start:-1], column, row_number)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dump", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    tables: dict[str, dict[str, object]] = {}
    views: dict[str, dict[str, object]] = {}
    dump_hash = hashlib.sha256()
    with args.dump.open("rb") as source:
        for block in iter(lambda: source.read(8 * 1024 * 1024), b""):
            dump_hash.update(block)

        source.seek(0)
        with mmap.mmap(source.fileno(), 0, access=mmap.ACCESS_READ) as mm:
            position = 0
            while True:
                start = mm.find(CREATE_MARKER, position)
                if start < 0:
                    break
                name_start = start + len(CREATE_MARKER)
                name_end = mm.find(b"`", name_start)
                end = mm.find(b";\n", name_end)
                if name_end < 0 or end < 0:
                    raise RuntimeError("unterminated CREATE TABLE statement")
                ddl = mm[start : end + 1]
                position = end + 2
                if b") ENGINE=" not in ddl:
                    continue
                name = mm[name_start:name_end].decode("utf-8")
                auto_increment = re.search(rb"AUTO_INCREMENT=(\d+)", ddl)
                columns, enum_columns = table_enum_columns(ddl)
                enum_audits = {
                    column_name: {
                        "allowed_count": len(allowed),
                        "source_non_null_rows": 0,
                        "invalid_rows": 0,
                        "expected_restored_empty_rows": 0,
                        "invalid_token_digest": hashlib.sha256(),
                    }
                    for column_name, allowed in enum_columns.values()
                }
                tables[name] = {
                    "ddl_sha256": sha256(ddl),
                    "normalized_ddl_sha256": sha256(normalized_ddl(ddl)),
                    "source_auto_increment": int(auto_increment.group(1)) if auto_increment else None,
                    "column_count": len(columns),
                    "insert_blocks": 0,
                    "insert_sha256": hashlib.sha256(),
                    "rows": 0,
                    "_enum_columns": enum_columns,
                    "enum_audit": enum_audits,
                }

            position = 0
            while True:
                start = mm.find(VIEW_MARKER, position)
                if start < 0:
                    break
                name_start = start + len(VIEW_MARKER)
                name_end = mm.find(b"`", name_start)
                definition_start = mm.find(b" AS ", name_end)
                end = mm.find(b" */;\n", definition_start)
                if name_end < 0 or definition_start < 0 or end < 0:
                    raise RuntimeError("unterminated final VIEW statement")
                name = mm[name_start:name_end].decode("utf-8")
                definition = mm[definition_start + len(b" AS ") : end]
                definition = definition.replace(b"`staging_emusa_core`.", b"`test_database`.")
                definition = definition.replace(b"staging_emusa_core.`", b"test_database.`")
                views[name] = {"definition_sha256": sha256(definition.strip())}
                position = end + len(b" */;\n")

            position = 0
            while True:
                start = mm.find(INSERT_MARKER, position)
                if start < 0:
                    break
                name_start = start + len(INSERT_MARKER)
                name_end = mm.find(b"`", name_start)
                values = mm.find(b" VALUES ", name_end)
                end = mm.find(b";\n", values)
                if name_end < 0 or values < 0 or end < 0:
                    raise RuntimeError("unterminated INSERT statement")
                name = mm[name_start:name_end].decode("utf-8")
                position = end + 2
                if name not in tables:
                    continue
                tuples = mm[values + len(b" VALUES ") : end]
                # Count tuple separators only outside MySQL escaped string literals.
                rows = 0 if not tuples else 1 + sum(
                    match.lastgroup == "separator" for match in MYSQL_STRING_OR_SEPARATOR.finditer(tuples)
                )
                tables[name]["rows"] = int(tables[name]["rows"]) + rows
                tables[name]["insert_blocks"] = int(tables[name]["insert_blocks"]) + 1
                tables[name]["insert_sha256"].update(tuples)  # type: ignore[union-attr]
                audit_enum_values(tuples, tables[name]["_enum_columns"], tables[name]["enum_audit"])  # type: ignore[arg-type]

    serializable = {}
    for name in sorted(tables):
        entry = tables[name]
        entry.pop("_enum_columns")
        insert_hash = entry.pop("insert_sha256")
        entry["insert_sha256"] = insert_hash.hexdigest()  # type: ignore[union-attr]
        for column_name, audit in entry["enum_audit"].items():  # type: ignore[union-attr]
            digest = audit["invalid_token_digest"]
            audit["invalid_token_digest"] = digest.hexdigest()  # type: ignore[union-attr]
            audit["alert_codes"] = sorted(code for code, alert_tables in ALERT_TABLES.items() if name in alert_tables)
        serializable[name] = entry

    manifest = {
        "format": 1,
        "dump_bytes": args.dump.stat().st_size,
        "dump_sha256": dump_hash.hexdigest(),
        "table_count": len(serializable),
        "view_count": len(views),
        "row_count_method": "quote-aware mysqldump tuple tokenization",
        "tables": serializable,
        "views": {name: views[name] for name in sorted(views)},
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
