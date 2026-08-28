# Design & genres — philosophy, diegetic HUD, conventions, juice

The craft layer of HUD design: what belongs on screen at all, how genres
solve it, the diegetic/immersive school, and the game-feel that makes a
HUD feel responsive. The engineering (events, view-models, pooling) is in
[elements.md](./elements.md). `[P]` praised, `[C]` criticized, `[?]`
contested/uncertain.

## The diegesis taxonomy (the foundational frame)

Two axes — **fiction** (are the characters aware of it?) and **geometry**
(is it in the 3D world or a 2D overlay?) — cross into four classes
(Fagerholt & Lorentzon, *Beyond the HUD*, Chalmers 2009):

| Class | In fiction? | In 3D world? | Example |
| --- | --- | --- | --- |
| **Diegetic** | Yes | Yes | Dead Space RIG spine health bar; holographic inventory |
| **Non-diegetic** | No | No | Traditional 2D overlay HP bar, ammo counter, minimap |
| **Spatial** | No | Yes | RTS selection brackets, floor waypoint arrows, world markers |
| **Meta** | Yes | No | Blood splatter / damage vignette, cracked-glass screen FX |

That same study found UI channels skew ~⅘ **visual**, ~14% **auditory**,
~9% **haptic** — non-visual HUD channels are underused, and the
redundancy that helps accessibility ([accessibility.md](./accessibility.md))
also strengthens feel.

## What belongs on the HUD at all

- **Non-diegetic as last resort**: use a flat overlay element *only* when
  presenting the info any other way is cumbersome (the Halo ammo-readout
  framing). Show survival-critical info persistently; defer the rest to
  contextual or on-demand surfaces (progressive disclosure). `[P]`
- **Cost of clutter**: Dead Space's team contrasted their clean frame
  against a Mass Effect screen "full of inventory and mini-maps" as the
  anti-pattern. Clutter over a beautiful world is a recurring `[C]`
  (Hogwarts Legacy's lack of a dynamic HUD).
- **Immersion is not universally improved by less HUD**: removing the
  non-diegetic HUD raised immersion **only for experts** (for whom it had
  become a distracting barrier); novices saw no immersion change and
  found the game harder (Iacovides et al., "Removing the HUD"). "Less
  HUD" interacts with player skill — ship it as an *option*, not a
  mandate. `[?]`
- **Third- vs first-person constraint**: diegetic UI is far easier in
  third-person (draw on the visible avatar body) than first-person, where
  there's "a profound lack of real estate" beyond the weapon/visor.

## Diegetic & immersive case studies

- **Dead Space (2008) — the canonical fully-diegetic HUD** `[P]`: a
  spine-mounted segmented **health bar** on the RIG (color-shifts as it
  depletes, EKG flat-line on death), a **Stasis** meter on the back,
  **ammo on each weapon**, and inventory/map/logs as **real-time
  holograms** ~1 m in front of Isaac, who is locked into a ¾ screen
  position so the UI has a predictable anchor. *When diegetic breaks*:
  the holographic 3D map failed at navigation → a spatial **floor
  locator line** fallback; the inventory ended up a full-screen takeover.
  The legibility-vs-purity tension is real. `[C]`
- **Metroid Prime (2002) — the visor HUD** `[P]`: the whole HUD is on the
  inside of Samus's helmet; it banks with jumps and damage; rain/steam/
  frost accumulate on the glass, her face reflects on bright flashes, EM
  interference turns the screen to static (removing info diegetically).
  Used sparingly to stay fresh; visors are diegetic mode-switches.
- **Far Cry 2 (2008) — diegetic map/GPS**: a physical paper map + GPS the
  avatar dual-wields while the **world does not pause** (bullets keep
  flying) — but it still ships a "bluntly non-diegetic" HUD for ammo/
  health. Designers concluded ~100% diegetic is "nearly hopeless" in an
  FPS, and needing a non-diegetic crutch is a signal to rethink. `[P]`/`[C]`
- **The sci-fi excuse**: any interface is permissible if it's "a
  hologram" (Crysis nanosuit, racing cockpits, MGS codec) — sci-fi/
  vehicle fiction makes diegetic cheap. `[?]`

Cost/benefit: diegetic raises immersion and cuts clutter but risks
legibility, is camera/setting-dependent, costs more to build, and often
still needs a non-diegetic crutch.

## Genre conventions

| Genre | Canonical elements | Typical placement | Notable detail |
| --- | --- | --- | --- |
| **FPS** | crosshair, ammo, health/armor, hitmarkers, kill feed, compass, minimap | reticle center; health/ammo lower corners; kill feed top-right; compass top-center | diegetic **number-on-gun** ammo beat HUD-corner by **>27%** time-to-notice-empty (co-located with gaze) |
| **Fighting** | health/super bars, combo counter, round pips, timer | health top L/R mirrored, meter bottom, timer top-center | the combo counter's real value is **color-change to flag a dropped combo**, not the count |
| **MMORPG** | action bars, unit/raid frames, cast bars, threat meter, nameplates, buff/debuff | action bars bottom-center; raid frames near center; nameplates over units | **addon/WeakAuras culture** (ElvUI, Plater, DBM); best practice = pull vital info to a center-bottom "primary focus zone" |
| **Survival** | hunger/thirst/warmth/fatigue, stamina, status cluster | meters bottom-left; stamina contextual bottom-right | The Long Dark: ~7 zones, mostly **contextual/fade-out**, red used sparingly |
| **Looter-shooter** | damage spam, rarity colors, loot beams, abilities | numbers float off enemies; beams in-world; abilities corners | rarity should be **double-coded** (beam + VFX, not color alone) |
| **RTS/strategy** | resource bars, build queues, selection panel, minimap | resources top; selection bottom; minimap corner | selection brackets/auras are textbook **spatial** UI |
| **Battle royale** | circle/zone timer, squad health, ping, loadout, kill feed | squad/health lower-left, weapon lower-right | Apex moved health **bottom-center → lower-left** once TTK lengthened — placement is an attention decision |

FPS nuance: the *property* (number vs bar vs icon) matters more than
position — **numeric** displays won on success rate, but players
**subjectively preferred bars** despite worse performance. `[?]` Fighting
`[C]`: Guilty Gear Strive made the Burst meter a moving/dynamic display,
criticized because a life-or-death resource must be checkable in a
fraction of a second.

## Game feel / juice (the HUD side)

- **Juice is information delivery**: every action should get feedback;
  juice tells the player "the hit connected / this was a crit." The
  **rule of three** — visual + audio + kinesthetic (haptic) fire together
  or the hit feels hollow (Jonasson & Purho, *Juice It or Lose It*, GDC
  2012).
- **Polish is the third layer, not the whole** (Swink, *Game Feel*):
  juice amplifies an already-good simulation; on a weak one it makes the
  weakness *more* visible. `[?]`
- **Calibrate by hierarchy**: small actions get small rewards,
  exceptional get exceptional — if every hit is a screen-filling
  explosion, the significant event loses its punch. `[C]` over-juice.
- **The Vlambeer kit** (Nijman, *Art of Screenshake*): muzzle flash
  (white first frame), **hit flash** (enemy solid white 1–3 frames),
  impact pops, **screen shake** on fire/explosions, **hitstop/sleep**
  (freeze a few frames on impact, scaled by severity: light ≈2 frames,
  heavy ≈8–10).
- **Damage-number crunch**: encode type/magnitude/crit via size + color +
  motion; avoid the "12 +4 reads as 124" stacking bug; double-code for
  colorblind players (Tim Cain, "Damage Numbers").
- **Bars show state, not deltas**: a trailing **ghost/chip bar**
  communicates *how much* was just lost — which is why floaty numbers
  exist alongside meters (Raph Koster).
- **Alert juice**: low-health vignette + heartbeat (meta UI), "ammo low"
  color pulse, timer flash + SFX in the final seconds, empty-clip click
  on dry-fire.
- **Reward popcorn**: XP/level-up, kill-confirmed flash, loot beams
  meeting the HUD — sequence and stagger so rewards don't collide; sync
  audio (crit = distinct stinger). Hades is the exemplar (per-hit
  sound + particles + shake + reaction). `[P]`
- **Juice needs toggles**: screen shake, chromatic aberration, motion
  blur, flashing — now standard accessibility options, not optional
  ([accessibility.md](./accessibility.md)).

## Readability & moment-to-moment UX

- **Where the eye goes**: players fixate a small central region (reticle/
  character); put survival-critical info near gaze or make it readable
  peripherally. Far corners cost reaction time ("perceiving without
  looking").
- **Peripheral vision is colorblind by nature**: cone scarcity in the
  periphery means hue is hard to read out of the corner of the eye —
  peripheral elements should rely on **motion, size, shape, brightness**,
  not color.
- **Glanceability**: status must read in a single glance — high contrast,
  distinct silhouettes, flat clean bars over flashy portraits.
- **Contextual HUD**: show elements only when relevant (ammo when
  wielding a gun, stamina only while exerting). Reduces clutter without
  losing info.
- **Combat HUD vs exploration HUD** — the current consensus "best of
  both": GoW "Immersive mode" strips meters/compass/threat arrows;
  Horizon pioneered **tap-to-reveal then fade**; GoW Ragnarök maps it to
  a DualSense swipe. The dynamic HUD (hidden in exploration, summoned in
  combat) is the modern default. `[P]`

## Sources

Fagerholt & Lorentzon, *Beyond the HUD* (Chalmers 2009) · Dev.Mag
diegesis article · With A Terrible Fate "Aesthetics of UI" · Ars Technica
(Beaver) / Polygon GDC 2013 (Ignacio) — Dead Space · Space Ape / Goomba
Stomp — Metroid Prime visor · Benoit Perreault — Far Cry 2 · Iacovides
et al. "Removing the HUD" · York/IEEE GEM 2015 + ScienceDirect 2018 (FPS
displays) · UX Collective (Guilty Gear) · WeakAuras2 / nateboyer / tfbn
(MMO) · GameDeveloper "Long Dark HUD UI" · Justin Lee (Apex) · Swink
*Game Feel* (2008) · Nijman *Art of Screenshake* (2013) · Jonasson &
Purho *Juice It or Lose It* (GDC 2012) · Tim Cain "Damage Numbers" ·
Raph Koster "Notes on game feedback" · GameDeveloper "Perceiving without
looking". Flags: racing/Crysis/Halo specifics are lightly sourced; the
perf-vs-preference and expertise-moderates-immersion results are
single-study (suggestive, not settled); Halo's meta-vs-diegetic
classification is genuinely contested.
