# Ranged & gunplay — the other half of action combat

The melee core ([attack-graph.md](./attack-graph.md)) handles blades; this
covers guns, projectiles, and aiming. The payoff is **one combat core** —
melee sweeps and projectile impacts both terminate in the same
`HitEvent{attacker, target, attackData, contactPoint, normal, direction}`,
and the stagger economy, hit-stop, screenshake, and damage numbers don't
care which fired it. Ranged just adds upstream terms (distance falloff,
hit-zone multiplier, penetration). `[?]` = uncertain/contested.

## Gun feel — cumulative micro-feedback

Gun feel is **a stack of ~30 trivial tweaks, not one system** (Nijman,
*The Art of Screenshake*) — the ranged analog of the melee rule "feedback
consumes the HitEvent stream, it never lives in damage math." The checklist:

- **Visual recoil / kick** — the gun model and camera punch back on fire,
  recovering over the recovery time. Distinct from *gameplay* recoil
  (below). Sells weight.
- **Screenshake** — shake **opposite** the firing direction; bigger guns
  shake more. Reuse the melee **trauma model** (trauma², Perlin not random,
  0.15–0.25 s ring-down, player slider). `Random.insideUnitCircle` gives
  strobe jitter, not heft.
- **Muzzle flash** (bright, 1–2 frame, oversized), **per-archetype audio**
  (shotgun bark vs laser zap vs MG rattle — recognizable by sound alone),
  **hit feedback** (enemy flash-white + impact particle on *every*
  collision + damage number = the "I connected" confirmation = the
  HitEvent firing), ejecting brass, ADS lean.
- Praised: Nuclear Throne, Doom 2016, Titanfall 2. Criticized: statistically
  fine weapons that feel like "butter knives" read as broken.

## Recoil & spread (the gameplay layer)

- **Pattern (deterministic) recoil** — the CS spray pattern: a *fixed*
  per-shot offset sequence (heavy vertical climb, then horizontal sway).
  Memorizing + counter-pulling is a **core skill mechanic**; resets when
  you stop firing. **Actual vs visual mismatch** (the crosshair only
  partially follows the real displacement) forces memorization — `[?]`
  contested as hidden info vs skill depth.
- **First-shot accuracy** — the first bullet always lands at the crosshair,
  rewarding tap/burst at range. The **pattern-vs-random debate**:
  deterministic = high learnable ceiling (CS); random RNG cone = lower
  ceiling, "fairer" to casuals but the "I aimed dead-on and missed"
  feels-bad.
- **The cone of fire / bloom** — bullets deviate within a cone that
  *widens* per-shot and with movement (running > walking > standing >
  crouching; jumping huge). Spread works *with* the recoil pattern: the
  pattern says where the shot should go, spread says how far it strays.
- **ADS** — an accuracy bonus + reduced spread, traded against mobility and
  the **ADS transition time**. ADS time / sprint-to-fire / swap time are
  the ranged equivalent of melee **startup frames** — they map directly
  onto the **commitment↔freeform dial** ([attack-graph.md](./attack-graph.md)):
  high ADS time = committed/heavy, fast ADS = freeform/responsive.

## Hitscan vs projectile architecture

- **Hitscan** — an instant raycast from muzzle/camera along aim ± spread to
  the first blocker. The FPS standard; use it for fast TTK and
  responsiveness (skill = crosshair placement at the click instant). No
  leading, no drop, trivially cheap.
- **Projectile** — a moving object with travel time; you must **lead**
  moving targets. Design rule: **dodgeability ∝ projectile speed/size vs
  character speed/size** — slow characters get slow (dodgeable) bullets;
  fast characters get fast bullets. Projectiles enable counterplay
  (dodging) hitscan can't.
- **"Fake projectile"** — hitscan hit resolution + a purely cosmetic
  tracer: projectile *readability* with hitscan *reliability*; the tracer
  never touches hit registration.
- **Engineering**:
  - **Pool projectiles** (never spawn/destroy per shot); auto-return on
    max range/time. UE's default `ProjectileMovementComponent` isn't
    poolable — use a custom pooled mover.
  - **Sub-step fast projectiles** — the *same tunneling problem the melee
    skill solves with sweep traces*: trace from prev-frame to current-frame
    position each tick (CCD). (An ECS trace-per-tick approach hit 40k
    bullets @16.6 ms — it scales.)
  - **Split collision** — projectile-vs-world (block/ricochet/stick) vs
    projectile-vs-actor (resolve to a HitEvent, `direction` = velocity).
  - **Ballistics params** — gravity (bullet drop), drag, homing (seek +
    max turn rate); games lower real muzzle velocities (rifle ~750–900 m/s)
    to exaggerate drop/leading.
  - **AoE/splash** — radius + a falloff curve + optional per-target LoS
    check to block splash through walls.

## Aiming & targeting

- **Aim assist** (the console necessity) — four stacked types: **slowdown/
  sticky** (look speed drops over a target — least controversial),
  **rotational/adhesion** (camera rotation matching the target's screen
  movement — what MnK players call "the game tracking for them"), **bullet
  magnetism** (shots snap toward target even when the crosshair is off —
  most controversial), and **ADS snapping**. They're **interlocked with
  range/spread** (Destiny: the assist cone shrinks as the accuracy cone
  widens). The **crossplay controversy** is `[?]` genuinely unsettled —
  MnK calls strong rotational assist "free aimbot," controller players call
  it the only thing making crossplay viable; studios tune per-patch.
- **Lock-on / soft-lock** (action games, distinct from FPS aim assist) —
  **hard lock-on** binds camera + targeting to one enemy (the
  `camera-system` concern; target priority by screen-center/distance/
  threat); **soft-lock** auto-orients attacks/projectiles toward the
  nearest valid target in a cone without a camera lock (DMC gun aim) — what
  lets the "gun as combo extender" fire at whatever's in front.
- **Aiming math** (the HUD owns the crosshair *visuals*; this is the
  *math*): spread-to-screen (convert the cone half-angle to the reticle gap
  so the crosshair grows with bloom), hit-confirmation (the hitmarker fires
  off the HitEvent), and target leading
  `lead = targetPos + targetVel × (distance / projectileSpeed)`.

## Hit registration & netcode (the contested topic)

The biggest divergence from melee — for PvP ranged, **authority and
latency dominate feel** (full netcode-model landscape in
`coop-session/netcode-models.md`):

- **Client prediction + server authority** — the client shows instant
  fire/recoil/tracer, but the **server is authoritative** on the hit;
  mismatches reconcile. Pure client-authoritative hits are trivially
  cheatable.
- **Lag compensation / server-side rewind ("favor the shooter")** — the
  server keeps ~1 s of hitbox history and **rewinds every other player to
  the instant the shooter saw** (`ServerTime − RTT − interpolation`), tests
  the shot, restores. So you hit what your screen showed. The cost: a
  target who already ran behind cover can die "around the corner."
- **"I shot them but no hit"** — interpolation delay (you aimed at a
  50–150 ms-old position) or client/server hitbox desync; lag comp is the
  fix. **Peeker's advantage** is inherent to interpolation + favor-the-
  shooter.
- **Hitbox model** — **per-bone capsules** (head/torso/limbs), not the
  render mesh; headshot = a small capsule × a big multiplier. This is the
  ranged extension of melee's "hit roots not colliders" — here limbs are
  *intentionally* separate for zone multipliers. **Penetration/wallbang**
  continues the ray through thin surfaces at reduced damage.

## Ranged damage & TTK

Extends the melee pipeline (`raw = base × MV → crit → part mult → defender
mods → cap`), inserting **distance** and **hit-zone** as first-class terms:

- **Headshot/weakpoint multipliers** — the ranged crit (CS AK = 4× head).
  Tune the multiplier to *cross a TTK breakpoint* (2-body → 2-head); a
  multiplier too small to change shots-to-kill is "high skill, low reward."
- **Damage falloff over distance** — stepwise (CoD thresholds — easiest to
  reason about), piecewise-linear (Battlefield), or exponential (smoothest);
  snipers ≈ no falloff. Falloff bands signal the intended engagement range.
- **The immediate-reward spread trick** (CoD MW2019): keep spread tight and
  let **body-part multipliers** (not random misses) lengthen effective TTK
  — rewards correct aim instead of punishing it with RNG.
- **TTK breakpoints** — `TTK = (STK − 1) / fireRate`; STK is a *step
  function* of damage vs HP. Balance lives at the breakpoints; tweaks that
  don't cross one are invisible.
- **Shotgun spread** = N pellets each their own ray (a distribution, not a
  roll). **Charge shots** = the ranged analog of melee charge attacks
  (authored hold edges). **Fire mode** (burst/full-auto/semi) is a node
  property. The **weapon-balance triangle** (damage/range/fire-rate/
  handling) is the ranged sibling of melee MV/sec — evaluate by DPS-at-
  range *and* handling, plus the ammo/reload resource layer.

| Archetype | Hit type | Fire rate | Falloff | Headshot× | TTK band |
| --- | --- | --- | --- | --- | --- |
| Assault rifle | hitscan | 600–750 RPM | stepwise mid | ~1.5–4× | medium |
| SMG | hitscan | 800–1000 RPM | early/steep | ~1.3–1.5× | fast (close) |
| Sniper/DMR | hitscan/fast-proj | low | ~none | ≥2× (often 1-shot) | very fast |
| Shotgun | hitscan pellets | low | cone-driven | per-pellet | fast point-blank |
| Rocket | projectile + AoE | very low | splash falloff | n/a | burst |
| Bow | projectile (drop) | charge-gated | gravity arc | charge-scaled | charge-dep. |
| Plasma/orb | projectile (slow) | med | speed-defined | varies | slow |

## Mixing melee + ranged (the hybrid)

One core serving both, via the unified HitEvent:

- **DMC5 Dante / Bayonetta Bullet Arts** — guns are **combo extenders**
  that fire *during* melee strings (Dodge Offset preserves string position
  — the same per-edge cancel semantics as melee). Gun actions are bound to
  a separate style/input to avoid colliding with melee directional inputs.
- **Switching** — instant weapon/mode swap as a near-universal cancel
  target (like the skills layer that interrupts the graph); swap time is
  the commitment cost.
- **Parrying projectiles** — extend the **perfect-guard window** to test
  against incoming projectile hitboxes (Sekiro arrow-deflect): on contact,
  negate or **reflect** (re-emit a projectile owned by the defender) —
  defense-feeds-offense, same as the melee parry→stun loop.
- **The unified pipeline** — add a `weakpointZone`/`falloffMul` field to
  `attackData`; everything downstream (stagger, hit-stop, numbers, the Link
  economy) is unchanged.

## Sources

Nijman/Vlambeer *The Art of Screenshake* · Crum *Nuclear Throne case study*
· GDC 2016 Eiserloh *Juicing Your Cameras* · counterstrike.fandom *Recoil*
+ davidbdurst.com (actual vs visual) · Celia Wagar (CritPoints) *Hitscan
vs Projectile* · NeoFPS docs · UE object-pool/CCD forums · Harvey Yang
*Aim Assist Types* + Destiny dev notes · Valve Source `player_lagcompensation`
+ Gambetta *Fast-Paced Multiplayer Pt.4* · Junce Wang *CoD MW2019 Balance*
+ Zeke Virant *Damage Falloff* · BK Brent *DMC5 Dante* + Bayonetta wiki
*Bullet Arts*. Flags: CS recoil constants vary by patch; crossplay aim-
assist has no consensus (contested); homing/AoE curves are game-specific
knobs, not fixed values.
