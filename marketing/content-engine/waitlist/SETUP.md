# Caira Waitlist — Setup Guide (hosted form + ESP)

Goal: a frictionless waitlist that **captures an email, instantly emails the lead
magnet, and drops the person into the 5-email nurture** — with zero custom code,
unsubscribe handling, and good deliverability out of the box.

**Recommended tool: MailerLite.** Free tier covers up to 1,000 subscribers /
~12,000 emails per month *and includes automations* (most competitors paywall
automation). Tally or a Google Form can collect emails, but they don't send the
nurture — so use an ESP that does both. (Alternatives: Brevo, MailerLite,
Kit/ConvertKit. The steps below map cleanly to any of them.)

---

## One-time setup (≈30–45 min)

### 1. Account + sender
1. Create a MailerLite account; verify your sending domain (`caira.net.au`) —
   this is the single biggest deliverability win. Add SPF/DKIM as MailerLite
   instructs in your DNS.
2. Set the sender name to **Edward (Caira)** and reply-to your real inbox.

### 2. Group + fields
1. Create a **Group**: `Caira Waitlist`.
2. Standard fields `email` and `name` exist by default. Add one custom field:
   - `magnet` (text) — which lead magnet they asked for (`checklist` /
     `cheatsheet` / `both`). Lets you tailor Email 1.
3. Optional second group `Caira Early Access` for people who tick "I'd like to
   help shape Caira / be first in line" — these are your warm beta leads.

### 3. Host the lead magnets
1. The print-ready PDFs are already built and on-brand (Sage & Clay, one page each):
   - `lead-magnets/audit-ready-note-checklist.pdf`
   - `lead-magnets/person-first-language-cheatsheet.pdf`
   (Source HTML lives in `lead-magnets/build/` — edit there and re-run the build
   command in that folder's note to regenerate.)
2. Upload both PDFs to MailerLite's **File manager** (or host at
   `caira.net.au/downloads/…`). Copy the public links — these become
   `{{checklist_link}}` and `{{cheatsheet_link}}` in the nurture.

### 4. The form
1. Build an **Embedded form** (not a pop-up) titled `Caira Waitlist`.
   - Fields: `name` (optional), `email` (required), a checkbox "I'd like to help
     shape Caira and be first in line" (maps to the Early Access group), and a
     hidden/preset `magnet` value per page (see below).
   - Success message: "Check your inbox — your guide is on its way. 🙌"
   - Subscribes to group `Caira Waitlist`.
2. Copy the embed snippet (see `embed.html` in this folder for a clean,
   accessible fallback you can style with the Sage & Clay tokens).

### 5. The automation (delivers magnet + runs the nurture)
Create an **Automation**: *Trigger — when a subscriber joins group `Caira
Waitlist`*. Then add steps straight from `email/nurture-sequence.md`:

| Step | Wait | Email |
|------|------|-------|
| 1 | immediately | **Email 1** — deliver the magnet(s) + hello (**branched** on `magnet`: checklist / cheatsheet / both — see nurture-sequence.md variants A/B/C) |
| 2 | +2 days | **Email 2** — the in-the-moment notes habit |
| 3 | +2 days | **Email 3** — the 9pm founder story |
| 4 | +3 days | **Email 4** — what Caira looks like (testimonial slot) |
| 5 | +3 days | **Email 5** — soft CTA / be first in line |

- Paste each email's subject + body. Map `{{first_name}}` → MailerLite's
  `{$name}` (with a fallback like "there"), `{{checklist_link}}` /
  `{{cheatsheet_link}}` → the hosted PDF links, `{{waitlist_or_trial_link}}` →
  your Early Access form/page.
- Email 1 is **branched** on the `magnet` field — add a condition step after the
  trigger and wire variants A/B/C (or use dynamic content). Each variant links
  both PDFs anyway, so even the simplest single-email setup works.

### 6. Connect it to the funnel
- Put the form on the **landing page** (`landing/landing-copy.md` →
  lead-magnet capture block) and on a simple `caira.net.au/free-guides` page.
- Use the form's hosted URL as the link in:
  - `config.json` → `app.earlyInterest`
  - Facebook posts that offer the cheat-sheet (W4 Tue, W12 etc.) — "comment or
    grab it here: <link>"
  - Your link-in-bio / Page button.

---

## Test before you promote it
1. Submit the form with a test email → confirm Email 1 + magnet arrive within a minute.
2. Confirm the +2/+4/+7/+10 day emails are queued in the automation view.
3. Check the unsubscribe link works and the from-address is your verified domain.
4. View on a phone — most of your audience is mobile-first.

## Compliance & privacy (keep these)
- **Consent:** the form line should make clear they're joining Caira's email list;
  Australian Spam Act requires consent + a working unsubscribe (the ESP handles
  unsubscribe). Don't pre-tick the early-access box.
- **Privacy:** link your privacy policy on the form. Waitlist emails are personal
  information — store them only in the ESP, don't export them around.
- **No endorsement / no guarantees** in any email (already true in the nurture).
- Real testimonials only — leave Email 4's quote slot blank until you have one.

## When Caira launches
- Swap the nurture's CTA from waitlist → free trial (`nurture-sequence.md` has both variants).
- Email the whole `Caira Waitlist` group a real launch broadcast (see `email/broadcast-ideas.md`).
