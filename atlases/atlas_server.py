#!/usr/bin/env python3
"""Serve the project Atlas lobby and persist every research instance."""

from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
INDEX_FILE = ROOT / "index.json"
INSTANCES_ROOT = ROOT / "instances"
MAX_JSON_BYTES = 4_000_000
VALID_STATUSES = {"active", "completed", "archived"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return slug[:80]


def atomic_write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=path.parent, delete=False, prefix=f"{path.stem}.", suffix=".tmp"
    ) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    os.replace(temporary_path, path)


def read_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def load_index() -> dict:
    if not INDEX_FILE.exists():
        payload = {"schemaVersion": 1, "updatedAt": now_iso(), "instances": []}
        atomic_write_json(INDEX_FILE, payload)
        return payload
    payload = read_json(INDEX_FILE)
    if not isinstance(payload, dict) or not isinstance(payload.get("instances"), list):
        raise ValueError("index.json is not a valid Atlas index")
    return payload


def instance_root(instance_id: str) -> Path:
    safe_id = slugify(unquote(instance_id))
    if not safe_id or safe_id != instance_id:
        raise ValueError("Invalid Atlas instance id")
    return INSTANCES_ROOT / safe_id


def metadata_for(instance_id: str) -> dict:
    payload = read_json(instance_root(instance_id) / "atlas.json")
    if not isinstance(payload, dict) or payload.get("id") != instance_id:
        raise ValueError("atlas.json does not match this Atlas instance")
    return payload


def update_index_metadata(metadata: dict) -> None:
    index = load_index()
    instances = [item for item in index["instances"] if item.get("id") != metadata["id"]]
    instances.append(metadata)
    instances.sort(key=lambda item: item.get("updatedAt") or "", reverse=True)
    index["instances"] = instances
    index["updatedAt"] = now_iso()
    atomic_write_json(INDEX_FILE, index)


def index_with_counts() -> dict:
    index = load_index()
    enriched = []
    for metadata in index["instances"]:
        item = dict(metadata)
        try:
            review = read_json(instance_root(item["id"]) / "review-state.json")
            item["acceptedCount"] = sum(1 for accepted in review.get("accepted", {}).values() if accepted)
            predefined_notes = sum(1 for note in review.get("regionNotes", {}).values() if note.get("note"))
            custom_notes = sum(
                1
                for regions in review.get("customRegions", {}).values()
                for region in regions
                if region.get("note")
            )
            item["noteCount"] = predefined_notes + custom_notes
        except (OSError, KeyError, TypeError, json.JSONDecodeError, ValueError):
            item["acceptedCount"] = 0
            item["noteCount"] = 0
        enriched.append(item)
    return {**index, "instances": enriched}


def create_instance(name: str, objective: str = "", requested_id: str = "") -> dict:
    clean_name = name.strip()
    if not clean_name:
        raise ValueError("Name is required")
    instance_id = slugify(requested_id or clean_name)
    if not instance_id:
        raise ValueError("Name must contain letters or numbers")
    root = instance_root(instance_id)
    if root.exists():
        raise FileExistsError(f"An Atlas named '{instance_id}' already exists")
    created_at = now_iso()
    metadata = {
        "id": instance_id,
        "name": clean_name,
        "objective": objective.strip(),
        "status": "active",
        "createdAt": created_at,
        "updatedAt": created_at,
    }
    root.mkdir(parents=True)
    (root / "images").mkdir()
    atomic_write_json(root / "atlas.json", metadata)
    atomic_write_json(root / "atlas-data.json", {"id": instance_id, "title": clean_name, "rounds": []})
    atomic_write_json(root / "review-state.json", {
        "atlasId": instance_id,
        "updatedAt": None,
        "accepted": {},
        "feedback": {},
        "regionNotes": {},
        "customRegions": {},
        "screenIndex": {},
    })
    update_index_metadata(metadata)
    return metadata


class AtlasHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _path_parts(self) -> list[str]:
        return [unquote(part) for part in urlparse(self.path).path.strip("/").split("/") if part]

    def _send_json(self, payload: object, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_payload(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > MAX_JSON_BYTES:
            raise ValueError("Request has an invalid size")
        payload = json.loads(self.rfile.read(length).decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("Request body must be a JSON object")
        return payload

    def _error(self, error: Exception, status: HTTPStatus = HTTPStatus.BAD_REQUEST) -> None:
        self._send_json({"error": str(error)}, status)

    def do_GET(self) -> None:
        parts = self._path_parts()
        if parts == ["api", "instances"]:
            try:
                return self._send_json(index_with_counts())
            except (OSError, json.JSONDecodeError, ValueError) as error:
                return self._error(error, HTTPStatus.INTERNAL_SERVER_ERROR)
        if len(parts) == 3 and parts[:2] == ["api", "instances"]:
            try:
                return self._send_json(metadata_for(parts[2]))
            except (OSError, json.JSONDecodeError, ValueError) as error:
                return self._error(error, HTTPStatus.NOT_FOUND)
        if len(parts) == 4 and parts[:2] == ["api", "instances"]:
            try:
                root = instance_root(parts[2])
                filename = {"data": "atlas-data.json", "review-state": "review-state.json"}.get(parts[3])
                if not filename:
                    raise ValueError("Unknown Atlas resource")
                return self._send_json(read_json(root / filename))
            except (OSError, json.JSONDecodeError, ValueError) as error:
                return self._error(error, HTTPStatus.NOT_FOUND)
        return super().do_GET()

    def do_POST(self) -> None:
        if self._path_parts() != ["api", "instances"]:
            return self.send_error(HTTPStatus.NOT_FOUND)
        try:
            payload = self._read_payload()
            metadata = create_instance(
                str(payload.get("name", "")), str(payload.get("objective", "")), str(payload.get("id", ""))
            )
            self._send_json(metadata, HTTPStatus.CREATED)
        except FileExistsError as error:
            self._error(error, HTTPStatus.CONFLICT)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            self._error(error)

    def do_PATCH(self) -> None:
        parts = self._path_parts()
        if len(parts) != 3 or parts[:2] != ["api", "instances"]:
            return self.send_error(HTTPStatus.NOT_FOUND)
        try:
            payload = self._read_payload()
            metadata = metadata_for(parts[2])
            if "name" in payload:
                name = str(payload["name"]).strip()
                if not name:
                    raise ValueError("Name is required")
                metadata["name"] = name
            if "objective" in payload:
                metadata["objective"] = str(payload["objective"]).strip()
            if "status" in payload:
                status = str(payload["status"])
                if status not in VALID_STATUSES:
                    raise ValueError("Status must be active, completed, or archived")
                metadata["status"] = status
            metadata["updatedAt"] = now_iso()
            atomic_write_json(instance_root(parts[2]) / "atlas.json", metadata)
            update_index_metadata(metadata)
            self._send_json(metadata)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            self._error(error)

    def do_PUT(self) -> None:
        parts = self._path_parts()
        if len(parts) != 4 or parts[:2] != ["api", "instances"] or parts[3] != "review-state":
            return self.send_error(HTTPStatus.NOT_FOUND)
        try:
            payload = self._read_payload()
            metadata = metadata_for(parts[2])
            if payload.get("atlasId") != parts[2]:
                raise ValueError("Review state belongs to a different Atlas")
            payload["updatedAt"] = now_iso()
            atomic_write_json(instance_root(parts[2]) / "review-state.json", payload)
            metadata["updatedAt"] = payload["updatedAt"]
            atomic_write_json(instance_root(parts[2]) / "atlas.json", metadata)
            update_index_metadata(metadata)
            self._send_json({"saved": True, "file": f"instances/{parts[2]}/review-state.json"})
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            self._error(error)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4175)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()
    INSTANCES_ROOT.mkdir(exist_ok=True)
    load_index()
    server = ThreadingHTTPServer((args.host, args.port), AtlasHandler)
    print(f"Atlas lobby: http://{args.host}:{args.port}/")
    print(f"Instance index: {INDEX_FILE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
