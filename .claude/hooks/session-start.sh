#!/bin/bash
# SessionStart hook — bootstraps the app for Claude Code on the web so the dev
# server, linter and Prisma all work in a fresh session.
#
# What it does (idempotent, non-interactive):
#   1. Ensures DATABASE_URL is set (local SQLite path — NOT a secret).
#   2. Installs npm dependencies.
#   3. Regenerates the Prisma client.
#   4. Applies migrations to the local SQLite database.
#   5. Seeds sample (dummy) data + learned-option picklists.
#
# Secrets are NEVER baked in here. GEMINI_API_KEY (for AI note generation) must be
# provided via the environment's configured variables — see .env.example. Without
# it the app still runs; only AI generation is disabled.
set -euo pipefail

# Only run in the remote (Claude Code on the web) environment. Locally you run the
# same steps yourself, or remove this guard if you want it everywhere.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "session-start: not a remote session — skipping bootstrap."
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# 1. DATABASE_URL — default to the local SQLite file (safe to commit/automate).
DB_URL="${DATABASE_URL:-file:./dev.db}"
export DATABASE_URL="$DB_URL"
# Persist it for the rest of the session's commands.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export DATABASE_URL=\"$DB_URL\"" >> "$CLAUDE_ENV_FILE"
fi
# Prisma CLI reads .env (via dotenv); create one only if absent so we never
# clobber a local .env that may hold real secrets.
if [ ! -f .env ]; then
  echo "DATABASE_URL=\"$DB_URL\"" > .env
fi

echo "session-start: installing dependencies…"
npm install

echo "session-start: generating Prisma client…"
npx prisma generate

echo "session-start: applying database migrations…"
npx prisma migrate deploy

echo "session-start: seeding sample data…"
npx tsx prisma/seed.ts
npx tsx scripts/seed-learned-options.ts

echo "session-start: bootstrap complete."
