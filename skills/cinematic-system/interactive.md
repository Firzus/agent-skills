# Interactive cinematics — the debate, QTEs, agency, branching, player state

The contested design layer: whether to use cutscenes at all, how to give
the player agency inside them, how to branch them by choice, and how to
reflect player state. The linear cutscene tech is in
[timeline-transitions.md](./timeline-transitions.md); skip/replay UX there
too. This is a *contested* area — `[P]` praised, `[C]` criticized heavily,
`[?]` uncertain.

## The cutscene design debate

- **Ludonarrative dissonance** (Clint Hocking, 2007, re: BioShock): the
  story told via cutscenes and the story enacted via gameplay don't align.
  `[C]` the "gameplay-as-superpower gap" — cutscene Kiryu is threatened by
  a gun that does negligible gameplay damage; you can't use hoarded heals
  mid-scene. `[P]` reframe: dissonance can be a deliberate tool (Pathologic
  2 weaponizes jank; Journey makes play *be* the narrative —
  "ludonarrative consistency").
- **The anti-cutscene argument**: academically, cut-scenes are "a non-game
  element… that blocks interaction," felt as "dead." Strong critics (T.Z.
  Barry): games trying to be both movies and games achieve "inferior forms
  of each"; a cutscene "ceases to be a game and turns into mere video."
- **The case FOR cutscenes**: authored emotional beats, pacing, and
  performance you can't guarantee with the player in control. Naughty Dog:
  cutscenes should show *emotional moments*, not big action — "without the
  player's input these scenes show exactly the story the game wants."
  Lemarchand: "the rhythms of the story match the rhythms of the gameplay."
- **Length/frequency criticism — MGS4**: Guinness records — longest single
  cutscene **27 min**, longest sequence **71 min**. The "90-minute
  cutscene" claim is `[?]` internet myth (debunked); totals vary by how you
  count.

## Quick-time events (QTEs)

- **History**: Dragon's Lair (1983, LaserDisc, often no on-screen prompt)
  → Shenmue (1999, Yu Suzuki coined "quick timer events," intent "a fusion
  of gameplay and movie") → God of War (2005) popularized QTE finishers.
- **What a QTE is**: normal input is taken away, the action snaps to a
  cinematic angle, and an **on-screen prompt** appears *because the action
  is outside the character's standard moveset* (Kratos ripping a head).
  Taxonomy: **replacement** QTE (substitutes for a cutscene — Shenmue) vs
  **enhancement** QTE (a reason to invest in cutscene story — RE4).
- **Why controversial** `[C]`: "Press X to Not Die" — failure = game-over →
  forced repetition of the *same cutscene*. QTEs "test reflexes rather than
  morality" (relegating moral choices to QTEs *reduces* moral engagement);
  unwinnable QTEs (GoW II) reinforce "why am I pressing this."
- **Good QTE design — RE4 Krauser knife fight** `[P]`: the QTE is a
  *physical representation* of the hissed dialogue; unpredictable prompts +
  lingering camera create dread; "player and character emotional states
  overlapped." The boulder-dodge telegraphs the threat *before* the prompt
  → the player feels Leon's panic. `[C]` even here: too long, can't skip,
  failure repeats the dialogue.
- **The modern refinement/decline**: RE4 Remake (2023) all but removed
  mid-cutscene QTEs, replacing the Krauser fight with integrated knife-
  **parry** gameplay ("there aren't prompts to press buttons
  mid-cutscene") — reflecting an industry-wide retreat from QTEs.

## Interactive / playable cinematics

- **The Naughty Dog model — "The Active Cinematic Experience"** (GDC 2010):
  parallel gameplay and storytelling. **Seamless transitions** trigger
  cutscenes on **player-initiated forced actions** (jumping off the train,
  walking to a spot) so position/facing match at the cut — ND is "very
  anti-invisible-region to take away control"; every control-taking
  transition should be on a player action. **Variable start positions**:
  the playable→cinematic blend handles arriving in different states.
- **The "Naughty Dog walk"** (slow walk-and-talk exposition): you can only
  walk at a deliberate pace so you bond before the tone flips; mechanics are
  contextually replaced (a punch with no enemy makes Drake clutch his
  wound). `[C]` widely read as a pacing/loading-hiding crutch and agency
  limiter; ND frames it as intentional tone-building. `[?]` "loading-hiding"
  is a community read, not ND's stated rationale.
- **God of War (2018) — the one-shot** `[P]`: the entire game is a single
  unbroken camera (~100 long takes), no cuts even gameplay↔cinematic; the
  player keeps control while the camera shifts into cinematic framing.
  Cost: it loses standard film grammar (shot/reverse-shot, establishers) —
  "like writing a novel without nouns" — solved with snap-zooms,
  choreographed blocking, and **hidden cuts/loads**.
- **Half-Life — the "never take control away" philosophy**: a first-person
  game should "stay in first person the entire time, never break the
  narrative spell." Story is delivered via **in-engine scripted sequences**
  in real time (a scientist killed in front of you), not third-person
  cutscenes — "the narrative had to be baked into the corridors." They
  built a third-person camera but used it once (to simulate first person).
- **The cinematic-game subgenre** (Heavy Rain, Until Dawn, Detroit): blurs
  cutscene/gameplay so QTEs *are* the gameplay; fail-states branch the
  story rather than game-over.

## Branching & choice-driven cinematics

- **The dialogue-choice cutscene — Mass Effect**: the wheel shows
  **paraphrases**, not verbatim lines; spatially consistent (left =
  investigate, right = advance; Paragon top-right, Renegade bottom-right)
  for directional muscle memory. The **cinematic conversation system** uses
  shot/reverse-shot grammar with the camera framing driven by who's
  speaking — which is what makes branching dialogue *cheap to stage* (one
  camera rig serves many variant lines).
- **The Telltale model**: (1) **signal choice importance** even when it
  changes nothing ("[Character] will remember that"); (2) **hard course
  correction** — choices that feel major converge to the same outcome.
  Maximizes scenes-seen per scene-produced.
- **Detroit — the flowchart**: a post-chapter flowchart visualizes every
  decision + unexplored branches + checkpoint replay; short chapters keep
  replay friction low.
- **Until Dawn — the Butterfly Effect** `[C]`: branches are deliberately
  bounded — a variable body count but "broad plot beats always remain the
  same"; the cast funnels back through shared scenes. The basement scene is
  jarringly incoherent when a character is absent — showing how hard
  reactive staging is to hold together.
- **The combinatorial-explosion problem**: 3 choices × 5 conversations =
  243 paths; a binary tree 10 deep = 1,024 endpoints. Management patterns:
  - **Branch-and-bottleneck / branch-and-merge** — branches periodically
    reconverge at fixed beats (Until Dawn, Walking Dead).
  - **Modularization** — isolated state-controlled sub-stories so one
    failure doesn't break the whole.
  - **Separation of concerns** — dialogue = a data graph (nodes/choices);
    progress = a state machine (flags, who's-alive). Variant/conditional
    clips gated by state variables, never hardcoded.
  - **Illusory consequence** — HUD cues for emotional stakes without real
    divergence.

## Player-state-reflective cutscenes

- **The "what weapon is holstered" problem** (Cutscene Equipment
  Mismatch): scenes that snap to generic defaults (Halo 3's assault rifle,
  ME's default Avenger) regardless of loadout. Why: pre-rendered/hardcoded
  scenes, and animation compatibility (arbitrary weapons clip/break).
- **The "respect the animation" fix**: swap to the player's carried weapon
  *of the same class the scene is animated for* (default pistol → your
  heavy pistol; default rifle → your AR) — never force a sniper into a
  pistol animation. The principled middle path.
- **The "canonize-or-reflect" decision**: **canonize** a fixed state
  (cheap, stable, breaks immersion) vs **reflect** the player's actual
  model/state in a realtime in-engine scene (immersive, expensive,
  fragile). SWTOR mostly reflects, so the rare scene that *doesn't* reads
  as a bug — the cost of reflecting most of the time is that exceptions
  look broken.
- **The customized-protagonist / MMO problem (FFXIV)**: cutscenes reflect
  your appearance and weapon (realtime in-engine), but **party members
  aren't shown** (one position loaded). The replay seam: the Unending
  Journey loads only your *current* glamour, and two-character scenes (the
  wedding) can't be replayed. Romance/relationship-state staging is the
  same authoring challenge (variant clips per state) — `[?]` under-sourced
  for cinematic staging specifically.
- **Hiding the seams**: transition on forced actions (the ND model), load
  player data during a brief blackout, restrict the variant axes (weapon
  *class* not exact weapon), or canonize where reflection is infeasible.

## Cutscene UX & accessibility

- **Skip / pause / replay**: unskippable cutscenes are a flashpoint (the
  FFXIV Praetorium fallout influenced later conservatism); skippability is
  the standard defense of long cutscenes. **Pause-during-cutscene** is an
  explicit accessibility expectation (fatigue, planning).
- **QTE accessibility** (the strongest-sourced area): QTEs require rapid
  precision → exclude players with strength/fatigue/speed impairments.
  Mitigations: an **auto-complete toggle** (Spider-Man, The Quarry "Auto"),
  **mash→hold** conversion, and **timing windows** (the Microsoft criterion
  — allow ≥1 s between presses, or no limit). The Quarry exposes QTE/
  choice-timer/interruption speeds (Short/Long/Max/Auto).
- **Subtitles/captions in cinematics**: on/off, speaker ID, font size,
  mixed case, sans-serif, **solid background**; best-in-class (The Quarry)
  adds sizes, colored speaker names, separate SFX **closed captions**, and
  independent volume sliders (pairs with `hud-system` caption rules).
- **Photosensitivity**: avoid high-contrast flashes — the ≤3-flashes/sec
  rule; cinematic explosions/strobes are the common offenders.
- **Audio description (the newest frontier)**: TLOU2 (2020) shipped
  *without* AD even in its celebrated accessibility suite; **TLOU2
  Remastered (2024) added Cinematic Descriptions** (a separate volume
  slider narrating key visual events, "especially valuable in dark
  scenes").
- **The interactive↔passive tradeoff**: interactive cutscenes (QTEs) add a
  motor barrier; passive ones remove agency but are easier to caption/
  describe/pause. The goal is letting each player **choose their position
  on the axis** (auto-QTE + adjustable timers for the motor side; AD +
  captions for the sensory side).

## Sources

Hocking (2007, ludonarrative dissonance) · DiGRA (cut-scenes as non-game)
· T.Z. Barry (anti-cinematic critique) · GDC 2010 "Active Cinematic
Experience of Uncharted 2" · Game Developer "Reflecting on Uncharted 2",
"History of the QTE", "Full Reactive Eyes Entertainment" (RE4) · Variety /
GameRevolution (GoW one-shot, snap-zoom) · Marc Laidlaw "Writing for
Half-Life" / RPS · Mass Effect Wiki + Eludamos (cinematic conversation) ·
JB Oger (Telltale) · Detroit flowchart · Intermittent Mechanism (Until
Dawn) · StoryFlow / MIT Press (combinatorial explosion, branch-and-merge)
· Giant Bomb (equipment mismatch) · SWTOR / FFXIV forums (reflect vs
canonize) · Game Accessibility Guidelines + Microsoft criteria + Can I
Play That (The Quarry) + Naughty Dog support (TLOU2 Remastered
descriptions). Flags: MGS4 totals vary by definition; "ND walk =
loading-hiding" is a community read; romance-state cinematic staging is
under-sourced.
