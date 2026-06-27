# Keeping your secrets safe (local-only setup)

This guide explains where to keep the **sensitive values** this app uses, so they
stay on your PC and never get uploaded to GitHub or Google Drive.

It is written for a Windows setup where the project is backed up with **GitHub for
the code** and **a password manager for the secrets** — not Google Drive.

---

## What counts as a secret in this app

Your code reads only a handful of environment variables. Most are **not** secret:

| Variable        | Secret? | What it is                                                        |
| --------------- | ------- | ---------------------------------------------------------------- |
| `DATABASE_URL`  | No      | Path to the local SQLite database file (`file:./dev.db`).        |
| `NODE_ENV`      | No      | Set automatically by the tooling. You never store this yourself. |
| `GEMINI_MODEL`  | No      | Optional model name, e.g. `gemini-2.5-flash`.                    |
| `GEMINI_API_KEY`| **YES** | Your Google Gemini AI key. **This is the only true secret.**     |

> If you later add real Google Drive integration (the app uploading/reading data
> from Drive), you will also get Google credentials — an **OAuth Client ID +
> Client Secret**, or a **service-account JSON key**. Those are secrets too and
> belong in the same local-only `.env` file described below. Add a row to this
> table when that happens.

---

## The one rule

> Your `.env` file must sit in the **project root** (that is where the app looks
> for it), but it must **never** be uploaded to GitHub or synced to Google Drive.

This repo already enforces the GitHub half: `.gitignore` contains `.env*` (with an
exception for `.env.example`), so git refuses to upload your real `.env`. You only
need to handle the Google Drive half — by keeping the project folder out of Drive.

---

## One-time setup on your PC

1. **Move the project out of Google Drive.**
   Put the code in a folder that Google Drive is **not** syncing, for example:

   ```
   C:\Users\edwar\dev\disability-support-suite
   ```

   Avoid `Documents`, `Desktop`, or any folder under a Google Drive / OneDrive
   sync location.

2. **Create your `.env`** in the project root (same folder as `package.json`).
   The quickest way is to copy the template:

   ```
   copy .env.example .env
   ```

   Then open `.env` and fill in your real key:

   ```
   DATABASE_URL="file:./dev.db"
   GEMINI_API_KEY="paste-your-real-key-here"
   ```

3. **Confirm git is ignoring it.** In the project folder run:

   ```
   git status
   ```

   `.env` should **not** appear in the output. If it does, stop and check that
   `.gitignore` still contains the `.env*` line.

4. **Back up the secret itself — separately from the code.**
   Store the value of `GEMINI_API_KEY` in a **password manager** (Bitwarden,
   1Password, etc.). That way, if your PC is lost, you still have the key — but it
   was never stored as a file in the cloud.

---

## Day-to-day rules

- **Code backups go to GitHub**, never Google Drive. GitHub stores everything
  except your `.env`.
- **Never** paste a secret into a file that is tracked by git (anything except
  `.env`). When in doubt, run `git status` before committing.
- **Never** share the project folder via a Google Drive "anyone with the link"
  share — that is the most common way secrets leak.
- If a secret is ever exposed, **rotate it** (generate a new key in the provider's
  console and delete the old one). A leaked key cannot be "un-leaked" — only
  replaced.

---

## Quick reference: where everything lives

| Thing                | Where it belongs                         | Why                                      |
| -------------------- | ---------------------------------------- | ---------------------------------------- |
| Your **code**        | GitHub                                   | Free, built for code, auto-ignores `.env`|
| Your **`.env`**      | Local PC only (project root)             | Lets the app run; never syncs            |
| Your **secret value**| A password manager                       | Safe backup that is not a synced file    |
| Your **app's data**  | Wherever the app already stores it       | Data is not a secret                     |
