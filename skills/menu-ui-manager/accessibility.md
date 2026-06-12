# Accessibility — standards, screen readers, inclusive UI

Menu/UI accessibility. Legal/cert items are dated (today = 2026). Tagged **[LEGAL]**
statutory / **[CERT]** platform / **[BP]** best practice / **[?]** uncertain. **This
is not legal advice — verify the current law for your markets.**

## Standards & legal landscape

- **Game Accessibility Guidelines (GAG)** [BP]: the community standard — tiered
  Basic/Intermediate/Advanced, prioritized by reach × impact × cost. A prioritization
  aid, not a checklist.
- **Xbox Accessibility Guidelines (XAG)** [BP]: ~23 numbered guidelines (101 Text, 102
  Contrast, 104 Subtitles, 106 Screen Narration, 107 Input, 108 Difficulty, 112–114 UI
  Navigation/Focus, 117 Motion, 118 Photosensitivity). Explicitly *not* a legal
  checklist; tied to the optional MGATS testing service.
- **APX (AbleGamers)** [BP]: 22 design *patterns* (a design language) split into Access
  + Challenge patterns.
- **CVAA (US)** [LEGAL]: covers in-game **text/voice/video chat** (Advanced Comms
  Services) — must be locatable, operable, and work with assistive tech. In force for
  games since 1 Jan 2019 (the waiver expired). Only covers comms, not gameplay.
- **EAA (European Accessibility Act)** [LEGAL]: enforceable since **28 June 2025**. Games
  aren't named but aren't exempt — it reaches **storefronts/IAP/subscriptions, in-game
  chat, and web/mobile service elements** (built on EN 301 549 → WCAG 2.1/2.2 AA). Per-
  game scope is still settling in member-state law `[?]`.
- **Accessible Games Initiative (AGI)** [BP]: announced GDC 2025 by the ESA + major
  publishers — **24 storefront tags** with defined criteria (Narrated Menus, Clear Text,
  Large & Clear Subtitles, Full Input Remapping, Save Anytime…). Voluntary, self-attested
  — Xbox is replacing its own tags with AGI equivalents.
- **WCAG mapping**: games aren't web — use **WCAG2ICT** to map WCAG A/AA to software. Key
  menu SC: 1.4.1 Use of Color (A), 1.4.3 Contrast (AA), 1.4.4 Resize Text 200% (AA),
  2.3.1 Three Flashes (A).

## Screen readers & TTS for menus

- **The requirement**: every focusable/interactive/informative element needs a **label,
  role, value, state**; focus changes announced; dynamic text via **live regions**;
  logical navigation order (XAG 106/112–114; AGI "Narrated Menus").
- **The architecture — a parallel accessibility node tree**: engines do NOT expose UI to
  OS screen readers out of the box (Unity/Unreal/Godot<4.3 are "black boxes"). Build an
  **AccessibilityHierarchy of AccessibilityNodes separate from the visual tree** — each
  node carries label/role/value/state/frame + parent-child. On focus move, update the
  tree + fire notifications. **Flatten** deep nesting. Bridges: the Unity Accessibility
  module (Narrator/VoiceOver/TalkBack), Unreal `SlateAccessibility`, Godot 4.3+, and
  **AccessKit** (the cross-platform 2026 approach wrapping Windows UIAutomation + macOS
  AX).
- **Exemplars**: The Last of Us Part II (the landmark built-in TTS — narrates all menus/
  prompts/tutorials, auto-enables on console TTS, remembers menu position); GoW Ragnarök
  (a screen reader for select menus); Madden (a **boot-time welcome/accessibility screen**
  reachable *before install completes* — "if settings aren't accessible, they may as well
  not exist").
- **The "label everything" rule**: auto-labels work for text buttons but **fail for
  icon-only buttons, image tiles, sliders, custom widgets** → give explicit labels
  ("Inventory", not "Button 3") + value announcements ("Music volume: 60%").

## Visual accessibility

- **Colorblind** [BP; 1.4.1]: three types (protanopia/deuteranopia red-green, tritanopia
  blue-yellow). **"Never color alone"** — pair every color meaning with icon/shape/
  label/pattern. Offer **per-type presets** (not one global toggle), ideally with
  intensity + live preview. Safe pairs: blue/orange, blue/yellow.
- **Contrast** [AA]: text 4.5:1, large 3:1; **High-Contrast mode ≥7:1**; opacity-adjustable
  backgrounds behind text.
- **Text size** [BP/AGI/XAG 101]: minimum default 26 px @1080p console / 18 px PC; must
  **scale to 200%** (WCAG 1.4.4) without loss of content; icons scale too.
- **Fonts** [BP, contested `[?]`]: no single "dyslexia-friendly" winner (research
  inconclusive) — offer **choice** (default + OpenDyslexic + a clean sans like Atkinson
  Hyperlegible); sans-serif > serif; bold (not italic/underline) for emphasis.
- **Reduce-motion** [XAG 117]: toggle camera shake, parallax, idle animations; read the
  OS "reduce motion".
- **Photosensitivity** [2.3.1]: the **Three-Flashes rule** (no >3 general or >3 red
  flashes/s, flash area ≤25% of the central 10° field; avoid sequences >5 s). Test with
  the **Harding Test (FPA)** or PEAT. **Never label anything "epilepsy safe"** — name the
  effect ("Screen Flash Effects").

## Motor accessibility

- **Full input remapping** [BP/AGI]: any action → any control (not just preset swap).
- **Hold-vs-toggle — "toggle for everything"** [BP]: convert every required *hold* (aim,
  sprint, ADS) to toggle/auto; **Disable UI Input Hold** in menus (press not hold).
- **Input-method independence** [AGI]: playable with buttons-only / keyboard-only /
  mouse-only / touch-only; playable *without* motion controls / rapid presses; single-
  stick; **switch access**; Xbox Controller Assist (two controllers act as one).
- **No-QTE-fail / button-mashing alternatives** [BP]: hold-instead-of-mash or auto-
  succeed/skip.
- **Adjustable timing / no-timeout** [XAG 116]: extend/disable time limits, self-paced
  prompts.

## Cognitive accessibility

- **Difficulty options** [XAG 108/AGI]: ≥4 presets ideally, adjustable any time,
  **decoupled** (combat vs puzzle vs platforming), non-denigrating labels.
- **Clear language** (never instructions by text alone — reinforce with visuals/speech);
  **tutorials/reminders** (replayable, control + objective reminders during gameplay);
  **waypoints/objective clarity** [XAG 109]; reduce-clutter; "don't punish" options (save
  anywhere, pauseable); **consistent navigation** (settings saved/remembered).

## Hearing (menu-relevant)

- **Subtitle config UI** [AGI/XAG 104]: min 32 px @1080p console, scale to ≥46 px;
  sans-serif option; adjustable background container + opacity + a solid-black option;
  speaker ID (name + non-color-only); ≤2 lines. Captions ≠ subtitles (captions include
  SFX) — see `dialogue-system`.
- **Separate volume sliders** (Master/Music/Dialogue/SFX/Cinematics/Cues/TTS — the TLOU2
  model); a **mono audio** toggle; visual sound indicators.

## Build it in from day one

- **The parallel accessibility node tree** (above) is the foundational menu-framework
  decision — bolt-on later = a rebuild.
- **The settings-as-data registry** (see [settings-screens.md](./settings-screens.md))
  feeds **presets** (Vision/Motor/Hearing) and wires to systems (post-process for
  colorblind, input-mapping for controls, gameplay params for difficulty).
- **"Label everything" discipline** at creation time; a **boot-time accessibility
  screen**; **read platform settings** at launch (HC mode, font scale, reduce-motion, OS
  TTS, caption prefs).
- **Test with real screen readers** + a CI check that every focusable element has a
  label/role. **Why retrofitting is expensive** `[?, single-source ~3–5×]`: auditing
  hundreds of widgets, refactoring hardcoded input, redesigning color-dependent UI.

## Flagged gaps — do NOT invent

Dyslexia-font efficacy (inconclusive) · EAA per-game scope (settling in member-state
law) · the 3–5× retrofit cost (single-source) · GoW Ragnarök reader breadth · NDA'd
platform cert texts (MGATS, Sony/Nintendo).

## Sources

gameaccessibilityguidelines.com · learn.microsoft.com/gaming/accessibility (XAG) ·
accessible.games (APX) · fcc.gov (CVAA) · theesa.com / accessiblegames.com (AGI) ·
EAA analyses (twobirds, levelaccess) · w3.org WCAG2ICT · Unity/Unreal accessibility
docs + AccessKit · naughtydog.com (TLOU2) · playstation.com (GoW Ragnarök) · Can I Play
That? / AbleGamers.
