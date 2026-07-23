# Atlas research library

Run the repository-backed Atlas from the project root:

```bash
python3 atlases/atlas_server.py --port 4175
```

Open `http://127.0.0.1:4175/`. The lobby manages every study stored under `atlases/instances/`.

For the same research objective, add later searches as new entries in the instance's `rounds` array. Do not replace earlier rounds. A materially different objective belongs in a new stable instance.

Each instance stores its durable review state in `review-state.json`, including accepted references, reference feedback, predefined-region notes, custom regions, and multi-screen position. Saved notes render as numbered markers over their reference screen and must survive reloads and separate browser sessions.

Codex browser-panel comments are task-local evidence and are not captured automatically. Transfer relevant comments into Atlas feedback or region notes before considering them durable research evidence.

The former single-folder implementation at `prototype/dashboard-reference-atlas/` is retained only as a verified migration source. Do not add new research there.
