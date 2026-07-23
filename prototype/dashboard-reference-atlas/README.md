# Dashboard Reference Atlas

This folder is the preserved legacy migration source. The active, writable study is `atlases/instances/dashboard-inspiration/` and the shared Atlas application is `atlases/`.

Run the canonical file-backed Atlas server from the repository root:

```bash
python3 atlases/atlas_server.py --port 4175
```

Open `http://127.0.0.1:4175/`, then choose **Dashboard inspiration review**. Do not record new review feedback in this legacy copy.

The canonical Atlas reads and writes `atlases/instances/dashboard-inspiration/review-state.json`. Selections, reference feedback, predefined-region notes, custom regions, and screen position therefore follow the repository and work across browsers and Codex tasks.

Use the Atlas controls for durable feedback:

- edit the text box below a reference;
- click a predefined overlay region and save its note; or
- draw a custom region, name it, and save its note.

Codex browser-panel annotations are task comments outside the page and are not written to `review-state.json`.

Do not open either Atlas through `file://` or a generic static file server when editing. Browsers cannot write repository files directly; the canonical `atlases/atlas_server.py` provides the local save endpoint.
