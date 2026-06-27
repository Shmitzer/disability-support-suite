# Caira Animation — Reconciliation (Rive renderer × "overhaul" behaviour layer)

> **Status: DRAFT for review.** Reconciles the newly-uploaded *"Caira animation
> overhaul"* blueprint (sprite-sheet + GSAP wander + mic-travel) against the
> already-decided, already-scaffolded **Rive** approach (`Caira Rive — Rig &
> Integration Spec`, `Caira Rive — Per-State Animation Direction`). Nothing here is
> built yet — this is the agreed plan before code.

## TL;DR recommendation

**Keep Rive as the renderer. Adopt the overhaul's *behaviour/movement* layer as a
wrapper around the existing `CairaCharacter` — do NOT switch to sprite-sheets.**

The two proposals mostly address **different axes**, and only genuinely conflict on
one thing (the renderer). The overhaul's real new value — organic wander +
travel-to-mic + queued transitions — is renderer-agnostic and worth taking.

## The two proposals, on three axes

| Layer | Rive spec (decided) | Overhaul blueprint (new) |
|---|---|---|
| **Renderer** — how a frame looks | Rive image-mesh of the *real* `caira-master.png` pixels | Pre-rendered **sprite-sheet** frames, `background-position` swap |
| **Expression** — what she feels | 5 emotional states (Greet/Cheer/Reassure/Idle/Goal) | — (none) |
| **Spatial behaviour** — where she goes | left to the app | **wander (random walk) + travel-to-mic + assist pose** ✅ |

Key realisation: the overhaul's `Idle / Walking / Assisting` are **functional/positional**
states; Rive's `Greet/Cheer/Reassure/Idle/Goal` are **expressive** states. They're
orthogonal — *where she moves* vs *how she looks while moving*. The clean synthesis is
**two state machines, one per axis.**

## Renderer decision: Rive over sprite-sheet

| Dimension | Rive | Sprite-sheet |
|---|---|---|
| On-brand photoreal clay look | ✅ rigs the actual artwork | ⚠️ needs a large pre-rendered frame set (its own art bottleneck) |
| Smoothness | ✅ vector interpolation, 60–120fps | ⚠️ mechanical unless many frames |
| Asset size | ✅ tiny `.riv` | ✗ heavier sheet |
| Implementation skill | ⚠️ needs Rive-editor authoring (current blocker) | ✅ plain JS |
| Repo readiness | ✅ `CairaCharacter` + static fallback already built | ✗ would discard that work |
| Accessibility (reduced-motion / Quiet) | ✅ specced + wired in the component | ✗ rebuild from scratch |

Switching to sprite-sheets would throw away the scaffolded, on-brand, accessible Rive
component **and** still require producing a photoreal frame set — a worse look for more
work. The only thing that would flip this: if authoring `caira.riv` in the Rive editor
is genuinely never going to happen. In that case sprite-sheet is the pragmatic
fallback — but note you'd *still* need pre-rendered frames, so confirm the art pipeline
before committing either way.

## Target architecture — two axes, one character

```
CairaWanderController            ← NEW (behaviour layer, from the overhaul)
  ├─ positional state machine:  idle-wander → walking → assisting
  ├─ GSAP-driven movement within a "safe zone" (smoothed random walk / Perlin)
  ├─ mic hook: record → walk to button → assisting; stop → return to wander
  └─ moves the CONTAINER of ↓
       CairaCharacter           ← EXISTING (renderer, unchanged API)
         state="idle|greet|cheer|reassure|goal"  quiet  size
         └─ CairaRive (when caira.riv present) | CairaStatic (fallback)
```

- The behaviour layer **only moves Caira's container and picks an expression** — it
  never touches the renderer internals. So it works identically whether the underlying
  renderer is the Rive rig or the current static cutout.
- **Axis mapping** (positional → expression input on `CairaCharacter`):
  - `idle-wander` → `state="idle"` (the self-breathing/blink rest state)
  - `walking` → `state="idle"` held attentive (no separate "walk" expression needed;
    the *motion* is the travel itself)
  - `assisting` (at the mic) → `state="idle"` attentive, or `greet` on arrival
  - app events still drive expression directly: success → `cheer`, error → `reassure`,
    milestone → `goal`, overlay open → `greet`.

## What we keep from each

**From the Rive spec (unchanged):**
- `caira-master.png` image-mesh rig; state machine `Caira`; inputs `state` (0–4),
  `quiet` (bool), `blink` (trigger) — exactly as in the Rig spec §4.
- `components/caira/CairaCharacter.tsx` stable API and the static-cutout fallback.
- Accessibility: `prefers-reduced-motion` → static/Idle-reduced; Quiet everywhere;
  colour never load-bearing; no 3-flash; TTS only after first interaction.

**From the overhaul blueprint (adopt):**
- **Organic wander** — replace the current linear `CairaBar` slide (the
  `setInterval`/±2px walk in `CairaBar.tsx`) with a **smoothed random walk** inside a
  defined safe zone, GSAP soft easing (`power1.inOut`), no snapping.
- **Mic-travel interaction** — on record start, travel adjacent to the record button
  and enter an attentive/assist pose; on stop, return to the wander.
- **Discipline** — `requestAnimationFrame` + `will-change`, and **queued transitions**
  (finish the walk before starting assist) to prevent glitches.

**From the overhaul blueprint (drop / re-map):**
- Sprite-sheet rendering + `background-position` frame-swap → **dropped** (Rive renders).
- `Idle/Walking/Assisting` as the *only* state machine → **re-mapped** to the positional
  axis above; expression stays on the Rive 5-state axis.

## Open questions for review

1. **Rive authoring resource** — is producing `caira.riv` actually committed? This is
   the only real blocker to the recommended path. If not, decide sprite-sheet fallback
   *and* who renders the frames.
2. **Scope of wander** — every surface, or just the nav `CairaBar`? (The blueprint
   implies free roam; the current app confines her to the bar.)
3. **Do we want a true "walking" expression** in the Rive rig (a distinct lean/step),
   or is travel-by-motion enough? Adding one means a 6th `state` value — a Rig-spec change.
4. **GSAP dependency** — adding `gsap` for the wander, or implement the smoothed walk
   with `requestAnimationFrame` + existing easing to avoid a new dependency?

## Suggested next steps (post-approval)

- [ ] Confirm the Rive-authoring resource (Q1) — unblocks everything.
- [ ] Spec `CairaWanderController` (props, safe-zone definition, mic-hook contract).
- [ ] Refactor `CairaBar` wander → smoothed random walk behind the controller.
- [ ] Author `public/caira/caira.riv` to the existing Rig spec; swap `CairaRive` on.
- [ ] Verify each expression + reduced-motion + quiet, screenshot-compare to source.
