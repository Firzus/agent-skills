# Design craft — sound design, genres, accessibility, pipeline

The design/craft/process layer of game audio: how sounds are built, how
genres use audio, how to serve deaf/HoH players, and how an audio team
ships. The engineering (mix, DSP, spatial) is in
[music-mix.md](./music-mix.md), [dsp-synthesis.md](./dsp-synthesis.md),
and [spatial.md](./spatial.md). `[P]` praised, `[C]` criticized, `[?]`
adage/uncertain.

## Sound design craft

- **Audio is half the feel**: the industry adage (Lucas-attributed) — the
  sound carries the *weight*, *punch*, and *juice*; without hit-
  confirmation audio a strike "doesn't connect." Audio turns an animation
  into an *impact* at relatively low cost. `[?]` (the ratio is an adage,
  not a measurement)
- **Layering — the foundational technique**: a "single" sound is a stack
  of separately-treated layers. The canonical gunshot = **Mech**
  (mechanical action — personality), **Body** (the detonation core — "if
  I kept one layer it's this"), **Top/Transient** (high-freq attack —
  makes it cut the mix), **Sub/Punch** (low-end weight), **Tail**
  (decay/reverb — context and distance, often isolated so it can swap by
  environment: forest vs desert vs interior). Tiny timing offsets between
  transient and body change the *perceived size*.
- **Foley**: performed everyday sound (footsteps, cloth, object handling)
  re-recorded for physicality, mounted on animation states (God of War's
  armor Foley "sells" the weight).
- **Hyperreal vs realistic**: pure realism often sounds thin/poppy (a
  real gun sample has "no oomph"); the dominant practice is
  **hyperrealism** — exaggerate for emotional readability (TLOU2 Infected
  gore recorded wet and high-frequency for a *sickening* feel). `[C]` too
  much hyperreal causes fatigue; minimalism (Inside/Limbo) proves the
  inverse.
- **Audio readability — "can you play with your eyes closed?"**: every
  important gameplay event needs a *distinct* sonic signature (the
  accessibility guideline: "sound choices for each key object/event are
  distinct"). Audio is an information channel parallel to the visual.
- **Diegetic vs non-diegetic**: source-in-world (footsteps, Silent Hill's
  radio, an RDR2 saloon band) vs a layer for the player (score, UI
  stinger). Deliberately blurring the two is a craft signature (the radio
  static is *both* diegetic and a tension cue).
- **Signature sounds / audio branding**: the memorable mark — the Halo
  choir, the Hearthstone clicks, the Mario coin, a menu *click* — builds
  identity and tactile satisfaction.
- **Worldizing** (Walter Murch): replay a sound through a speaker in a
  real space and re-record it to capture that room's acoustic print; in
  games, approximated by convolution/IRs. Gives spatial credibility a dry
  studio can't.
- **Frequency-slotting / mix-by-frequency**: carve spectral space so
  *everything* is heard — subtractive EQ (cut before boost), high-pass
  anything without sub, complementary EQ (boost the voice at 3 kHz, cut
  the guitar there). The mud zone is ~200–500 Hz. The
  [dsp-synthesis.md](./dsp-synthesis.md) EQ tools serve this craft goal.
- **Reference tracks**: work against an audio-direction doc and creative
  references written *before* the first proto (Returnal).

## Genre conventions

| Genre | Key convention | Canonical | Detail |
| --- | --- | --- | --- |
| Horror | silence as tension; drop the music-cue; sound ~3 frames *before* the visual | Silent Hill | diegetic radio static = enemy proximity; "lack of sound impresses more than beautiful music" (Yamaoka) |
| Horror (binaural) | voices placed in 3D around/inside the head | Hellblade | binaural mics, voices co-designed with real voice-hearers `[P]` |
| Rhythm | sample-accurate sync; audio drives gameplay; the **latency-calibration** problem | Crypt of the NecroDancer | beatmap logic client-side (never networked); DSP clock not frame clock; per-device calibration offset |
| Fighting | heavy hit sounds + voice; audio cue for state/frame data | Killer Instinct | dedicated audio HUD sliders (KV/shadow meter) playable without sight |
| Racing | engine-RPM synthesis; gear/turbo/skid in modular layers | sim racers | one tonal model recombined by RPM/load; contextual skid tail |
| Shooter | "gun feel" by layering; whizz-by; **footstep meta = info-warfare** | CS2, Valorant | footstep radius + surface; in-engine HRTF > virtual 7.1; imaging > soundstage |
| MOBA/MMO | ability readability; a distinct spell-callout per cast | LoL/Dota | each cast = a unique signature for the opponent's reaction `[?]` |
| Platformer | ultra-satisfying short tonal feedback | Mario | the coin = audio branding + immediate feedback |
| Stealth | **sound propagation as a mechanic**; detection cue | Splinter Cell/MGS | player noise propagates and triggers the AI; audio states = detection states |
| Strategy | unit acknowledgments; audio-as-notification | StarCraft II | separate sliders; unit barks = order feedback |

## Music composition & implementation craft

- **Write FOR interactivity**: music must be loopable, layerable, with
  **key/tempo discipline**. RDR2's narrative score kept the *same tempo
  and key* to avoid clutter when stems stack (~15 stems → ~6).
- **Leitmotif / theme system**: a theme per character/boss, re-
  instrumented by context. Journey uses *one* evolving theme — the
  **cello = the player** ("a concerto where you are the soloist").
- **Vertical vs horizontal (composer side)**: vertical = layers added/
  removed by intensity; horizontal = transitions between segments. The
  composer must write *abrupt-but-musical* changes ("you never know when
  the player reaches a point"). (Engine side:
  [music-mix.md](./music-mix.md).)
- **Melodic identity vs ambient texture**: the hummable Mario/Zelda
  melody as a brand, vs Silent Hill *removing* melody to unsettle.
- **Licensed vs original**: original gives leitmotif/interactive control;
  licensed gives cultural anchoring (GTA radio). **Music-as-reward**: the
  boss-defeat fanfare, the Zelda puzzle jingle.
- **Mick Gordon — DOOM 2016**: built a "DOOM instrument" — sine + noise
  pushed through analog chains (distortion, bit crushers, tape echo) to
  *corrupt* the pure signal; a 9-string guitar morphed with the original
  chainsaw SFX. Lesson: *change the process to change the result.* (`[C]`
  separate the process lesson from the later id conflict.)
- **Austin Wintory — Journey**: a dynamic score where themes move *with*
  the player imperceptibly — reconciling adaptivity and musicality.
- **Adaptive music criticism** `[C]`: badly-managed transitions feel
  *disjointed* — abrupt cuts, audible repetitive loops, "music that
  doesn't know what to do" in prolonged combat. The main complaint about
  poorly-implemented vertical/horizontal music.

## Audio accessibility (the audio side)

- **Sound-effect captions** (beyond dialogue): caption significant
  non-verbal sounds (footsteps, an off-screen explosion) — "no essential
  information conveyed by sounds alone" (GAG). Pairs with the HUD-side
  caption rules in `hud-system`.
- **Directional / positional captions**: any important info conveyed by
  audio (the direction a shot came from) must be replicated in text/
  visuals — a damage-direction indicator, a footstep radar.
- **"Visualize sound" — Fortnite** `[P]`: a sound-viz wheel — colored
  rings by type (red = gunfire, gold = chests, white = footsteps),
  opacity = distance, rotating with the player = direction. 10/10 from
  Can I Play That; on by default. `[C]` history: enabling it once *muted
  all audio* — now visual + audio coexist. Cross-benefit: a competitive
  edge for hearing players too.
- **Mono audio toggle**: for unilateral hearing, sum L+R to both channels
  so nothing on the "bad side" is missed; must be **in-game**, not just
  OS (Diablo III, XAG 105). Ideally ship a dedicated mono mix.
- **Separate volume sliders as an accessibility feature**: Master /
  Music / SFX / VO / voice-chat / narration, each independent — for
  frequency-dependent hearing loss and auditory processing disorder.
- **Dynamic range / "night mode"**: a compression option for low-volume/
  headphone listening and for hard-of-hearing players (raises quiet
  sounds) — the Naughty Dog presets in [music-mix.md](./music-mix.md).
- **Haptics as an audio substitute**: vibration relays sonic info (damage
  direction, impact). The haptics toggle/slider is mandatory (can cause
  pain/overload). Returnal designed DualSense haptics *with* the 3D audio
  as a parallel tactile channel.

## Production pipeline & team

- **Team roles**: Audio Director (vision + final mix), Sound Designer
  (SFX/Foley), Composer (score), Technical Sound Designer / Audio
  Programmer (middleware implementation, systems, perf), Dialogue/VO lead
  (casting, sessions, ADR). TLOU treated Clicker vocalizations *as
  dialogue* (states: unaware/sleeping → aggressive) scripted with anim +
  AI teams.
- **Asset pipeline**: record → edit → implement (middleware) → mix →
  master; isolated tails, many variations (anti-repetition: "buckets of
  sound called randomly").
- **VO production**: directed sessions, **ADR** (re-records as a
  character evolves — FFXVI's Clive over ~4–5 years), **localization VO
  at scale** (25+ languages): script *adaptation* (≠ translation — respect
  rhythm, breath pauses, lip-sync), native casting per market, the source
  audio as a reference loc-kit. Loc often starts *before* the original
  finishes (a moving target).
- **Naming-convention / asset management**: strict naming + metadata +
  versioning, indispensable at multi-language volume; engine-ready.
- **Middleware handoff**: the designer/composer *authors* in Wwise/FMOD
  (events, RTPC/parameters, states, buses); the programmer exposes the
  gameplay hooks.
- **Mixing as a final pass**: the mix is a dedicated pass (not linear like
  film, because interactive); dynamic mixing (ducking/sidechain) keeps
  dialogue intelligible (God of War side-chains minor sounds under a Troll
  attack or Kratos/Atreus banter; RDR2's "Gunfight Conductor" AI arbitrates
  the mix live). Plus a **vertical-slice audio pass** and dedicated audio
  QA (occlusion, voice priority, dialogue intelligibility).

## Case studies — technique + lesson

- **DOOM 2016**: analog-corruption synthesis + legacy-SFX-morphed guitar.
  *Change the process to get a sound that doesn't exist as a preset.*
- **God of War 2018**: one-shot camera → no cuts to hide audio
  transitions; sidechain to prioritize dialogue/impacts. *In a continuous
  flow, dynamic mixing is the key to narrative intelligibility in combat.*
- **The Last of Us**: Clickers = echolocation, 100% human voice, treated
  as dialogue with emotional states; a breathing system tied to the
  character's state. *Treat creature SFX as a character (states, emotion,
  randomization) for terror and credibility.*
- **Hellblade**: binaural-recorded voices co-designed with voice-hearers +
  a neuroscientist. *Audio can be the central narrative mechanism* —
  needs expert consultants; `[C]` mostly lost without headphones.
- **Returnal (PS5 Tempest)**: 3D audio as *gameplay* (mix priority to
  unseen enemies, verticality), sound rays generating real-time
  reflections, coupled haptics. *3D audio as a survival mechanic, not a
  gimmick.*
- **Red Dead Redemption 2**: systemic ambiences by region/weather/time +
  ~6–11 vertical stems driven by the Gunfight Conductor AI, key/tempo-
  fixed narrative score. *Systemic ambient detail + harmonic stem
  discipline = a living world without clutter.*

## Sources

GDC: Mick Gordon "DOOM: Behind the Music" (2017), "Sound Design for God
of War", "Aural Immersion / Breathing Life into The Last of Us", Wintory
"Journey vs Monaco", Yamaoka GDC 2005, GTAV audio (2014) · A Sound Effect
(God of War, Returnal) · Designing Sound (Chuck Russom gun design,
worldizing, RDR interview) · PlayStation Blog (Tempest/Returnal) ·
Naughty Dog (Clickers) · Telegraph/Mixonline (RDR2/Woody Jackson) · Game
Accessibility Guidelines + Xbox Accessibility Guideline 105 + Accessible
Games Initiative + Can I Play That (Fortnite 10/10) · mastering.com /
Splice (frequency slotting, gun layering) · Lionbridge/SandVox (VO loc) ·
Ninja Theory dev diary / BBC Science Focus (Hellblade). Flags: the "50%"
ratio is an adage; Inside/Limbo lacks a sourced talk in this batch; MOBA/
stealth/platformer conventions are described by principle.
