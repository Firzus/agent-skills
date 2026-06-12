# Accessibility — standards, visual, captions, motor, cognitive, photosensitivity

The HUD is where most game accessibility is won or lost. Build it in from
day one — features that are *also* good design (clear hierarchy, scalable
text, clean audio cues) are cheap when built in and expensive to bolt on.
The architecture hook is a **settings-as-data options registry**; the
contract is **redundancy** (never one channel for critical info). `[DOC]`
= standard/spec, `[?]` = practice/uncertain.

## Standards & legal landscape

- **Xbox Accessibility Guidelines (XAG)** — prescriptive, testable `[DOC]`:
  - **XAG 101 (text size)** applies to *all* HUD text (bars, waypoints,
    diegetic UI). Console minimum **26 px @1080p** (52 @4K, 17 @720p),
    measured ascender-to-descender; large-text option **38 px @1080p**;
    icon/glyph text ≥13 px @1080p (→26 at 200%). PC/VR have lower minima.
  - **XAG 102 (contrast)**: standard **≥4.5:1**; large text (≥52 px
    console / 36 px PC) **≥3:1**; disabled 2.5:1; **high-contrast mode
    ≥7:1**.
  - **XAG 104** subtitles/captions; **XAG 107** input/motor.
- **Game Accessibility Guidelines (GAG)** — tiered Basic/Intermediate/
  Advanced, community-authored; the standard reference for subtitles,
  color, remapping.
- **APX (Accessible Player Experiences)** — AbleGamers' design patterns,
  inclusive-by-default beyond legal minimum.
- **Legal** `[DOC]`: **CVAA** (US, mandatory since 2019) covers *only*
  Advanced Communication Services (voice/text/video chat + the UI to
  reach them), not the whole game. **EAA** (EU, in force 28 Jun 2025)
  targets e-commerce (in-game stores) and comms, not core gameplay;
  web/mobile fall under EN 301 549 (≈ WCAG 2.1). GPSR is interpreted to
  cover photosensitivity safety. `[?]`

## Visual accessibility

- **Text size & scaling**: baseline 26 px @1080p console; provide scaling
  to **200–400%** of base (400% is common practice, not a hard number).
  `[?]`
- **Colorblindness** `[DOC]`: ~8% of males / ~0.5% of females have CVD;
  **red-green ≈99% of cases** (deuteranomaly ~5%, the most common);
  blue-yellow (tritan) <0.01%, sex-independent.
  - **"Never color alone"** — pair hue with **shape/icon/pattern/text/
    position** (Grounded: meters use color + symbol + text). Verify the
    UI is legible in **grayscale**.
  - **Okabe-Ito / CUD palette** (8 colorblind-safe hexes): orange
    `#E69F00`, sky blue `#56B4E9`, bluish-green `#009E73`, yellow
    `#F0E442`, blue `#0072B2`, vermilion `#D55E00`, reddish-purple
    `#CC79A7`, black `#000000`. Use vermilion (not pure red) for protan
    visibility; avoid the yellow-green range for thin lines.
  - In-game CVD **filters** (daltonization) are a fallback — they can't
    fix info encoded purely by hue. Correct design + redundancy beats a
    post-process filter. `[?]`
- **The backplate/scrim technique**: an opaque/semi-opaque container
  behind text guarantees the 4.5:1 ratio over any busy scene — explicitly
  accepted by XAG as sufficient to meet contrast. (Also the fix for
  pitfall #11, readable-in-studio-unreadable-in-combat.)
- **High-contrast HUD mode**: a dedicated ≥7:1 restyle (flatter, opaque
  backs). **Reticle/crosshair customization** (size/color/shape/opacity)
  is a low-vision aid — tech in [world-space.md](./world-space.md).

## Subtitles & captions

- **Subtitle vs caption** `[DOC]`: subtitles = spoken dialogue; captions
  = dialogue **+ non-speech sound events** (`[eerie creaking, left]`,
  `[gunfire]`).
- **Numbers** (GAG + broadcast): **≥46 px @1080p** (notably larger than
  the 26 px UI min), **≤40 chars/line**, **max 2 lines**; reading pace
  ~15–20 cps, min on-screen ~1.5–2 s, linger ~0.3–0.5 s after audio;
  solid/semi-opaque letterbox + outline, mixed case, sans-serif,
  bottom-center.
- **Speaker labels** (XAG 104): show the name when the speaker changes
  (not every line); re-show after a long pause; color may distinguish
  speakers but **never as the only cue** (pair with the name).
- **Directional indicators**: an arrow showing the screen-relative
  direction of an off-screen speaker; suppress for on-screen speakers.
- **Reference suite — TLOU2**: subtitle size/color, dark-background
  toggle, per-speaker name colors, directional arrows, enemy-combat-
  dialogue subtitles, plus a one-click HoH preset bundling awareness
  indicators, pickup notifications, and dodge prompts. "Customization is
  king" — ship font / size / speaker mode / edge effect / letterbox /
  opacity as separate options.

## Motor & input

- **Hold-vs-toggle** (XAG 107): any sustained hold (aim, sprint, fire)
  offers a toggle/auto alternative; the **HUD must reflect the current
  toggle state**.
- **Full remapping** of all controls in-game (analog + digital), per-axis
  invert. Avoid simultaneous multi-button requirements, mashing, and
  time-dependent inputs (offer as supplementary only); support switch/
  eye-tracking devices.
- **Aim-assist feedback**: give a clear on-HUD confirmation (reticle
  snap/state) so the player understands assist is active. `[?]`

## Cognitive accessibility

- **Reduce clutter** via per-element visibility; a clear visual hierarchy
  doubles as a low-vision aid.
- **Objective reminders & "where do I go" support**: on-demand objective
  recap and waypoint/guidance systems framed explicitly as **cognitive
  accessibility** (reducing memory load), not just convenience.
- **The redundancy principle (the core rule)**: **never deliver critical
  info on a single channel.** Pair health bar + screen-edge vignette +
  audio heartbeat; damage = bar + directional indicator + audio. All-audio
  excludes deaf players; all-visual excludes blind/low-vision. This is a
  **system contract**, and the event-driven HUD fits it: one game event
  fans out to bar + vignette + audio.
- **Reading support**: a dyslexia-friendly font option, generous timing
  on auto-advancing text.

## Photosensitivity

- **Three-flash rule** (WCAG 2.3.1) `[DOC]`: content must not flash **>3
  times in any 1-second window**, *or* stay below the general/red flash
  luminance thresholds, *or* keep the flashing area small (≤25% of any
  10° visual field). **Red flashing is specially dangerous** → a separate
  stricter test. The low-HP heartbeat and damage flash must respect this
  cap (pitfall: a low-HP pulse above 3 Hz).
- **Testing**: **Harding FPA** is the commercial standard for games/
  broadcast (ISO 9241-391, 2023 red-flash update); **PEAT** is free but
  **non-commercial only** (prohibited for shipping games). Never claim
  "epilepsy-safe" — provide reduction options.
- **Player controls**: flash-intensity slider, screen-shake slider/off,
  damage-flash cap, disable bloom/strobe.

## Architecture implications (build it in from day one)

- **Settings-as-data options registry**: model accessibility options as
  **data** (`{id, type, range, default, target element(s)}`) consumed by
  the HUD layer — not hard-coded toggles. This enables the "customization
  is king" breadth without bespoke code per option.
- **Per-element visibility / scale / opacity / backplate**: every HUD
  element exposes these so global presets (HoH, low-vision, high-contrast,
  reduced-motion) are just stored option bundles (the TLOU2 one-click
  preset model).
- **Redundancy as a contract**: critical events fan out to ≥2 channels by
  design — the same property the [elements.md](./elements.md) event bus
  already provides.
- **Day-one beats retrofit**: scalable text, clean audio cues, and a
  responsive control scheme are cheap when built in and a refactor when
  bolted on at the end.

## Sources

Microsoft Learn — XAG 101/102/104/107 · gameaccessibilityguidelines.com ·
AbleGamers APX · Accessible Games Initiative tags (Mar 2025) · FCC CVAA
guide; IGDA GA-SIG "Demystifying EAA & GPSR"; Player Research EAA (2025) ·
Naughty Dog TLOU2 accessibility blog; Game Developer "How to do subtitles
well" · Okabe & Ito CUD (jfly); EIZO CUD handbook; PMC global CVD review ·
SpecialEffect DevKit; GDC "Accessibility Best Practices: Mobility" · W3C
Understanding SC 2.3.1 + G19; Harding FPA / PEAT docs; PMC
"International Guidelines for Photosensitive Epilepsy". Flags: 400%
scaling upper bound is practice not a hard XAG number; GPSR
photosensitivity applicability is an evolving legal interpretation.
