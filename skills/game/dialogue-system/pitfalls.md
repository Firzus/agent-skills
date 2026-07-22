# Pitfalls — the 16 classic dialogue-system failure modes

Each: symptom → root cause → prevention. Read before designing;
re-read when a player gets stuck in dialogue mode or the German build
overflows every box. Deep dives: [graph.md](./graph.md),
[runtime.md](./runtime.md), [narrative-design.md](./narrative-design.md),
[presentation.md](./presentation.md), [pipeline.md](./pipeline.md).

## 1. Text embedded in logic

- **Symptom** — localization impossible; a rewrite breaks branches;
  VO files no longer match their lines.
- **Root cause** — hardcoded lines in code/graphs; comparisons on
  choice *text* (`if choice == "Accept"`); VO filenames derived from
  English content.
- **Prevention** — every string is a localization key (the universal
  line-ID pattern: Yarn injects `line:` tags, UE Dialogue Waves carry
  a localization GUID); choices carry stable IDs; VO named by line
  ID, never by content.

## 2. The unskippable dialogue

- **Symptom** — replay/alt-account rage; mandatory slow typewriter;
  third-party auto-skip scripts appear (they did for Genshin).
- **Root cause** — skip never designed as a first-class feature; fear
  of breaking quest triggers by jumping lines.
- **Prevention** — per-line skip + sequence skip from day one; **world
  events triggered by dialogue execute even when skipped**. The
  shipped model: HSR 3.4's skip-with-summary. The cautionary tale:
  Genshin's verified chronology (4.5 hangout-repeats only → 5.0
  Quick Start which skips *prerequisites* not dialogue → 5.8
  time-skip) — years of demand, still no general skip.

## 3. Session state leaks

- **Symptom** — the player stuck in dialogue mode (input locked,
  camera frozen, HUD hidden) after an abnormal exit; combat
  interrupts and leaves the NPC frozen.
- **Root cause** — entering dialogue mutates N systems with no
  guaranteed inverse transaction; abnormal exits (death, teleport,
  load) bypass the nominal end.
- **Prevention** — the session is one scope: capture on entry,
  restore in a `finally` reached by every path including destruction
  and load. Real case: Skyrim's cell-change-during-conversation
  leaving NPCs repeating their first line with no options.

## 4. Voice/text desync

- **Symptom** — the subtitle says X, the voice says Y.
- **Root cause** — text edited after VO recording; no locked status
  on lines; pickup sessions that never all happen.
- **Prevention** — text-lock before recording discipline; separate
  spoken-text vs subtitle fields for deliberate divergence (UE's
  `SpokenText`/`SubtitleOverride` is this design, shipped);
  re-recorded-line tracking per script version.

## 5. Bark spam

- **Symptom** — an ambient NPC repeating the same line every 10
  seconds; barks talking over session dialogue or cutscenes.
- **Root cause** — gameplay calls PlaySound directly; no central
  arbiter, no priority, no cooldown, no history.
- **Prevention** — a central VO manager: gameplay requests, the
  manager decides (priority categories, per-line and per-category
  cooldowns, anti-repetition history, FIFO by priority, barks muted
  during sessions). References: Valve GDC 2012 fact matching,
  Naughty Dog's context-aware dialog.

## 6. Look-at uncanny valley

- **Symptom** — the head snaps to the player in one frame; eyes track
  through walls or past 180°; broken-neck poses.
- **Root cause** — constraint weight 0→1 instantly; no angular
  limits; no visibility/distance test.
- **Prevention** — ramp the weight (~0.3–0.5 s lerp); clamp angles
  and disengage beyond; line-of-sight check; distribute along the
  chain (eyes → head → torso). Engine traps: aim constraints on the
  bone itself get overwritten by animation (use a sibling); wrong
  aim axis sends gazes to the floor.

## 7. Choice misclicks

- **Symptom** — the wrong choice selected by spam-advancing; choices
  clicked before reading; irreversible picks with no confirmation.
- **Root cause** — the same button advances lines AND validates
  choices; choices appear while the player hammers advance.
- **Prevention** — an input dead-window (~0.2–0.3 s) when choices
  appear; show choices only after the reveal completes (or greyed);
  separate advance and select inputs; explicit confirmation for
  consequential choices. (Consensual craft heuristics — no single
  canonical source.)

## 8. The frozen NPC

- **Symptom** — an NPC stuck facing the player forever; their daily
  schedule never resumes.
- **Root cause** — the NPC-side variant of #3: the in-dialogue AI
  flag isn't released on abnormal paths; the schedule system has no
  recovery.
- **Prevention** — the NPC lock belongs to the session scope (same
  finally); an AI-side safety timeout (an NPC "in dialogue" with no
  valid session for N seconds frees itself); the BotW data answer:
  `ReturnMoveTimeAfterTalk` makes routine resumption part of the
  staging data. Links to the quest-system NPC-lock pitfalls.

## 9. Localization overflow

- **Symptom** — German overflowing dialogue boxes; CJK breaking
  mid-word; name insertion breaking grammar.
- **Root cause** — UI sized on English; string concatenation; no
  testing before translations arrive.
- **Prevention** — +30–40% expansion budget (German; Finnish can
  exceed); auto-sizing layouts; **pseudo-localization from day one**
  (inflated accented text catches overflow, hardcoded strings, and
  concatenation); plural/gender forms in the format string; CJK
  line-breaking rules and ruby support in the text renderer.

## 10. VO memory blowout

- **Symptom** — huge memory peaks/load times; all languages × all
  lines resident.
- **Root cause** — direct AudioClip references (everything referenced
  loads), decompress-on-load on voice, no per-language separation.
- **Prevention** — streamed compressed voice (Vorbis −70/80%, Opus
  ~4 KB/s), load-in-background, no preload; soft references /
  per-language packs loaded on demand (the Genshin model:
  downloadable 14–18 GB packs per VO language); release handles
  after playback; arbitrate streaming overhead (~200 KB/clip) for
  short barks.

## 11. The dead-end conversation

- **Symptom** — a graph with no exit path; all choice conditions
  false → zero choices displayed; a loop without an exit edge.
- **Root cause** — conditions edited with no reachability
  visualization; no validation tooling.
- **Prevention** — graph validation at import/build: every node
  reaches a terminal; every choice group has an unconditional option
  or a fallback; cycle detection for exit-less loops. (Mountea ships
  graph validation as a headline feature — make it a tooling
  requirement, not a nice-to-have.)

## 12. Interruption chaos

- **Symptom** — the player walks away and the dialogue continues to
  empty air; or hard-stops brutally; combat mid-session; two NPCs
  initiating simultaneously.
- **Root cause** — no interruption policy per dialogue category; no
  single session arbiter.
- **Prevention** — an explicit policy matrix: ambient barks
  (silently interruptible) / optional conversations (pause-resume,
  or fade out with a break line) / critical dialogue (player locked
  in a radius — the BotW stance, assumed but rigid; walk-and-talk
  games pay the full pause-resume machinery). One session manager:
  one active session, concurrent requests refused or queued.

## 13. Auto-advance racing the reader

- **Symptom** — auto mode faster than reading; voice-end advance
  cutting off slow readers; no settings.
- **Root cause** — auto timing keyed to the VO clip length or a
  constant, not the text length; no accessibility option.
- **Prevention** — auto delay = `max(VO duration, text length ×
  configurable reading speed) + margin`; typewriter speed and
  auto-delay exposed in settings; voice-end advance opt-in (Yarn's
  parameter proves the point). Reading anchors: 238 wpm silent
  adult, 160–180 wpm subtitle standards. Real bug: Skyrim skipping
  to the next line if the clip ended while paused.

## 14. The 100-condition node

- **Symptom** — spaghetti graphs; conditions scattered across
  hundreds of nodes; nobody knows which states are reachable; the
  writer tool diverges from runtime data.
- **Root cause** — contextual selection (which variant to say given
  world state) encoded as explicit branches instead of a selection
  system; manual writer→runtime export.
- **Prevention** — separate **conversation structure** (the graph,
  small) from **contextual selection** (a rule base — the Valve
  model: fact matching, most-specific-rule-wins, special cases added
  as data); a single writer-side source of truth with automated
  import + validation (#11) on every sync.

## 15. The paraphrase-betrayal wheel

- **Symptom** — the player picks a short wheel option and the
  protagonist says something tonally different; "save before every
  conversation" becomes community advice; choices feel misrepresented.
- **Root cause** — a paraphrase/abbreviated wheel (one or two words)
  whose mapping to the full spoken line is ambiguous, with no fidelity
  guarantee — the Mass Effect "betrayal" and Fallout 4 4-option cases.
  Reception tracks **fidelity + consequence**, not the wheel/list form
  (Witcher 3 paraphrases too and was praised).
- **Prevention** — for a voiced protagonist, keep the paraphrase an
  honest summary of *tone and intent* (position-encode tone, never
  surprise the player); for precision, use **full-text** options
  (BG3/Disco Elysium) at the cost of screen space. Never let a label
  collapse to filler when content < the wheel's slot count. See
  [narrative-design.md](./narrative-design.md).

## 16. Generative-NPC canon/latency/consent failures

- **Symptom** — an LLM NPC states a lore-breaking falsehood; replies lag
  1–3 s and kill presence; the build ships an un-consented voice replica;
  stochastic output breaks QA.
- **Root cause** — calling a frontier cloud model for everything, with no
  lore grounding, no latency budget, no SAG-AFTRA consent process, and no
  eval harness for non-deterministic output.
- **Prevention** — the [pipeline.md](./pipeline.md) playbook: **tier the
  routing** (on-device SLM for ambient, cloud only for plot-critical with
  a wait affordance); **ground with RAG + constrained decoding** so the
  model can't name entities outside the lore trie; budget latency (<1 s,
  prompt-cache toward ~200 ms); secure **SAG-AFTRA-compliant consent**
  (Real-Time Generation = 7.5× scale, 90-day usage report); keep authored
  content on the critical path and scope generative to ambient/optional;
  add a non-deterministic QA eval harness + input/output moderation.

## Debugging order

When dialogue misbehaves: (1) exit a session by every abnormal path
and check input/camera/HUD/NPC state (#3, #8), (2) run the graph
validator on the whole corpus (#11), (3) play in pseudo-loc (#9),
(4) spam advance into every choice menu (#7), (5) trigger two
dialogues + a bark simultaneously (#5, #12), (6) let auto mode run a
text-only unvoiced line (#13), (7) profile memory with all VO
referenced (#10).

## Ship checklist

```
- [ ] Zero text in logic; every line/choice keyed; VO named by ID
- [ ] Skip per line + per sequence; skipped dialogue still fires its
      world events
- [ ] Session scope restores on EVERY exit path (death/teleport/load
      tested); NPC AI timeout in place
- [ ] Text-lock discipline + spoken-vs-subtitle fields in the schema
- [ ] Bark arbiter: priorities, cooldowns, history, session muting
- [ ] Look-at ramped, clamped, vision-checked
- [ ] Choice dead-window + separate advance/select + confirmations
- [ ] Pseudo-loc pass clean; expansion budgets verified in UI
- [ ] VO streamed per-language on demand; memory profiled
- [ ] Graph validator green on the full corpus (no dead ends)
- [ ] Interruption matrix written and tested per category
- [ ] Auto-mode timing text-aware and player-configurable
- [ ] Subtitle accessibility: size options, 2x40 budget, speaker
      indication (beat the reference games — they ship none)
- [ ] Wheel paraphrases honest (tone/intent); or full-text options
- [ ] Generative NPCs (if any): tiered routing, RAG grounding, latency
      budget, SAG-AFTRA consent, authored critical path
```
