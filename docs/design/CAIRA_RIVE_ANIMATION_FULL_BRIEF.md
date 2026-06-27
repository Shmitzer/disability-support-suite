# Caira — Full Animation Brief
### For the Rive author, graphic designer, and front-end team

**Authored by:** cc (animation team research session, 2026-06-27)  
**Status:** Approved direction — implement against this spec.  
**Companion docs:** `CAIRA_ANIMATION_RECONCILIATION.md` · `Caira Rive — Rig & Integration Spec` (GD) · `Caira Rive — Per-State Animation Direction` (GD)

---

## 1. Character Vision — Who Is Caira?

Caira is a **clay-fabric creature** — small, round-bodied, warm, and unhurried. She is not a mascot. She is not excitable. She is the kind of presence that makes a stressful workspace feel like someone is quietly watching out for you.

Her job is to help support workers, coordinators and participants — people doing emotionally demanding work — feel accompanied rather than monitored. She should feel:

- **Curious, not intrusive.** She notices you. She doesn't stare.
- **Warm, not gushy.** She is genuinely pleased when things go right; she doesn't perform it.
- **Calm in difficult moments.** Her Reassure state is her most important state. Panic is contagious; so is calm.
- **Quietly alive.** The best frame of Caira is an idle frame that makes you think she just moved.

The single most important animation note: **she should feel like she has weight.** Clay is dense. She settles into poses. She doesn't pop or snap.

---

## 2. The 12 Principles Applied to Caira

These are the Disney/Illusion of Life principles interpreted for a small UI companion:

| Principle | Caira Application |
|---|---|
| **Squash & Stretch** | 1–3% maximum on the body. She is clay, not rubber. On `cheer`/`goal` use 4% momentarily at bounce apex only. The face stretches slightly on smile (eyes curve up, mouth widens). |
| **Anticipation** | Before every action, a 60–80ms micro-lead. Raising her arm: shoulder drops 1% first. Jumping: knees bend (body compresses 2%) before the lift. This is what makes motion feel intentional. |
| **Follow-through & Overlapping** | Arms settle 80–120ms after the body stops. Head follows the torso by 60–80ms (the head is slightly "loose"). On landing from a bounce, the body overshoot-and-settles (spring easing, NOT linear). |
| **Ease In/Out** | Nothing moves at constant velocity. Use `cubic-bezier(0.4, 0, 0.2, 1)` (Material ease) or `power2.inOut` (GSAP) as the baseline. The final 15% of any movement decelerates more than the start. |
| **Arcs** | All limb movement travels in gentle arcs, never straight lines. The arm wave is an arc, not a flag-wave. Even the body's breathing bob should drift very slightly left on the way up and right on the way down. |
| **Secondary Action** | `idle`: the belly-heart icon has a very slow, very faint pulse (2s, ~0.5% scale) — not a heartbeat, just alive. `cheer`: the right arm raises AND the head tilts slightly right simultaneously (not in sequence). |
| **Timing** | Emotional beats: `cheer` = 400–500ms. `reassure` = 1.4–1.8s. `goal` = 800ms (the leap), then a 400ms settle. `idle` breathe = 3.6s loop. Slow = heavy = weight. |
| **Exaggeration** | She is slightly exaggerated — but **only by 10–15% beyond naturalistic**. She is not a cartoon. Her `goal` is the most exaggerated she ever gets; anything bigger reads as manic. |
| **Solid Drawing** | Keep her silhouette readable at 38px (CairaHead) and 100px (standard). No motion should obscure her outline. Arms stay within the artboard at all times. |
| **Appeal** | Her head is proportionally large (classic appeal character rule). Ensure the face bones/mesh preserve the rounded forehead. Do not let rigging distort her toward "scary". |
| **Staging** | Her facing direction and any arm gestures should always read clearly from a distance. No ambiguous poses. |
| **Straight Ahead / Pose-to-Pose** | Use pose-to-pose for the one-shots (`greet`, `goal`); straight-ahead for the loops (`idle`, `cheer`, `reassure`). This is the correct Rive workflow (key key poses first, then refine in-betweens). |

---

## 3. The Breathing System — Her Foundation

Every animation in Rive is layered *on top of* a breathing track. Breathing is what makes an idle feel alive, even if you look away and look back.

### Idle Breath (3.6s loop, slow)
```
0.0s  → Scale 100%, Y offset 0
1.2s  → Scale 101.8%, Y offset -2px  (inhale peak — slow ease-in)
2.4s  → Scale 100.4%, Y offset -0.8px  (partial exhale)
3.6s  → Scale 100%, Y offset 0  (full exhale — ease-out to rest)
```
- The chest/torso mesh should expand slightly outward (X +0.5%) and upward.
- Head floats up by ~1.5px on the inhale (the neck bone carries it).
- Easing: inhale is a long ease-in (slow to fast), exhale is ease-out (fast to slow).

### Quiet Breath (when `quiet=true`, 4.8s loop)
- Same keyframes but amplitude halved: Scale max 100.9%, Y max -1px.
- Duration 30% slower.

### Blink System
- Self-blink fires every **4–7 seconds** (randomised within the loop).
- Duration: 90ms close, 70ms open (asymmetric — eyes close slightly faster than they open).
- Occasionally (1 in 6 blinks): **double-blink** — blink, 200ms open, blink again.
- `blink` trigger in the state machine is optional: if the app fires it, honour it; if not, self-blink on the idle timeline.

---

## 4. Per-State Direction (Face + Body + Timing)

### IDLE (state=3) — the default everywhere
**Face:** Neutral soft smile. Not a wide grin — the corners of the mouth very slightly upturned. Eyes: relaxed, slightly narrowed (she looks content). Brows: flat, not raised.

**Body:**
- Breathing loop (see §3).
- Tiny forward weight shift every ~12s: body leans 0.5° forward and back over 2s. This is a "weight shift" — she feels like she's standing, not hovering.
- No other movement. The less she does in idle, the more alive the transitions feel.

**Timing:** Loop indefinitely.

---

### GREET (state=0) — assistant opens / first appearance
**Face:** Open bright smile (mouth corners up, cheeks slightly risen). Eyes: fractionally wider (inner brows up 1–2px).

**Body sequence (one-shot, ~900ms total):**
1. **0–80ms**: anticipation — she compresses very slightly (scale 99.5%, body drops 1px).
2. **80–280ms**: drop-in from 8px above — body arrives at natural position with spring overshoot (lands at -3px, bounces back to 0 by 400ms). Right arm begins raising.
3. **280–600ms**: right arm raises in an arc to ~45° above horizontal. Head tilts +3° to the right as the arm lifts (she's "presenting herself").
4. **600–750ms**: arm pauses at top, then descends in arc to rest. Head tilts back to centre.
5. **750ms onward**: ease into Idle.
6. **Fire event `greetDone`** at frame ~700ms (arm starting to descend).

**Note:** The drop-in must feel like she *arrived*, not like she was placed. The spring on landing is essential.

---

### CHEER (state=1) — success / save / positive moment
**Face:** Big happy smile. Eyes: curved happy-squint (think crescent shape). Brows: up.

**Body (looping while held):**
- 400ms squash-stretch cycle: compress to 97% height / 103% width on the down-beat; stretch to 103% height / 97% width at the apex.
- Right arm raised at ~30°, gives small shakes (±5° oscillation, 200ms per cycle).
- Head bobs with the body — follows by 60ms.
- The whole character lifts ~4px off the implied ground at apex, settles back.
- Amplitude stays modest: this is workplace joy, not a victory dance.

**Timing:** Loop 400ms per bounce cycle. When state changes, finish current cycle before transitioning.

---

### REASSURE (state=2) — errors / something went wrong
**Face:** Gentle concern. Mouth corners very slightly down (not a frown — more like "oh dear"). Eyes: soft, half-closed, inner brows slightly raised (empathetic, not alarmed). This face must NOT read as sad-crying.

**Body (looping while held, very slow):**
- Slow head tilt to the left: 5° over 1.6s, then back to centre over 1.6s. 3.2s full cycle.
- Simultaneously: body sways gently with the head tilt, 1° max.
- Arms: drawn very slightly inward and downward (~2% lower than idle), as if leaning in to help.
- Breathing continues underneath, same as idle but 10% slower.

**The most important note:** `reassure` must feel like she is WITH you in the difficulty, not performing sympathy from a distance. Slow and close.

---

### GOAL (state=4) — milestone / completion
**Face:** Beaming. Full smile. Eyes shut-happy (curved, eyes closed with happiness). This is her best face.

**Body sequence (one-shot, ~1.2s total, then Idle):**
1. **0–100ms**: deep anticipation — compress to 95% height, 106% width. Both arms start to rise.
2. **100–350ms**: HOP — scale back to 100%, body lifts +8px in an arc. BOTH arms rise to full overhead position. Scale peaks at 104% height briefly at apex.
3. **350–500ms**: apex hold — she is airborne, arms overhead, eyes shut-happy. **Fire event `goalReached` here.**
4. **500–700ms**: land — compress back to 96% height (landing squash), arms start descending.
5. **700–1000ms**: bounce back to rest height, arms settle, spring overshoot and settle.
6. **1000ms+**: ease into Idle.

**Optional sparkle layer (hide when `quiet=true`):** at the `goalReached` frame, a burst of tiny star/sparkle shapes can radiate outward from the body over 400ms and fade. Keep them the same teal/clay palette. Max 6 sparkles. No flashing.

---

## 5. Quiet Mode (quiet=true)

Applied to ALL states. Rules:

- **Amplitude**: halve all positional/scale values.
- **Timing**: slow all durations by ~1.4×.
- **Suppress**: sparkles, extra shakes, the double-blink, the weight-shift micro-move.
- **Must still read**: each state should still be distinguishable by pose even at quiet amplitude. Quiet Cheer still has the arm up. Quiet Reassure still has the head tilt.

Quiet mode is for:
- Users who have set `prefers-reduced-motion` (note: OS reduced-motion → static cutout, app-handled)
- The Caira "low stimulation" toggle in settings
- Any context where background motion would be distracting

---

## 6. Micro-Animations for UI Presence

These are not states — they are ambient micro-beats that fire during `idle` to keep Caira feeling inhabited:

| Micro-animation | Trigger | Motion |
|---|---|---|
| **Weight shift** | Every ~12s during idle | Body leans 0.5° left then right over 2s |
| **Look around** | Every ~18s during idle | Head rotates ±4° slowly, as if glancing |
| **Tummy pulse** | Continuous | Heart/C logo on belly pulses very faintly (0.3% scale, 2s, loop) |
| **Antenna wobble** | On hover (if tappable) | Antenna sways 3° over 200ms, ring-damps back |

These are all **additive** to the breathing base. Implement as additive timeline layers or separate animations blended at low weight.

---

## 7. The Wander System (CairaWanderController)

This is the **positional axis** — where she moves on screen. Implemented in React/code, not in Rive.

### Philosophy
She wanders like a small creature exploring a room — not randomly, but with *intent*. She has a destination. When she arrives, she dwells. Then curiosity takes her somewhere new.

### Smooth Random Walk
- **Safe zone**: defined by parent container bounds minus padding.
- **Target**: random point within safe zone, weighted slightly toward the centre (she doesn't hug walls).
- **Movement**: lerp toward target using exponential ease, `lerpFactor ≈ 0.04` per animation frame (~60fps → ~2.4 units/frame closing speed). When distance < threshold, dwell 2–5 seconds, then pick new target.
- **No straight lines**: add a tiny sinusoidal X-drift during travel (±1–2px over the travel duration) so she curves slightly.
- **Never teleport**: if the safe zone changes (resize), lerp to the new in-bounds position over 600ms.

### Mic Hook
- **On record start** (`mode === "record"`): pick a target adjacent to the record button. Travel there with a slightly faster lerp (0.07). On arrival, expression switches to `idle` attentive (no separate state needed — motion communicates it).
- **On record stop**: return to wander from current position.

### Expression during wander
- Wander `idle` → `state="idle"` always.
- Application events override: `success → cheer`, `error → reassure`, `milestone → goal`, `overlay open → greet`. These interrupt the wander temporarily; when they finish, wander resumes.

---

## 8. Layering & Material Notes for the Rive Author

### Why image-mesh (not vector re-draw)
The clay render (`caira-master.png`) has:
- **Sub-surface scattering** on the clay surface (the soft warm glow you can't get from flat SVG)
- **Fabric texture** in the ears/feet
- **Teal+coral swirl pattern** that would take 40+ SVG paths to approximate

Rigging the *actual pixels* via image-mesh preserves all of this at zero re-art cost. Mesh vertices go around the major body parts and limbs.

### Recommended mesh density
- **Body/torso**: 3×4 grid mesh (12 vertices) — enough to squash and breathe
- **Each arm**: 2×3 grid (6 vertices) — rotate at shoulder pivot, bend at elbow
- **Head**: 2×2 grid (4 vertices) — for the neck tilt
- **Face region**: optional 4×3 mesh over eyes/mouth area for blink and expression squash
- **Heart/C logo**: single bone or 1×1 mesh pinned to body — just scales with the belly pulse

### Layer stack (back → front)
```
[shadow]           — soft radial gradient, follows body position, 40% opacity
[body]             — the main torso mesh
[left-arm]         — hangs at side in idle; subtle secondary motion
[right-arm]        — the "active" arm for wave/raise
[head/neck]        — pivots at base of neck
[face]             — eyes + mouth (mesh or swap layers for expression)
[belly-heart]      — heart-C logo, subtle pulse
[sparkle-layer]    — goal state only; particles; hidden when quiet=true
```

### Shadow behaviour
The shadow (a blurred ellipse underneath her) should:
- Shrink as she rises (goal hop: shadow shrinks to 60% at apex)
- Soft-lighten during hop (opacity drops from 40% → 20% at apex)
- This is the cheapest way to sell "she left the ground"

### Artboard size
594 × 711px (matching the @3x master). Aspect ratio 0.836. The React component constrains this correctly via `CAIRA_ASPECT`.

---

## 9. Rive State Machine Contract

This is **fixed** — the app code already implements this. Do not deviate.

```
State Machine name: "Caira"

Inputs:
  number  "state"   → 0=Greet  1=Cheer  2=Reassure  3=Idle  4=Goal
  boolean "quiet"   → true = low-stimulation
  trigger "blink"   → optional (self-blink if absent)

Events (optional, forwarded to onEvent callback):
  "greetDone"      → fire when the arm-wave finishes (greet state)
  "goalReached"    → fire at the hop apex (goal state)
  "tap"            → if you make her tappable in-rig

Export filename: caira.riv
Path: public/caira/caira.riv
```

Transitions:
- Any state → Idle (150–250ms blend, triggered by `state` input change)
- Greet and Goal: auto-return to Idle after one-shot finishes
- Cheer and Reassure: loop until state changes

---

## 10. Accessibility Non-Negotiables

| Rule | Implementation |
|---|---|
| `prefers-reduced-motion` | App shows still PNG cutout, does not load Rive canvas. Already handled. |
| Quiet mode | All amplitudes halved, timing slowed ~1.4×. Available everywhere. |
| No 3-flash | No animation flashes more than 3 times/second. Sparkles are slow-fade, not strobe. |
| Colour is decorative | Every state reads by pose/motion. Never by colour alone. |
| 44px minimum hit target | The wander controller wrapper is always ≥44×44px tappable. |
| TTS after first interaction | Voice only fires after user has interacted. Already app-handled. |

---

## 11. Validation Checklist (for the Rive author, post-export)

Before committing `caira.riv`:

- [ ] All 5 states read distinctly at 100px size
- [ ] All 5 states read with `quiet=true` (still distinguishable by pose)
- [ ] Greet one-shot auto-returns to Idle (no freeze)
- [ ] Goal one-shot auto-returns to Idle (no freeze)
- [ ] Cheer loops without visible seam
- [ ] Reassure loops without visible seam
- [ ] Idle breathe loops without visible seam
- [ ] Blink fires on idle loop (or `blink` trigger fires it)
- [ ] `greetDone` event fires (check Rive preview's event log)
- [ ] `goalReached` event fires
- [ ] No mesh distortion on any limb at any keyframe
- [ ] Shadow shrinks on Goal hop
- [ ] Sparkle layer hidden when `quiet=true`
- [ ] File size < 200KB (prefer < 100KB)
- [ ] Artboard size exactly 594 × 711

Drop the .riv at `public/caira/caira.riv`. No code changes needed — the app wires up automatically.

---

## 12. UI Presence — How Caira Brings Life to Every Screen

Caira is not just in the nav bar. She appears in:

| Surface | Size | State | Notes |
|---|---|---|---|
| Nav bar (CairaBar) | 38px head | idle, wanders | The wander controller governs her position |
| Loading screens (CairaLoading) | 64–80px | idle | She breathes while content loads |
| Error screens (CairaError) | 80px | reassure | She looks concerned with you, never at you |
| Empty states (CairaEmpty) | 64px | idle | Quiet presence; she's there if needed |
| AI overlay open (CairaAIOverlay) | 100–120px | greet → idle | Greets on open, idles during conversation |
| Recording (CairaRecordingOverlay) | 100px | idle (attentive) | Leans toward mic zone via wander |
| Milestones | 100px | goal | Biggest animation in the app |

Each of these uses `<CairaCharacter state="..." size={...} />` with no further changes needed once `caira.riv` lands.

---

*This document is the animation team's definitive brief. The rig spec (GD: "Caira Rive — Rig & Integration Spec") and the per-state direction doc (GD: "Caira Rive — Per-State Animation Direction") are companion references. This file supersedes the earlier CAIRA_ANIMATION_RECONCILIATION.md (which was a draft; this is the resolved brief).*
