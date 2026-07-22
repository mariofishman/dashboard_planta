# Dashboard Reference Atlas

Run the file-backed review server from the repository root:

```bash
python3 prototype/dashboard-reference-atlas/atlas_server.py --port 4175
```

Open `http://127.0.0.1:4175/`.

The Atlas reads and writes `review-state.json`. Selections, reference feedback, predefined-region notes, and custom regions therefore follow the repository and work across browsers and Codex tasks.

Use the Atlas controls for durable feedback:

- edit the text box below a reference;
- click a predefined overlay region and save its note; or
- draw a custom region, name it, and save its note.

Codex browser-panel annotations are task comments outside the page and are not written to `review-state.json`.

Do not open the Atlas through `file://` or a generic static file server when editing. Browsers cannot write repository files directly; `atlas_server.py` provides the local save endpoint.
