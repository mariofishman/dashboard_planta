#!/usr/bin/env python3
"""Serve the Atlas and persist its review state to a companion JSON file."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
STATE_FILE = ROOT / "review-state.json"
MAX_STATE_BYTES = 2_000_000


class AtlasHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _is_state_endpoint(self) -> bool:
        return urlparse(self.path).path == "/api/review-state"

    def _send_json(self, payload: object, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if not self._is_state_endpoint():
            return super().do_GET()
        try:
            self._send_json(json.loads(STATE_FILE.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError) as error:
            self._send_json({"error": str(error)}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def do_PUT(self) -> None:
        if not self._is_state_endpoint():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_STATE_BYTES:
                raise ValueError("Review state has an invalid size")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("Review state must be a JSON object")
            if payload.get("atlasId") != "monitor-dashboard-references":
                raise ValueError("Review state belongs to a different Atlas")
            with tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", dir=ROOT, delete=False, prefix="review-state.", suffix=".tmp"
            ) as temporary:
                json.dump(payload, temporary, ensure_ascii=False, indent=2)
                temporary.write("\n")
                temporary_path = Path(temporary.name)
            os.replace(temporary_path, STATE_FILE)
            self._send_json({"saved": True, "file": STATE_FILE.name})
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            self._send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4175)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), AtlasHandler)
    print(f"Atlas: http://{args.host}:{args.port}/")
    print(f"Review state: {STATE_FILE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
