# Caira Marketing — End-to-End Readiness Checklist

Every manual step left, in the order to do them. Everything in code is done and
on branch `claude/festive-tesla-lebjxq`; this list is the human runway. Tackle
the phases top to bottom — each unblocks the next. Est. total hands-on time:
~3–4 hours spread over a few sittings.

Legend: 🟢 do now (no dependencies) · 🟡 needs the legal/site gate first

---

## Phase 0 — Foundations (do first, ~60–90 min)

- [ ] **0.1 🟡 Privacy policy live.** You're collecting emails + (later) participant
  notes, so this gates everything public. Get the `/privacy` draft (already in the
  app, pending legal review per the command centre) reviewed and published at
  `caira.net.au/privacy`. The waitlist form links to it.
- [ ] **0.2 🟡 Confirm go-to-market legal gate.** Your call — sole-trader ABN, terms,
  any registration questions resolved enough to be marketing publicly. Until this
  clears, keep posts to pure value (weeks 1–whenever) and hold the SOFT_APP posts.
- [ ] **0.3 🟢 Decide the early-interest destination.** Waitlist form URL (Phase 2)
  vs "DM me" for now. Recommendation: stand up the form so leads are captured.

## Phase 1 — Email engine: MailerLite (~45 min) 🟢

- [ ] **1.1** Create a MailerLite account (free tier is fine to start).
- [ ] **1.2 Domain authentication** — verify `caira.net.au`, add the SPF/DKIM DNS
  records MailerLite gives you. *(Biggest deliverability win — don't skip.)*
- [ ] **1.3** Sender name **Edward (Caira)**, reply-to your real inbox.
- [ ] **1.4** Create group `Caira Waitlist` + optional group `Caira Early Access`.
- [ ] **1.5** Add custom field `magnet` (text).
- [ ] **1.6** Upload both PDFs (`lead-magnets/*.pdf`) to the File manager; copy the
  two public links → these are `{{checklist_link}}` and `{{cheatsheet_link}}`.

*(Full detail: `waitlist/SETUP.md`.)*

## Phase 2 — The form (~20 min) 🟢

- [ ] **2.1** Build an **embedded form** "Caira Waitlist": fields name (optional),
  email (required), the "help shape Caira / be first in line" checkbox → `Caira
  Early Access` group; preset hidden `magnet` value per page.
- [ ] **2.2** Success message + link the privacy policy on the form (Phase 0.1).
- [ ] **2.3** Either use MailerLite's embed snippet, or style with
  `waitlist/embed.html` pointed at the form's action URL.
- [ ] **2.4** Put `app.waitlistUrl` in `config.json` = the form/landing URL.

## Phase 3 — The 5-email nurture automation (~45 min) 🟢

- [ ] **3.1** New automation, trigger = joins `Caira Waitlist`.
- [ ] **3.2 Email 1 (branched)** on `magnet` → variants A/B/C from
  `email/nurture-sequence.md`. Each links both PDFs. (Or one generic Email 1.)
- [ ] **3.3** Emails 2–5 with waits +2 / +2 / +3 / +3 days (subjects/bodies in
  `nurture-sequence.md`). Map `{{first_name}}` → `{$name}` w/ fallback "there".
- [ ] **3.4** Leave Email 4's testimonial quote **blank** until you have a real one.
- [ ] **3.5 Test:** submit with a test email → Email 1 + PDFs arrive < 1 min;
  confirm the rest are queued; check unsubscribe + from-address; view on a phone.

## Phase 4 — Facebook presence (~30 min) 🟢

- [ ] **4.1** Create the Caira **Facebook Page** (clearly branded as you).
- [ ] **4.2** Page bio: support worker who built a tool; link to waitlist; add a Page button → waitlist.
- [ ] **4.3** Join the target communities (`config.json` → `channels.communities`).
  Start being helpful — comment value, no pitching yet (earn the ~50-helpful-
  comments right before any Caira mention).

## Phase 5 — Auto-scheduling the posts (optional, ~30 min) 🟢

Only if you want the engine to schedule for you; otherwise copy-paste from
`drafts/queue.json` into Meta Business Suite.

- [ ] **5.1** Meta dev app with `pages_manage_posts` + `pages_read_engagement`.
- [ ] **5.2** Get a **long-lived Page access token** → `export META_PAGE_TOKEN=…`.
- [ ] **5.3** Put the **Page ID** in `config.json` → `channels.facebook_page.pageId`.
- [ ] **5.4** Review `drafts/queue.json`; set `"status":"approved"` on the posts you want.
- [ ] **5.5** `node src/cli.js check` (compliance) then `node src/cli.js schedule`.

## Phase 6 — Landing page (when site work happens) 🟡

- [ ] **6.1** Build `caira.net.au` from `landing/landing-copy.md` (demo video,
  single CTA, social proof, WCAG 2.1). Pre-launch CTA = waitlist.
- [ ] **6.2** Embed the waitlist form + the lead-magnet capture block.
- [ ] **6.3** Publish the 3 GEO/SEO pages (`content/seo/`) as real pages; ensure
  Bing indexes them (ChatGPT Search uses Bing); add author/date + FAQ schema.

## Phase 7 — Go (the first 2 weeks) 🟢

- [ ] **7.1** Warm-network outreach (the #1 channel) — personally message the 5–10
  colleagues/providers from your three tiers; offer founding-user access.
- [ ] **7.2** Start posting 3–5×/week (weeks 1–2 from `drafts/queue.json`): value
  + intro only, no pitch. Reply to every comment personally.
- [ ] **7.3** Personal LinkedIn build-in-public, 3–5×/week, links in first comment.
- [ ] **7.4** Watch activation, not likes (per `docs/PLAYBOOK.md` metrics).

---

## What's already done (no action needed)
Strategy (`docs/PLAYBOOK.md`) · 48 posts / 12 weeks (`drafts/queue.json`, compliance-clean)
· 2 lead-magnet PDFs · 5-email nurture (branched Email 1) · broadcast idea bank ·
3 GEO/SEO pages · landing copy · waitlist form + setup · compliance gate in the CLI.

## The hard gates to respect
- Don't promote anything public before **0.1 privacy policy** + **0.2 legal gate**.
- No fabricated testimonials — real quotes only.
- No "NDIS approved/endorsed", no guaranteed outcomes (the `check` command enforces the obvious cases).
- Engagement stays human; the engine only schedules your own approved Page posts.
