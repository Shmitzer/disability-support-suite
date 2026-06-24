@AGENTS.md

# Design ↔ implementation (project convention)

Two roles, no overlap:

- **Design** is authored as `.dc.html` prototypes + screenshots + `docs/design/HANDOFF.md`, committed under `docs/design/`. That folder is the single source of truth for layout and visual design (see `docs/design/README.md`).
- **Implementation** is the React app in `src/`. Build/update the React components to MATCH `docs/design/`, wired to the live backend.

Rules:

- The design changes in `docs/design/` first; then `src/` is rebuilt to match. Don't let them drift.
- No standalone, render-outside-the-app components (e.g. a loose `.jsx`). New screens become real routes in `src/` (App Router, TSX, the Sage & Clay tokens in `src/app/globals.css`).
- Keep design tokens centralised in `globals.css`; if a hex changes in the design, update it there.
