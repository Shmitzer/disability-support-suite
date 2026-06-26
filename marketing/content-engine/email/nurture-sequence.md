# Caira Email Nurture Sequence

A 5-email sequence for people who download a lead magnet (the audit-ready note
checklist or person-first cheat-sheet). Goal: deliver value, build trust through
the founder story, then a soft trial/waitlist CTA. Per PLAYBOOK.md §Conversion.

**Cadence:** Email 1 instant · 2 at +2 days · 3 at +4 days · 4 at +7 days · 5 at +10 days.
**Voice:** Edward — warm, plain, an actual support worker. AU spelling.
**Compliance:** no "NDIS approved/endorsed", no guaranteed outcomes. Caira *helps
you write your own* compliant notes. Every email has a one-click unsubscribe.

> Placeholders: `{{first_name}}`, `{{checklist_link}}`, `{{cheatsheet_link}}`,
> `{{waitlist_or_trial_link}}`. Use the waitlist CTA pre-launch; swap to the
> trial CTA at launch.

---

## Email 1 — Deliver the magnet (instant) · BRANCHED on the `magnet` field

This email branches on the `magnet` field set by the form (`checklist`,
`cheatsheet`, or `both`). In MailerLite, do this one of two ways:
- **Simplest:** the automation's first step is a **condition on `magnet`** → three
  parallel "send email" steps, one per variant below; or
- **One email, dynamic blocks:** use the ESP's conditional content (`{$magnet}`)
  to swap the bolded line + link. Either way the hello/sign-off is identical.

Always link **both** PDFs as a bonus regardless — it raises perceived value and
saves a second email. Hosted links:
`{{checklist_link}}` = audit-ready-note-checklist.pdf ·
`{{cheatsheet_link}}` = person-first-language-cheatsheet.pdf

---

### Variant A — they asked for the checklist (`magnet = checklist`)

**Subject:** Here's your Audit-Ready Note Checklist 👇
**Preview:** Plus a quick hello from the support worker who made it.

Hi {{first_name}},

Here's what you came for — **The Audit-Ready Shift Note Checklist**:
→ {{checklist_link}}

While I'm here, I also made a **Person-First Language Cheat-Sheet** that pairs
nicely with it — yours too if it's useful: → {{cheatsheet_link}}

[SHARED-HELLO]

---

### Variant B — they asked for the cheat-sheet (`magnet = cheatsheet`)

**Subject:** Here's your Person-First Language Cheat-Sheet 👇
**Preview:** Plus a quick hello from the support worker who made it.

Hi {{first_name}},

Here's what you came for — **The Person-First Language Cheat-Sheet**:
→ {{cheatsheet_link}}

I also made an **Audit-Ready Shift Note Checklist** that goes hand in hand with
it — grab that too if you'd like: → {{checklist_link}}

[SHARED-HELLO]

---

### Variant C — they asked for both (`magnet = both`, the default)

**Subject:** Here are your free guides 👇
**Preview:** Plus a quick hello from the support worker who made them.

Hi {{first_name}},

Here are both guides, as promised:
• **The Audit-Ready Shift Note Checklist** → {{checklist_link}}
• **The Person-First Language Cheat-Sheet** → {{cheatsheet_link}}

[SHARED-HELLO]

---

### [SHARED-HELLO] — paste into each variant where shown

Quick hello while you're here. I'm Edward — I've spent years doing support work
on the Central Coast, and I made these because they're the things I wish someone
had handed me when I started.

Have a read, use what's useful, ignore what isn't. Over the next week or so I'll
send a couple more short, practical things — the stuff that actually saves time
on the job. No fluff, and you can unsubscribe any time.

Talk soon,
Edward

*P.S. Hit reply and tell me the one admin task you'd most love to never do again. I read every reply.*

---

## Email 2 — Pure value (+2 days)

**Subject:** The 5-minute habit that gave me my evenings back
**Preview:** It's not about working harder. It's about *when* you write.

Hi {{first_name}},

The single biggest change to my week wasn't a tool — it was timing.

I stopped writing notes from memory at home, and started capturing them **in the
moment**: a quick voice memo in the car, or three bullets before I drove off —
what the goal was, what happened, how they responded. Tidy it later if you need to.

Five minutes while it's fresh beats an hour on a Sunday, and the notes are better
because the detail's still sharp.

That's it. Try it on your next shift and see.

Edward

*P.S. The Audit-Ready Note Checklist has the full structure if you want it: {{checklist_link}}*

---

## Email 3 — Founder story (+4 days)

**Subject:** The 9pm admin night that started all this
**Preview:** Care all day, paperwork all night. Sound familiar?

Hi {{first_name}},

A while back I finished a run of shifts, sat down at 9pm, and spent another two
hours on notes and invoices. Care all day, paperwork all night.

I remember thinking: *the record-keeping shouldn't cost this much of the actual
caring.* The work that matters is the time with people — not reconstructing it
from memory hours later.

That night is why I started building something. I'm doing it in the open, with
support workers, because the people who do the job should shape the tool. More on
that soon.

Edward

*P.S. Still curious — what's the part of your week that has nothing to do with support but eats the most time? Reply and tell me.*

---

## Email 4 — Proof / what it looks like (+7 days)

**Subject:** "90 seconds in the car instead of 20 minutes at home"
**Preview:** What early users are telling me.

Hi {{first_name}},

I've been building **Caira** — a tool that takes the documentation off a support
worker's plate. Capture a note in the moment, one-handed, with the important
bones already there, so the time goes back to care.

It helps you write *your own* clear, factual notes — it doesn't replace your
judgement or your provider's policies. The early folks trying it have been honest
(sometimes brutally so), and it's made it sharper.

> *[Founding-user quote once you have one — e.g. "I log my notes in 90 seconds
> in the car instead of 20 minutes at home." — Sarah, Gosford]*

**Care is the work. Caira handles the record.**

Edward

---

## Email 5 — Soft CTA (+10 days)

**Subject:** Want to be first in line?
**Preview:** No pressure — just an open door.

Hi {{first_name}},

Caira isn't out yet — I'm getting it ready properly. But I'm taking on a few more
support workers and small providers who want to **shape it and be first in line**.

If that's you: {{waitlist_or_trial_link}}

No cost, no lock-in — I just want it built with the people who'll actually use it.
And either way, the practical emails will keep coming when I've got something
genuinely useful to share.

Thanks for reading this far. It means a lot.

Edward

*P.S. Not for you right now? No worries at all — keep the free guides with my compliments: {{checklist_link}} · {{cheatsheet_link}}*
