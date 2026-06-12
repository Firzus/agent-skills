# Pipeline — tooling, VO, localization, lip-sync, AI NPCs

The authoring and production layer. All numbers are **starting points**. Tagged
**[SHIPPED]** / **[DEMO]** / **[HARD]** standard / **[BP]** best practice.

## Writer tools compared

| Tool | Model | Loc + VO | Scale ceiling | Shipped |
| --- | --- | --- | --- | --- |
| **Ink** (inkle) | markup-first script → JSON; weave/knots/tunnels/threads/lists; you build the UI/DB layer | tag-based IDs, DIY CSV | very high (millions of words) | 80 Days, Heaven's Vault, Sorcery! |
| **Yarn Spinner** | node + script `.yarn`, `#line` IDs, markup, storylets/saliency; Unity/Godot/Unreal runtimes | strong: String + Asset tables, CSV, runtime switch | mid–high | Night in the Woods, A Short Hike |
| **Twine** | passage/link hypertext → HTML; story formats (Harlowe/SugarCube) | weak/DIY | low–mid (Tweego for big) | Depression Quest, Nocked! (>1M words) |
| **articy:draft** | visual DB / single source of truth; one-click export | strong: in-app, Excel, DeepL, VO ext | highest (AAA) | Disco Elysium, Hogwarts Legacy |
| **In-engine** (Aurora, Creation Kit) | conversation + script editors, full game-state access | engine loc pipeline | high (in-engine) | Neverwinter Nights, Skyrim |

Whatever the tool: **automated import to runtime with validation on every sync**.
Testing tools matter — Ink-Tester runs a story thousands of times for a coverage
report (zero-hit lines = unreachable); Yarn's VS Code extension does live
validation + graph view; theorem-prover verification (Yarn Story Solver) detects
soft locks and unreachable content.

## The VO pipeline

Line ID → recording script (with director-context fields) → audio files named by
line ID → integration + lip-sync data.

- **Text-lock before recording**; separate spoken-text vs subtitle fields for
  deliberate divergence (pitfalls #4); pickup-session tracking per script version.
- **Costs**: SAG-AFTRA $551/h (1 voice) / $1,102/4 h (up to 3 voices).
- **Audio**: Vorbis −70/80% or Opus (~4 KB/s); streamed, load-in-background, no
  preload; per-language packs on demand (pitfalls #10).

## Localization depth

- **Line-ID generation is the keystone**: the same key indexes the String Table
  (text) and the Asset Table (VO). Lock IDs/text → export → translate + record
  against stable IDs → re-import.
- **Expansion budgets** [HARD]: DE +10–35%, FR +15–25%, short strings +100–200%,
  Arabic ~+30%; CJK contracts. Design **dynamically scalable containers**, never
  fixed-width. Validate early with **pseudo-localization** (inflated accented text
  catches overflow, hardcoded strings, concatenation).
- **Grammar** [HARD]: use **ICU MessageFormat** for plural + gender — never if/else
  or concatenation (plural-form counts: English 2, Russian 3, Arabic 6, Japanese
  1). Full sentences with named placeholders so translators can reorder. (UE's
  `FText` `|plural()`/`|gender()` is Epic's own CLDR formatter, not ICU; Unity
  Smart Strings conflict with Yarn `{}` interpolation.)
- **RTL (Arabic/Hebrew)** [HARD]: bidi rendering (HarfBuzz/UBidi) + UI mirroring
  (menus, progress bars, lists) — but **do NOT mirror** spatially-meaningful UI
  (minimaps, timelines). Engineering cost ≈ 2–3× European loc.
- **CJK** [HARD]: per-character line-breaking (kinsoku, no inter-word spaces),
  vertical text, ruby/furigana.
- **Throughput**: ~2,000–2,500 words/day/translator. Genshin ships 15 text
  languages vs 4 voice — text scales, voice doesn't.
- **Sim-ship vs post-launch**: simultaneous shipping needs loc folded into dev
  (string externalization, locked-but-living strings); post-launch is cheaper
  upfront but fragments the audience and risks late RTL/CJK UI surprises.

## Lip-sync tiers

Mix tiers by content importance:

- **Mouth flaps** (rhythmic open/close — the observed Genshin standard-dialogue
  level).
- **Auto visemes** (phoneme → viseme → blendshapes, ~15 shapes: OVRLipSync 15,
  Rhubarb 6–9; Hogwarts Legacy shipped 50k lines × 8 languages with audio-driven
  auto lip-sync).
- **Facial capture** for cutscenes (`cinematic-system`).

UE5 MetaHuman Animator does audio-to-face offline (5.5+) and editor Live Link
(5.6+) but has **no official in-game runtime** (Epic-confirmed).

## AI / generative NPC dialogue (the frontier)

State (2024–2026): mostly **[DEMO]** (Ubisoft NEO/Teammates, NVIDIA ACE Covert
Protocol) with some **[SHIPPED]** (KRAFTON inZOI "Smart Zois", the Skyrim Mantella
mod, Suck Up!). The architecture and constraints:

- **Pipeline**: STT (Whisper/Riva) → retrieval/grounding → LLM → guardrails → TTS
  (ElevenLabs/Riva) → facial anim (Audio2Face).
- **Tiered routing** [BP] (the dominant cost/latency pattern): ambient/barks → a
  1–3B on-device SLM (~80–300 ms, ~zero marginal cost); named NPCs → 7–8B
  edge/device; plot-critical → a frontier cloud model (400–1200 ms, show a wait
  affordance). **Don't call a frontier model for a greeting.**
- **Grounding / RAG** [BP]: tiered memory (working ~20 turns / episodic vector /
  long-term knowledge graph); GraphRAG + constrained decoding physically forbids
  generating entities outside the lore trie; inject a fact/constraint XML block
  before each call.
- **Hybrid authored + generative** [BP]: generative fills freeform/ambient;
  authored holds the critical path.

**The hard problems**:

- **Hallucination / canon violation** — a wrong fact is a lore-breaking story
  event, not a typo (no perfect fix; mitigate with RAG + constrained decoding).
- **Latency** — the human conversational gap ≈200 ms; cloud roundtrips add 1–3 s;
  >1 s is noticeable, ~3 s collapses presence. Prompt caching helps.
- **Cost** — ~100 LLM calls/session; at ~1M DAU cloud inference reaches seven
  figures/month → on-device is "the difference between a game that ships and one
  that doesn't".
- **SAG-AFTRA** [HARD][date-sensitive]: the 2025 Interactive Media Agreement
  (ratified July 2025) requires informed "clear and conspicuous" consent for any
  digital voice replica; **Vocal Digital Replica pay = per ~10-word line**;
  **Real-Time Generation (embedded AI chatbot) = 7.5× scale minimum**; usage
  report within 90 days of release.
- **Non-determinism vs QA** — stochastic output breaks deterministic test scripts
  (needs eval harnesses); generated text bypasses the authored loc pipeline.

**Where it fits** [BP]: generative wins for ambient barks, crowd chatter,
"infinite" side NPCs, freeform Q&A; **authored stays** for critical-path beats,
branching quests, anything needing deterministic flags, guaranteed canon, and
certifiable QA.

## Flagged gaps — do NOT invent

Per-conversation cost figures and OPEX are illustrative estimates · Ubisoft
NEO/Teammates remain prototypes (no ship date) · vendor latency/cost-reduction
claims are first-party · SAG-AFTRA terms current as of the 2025–2028 MOA (verify
before citing).

## Sources

inkle/ink + Yarn Spinner + articy + Twine docs · Sam Kabo Ashwell (structure) ·
Elan Ruskin GDC 2012 · SAG-AFTRA 2025 IMA (sagaftra.org) · Ubisoft NEO/Teammates
PR · NVIDIA ACE / Audio2Face docs · Inworld AI · Mantella (Nexus Mods) · ICU
MessageFormat / W3C i18n · OVRLipSync / Rhubarb / Speech Graphics (Hogwarts
Legacy) · MetaHuman Animator docs.
