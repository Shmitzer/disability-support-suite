#!/bin/bash
# SessionStart hook — bootstraps the app for Claude Code on the web so the dev
# server, linter and Prisma all work in a fresh session.
#
# On Postgres/Supabase this stops at deps + Prisma client generation: migrations
# and seeding are run DELIBERATELY against the configured database (see
# docs/PRODUCTION_CUTOVER.md), never automatically — auto-migrating or seeding a
# remote DB on every session start is unsafe.
#
# Secrets are NEVER baked in here. DATABASE_URL / DIRECT_URL / GEMINI_API_KEY are
# provided via the environment's configured variables or a local .env (see
# .env.example). Without GEMINI_API_KEY the app still runs; only AI is disabled.
set -euo pipefail

# Only run in the remote (Claude Code on the web) environment. Locally you run the
# same steps yourself, or remove this guard if you want it everywhere.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "session-start: not a remote session — skipping bootstrap."
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

echo "session-start: installing dependencies…"
# --no-package-lock: install without rewriting package-lock.json, so a fresh
# session doesn't leave the lockfile dirty from npm's normalisation churn.
npm install --no-package-lock

echo "session-start: generating Prisma client…"
npx prisma generate

echo "session-start: bootstrap complete (deps + Prisma client)."
echo "session-start: with DATABASE_URL set, apply schema via 'npx prisma migrate deploy'."
