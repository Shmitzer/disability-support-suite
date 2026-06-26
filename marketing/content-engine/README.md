# Caira Content Engine

A transparent, Terms-of-Service-compliant tool to market **Caira** to NDIS sole
traders and small/medium providers — by showing up as **you**, openly, with
genuinely useful content, and letting an honest founder story do the work.

**Strategy spine:** [`docs/PLAYBOOK.md`](docs/PLAYBOOK.md) — the founder-led,
warm-network-first, organic-first launch plan. The config, content arc and
compliance checks all derive from it. Read it first.

It does **not** create fake personas, auto-engage on other people's posts, or
scrape. Those tactics break Meta's rules and, in the trust-driven disability
space, would torch your reputation if discovered. This funnel works *because*
it's honest.

## How it works — the 2-week arc

| Week | What | App pitch |
|------|------|-----------|
| 1 | Introduce yourself + pure value (tips, templates, a question) | None |
| 2 | More value + first founder-story posts + one soft, disclosed beta invite | One gentle "here's what I built" |
| Ongoing | 70% useful / 20% community / 10% honest app updates & case studies | Soft, always disclosed |

Post types: `VALUE` (no app at all), `INTRO` (founder/human), `COMMUNITY`
(a real question you answer personally), `SOFT_APP` (disclosed app mention).

## Commands

```bash
npm install
node src/cli.js plan      # show the calendar
node src/cli.js draft     # generate drafts -> drafts/queue.json (needs_review)
node src/cli.js review    # read drafts + approval status + compliance flags
node src/cli.js check      # NDIS-advertising compliance check over the queue
node src/cli.js schedule  # push APPROVED drafts to Meta (banned-phrase posts blocked)
```

**Nothing posts without you.** `draft` marks every post `needs_review`. You
read them, edit freely, and set `"status": "approved"` in
`drafts/queue.json` on the ones you want live. Only then does `schedule` send
them — and it sends them as Meta-native *scheduled* posts (10 min–30 days out),
so you keep a final window to cancel from Meta Business Suite.

## Setup

1. Edit `config.json` — your app name, one-liner, link, voice, posting times.
2. Edit `content/arc.json` if you want different topics.
3. **Auto-drafting (optional):** `export ANTHROPIC_API_KEY=...` to have Claude
   draft in your voice. Without it you get structured stubs to fill in yourself.
   Add `export VOICE_PASS=1` for a second rewrite that roughs up the rhythm so
   drafts sound less like AI — quality control for posts you publish as
   yourself, not detector evasion.
4. **Publishing (when ready):**
   - Create a Facebook **Page** for your brand.
   - Create an app at developers.facebook.com with `pages_manage_posts` +
     `pages_read_engagement`.
   - Get a long-lived **Page access token** → `export META_PAGE_TOKEN=...`
   - Put your Page ID in `config.json` → `channel.pageId`.

## The honesty guardrails (deliberate, please keep them)

- One Page, your own, clearly branded as you.
- Every app mention is disclosed ("I built this").
- No fake scarcity, no manipulation, no impersonation.
- You approve every post before it can be scheduled.
- Engagement on *other* people's content stays manual and human — reply as
  yourself, because you mean it.

This is the version that's allowed, sustainable, and actually persuasive to a
sceptical, participant-protective audience.
