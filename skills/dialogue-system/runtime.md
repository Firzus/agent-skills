# Runtime — session, staging, voice, barks

The live dialogue machinery. All numbers are **starting points**. Primary
sources: zeldamods (AISchedule), the Genshin datamines, Valve GDC 2012.

## The session scope

Entering dialogue mutates N systems — input context, camera (`camera-system`
contract via `DialogueStarted(speaker, listener)` / `DialogueLineChanged` /
`DialogueEnded` events), HUD visibility (`hud-system`), NPC AI (schedule pause).
The session **captures state on entry and restores it in a finally** on every
exit path: normal end, player death, teleport, save/load, NPC destruction. One
session manager, one active session; concurrent initiations refused or queued.

Neither reference game pauses the world during dialogue (Genshin's clock keeps
running; in co-op, guests keep running while the host talks — the session is
per-player, not a world state).

## Staging as data (the BotW gold mine)

AISchedule fields make conversational staging actor data:

- `MoveTalkTurn` / `WaitTalkTurn` (turn to face)
- `ReactionToApproach` + distance (interrupt current activity on approach)
- greeting types; rain variants of *every* field
- `ReturnMoveTimeAfterTalk` (routine resumption delay)

The runtime reads staging; designers author it per actor per schedule block.

**Look-at**: an additive head/eye aim layer — weight ramped over ~0.3–0.5 s
(never snapped), angle-clamped (disengage beyond), line-of-sight checked,
distributed along the chain (eyes → head → torso). Engine traps: aim constraints
on the bone itself get overwritten by animation (use a sibling); the wrong aim
axis sends gazes to the floor (pitfalls #6).

## Voice

- **Line ↔ audio by stable ID** (`soundId` per dialog node). Text-only lines are
  first-class: the partial-VO model is a shipped strategy, not a degenerate case.
- **Two cost strategies, both shipped**: Genshin voices Archon/Story quests, not
  world quests — 4 VO languages as separately downloadable packs (14–18 GB each);
  BotW voices only key cutscenes with ~13 characters (the stylized dodge: grunts
  + text elsewhere).
- **Voice-end advancing is a parameter, not a hardcode** (Yarn's
  `endLineWhenVoiceoverComplete` + post-line wait): auto mode advances on line end
  and **pauses on choices** (the Genshin v1.2 behavior).

## Barks

A separate system from sessions. Gameplay **requests** a bark; a central arbiter
**decides**:

- priority categories (session dialogue > scripted barks > ambient)
- per-line and per-category cooldowns
- a played-history for anti-repetition
- muting during sessions and cutscenes
- Playing / Queued / Rejected outcomes

For context selection at scale, the reference is **Valve GDC 2012 (Ruskin,
L4D/TF2/Dota)**: world state as facts, a rule base matched fuzzily, the most
specific rule wins, special cases added without touching code (see [graph.md](./graph.md)
for the rule-DB model) — plus Naughty Dog's context-aware dialog (TLoU) and
Firewatch's interruptible-conversation system as complements. BotW's data
equivalents: approach reactions in AISchedule and `ShoutMsg` one-shot subtitled
gameplay lines.

## Interruption policy

An explicit policy matrix decided in design, per category:

- **ambient bark** — silently interruptible
- **optional conversation** — pause-resume, or fade out with a break line
- **critical dialogue** — player locked (the BotW stance, rigid; walk-and-talk
  games pay the full pause-resume machinery — see [narrative-design.md](./narrative-design.md))

## Engine mapping

| Generic block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| Look-at | Animation Rigging Multi-Aim (constraint on a sibling, never the bone) + scripted weight ramp | Control Rig aim / AnimBP Look At node, blended weight |
| VO audio | Vorbis + Streaming + Load In Background, no preload; Addressables per language | Sound Waves + Sound Concurrency; ducking via Audio Bus + Submix Dynamics |
| Bark arbiter | central VO manager service emitting Play/Queue/Reject | subsystem + Sound Concurrency rules |

## Flagged gaps — do NOT invent

Genshin auto-mode delay rules · Genshin mouth-flap tech (visual observation only)
· lines-per-recording-session heuristics.

## Sources

zeldamods (AISchedule, Message archives) · Genshin / genshin-voice datamines ·
Valve GDC 2012 (Ruskin — dynamic dialog) · Naughty Dog GDC (context-aware dialog)
· Firewatch GDC 2017 · Yarn Spinner docs (voice-end advance parameter).
