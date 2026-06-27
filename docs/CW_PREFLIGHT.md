# cw preflight — repo health check (MANDATORY before any work)

**Every Cowork (cw) session runs this BEFORE touching the repo.** Future handovers to cw
must point here. The mounted repo (`C:\Users\edwar\Documents\IDSS`) is a virtiofs mount that
**allows file create/modify but blocks deletes**, which breaks git's "write `.lock` then rename"
pattern and recurrently (a) corrupts `.git/HEAD` and `.git/index`, and (b) injects stray NUL
bytes into working-tree files (phantom diffs). Verify and repair before trusting anything.

## 1. Integrity check

Run `git status`. If it errors, the repo is corrupt — repair before any other step:

| Symptom | Cause | Fix (overwrite-in-place — never `rm`, deletes fail on this mount) |
|---|---|---|
| `invalid HEAD` / `bad ref for .git/logs/HEAD` | `.git/HEAD` has trailing NUL bytes | `printf 'ref: refs/heads/main\n' > /tmp/H && cp /tmp/H .git/HEAD` |
| `bad index file sha1 signature` / `unknown index entry format` | `.git/index` corrupt | `GIT_INDEX_FILE=/tmp/i git read-tree HEAD && cp /tmp/i .git/index` |

Then: `git config maintenance.auto false` (stop background gc from re-corrupting the index).

Confirm with `git fsck --connectivity-only` and a clean `git status`.

## 2. Trust the remote, not the local refs

The local `origin/main` ref goes stale (no auto-fetch). Always
`git fetch origin main` and compare `git rev-parse HEAD origin/main` before claiming
ahead/behind. (On 2026-06-27 local `main` was `a0257f32` while true remote was `e50768c2`.)

## 3. Distinguish real edits from NUL noise

A file showing as "modified" is often **pure mount corruption**, not an edit. Before acting on
any diff: `tr -cd '\000' < FILE | wc -c` (must be 0). To compare real content ignoring the
corruption: `diff <(tr -d '\r\000' < FILE) <(git show HEAD:FILE)`. If identical, it's noise — skip it.

## 4. Never commit or push from the mount

`git add` / `git commit` rewrite `.git/index` via the blocked rename → re-corruption. Instead:

1. `git clone <url> /tmp/idss-clean` (sandbox `/tmp` — deletes work, git is reliable).
2. Copy in **NUL-stripped** working files: `tr -d '\r\000' < mount/FILE > /tmp/idss-clean/FILE`.
3. `git add` the intended files only, `git commit`, verify `git diff --cached --stat`.
4. `git fetch` again (guardrail — concurrent sessions move `main`), then push.

## 5. The push itself is Edward-run

The sandbox has **read** access to GitHub (clone/fetch) but **no push credentials**
(`git push` → "could not read Username"). So cw prepares and verifies the commit, writes the
clean files back into the mount, and hands Edward the laptop push commands — the actual
`git push origin main` runs on the laptop (where credentials live), from the clean
`IDSS-merge` clone, never from the corrupt mount.
