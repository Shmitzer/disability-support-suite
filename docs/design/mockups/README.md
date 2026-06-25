# Mockups (scratchpad rescue)

Self-contained HTML mockups produced in-session and rescued from the ephemeral
scratchpad so they survive container recycling. These are **rendered mockups**, not
the canonical Design-Component (`.dc.html`) prototypes that live one level up in
`docs/design/`.

| File | Screen | Maps to route |
|---|---|---|
| `caira-home.html` | Marketing / landing page | `src/app/(public)/page.tsx` |
| `caira-shift.html` | In-shift tracker | `src/app/(protected)/shift/[id]/page.tsx` |

Notes:
- Standalone — open directly in a browser, no build step, all assets inlined.
- Only these two screens were mocked up this way. Other routes (dashboard, billing,
  notes, admin settings, care-profile, login, privacy, auth) have no mockup yet.
- The `Caira Home.dc.html` referenced in `docs/design/HANDOFF.md` is still missing from
  the repo; `caira-home.html` here is the closest rescued artifact, not that file.
