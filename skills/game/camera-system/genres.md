# Genres — FPS, racing, RTS, fighting, platformer, VR

Camera design beyond third-person action. All magnitudes are **per-title tuning
constants** surfaced from dev blogs/community docs, not standards — treat as
starting ranges. Each genre has a different "north star".

## First-person (FPS) — immersion + aim

- **World vs viewmodel FOV split**: world camera ~80–110° HFOV; the weapon often
  rendered with a **separate ~70–75° FOV** to avoid wide-angle gun distortion.
  Console ~75–80 HFOV (couch distance); PC competitive 90–110.
- **Head-bob**: subtle **vertical-only sine** scaled by movement state; **never bob
  the camera *pitch*** (rotation) — facing is player-controlled → nausea. Best
  practice counter-rotates toward screen-center (mimicking the vestibulo-ocular
  reflex). Always ship an intensity slider / off toggle.
- **Weapon sway**: a spring-damper lagging behind the view; yaw > pitch > roll;
  **ADS reduces sway 50–80%**. **ADS transition** is a 0→1 blend weight (taps
  reverse mid-blend), ~8–15 frames snappy, up to ~25 for scoped.
- **Recoil "camera kick"**: additive camera rotation that interpolates back to the
  aim point. **Visual recoil ≠ real recoil** — higher FOV makes the same kick look
  smaller. Persistent physical states → camera animation; momentary events
  (explosion, flashbang) → screen-space effects.

## Racing — speed + control

- **View modes**: cockpit, hood/bumper, chase — each a different speed/control
  trade. **"Correct" FOV is geometric** (screen size + eye distance): single-screen
  often ~40–55° HFOV; triples 120–180°.
- **Wide FOV = exaggerated speed but distorted distance** → missed braking points;
  sims advise disabling dynamic FOV/shake/motion blur for consistency. **Dynamic
  speed-based FOV** is the arcade "sense of speed" lever (widen with velocity, with
  a FOV limiter at very high speed to reduce flicker).
- **Look-to-apex / head physics**: a 6-DOF neck spring; the camera tilts with
  G-forces and can align with velocity/steering and track the apex; optional horizon
  lock. The **stabilized in-cab camera** (DiRT Rally) doubles as a VR comfort tool.

## RTS / strategy — overview + precision

- **Goal**: maximum readable information ("omniscient, godlike", not an embodied
  head). **Orthographic vs perspective**: ortho = parallel geometry; a very low FOV
  (~10°) pulled far back fakes ortho while keeping subtle depth.
- **Movement = pan/dolly, not zoom**: attach to a pivot/spring-arm; mouse-wheel
  "zoom" is actually a **dolly**. **Zoom-toward-cursor**: raycast the world point
  under the mouse, dolly toward it; **clamp pivot height**.
- **Edge-pan**: cursor in a ~5% screen-edge margin triggers scroll; **clamp pan to
  map bounds**. **Max-zoom is a design decision** (StarCraft II blocks zoom-out and
  relies on the minimap vs Supreme Commander's strategic NATO-symbol zoom-out).
  Rotation is generally avoided (it invites balance cheese).

## Fighting games (2.5D) — both fighters framed

- **Core algorithm**: focus = the **midpoint of the two fighters**; **zoom from
  inter-fighter distance** (ortho: set `orthographicSize`; perspective: dolly Z).
  Smooth with `Lerp`/`SmoothDamp`.
- **Clamp zoom AND position**: `Clamp(distance/zoomFactor, min, max)` + clamp X/Y to
  stage bounds. The classic bug: it **zooms in too much when fighters close** — set a
  **minimum ortho size** so it only zooms *out* past base. Consider X and Y
  simultaneously (take the max required dolly) — "camera as referee".

## 2D/2.5D platformers — anticipation + readability (the Keren taxonomy)

Itay Keren's *Scroll Back* (GDC 2015) built on three pillars — **Attention,
Interaction, Comfort** — and a taxonomy of 2D camera behaviors:

- **Position-locking** (hard-locked to the player), **camera-window** (stationary
  until the character hits a window edge), **edge-snapping**, **platform-snapping**
  (camera stays put during a jump, snaps to the player on landing — Mario),
  **lerp-smoothing** (continuously reduce camera↔target distance), **region-based
  anchors** (designer rectangles dictating path/zoom/focus), **dual-forward-focus**
  (shift focus ahead based on facing), **projected/physics-smoothing** (smoothing
  scaled by velocity).
- **Look-ahead numbers**: max lead 50–150 px (typ. 80–120); velocity influence
  0.6–0.9; lookahead time 0.2–0.5 s; vertical multiplier 0.3–0.7. Predictive form:
  `player_pos + velocity·lookahead_time`. **Celeste**: ~100 px base lead → 150 px on
  dash; per-room lead values; distance-based lerp `from + (target−from)·(1 −
  pow(0.01/multiplier, dt))` — "took months to tune, players consciously noticed
  almost nothing" = the success metric.
- Modern best practice: **deadzone + look-ahead + clamp to level bounds + slight
  downward bias on falls**.

## VR — comfort above all (the hard rules)

1. **Never take control of the camera** — it belongs to the headset; no locking,
   animating, or scripted moves you didn't initiate.
2. **Don't accelerate/rotate/decelerate** the VR camera — the vestibular system
   feels acceleration + rotation but **not constant-velocity linear motion**; keep
   motion constant-velocity (acceleration is the primary sickness driver).
3. **Vignette/tunnel on movement** — darken screen edges to cut peripheral optic
   flow/vection.
4. **Snap-turn over smooth-turn** — instant 30°/40° increments omit the rotational
   visual info the vestibular system can't corroborate.
5. **Fixed/stable horizon**; **cockpit/helmet reference frames** occlude optic flow
   "for free"; **high constant frame rate** (judder = head/camera mismatch).

Platforms publish **Comfortable / Moderate / Intense** comfort ratings.

## Other fixed-camera contracts

- **MOBA**: locked (hero centered, easy self-tracking, no scouting) vs free (map
  awareness — nearly all pros) vs the **Spacebar hybrid** (hold to re-center).
- **Isometric ARPG (Diablo lineage)**: a **fixed camera as a feature** — it sets the
  exact parameters all level/enemy/balance design flows from; free rotation invites
  boss-aggro cheese (Grim Dawn keeps it fixed). D4's tighter zoom was criticized.
- **Fixed-cam horror (Resident Evil)**: static director-chosen angles + cuts at room
  thresholds create blind spots — tension via *withheld* visual info.
- **Beat-em-up**: camera-lock as an encounter gate (scroll stops, enemies spawn,
  lock releases only when the room is cleared).

## Cross-cutting themes

- **Dolly ≠ zoom**: moving along the view axis is a dolly; only an FOV change is a
  zoom — conflating them causes RTS/fighting bugs.
- **Vestibular conflict is universal**, scaling with immersion (negligible-but-real
  in 2D → severe in VR); constant velocity safe, acceleration/rotation sickening —
  always expose intensity sliders.
- **FOV is a perception dial**: wider exaggerates speed (racing), shrinks targets +
  dampens *visual* recoil (FPS), and costs frame rate (why consoles lock it).

## Flagged gaps — do NOT invent

Most per-effect magnitudes are per-title tuning constants, not standards · racing
neck/chase numbers are mod-specific · VR comfort *ratings rubrics* are platform-
specific (the *rules* are well-established).

## Sources

Itay Keren *Scroll Back* (GDC 2015) · Celeste `Player.cs` source · MoCap Online
(FPS animation) · sim-racing FOV guides / CSP NeckFX · Gamasutra "Wide Angle Lens"
(RTS) · StackOverflow / Cinemachine threads (fighting) · Mobalytics (MOBA) · Meta
Horizon / Google VR / USI paper (VR) · GameBanshee (Diablo) · Streets of Rage wiki
(beat-em-up).
