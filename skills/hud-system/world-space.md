# World-space HUD — nameplates, off-screen indicators, reticles at scale

The 3D HUD: health bars over enemies, nameplates at MMO scale, off-screen
threat/damage arrows, and the reticle/crosshair. The hard part is making
hundreds of world-anchored elements cheap. Screen-space element internals
(pooling, view-models) are in [elements.md](./elements.md). `[DOC]` =
engine docs/benchmark, `[?]` = practice/extrapolation.

## World-space vs screen-space

- **Screen-space** is a 2D overlay: cheap, always crisp, no depth.
  **World-space** anchors to a 3D position (a bar over an enemy), then
  either stays in true 3D or is **projected to screen each frame**
  (`WorldToScreenPoint` / `ProjectWorldLocationToScreen`).
- **Billboarding**: world-anchored plates rotate to face the **camera
  plane** (not the camera position, or they skew at screen edges).
- **Depth / occlusion — draw through walls or not?** WoW-style nameplates
  use an **occlusion alpha multiplier** (occluded plates fade rather than
  vanish). Gameplay-critical targeting often draws through (no depth
  test); immersion/stealth occludes via depth test or raycast. Per-game
  trade-off.
- **Distance scaling & fade**: scale the plate down and fade alpha with
  distance; cull beyond a max distance (WoW exposes `nameplateMaxDistance`
  ~45–60, `nameplateMinAlpha`). `[DOC]`

## Nameplates / health bars at scale

The "100+ enemies each with a bar" problem — a naive 1 canvas/widget per
unit doesn't scale (per-unit Tick + canvas/Slate repaint dominates):

- **Pooling is mandatory**: pre-allocate a fixed set of plates, reuse
  (show/hide + rebind) instead of instantiate/destroy. Widget create/
  destroy cost can exceed actor spawn cost. `[DOC]`
- **Culling**: frustum-cull, distance-cull, and **priority filtering** —
  only bosses/targeted/damaged units get a plate (WoW's
  `nameplateShowOnlyNames`, friendly toggles, max distance).
- **Single-canvas batching**: one canvas/widget with many repositioned
  children rather than N canvases (fewer draw calls) — but in Unity the
  canvas goes dirty and rebuilds when *any* child changes, so split
  static from dynamic. `[DOC]`
- **GPU-instanced approach**: render bars as instanced quads / a single
  mesh with per-instance fill % + color instead of UI widgets — far
  cheaper at hundreds of units (common in RTS/MMO custom renderers; no
  single canonical public number). `[?]`
- **Occlusion-test cost**: per-plate raycasts are expensive at scale —
  throttle (test every N frames) or use a depth-buffer test instead of a
  CPU raycast.

## Off-screen indicators & threat/damage direction

The edge-clamp algorithm (the core of off-screen markers, threat arrows,
and damage-direction wedges):

```
1. Project target world pos -> screen/NDC.
2. Inside [-1,1] -> on-screen, draw normally.
3. Outside -> clamp to screen bounds: intersect the center->target ray
   with the four screen edges, take the nearest hit; add a margin.
   angle = atan2(screenY, screenX); rotate the arrow by it.
```

- **Behind-camera flip** (the classic bug): projection mirrors when the
  target is behind the camera. Guard with the forward dot-product:
  `if dot(camForward, targetDir) < 0` invert and snap to the edge. (This
  is pitfall #4.)
- **Directional clamping convention**: 0° = forward; some designs clamp
  the arc to ±135° so indicators avoid the cluttered bottom of the
  screen.
- **GoW threat-direction system**: color-coded directional arrows around
  the reticle distinguishing idle enemies vs **incoming attacks** (red =
  imminent, purple/special). Pairs with the HoH/awareness presets — a
  meta cue replacing a persistent element. `[?]`
- **Damage-direction indicator**: "where did that shot come from" = an
  arc/wedge at the screen edge pointing to the attacker's world
  direction (same project → relative-angle → arc math). Doubles as the
  redundancy channel accessibility wants
  ([accessibility.md](./accessibility.md)).

## Reticle / crosshair tech

- **Dynamic spread/bloom**: the crosshair gap scales with current weapon
  spread (movement/jump/fire), recovering over time (`BaseSpread`,
  `MovementSpread`, `MaxSpread`, recovery curve).
- **Spread→pixels**: convert the spread *angle* to screen size via FOV —
  cast a ray at the spread angle, `WorldToScreenPoint` the hit, derive
  the gap (`spreadAngle / FOV × screenRes`). Watch behind-camera/NDC
  pitfalls (devs hit "screenPos in the millions" bugs). `[DOC]`
- **Hitmarkers & hit-direction**: a transient marker on a confirmed hit
  (hit/critical variants); direction markers map the 3D hit vector to a
  screen-plane angle (same projection approach).
- **World-space vs screen-space reticle**: screen-space is always
  centered and cheap; a **world-space reticle** projects to the actual
  3D aim point (more accurate for free-aim, heavier — widget-component
  cost below).

## Performance cost model

- **UE `WidgetComponent`**: renders UMG → render target → textured mesh.
  Main cost = render-target allocation + Slate paint. Mitigate: size the
  widget tightly (no transparent margin), **pool**, and **add the
  component only when needed** — don't put one on thousands of idle
  actors (even hidden ones cost Tick). `[DOC]`
- **Invalidation / Volatile** (UE): wrap static groups in Invalidation
  Boxes; mark fast-changing parts (health bar) `Is Volatile` so only they
  repaint; prefer event-driven updates over Tick (fits the event-driven
  HUD). Canvas drawing measured **~10× slower than Slate** for the same
  render-target work. `[DOC]`
- **Unity world-space canvas**: every change marks the canvas dirty → full
  rebuild; many per-unit canvases = many rebuilds. Fix with a single
  canvas + repositioned pooled children, and a tiny `RectTransform` scale
  (~0.01). `[DOC]`
- **Widgets vs Niagara/particle digits**: a pooled-UMG case (30 enemies,
  damage numbers every 0.1 s) measured **~4 ms** game-thread →
  **~0.5 ms** just by pooling — the cost was create/destroy, not
  rendering. **Niagara** handles all indicators in one system (no pooling)
  and is generally faster, but it's 3D-only with no built-in text
  renderer (needs a character atlas / UI Renderer plugin). **Rule of
  thumb**: pooled UMG for standard text-based bars/numbers; Niagara/
  instanced for very high-volume 3D effects where text fidelity is
  secondary. `[DOC]`

## Sources

Plater & ElvUI nameplate source (occlusion alpha, fade); oUF nameplate
guide (CVars) · Unity Discussions / StackOverflow (world-space canvas
cost, off-screen indicators) · UE forums "Easy Offscreen Indicator",
"Widget Component slow performance", "Performant 3D UI" · froyok.fr
render-target benchmark (Canvas vs Slate ~10×) · kolosdev Niagara-vs-UMG
table; Niagara UI Renderer docs · UE5 CrosshairSystem / GTFO
AccurateCrosshair / PD2 AdvancedCrosshairs. Flags: GoW threat/damage-
direction specifics are from secondary coverage; GPU-instanced nameplate
numbers and nameplate LOD tiers are practice-based without a single
canonical public figure.
