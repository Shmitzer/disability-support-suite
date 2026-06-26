# MailerLite Paste-Pack — turnkey copy for the nurture automation

Everything below is **ready to paste straight into MailerLite**. Merge tags are
already in MailerLite syntax (`{$name|default:"there"}`). The only things you
substitute are the two PDF links and your early-access link — do a find/replace
once at the top and you're done.

## Find/replace these 3 placeholders first (once, across this whole file)
- `CHECKLIST_LINK` → public URL of `audit-ready-note-checklist.pdf` (File manager)
- `CHEATSHEET_LINK` → public URL of `person-first-language-cheatsheet.pdf`
- `EARLY_LINK` → your waitlist/early-access form URL (or your Page DM link for now)

## Automation settings
- **Trigger:** subscriber joins group `Caira Waitlist`
- **Steps & waits:** Email 1 (immediate) → wait 2 days → Email 2 → wait 2 days →
  Email 3 → wait 3 days → Email 4 → wait 3 days → Email 5
- **Sender:** Edward (Caira) · reply-to your real inbox

---

## EMAIL 1 — instant (branched on the `magnet` field)

Add a **condition** step right after the trigger: `magnet is checklist` → Variant A;
`magnet is cheatsheet` → Variant B; else → Variant C. (Or just use Variant C for
everyone — it links both PDFs and is perfectly fine.)

### Variant A — `magnet = checklist`
**Subject:** Here's your Audit-Ready Note Checklist 👇
**Preview:** Plus a quick hello from the support worker who made it.

```
Hi {$name|default:"there"},

Here's what you came for — The Audit-Ready Shift Note Checklist:
👉 CHECKLIST_LINK

While I'm here, I also made a Person-First Language Cheat-Sheet that pairs nicely
with it — yours too if it's useful:
👉 CHEATSHEET_LINK

Quick hello while you're here. I'm Edward — I've spent years doing support work on
the Central Coast, and I made these because they're the things I wish someone had
handed me when I started.

Have a read, use what's useful, ignore what isn't. Over the next week or so I'll
send a couple more short, practical things — the stuff that actually saves time on
the job. No fluff, and you can unsubscribe any time.

Talk soon,
Edward

P.S. Hit reply and tell me the one admin task you'd most love to never do again. I read every reply.
```

### Variant B — `magnet = cheatsheet`
**Subject:** Here's your Person-First Language Cheat-Sheet 👇
**Preview:** Plus a quick hello from the support worker who made it.

```
Hi {$name|default:"there"},

Here's what you came for — The Person-First Language Cheat-Sheet:
👉 CHEATSHEET_LINK

I also made an Audit-Ready Shift Note Checklist that goes hand in hand with it —
grab that too if you'd like:
👉 CHECKLIST_LINK

Quick hello while you're here. I'm Edward — I've spent years doing support work on
the Central Coast, and I made these because they're the things I wish someone had
handed me when I started.

Have a read, use what's useful, ignore what isn't. Over the next week or so I'll
send a couple more short, practical things — the stuff that actually saves time on
the job. No fluff, and you can unsubscribe any time.

Talk soon,
Edward

P.S. Hit reply and tell me the one admin task you'd most love to never do again. I read every reply.
```

### Variant C — `magnet = both` (default; safe for everyone)
**Subject:** Here are your free guides 👇
**Preview:** Plus a quick hello from the support worker who made them.

```
Hi {$name|default:"there"},

Here are both guides, as promised:
• The Audit-Ready Shift Note Checklist → CHECKLIST_LINK
• The Person-First Language Cheat-Sheet → CHEATSHEET_LINK

Quick hello while you're here. I'm Edward — I've spent years doing support work on
the Central Coast, and I made these because they're the things I wish someone had
handed me when I started.

Have a read, use what's useful, ignore what isn't. Over the next week or so I'll
send a couple more short, practical things — the stuff that actually saves time on
the job. No fluff, and you can unsubscribe any time.

Talk soon,
Edward

P.S. Hit reply and tell me the one admin task you'd most love to never do again. I read every reply.
```

---

## EMAIL 2 — +2 days
**Subject:** The 5-minute habit that gave me my evenings back
**Preview:** It's not about working harder. It's about when you write.

```
Hi {$name|default:"there"},

The single biggest change to my week wasn't a tool — it was timing.

I stopped writing notes from memory at home, and started capturing them in the
moment: a quick voice memo in the car, or three bullets before I drove off — what
the goal was, what happened, how they responded. Tidy it later if you need to.

Five minutes while it's fresh beats an hour on a Sunday, and the notes are better
because the detail's still sharp.

That's it. Try it on your next shift and see.

Edward

P.S. The Audit-Ready Note Checklist has the full structure if you want it: CHECKLIST_LINK
```

---

## EMAIL 3 — +2 days
**Subject:** The 9pm admin night that started all this
**Preview:** Care all day, paperwork all night. Sound familiar?

```
Hi {$name|default:"there"},

A while back I finished a run of shifts, sat down at 9pm, and spent another two
hours on notes and invoices. Care all day, paperwork all night.

I remember thinking: the record-keeping shouldn't cost this much of the actual
caring. The work that matters is the time with people — not reconstructing it from
memory hours later.

That night is why I started building something. I'm doing it in the open, with
support workers, because the people who do the job should shape the tool. More on
that soon.

Edward

P.S. Still curious — what's the part of your week that has nothing to do with support but eats the most time? Reply and tell me.
```

---

## EMAIL 4 — +3 days
**Subject:** "90 seconds in the car instead of 20 minutes at home"
**Preview:** What early users are telling me.

> Leave the quote as-is until you have a REAL one — then swap it in.

```
Hi {$name|default:"there"},

I've been building Caira — a tool that takes the documentation off a support
worker's plate. Capture a note in the moment, one-handed, with the important bones
already there, so the time goes back to care.

It helps you write your own clear, factual notes — it doesn't replace your
judgement or your provider's policies. The early folks trying it have been honest
(sometimes brutally so), and it's made it sharper.

[Founding-user quote goes here once you have one — leave out until then.]

Care is the work. Caira handles the record.

Edward
```

---

## EMAIL 5 — +3 days
**Subject:** Want to be first in line?
**Preview:** No pressure — just an open door.

```
Hi {$name|default:"there"},

Caira isn't out yet — I'm getting it ready properly. But I'm taking on a few more
support workers and small providers who want to shape it and be first in line.

If that's you: EARLY_LINK

No cost, no lock-in — I just want it built with the people who'll actually use it.
And either way, the practical emails will keep coming when I've got something
genuinely useful to share.

Thanks for reading this far. It means a lot.

Edward

P.S. Not for you right now? No worries at all — keep the free guides with my compliments: CHECKLIST_LINK · CHEATSHEET_LINK
```

---

## Before you switch it on
- Send a test through the whole automation (use a test email in the group).
- Confirm Email 1 + PDFs land in < 1 min; check on a phone.
- Verify the from-address is your authenticated `caira.net.au` and unsubscribe works.
- No "NDIS approved/endorsed", no guaranteed outcomes — already true here; keep it that way if you edit.
```
