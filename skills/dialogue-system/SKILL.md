---
name: dialogue-system
description: >-
  Architecture blueprint for dialogue systems across open-world, RPG, and
  narrative games: the dialogue graph data model (flow/text/conditions as three
  separate stores, branching-structure patterns, storylet/quality-based and
  salience-based narrative), the runtime session (input/camera/HUD scope,
  in-world staging as data, voice-end advancing, interruption policies), barks
  and the Valve fact-matching model, narrative-design mechanics (skill-check and
  dice-roll dialogue, dialogue wheels vs full-text, reactivity budgets, delayed
  consequence, timed/real-time conversation, internal-voice systems),
  presentation (typewriter, auto/skip, backlog, deep subtitle accessibility),
  and the authoring/VO/localization pipeline (writer tools — Ink/Yarn/articy,
  line IDs, lip-sync, RTL/CJK, text expansion, AI/LLM-driven NPCs and the
  SAG-AFTRA constraints). References: BotW/TotK and Genshin (datamined), Valve
  GDC 2012, Disco Elysium, Baldur's Gate 3, Mass Effect, Witcher 3, Oxenfree,
  with Unity 6 / UE5 mappings. Use when designing or building NPC conversations,
  dialogue trees, skill-check dialogue, barks, subtitles, VO pipelines,
  generative NPCs, or when players get stuck in dialogue mode, text overflows in
  German, NPCs freeze mid-routine, or a dialogue wheel misrepresents the line.
---

# Dialogue System

Build the dialogue layer of a game — graph, runtime, narrative-design mechanics,
presentation, and the authoring/VO pipeline. In-world dialogue focus: cutscenes
are out of scope (`cinematic-system`); procedural dialogue cameras live in
`camera-system`. References: BotW/TotK + Genshin (datamined graph/text/conditions),
Valve GDC 2012 (barks), and the Western-RPG canon (Disco Elysium, Baldur's Gate
3, Mass Effect, Witcher 3, Oxenfree) for narrative mechanics.

## The architecture rule

**Flow, text, and conditions are three separate stores — the graph never
contains text, only references.** Both reference games ship this separation, and
it is the foundation of localization, VO, and versioning.

```
GRAPH       flow only — line nodes + nextDialogs edges; a choice is fan-out;
            BotW: 5 event types (Action/Switch/Fork/Join/Sub-flow) suffice
TEXT        per-language tables addressed by stable key; rich-text control tags
            (color, pauses, ruby, gender variants) live IN the text
CONDITIONS  queries on world state (quest/flags/time/weather/player state)
EVENTS OUT  dialogue notifies; consumers decide (end-of-talk = a quest event)
```

## Reference map

| File | Covers |
| --- | --- |
| [graph.md](./graph.md) | The two datamined shapes (Genshin flat nodes, BotW 5 events), conditions, the text format, AND branching-structure patterns (Ashwell's taxonomy: time cave / gauntlet / branch-and-bottleneck / hub-and-spoke), storylet/quality-based and salience-based narrative for combinatorial control |
| [runtime.md](./runtime.md) | The session scope (capture + finally-restore), staging as data (the BotW AISchedule gold mine), look-at, voice strategy, the bark arbiter and the Valve fact-matching model |
| [narrative-design.md](./narrative-design.md) | Skill-check / dice-roll dialogue (Disco Elysium white/red checks, BG3 visible DCs), dialogue wheels vs full-text (the Mass Effect/Fallout 4 paraphrase backlash), the reactivity budget, delayed consequence (Witcher 3), timed/real-time conversation (Oxenfree), internal-voice systems |
| [presentation.md](./presentation.md) | Typewriter reveal, auto/skip modes (the Genshin skip cautionary tale), backlog, and deep subtitle accessibility (size, speaker ID, reading speed, dyslexia, screen-reader, the cert-tag standards) |
| [pipeline.md](./pipeline.md) | Writer tools compared (Ink/Yarn/articy/Twine/in-engine), line-ID and lock-then-record VO workflow, localization depth (RTL/CJK, ICU plural/gender, expansion budgets), lip-sync tiers, AND AI/LLM-driven NPCs (the architecture, the hard problems, the SAG-AFTRA 2025 terms) |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with real incidents, debugging order, ship checklist |

## The session and the barks (summary)

- **A dialogue session is a scope**: capture input/camera/HUD/NPC-AI on entry,
  restore in a `finally` on EVERY exit path (normal, death, teleport, load). The
  stuck-in-dialogue bug class is a missing finally.
- **Staging is actor data, not code** (the BotW lesson): turn-to-face, approach
  reactions, rain variants, routine resumption all live in AISchedule.
- **Barks are a separate system**: gameplay *requests*, a central arbiter
  *decides* (priority, cooldowns, history, muted during sessions). The reference
  is Valve's GDC 2012 fact-matching model.
- **The VO strategy is a cost decision made early**: partial VO (Genshin voices
  story quests only; BotW voices cutscenes only) with per-line `soundId` keys.

Full detail in [runtime.md](./runtime.md).

## Build order (4 shippable tiers)

```
Tier 1 — Graph and session
- [ ] Line nodes + edges + choice fan-out; text as keys from day one
- [ ] The session scope (capture + finally restore); Started/LineChanged/Ended
- [ ] Typewriter reveal + advance; line-by-line skip
- [ ] Graph validation at import (every node reaches a terminal)
Tier 2 — Conditions, staging, voice
- [ ] Condition gates via the world-state store
- [ ] Staging data: turn-to-face, look-at ramp, approach reactions
- [ ] VO by line ID; voice-end advance as OPT-IN; partial-VO first-class
- [ ] Events out: end-of-talk → quest-system; mid-line actions
Tier 3 — Mechanics and presentation
- [ ] Choice UI: dead-window, separate advance/select, consequential confirm
- [ ] Narrative mechanics chosen (skill-check / wheel / reactivity model)
- [ ] Auto mode (text-aware delay), skip-with-summary, backlog
- [ ] Subtitle accessibility: ≥32px scalable to 46, speaker ID, 2×40
Tier 4 — Pipeline and scale
- [ ] Writer tool → runtime import automated, validated on every sync
- [ ] VO pipeline: text-lock before recording, files by line ID, pickup tracking
- [ ] Localization: pseudo-loc, +30–40% budgets, ICU plural/gender, RTL/CJK
- [ ] Lip-sync tier decision; (if used) generative-NPC tiering + guardrails
```

## Key numbers (starting points — sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Corpus scale | Genshin v4.5: 170,202 lines, 2,422 speakers; 424,011 VO files | datamine |
| Reading rates | adult silent ~238 wpm; subtitles 160–180 wpm; Netflix 20 cps | academic/official |
| Subtitle size | default ≥32px @1080p, scalable to 46px (≥200%); cert tags | Xbox/AGI |
| Disco Elysium check | active 2d6 + skill ≥ DC (double 1 fail / double 6 success); % shown | wiki |
| BG3 check | d20 + ability + proficiency ≥ DC; Inspiration reroll (cap 4) | bg3.wiki |
| Skip reality | Genshin still has NO general skip; HSR 3.4 skip-with-summary is the model | chronology |
| VO costs | SAG-AFTRA $551/h (1 voice); AI Real-Time Generation = 7.5× scale min | official |
| Localization | DE +10–35%, Arabic ~+30%, short strings +100–200%; ICU plural forms | industry |
| Generative latency | conversational gap ~200ms; >1s noticeable, ~3s collapses presence | research |

Full sourced tables (with flagged "do-not-invent" gaps) in each reference file.

## Engine mapping (summary)

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Middleware | Yarn Spinner 3.x · Ink · Dialogue System for Unity | Narrative Pro · Mountea · custom DataAsset graphs (Dialogue Voice/Wave semi-abandoned) |
| Typewriter | TMP `maxVisibleCharacters` (rich-text safe) | UMG rich text + custom reveal |
| Text/loc | Localization package (line ID → String + Asset tables) | `FText` + String Tables; native `|plural()`/`|gender()` |
| VO audio | Vorbis + Streaming; Addressables per language | Sound Waves + Concurrency; Submix ducking |
| Lip-sync | uLipSync · SALSA · OVRLipSync (legacy) | MetaHuman Animator (offline/editor, no runtime) |

Full detail in [runtime.md](./runtime.md) and [pipeline.md](./pipeline.md).

## Related skills

- `quest-system` — end-of-talk as a quest event; the shared-NPC lock.
- `cinematic-system` — cutscenes host facial/lip-sync production; shared session
  scope discipline.
- `camera-system` — the dialogue camera consumes session events (180° rule).
- `hud-system` — HUD hiding during sessions; subtitle rendering.
- `enemy-ai-framework` — NPC schedules, approach reactions, the dialogue lock.
- `world-time-weather` — time/weather condition gates on lines.
- `save-persistence` — dialogue-seen flags, first-meet state, narrative variables.
