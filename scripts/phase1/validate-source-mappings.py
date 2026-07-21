#!/usr/bin/env python3
"""Validate backup-confirmed Phase 1 table and column mappings without printing data."""

from __future__ import annotations

import argparse
import json
import mmap
import re
from pathlib import Path


def ddl_columns(mm: mmap.mmap, table: str) -> set[str]:
    marker = f"CREATE TABLE `{table}` (".encode()
    start = mm.find(marker)
    if start < 0:
        raise RuntimeError(f"missing table {table}")
    end = mm.find(b") ENGINE=", start)
    if end < 0:
        raise RuntimeError(f"unterminated table {table}")
    ddl = mm[start:end].decode("utf-8", errors="strict")
    return {
        match.group(1)
        for line in ddl.splitlines()
        if (match := re.match(r"\s*`([^`]+)`\s+", line))
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dump", type=Path, required=True)
    parser.add_argument("--contracts", type=Path, required=True)
    args = parser.parse_args()

    catalog = json.loads(args.contracts.read_text(encoding="utf-8"))
    mappings: dict[str, set[str]] = {}
    for rule in catalog["rules"]:
        for mapping in rule["sourceMappings"]:
            source = mapping["source"]
            if mapping["evidence"] != "backup-confirmed" or not re.fullmatch(r"[a-z_]+", source):
                continue
            mappings.setdefault(source, set()).update(mapping["fields"])

    checked_fields = 0
    with args.dump.open("rb") as source_file:
        with mmap.mmap(source_file.fileno(), 0, access=mmap.ACCESS_READ) as mm:
            for table, expected_fields in sorted(mappings.items()):
                actual_fields = ddl_columns(mm, table)
                missing = expected_fields - actual_fields
                if missing:
                    raise RuntimeError(f"{table} missing contract fields: {', '.join(sorted(missing))}")
                checked_fields += len(expected_fields)

    print(json.dumps({
        "result": "pass",
        "backup": args.dump.stem,
        "tables": len(mappings),
        "fields": checked_fields,
        "dataRowsPrinted": 0,
    }, indent=2))


if __name__ == "__main__":
    main()
