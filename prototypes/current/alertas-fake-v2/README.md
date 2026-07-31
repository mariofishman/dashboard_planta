# alertas_fake V2 prototype

This folder contains the standalone HTML prototype for testing the A02, A03, and A05 alert laboratory.

## Recommended: open through a local server

Open Terminal and run:

```bash
cd /Users/mariofishman/.codex/worktrees/4407/dashboard_planta/prototypes/current/alertas-fake-v2
python3 -m http.server 5190 --bind 127.0.0.1
```

Keep that Terminal window open. Then open this address in the browser:

```text
http://127.0.0.1:5190/
```

Stop the server by returning to Terminal and pressing `Control+C`.

If port `5190` is already in use, choose another port, for example:

```bash
python3 -m http.server 5191 --bind 127.0.0.1
```

Then open `http://127.0.0.1:5191/`.

## Alternative: open the file directly

The same prototype can be opened without a server:

```text
file:///Users/mariofishman/.codex/worktrees/4407/dashboard_planta/prototypes/current/alertas-fake-v2/index.html
```

Both addresses display the same `index.html` design. The difference is how the browser loads it:

- `file:///...` reads the file directly from the disk.
- `http://127.0.0.1:5190/` reads it from a temporary web server running on this computer.

Use the local-server method for testing because it behaves more like a normal web application and avoids browser restrictions that can affect direct local files.

## Current limitations

- The prototype stores its experiment only in browser memory.
- Reloading or closing the page resets the experiment.
- It is not connected to `test_database`.
- It does not modify EmusaSoft or Monitor production data.
