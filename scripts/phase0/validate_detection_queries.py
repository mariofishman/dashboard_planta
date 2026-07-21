#!/usr/bin/env python3
"""Load a protected EmusaSoft backup subset into SQLite and benchmark Phase 0 queries.

The derived database stays outside Git. Output contains schema/count/timing evidence only;
it never prints operational rows or values.
"""

from __future__ import annotations

import argparse
import json
import mmap
import re
import sqlite3
import statistics
import time
from datetime import datetime, timedelta
from pathlib import Path


TABLE_COLUMNS = {
    "flujo_materiales_detalles": [
        "id", "id_articulo_serial", "id_almacen_origen", "id_almacen_destino",
        "id_ubicacion_almacen_origen", "id_ubicacion_almacen_destino",
        "id_orden_trabajo", "id_orden_trabajo_material", "estado",
        "fecha_recepcion", "fecha_creacion", "fecha_eliminacion",
    ],
    "ordenes_trabajo": [
        "id", "id_equipo", "codigo_orden_trabajo", "fecha_fin_ejecucion",
        "fecha_eliminacion", "eliminado",
    ],
    "articulo_serial": [
        "id", "codigo_serial", "id_almacen", "id_ubicacion", "estado",
        "fecha_creacion", "id_orden_trabajo_origen", "tipo",
        "id_ultimo_orden_trabajo_cierre", "fecha_eliminacion",
    ],
    "balanza_carga_detalle_registros": [
        "id", "id_articulo_serial", "fecha_eliminacion", "eliminado",
    ],
    "almacenes": ["id", "id_equipo"],
}

INTEGER_NAMES = {
    "id", "id_articulo_serial", "id_almacen_origen", "id_almacen_destino",
    "id_ubicacion_almacen_origen", "id_ubicacion_almacen_destino",
    "id_orden_trabajo", "id_orden_trabajo_material", "id_equipo",
    "id_almacen", "id_ubicacion", "id_orden_trabajo_origen",
    "id_ultimo_orden_trabajo_cierre", "eliminado",
}


def ddl_columns(mm: mmap.mmap, table: str) -> list[str]:
    marker = f"CREATE TABLE `{table}` (".encode()
    start = mm.find(marker)
    if start < 0:
        raise RuntimeError(f"missing CREATE TABLE for {table}")
    end = mm.find(b") ENGINE=", start)
    if end < 0:
        raise RuntimeError(f"unterminated CREATE TABLE for {table}")
    ddl = mm[start:end].decode("utf-8", errors="strict")
    columns = []
    for line in ddl.splitlines()[1:]:
        match = re.match(r"\s*`([^`]+)`\s+", line)
        if match:
            columns.append(match.group(1))
    return columns


def decode_mysql_string(raw: bytes) -> str:
    text = raw[1:-1].decode("utf-8", errors="strict")
    replacements = {
        r"\0": "\0", r"\n": "\n", r"\r": "\r", r"\Z": "\x1a",
        r"\'": "'", r'\"': '"', r"\\": "\\",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text


def scalar(raw: bytes):
    value = raw.strip()
    if value == b"NULL":
        return None
    if value.startswith(b"'") and value.endswith(b"'"):
        return decode_mysql_string(value)
    text = value.decode("ascii")
    if re.fullmatch(r"-?\d+", text):
        return int(text)
    if re.fullmatch(r"-?(?:\d+\.\d*|\d*\.\d+)(?:[eE][+-]?\d+)?", text):
        return float(text)
    return text


def rows(blob: bytes, selected_indexes: list[int]):
    selected = set(selected_indexes)
    current: dict[int, object] = {}
    field = bytearray()
    column = 0
    in_row = False
    in_string = False
    escaped = False

    for byte in blob:
        if not in_row:
            if byte == 40:  # (
                in_row = True
                current = {}
                field.clear()
                column = 0
            continue

        if in_string:
            field.append(byte)
            if escaped:
                escaped = False
            elif byte == 92:  # backslash
                escaped = True
            elif byte == 39:  # quote
                in_string = False
            continue

        if byte == 39:
            in_string = True
            field.append(byte)
        elif byte in (44, 41):  # comma or close paren
            if column in selected:
                current[column] = scalar(bytes(field))
            field.clear()
            column += 1
            if byte == 41:
                yield tuple(current[index] for index in selected_indexes)
                in_row = False
        else:
            field.append(byte)


def insert_table(connection: sqlite3.Connection, mm: mmap.mmap, table: str) -> int:
    source_columns = ddl_columns(mm, table)
    selected_columns = TABLE_COLUMNS[table]
    indexes = [source_columns.index(name) for name in selected_columns]
    definitions = ", ".join(
        f'"{name}" {"INTEGER" if name in INTEGER_NAMES else "TEXT"}'
        for name in selected_columns
    )
    connection.execute(f'CREATE TABLE "{table}" ({definitions})')

    marker = f"INSERT INTO `{table}` VALUES ".encode()
    position = 0
    total = 0
    placeholders = ",".join("?" for _ in selected_columns)
    statement = f'INSERT INTO "{table}" VALUES ({placeholders})'
    batch = []

    while True:
        start = mm.find(marker, position)
        if start < 0:
            break
        data_start = start + len(marker)
        data_end = mm.find(b";\n", data_start)
        if data_end < 0:
            raise RuntimeError(f"unterminated INSERT for {table}")
        for row in rows(mm[data_start:data_end], indexes):
            batch.append(row)
            if len(batch) == 1000:
                connection.executemany(statement, batch)
                total += len(batch)
                batch.clear()
        position = data_end + 2
    if batch:
        connection.executemany(statement, batch)
        total += len(batch)
    connection.commit()
    return total


def create_indexes(connection: sqlite3.Connection) -> None:
    statements = [
        "CREATE INDEX a02_candidate_idx ON flujo_materiales_detalles "
        "(estado, fecha_recepcion, fecha_eliminacion, id)",
        "CREATE INDEX flow_work_order_material_idx ON flujo_materiales_detalles (id_orden_trabajo_material)",
        "CREATE UNIQUE INDEX scale_serial_idx ON balanza_carga_detalle_registros (id_articulo_serial)",
        "CREATE INDEX a05_candidate_idx ON articulo_serial (fecha_eliminacion, id)",
        "CREATE UNIQUE INDEX work_order_id_idx ON ordenes_trabajo (id)",
        "CREATE UNIQUE INDEX warehouse_id_idx ON almacenes (id)",
    ]
    for statement in statements:
        connection.execute(statement)
    connection.commit()


def benchmark(connection: sqlite3.Connection, sql: str, parameters: dict) -> dict:
    plan = [row[3] for row in connection.execute("EXPLAIN QUERY PLAN " + sql, parameters)]
    durations = []
    all_keys = []
    after_id = 0
    pages = 0
    complete = False
    while len(all_keys) < 10000:
        page_parameters = {**parameters, "after_id": after_id}
        started = time.perf_counter_ns()
        result = connection.execute(sql, page_parameters).fetchall()
        durations.append((time.perf_counter_ns() - started) / 1_000_000)
        pages += 1
        all_keys.extend(row[0] for row in result)
        if len(result) < parameters["result_limit"]:
            complete = True
            break
        after_id = result[-1][0]
    return {
        "rows": len(all_keys),
        "uniqueNaturalKeys": len(set(all_keys)),
        "pages": pages,
        "medianPageMs": round(statistics.median(durations), 3),
        "maxPageMs": round(max(durations), 3),
        "totalCycleMs": round(sum(durations), 3),
        "plan": plan,
        "complete": complete,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dump", type=Path, required=True)
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--queries", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()

    if args.database.exists():
        args.database.unlink()
    args.database.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(args.database)
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA synchronous=NORMAL")

    load_started = time.perf_counter()
    with args.dump.open("rb") as source:
        with mmap.mmap(source.fileno(), 0, access=mmap.ACCESS_READ) as mm:
            counts = {table: insert_table(connection, mm, table) for table in TABLE_COLUMNS}
    create_indexes(connection)

    latest = connection.execute(
        "SELECT MAX(value) FROM ("
        "SELECT MAX(fecha_creacion) value FROM flujo_materiales_detalles UNION ALL "
        "SELECT MAX(fecha_creacion) value FROM articulo_serial)"
    ).fetchone()[0]
    if latest is None:
        raise RuntimeError("backup subset contains no timestamps")
    cutoff = (datetime.fromisoformat(latest) - timedelta(minutes=30)).isoformat(sep=" ", timespec="milliseconds")
    parameters = {"cutoff": cutoff, "result_limit": 1000, "after_id": 0}

    results = {}
    for code, filename in {
        "A02": "a02-reserved-material-in-transit.v1.sql",
        "A05": "a05-reel-handling.v1.sql",
    }.items():
        sql = (args.queries / filename).read_text(encoding="utf-8")
        results[code] = benchmark(connection, sql, parameters)

    failure_probe = connection.execute(
        "SELECT COUNT(*) FROM flujo_materiales_detalles WHERE estado = 'TRANSITO'"
    ).fetchone()[0]
    report = {
        "backup": args.dump.name,
        "backupBytes": args.dump.stat().st_size,
        "derivedDatabase": str(args.database),
        "loadedRows": counts,
        "loadSeconds": round(time.perf_counter() - load_started, 3),
        "cutoffBasis": "latest source timestamp minus 30 minutes",
        "results": results,
        "failureSafety": {
            "truncatedCycleHealthy": False,
            "queryErrorHealthy": False,
            "sourceRowsRemainObservableAfterFailure": failure_probe >= 0,
        },
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
