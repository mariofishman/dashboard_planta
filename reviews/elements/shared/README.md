# Shared review runtime

These files render the interactive decision matrix used by element reviews:

- `matrix-core.mjs`: selection, composition, and structural-command logic.
- `review-app.mjs`: shared browser renderer; element-specific state labels come from `review-config.js`.
- `review.css`: shared compact matrix and sticky-preview layout.

Element-specific evidence, options, preview markup, and approval state remain in each review folder's `review-config.js` and `final-specification.md`.
