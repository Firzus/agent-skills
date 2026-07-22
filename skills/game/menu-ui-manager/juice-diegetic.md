# Juice & diegetic — feel, in-world UI, identity, boot

The feel and identity layer. All numbers are **starting points**. Uncertainty
flagged `[?]`.

## UI juice & micro-interactions

The core principle — **"maximum output for minimal input"** (Gabler/Purho; the
foundational talk is Jonasson & Purho *Juice It or Lose It*, GDC 2012). Juice is
**information delivery**, not decoration — it tells the player "the game heard you".

- **Every interaction has feedback**; stack it across **≥3 channels** (the "Rule of
  Three" — visual + audio + kinesthetic/haptic). A response with only one channel feels
  hollow.
- **Button states**: hover = a tiny scale-up (~1.03–1.06) + subtle glow; press = a quick
  scale-down/"press-in"; disabled = reduced motion + lower contrast.
- **Easing**: appearing → ease-out; disappearing → ease-in; tiny feedback → short
  ease-out. **Timing budgets**: simple feedback (hover/press) ~100–200 ms; large
  transitions ~200–400 ms; frequent interactions bias shorter.
- **Sound is the highest-ROI juice** (Purho: "the most cost-effective thing you can
  add"). The UI audio loop = distinct click/confirm/back/error/disabled sfx; keep UI
  sounds <0.3 s, subtle, mutable, functional without audio.
- **Juice without distraction**: over-signaling → noise + fatigue. Align every effect to
  one target emotion (the "Juice Intention Matrix") so audio/visual/animation speak the
  same language; don't over-animate constantly-updating elements (ammo, HP ticks).
- **Exemplars**: Persona 5 (menus *are* juice), Hades ("even opening a menu is an
  opportunity to draw you into its world"), Tetris Effect (input quantized to music).

## Diegetic vs non-diegetic UI (the 4-quadrant model)

Two axes (Fagerholt & Lorentzon, *Beyond the HUD*, 2009): exists in the **fiction**
(characters aware?) × exists in the **3D space**.

| Type | In fiction? | In 3D space? | Example |
| --- | --- | --- | --- |
| **Diegetic** | yes | yes | Dead Space RIG spine health bar; holographic inventory |
| **Non-diegetic** | no | no | a traditional 2D overlay health bar, minimap, classic menu |
| **Spatial** | no | yes | Dead Space's floor "locator" trail; world-space objective markers |
| **Meta** | yes | no | blood splatter / red vignette on damage; regenerating-health flash |

- **Dead Space** is the reference AAA diegetic execution (Dino Ignacio, GDC 2013): health
  = a light strip on Isaac's RIG spine; inventory/map = in-world holograms that **do NOT
  pause the game** (real-time menus = sustained tension). "Diegetic by design *and* by
  implementation."
- **The diegetic tradeoff (immersion vs clarity)**: pure commitment hurts usability —
  Dead Space's holographic 3D map **largely failed at navigation**; the fix was the
  spatial **floor locator** added late. **Classify per element; mix quadrants.** Diegetic
  UI works for first-person/single-character/horror framing; non-diegetic overlays win
  for dense data (maps, inventories, fast reference). Accessibility caveat: diegetic/meta
  cues often need redundant audio/visual backups (see [accessibility.md](./accessibility.md)).
- **Metroid Prime's visor** is diegetic HUD projected inside Samus's helmet (it shifts
  when she jumps/takes damage; her face reflects in muzzle flashes, used sparingly); the
  Scan Visor turned UI into a core mechanic.

## Spatial / 3D menus (the menu-as-a-place)

- **3D menu scenes & character showcases**: live 3D-rendered models reacting to lighting/
  animation (Genshin's character screen, GoW's gear room `[?, observational]`).
- **Menu-as-a-place / diorama menu**: the frontend is a navigable *location* (Persona 5
  Velvet Room, Destiny's Tower, Souls bonfire hubs) — reinforcing fiction + ownership.
- **Parallax depth**: even 2D UIs gain depth via parallax layers + slight camera drift.
- **Implementation**: UE World-Space vs Screen-Space `WidgetComponent`; Event Dispatchers
  decouple widget↔actor (rotate the character, swap the camera, update stats); GoW
  Ragnarök's UI deep dive documents a **message-queue hierarchy** and tutorial-length
  limits (≤1–2 steps in gameplay, ≤7 in menus before players mash).

## Menu art direction & identity (UI as brand)

- **Persona 5** is the canonical "UI as brand statement" (Masayoshi Sutoh, CEDEC 2017):
  **color first** (P5 = passionate red, "pop punk / anti-establishment"); a strategic
  origin (UI became a low-cost marketing lever); **readability technique** (avoid
  sub-colors to protect the red; a central white guide line steers the gaze); **motion =
  identity** (ransom-note typography, diagonals, the protagonist slamming the menu into
  frame).
- **Hades** treats codex/Mirror/keepsake screens as a cohesive illustrated design system;
  **NieR: Automata** uses a minimalist machine-POV beige UI `[?, synthesis]`.
- **The principle**: UI communicates **tone before gameplay** — typography, color, layout,
  and motion form a cohesive language that signals genre and attitude on the title screen.
- **Reference tooling**: the **Game UI Database** and **Interface In Game** (searchable
  archives of AAA menu flows).

## Loading screens & transitions

- **The loading-screen minigame**: the Namco patent (US 5,718,632, filed 1995, **expired
  Nov 2015**) — load a small auxiliary game and run it while the main game loads (Ridge
  Racer → playable Galaxian). Its breadth chilled adoption for ~17 years; the workaround
  was using *main-game* code (FIFA / Assassin's Creed loading interactions).
- **Mask-the-load techniques**: loading tips/lore, attract footage, and **seamless
  transitions** (elevators, slow doors, camera pushes) hiding streaming — GoW's
  single-shot "no-cut" design. **Hero transitions** carry a motif (logo, character) across
  screens for continuity.

## Boot-to-gameplay flow & first impressions

- **The title → attract → main-menu sequence**: the title screen is "a book cover" — a
  tone-setting statement before interaction.
- **Why "Press Start" exists** (multi-cause): cert (interaction within a window +
  attract mode), **identify the primary controller / active profile**, a user-agnostic
  "safe" landing zone, and arcade attract-mode heritage.
- **Cold-open vs menu-first**: title-first sets mood; cold-open (GTA has dodged the prompt
  for ~20 years; the PC/VR trend) maximizes immediacy. Minimize time-to-first-interaction;
  avoid unskippable logo chains.
- **Settings-on-first-boot / accessibility prompt** [emerging BP `[?]`]: surface critical
  settings (text size, contrast, colorblind, reduce-motion, subtitles) at first boot —
  "from the first screen, not as a post-launch patch" (see [accessibility.md](./accessibility.md)).

## Flagged gaps — do NOT invent

Lollipop Chainsaw juice (illustrative, no dedicated source) · NieR:Automata art
direction (synthesis) · GoW "3D gear room as scene" (observational) · per-game
"seamless/no-loading" claims (verify individually) · the first-boot settings prompt
(emerging best practice, not a formal standard).

## Sources

Jonasson & Purho *Juice It or Lose It* (GDC 2012) · GameJuice.co.uk (Juice Intention
Matrix) · Gamine AI (UI animation timing) · Fagerholt & Lorentzon *Beyond the HUD*
(2009) · Dino Ignacio *Crafting Destruction* (Dead Space UI, GDC 2013) · Metroid Prime
visor analyses · Persona 5 UI panels (CEDEC 2017) · 80.lv (GoW Ragnarök UI deep dive) ·
interfaceingame.com / Game UI Database · EFF / Google Patents (Namco patent) · Kill
Screen (Press Start history).
