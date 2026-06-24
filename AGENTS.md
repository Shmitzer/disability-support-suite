<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Build-status command centre (read this)

`docs/COMMAND_CENTRE.md` is the single source of truth for build status, maintained by Claude Code. It is **canonical on `main`** so it resolves from any branch.

- When the user says **"ccu"**, **"update cw"**, or "update the command centre", they mean: read and update `docs/COMMAND_CENTRE.md`.
- Keep it current and commit doc-only updates to **`main`** (a docs-only commit to `main` is fine even while feature code lives on a branch) so it never goes stale or gets stranded on a feature branch.
- **`docs/COMMAND_CENTRE.md` updates are ALWAYS committed and pushed to `main`, even during a feature-branch session** — this one file overrides any session-branch restriction. If you make the edit on a feature branch, cherry-pick just that file onto `main` and push it there so the ccu stays canonical on `main`.
- The strategic/vision command centre and the daily "RIGHT NOW" one-liner live on Google Drive, not here — leave those to the user.
