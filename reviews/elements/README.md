# Monitor element reviews

This folder keeps browser-reviewable UI element decisions separate from production code while preserving their approved specifications.

## Run the review server

From the repository root:

```sh
python3 ~/.codex/skills/element-design-review/scripts/serve_review.py reviews/elements --port 4177
```

Open:

- Review index: <http://127.0.0.1:4177/>
- Alert chip review: <http://127.0.0.1:4177/chat-alert-chip/>
- Chat alert-message review: <http://127.0.0.1:4177/chat-alert-message/>
- Complete chat-list conversation-row review: <http://127.0.0.1:4177/chat-list-conversation-row/>
- Chat text-bubble family review: <http://127.0.0.1:4177/chat-text-bubble-family/>

Stop the foreground server with `Control-C`.

If port 4177 is already occupied:

```sh
lsof -nP -iTCP:4177 -sTCP:LISTEN
kill <PID>
```

Then run the server command again. The review server disables browser caching so a normal reload shows file changes.

## Folder convention

Each reviewed element has its own folder. Keep the interactive review, its approved `final-specification.md`, and any element-specific notes together. Shared matrix runtime files live in `shared/`; element-specific markup and configuration stay with the element. Review artifacts are evidence and decision records; production behavior remains governed by the current product and design documentation.

## Current reviews

| Element | Review | Status |
|---|---|---|
| Chat-list alert chip | `chat-alert-chip/` | Approved and implemented on 2026-07-29 |
| Alert object inside a chat message | `chat-alert-message/` | Approved and implemented on 2026-07-29 |
| Complete chat-list conversation row | `chat-list-conversation-row/` | Approved and implemented on 2026-07-29 |
| Chat text-bubble family | `chat-text-bubble-family/` | Approved and implemented on 2026-07-29 |
