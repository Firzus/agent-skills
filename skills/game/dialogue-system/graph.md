# Graph — data model & branching structure

How dialogue flow is stored and shaped. All numbers are **starting points**.
Primary sources: the GenshinDialog datamines, zeldamods (BFEVFL, MSBT), Ashwell's
choice-pattern taxonomy.

## Two datamined shapes

- **Genshin — flat nodes, choice as fan-out**: every line is a node with `id`,
  `nextDialogs[]` (the edges), `talkRole` (speaker), and two TextMap hashes (line
  + speaker name). A node fanning out to several player-spoken lines *is* the
  choice menu; exit = an option with an empty array. Dialogs group into **Talks**
  (the triggerable unit). One node type covers everything.
- **BotW — five event types**: Action (an actor function call), **Switch** (an
  actor *query* returning an int + a cases table — this is ALL conditional
  branching), Fork/Join (parallelism), Sub-flow (a callable entry point =
  functions/reuse). Text lives in MSBT archives per language, partitioned by
  purpose (`EventFlowMsg` NPC dialogue, `ShoutMsg` bark subtitles, `DemoMsg`
  cutscenes).
- **Choices carry typed metadata**: Genshin options bear category icons (talk,
  quest, shop, reward) — model the icon/type as choice-node data. Conditional
  choices can be hidden or greyed (decide per choice).

## Conditions

Queries on the world-state store: quest state, flags, items, time of day,
weather, first-meeting vs repeat, player state. The BotW proof that this scales:
systemic reactive lines (NPCs comment on rain, on a naked Link) come from
AISchedule variants + Switch queries — all data, no per-line code.

## Text format

Rich-text control tags live **in the text**, not the graph: color, pauses (named
or in frames), page breaks, ruby/furigana (CJK first-class in MSBT), name
insertion, **gender variants inline** (Genshin's traveler-gender lines vary per
language). BotW goes further: `sound` and `animation` tags trigger effects on the
speaking NPC from inside the text — typographic and performative pacing is
writing data. Budget for this in the parser from day one.

## Branching-structure patterns (Ashwell's taxonomy)

The canonical reference is **Sam Kabo Ashwell, "Standard Patterns in Choice-Based
Games" (2015)**. Pick the structure deliberately — it determines your
state-tracking cost:

| Pattern | Shape | State cost | Use |
| --- | --- | --- | --- |
| **Time Cave** | pure branching, no merges | none | short pieces only (3 decisions ≈ 40 nodes; exponential) |
| **Gauntlet** | one anointed thread, branches die/rejoin fast | minimal | linear stories with local color (many VNs) |
| **Branch-and-Bottleneck** | branches diverge then reconverge at canonical beats | **heavy** | the workhorse of ME / DA / Witcher / BG3 |
| **Hub-and-Spoke** | central hub, optional spokes, return | medium | investigation/conversation hubs (Disco Elysium) |
| **Quest / Open Map** | spatial navigation, revisit | medium | 80 Days |
| **Floating Modules** | content chunks triggered by state | high | the bridge to storylets |

**Combinatorial-management craft rules**:

- **Every divergence should have a known reconvergence.** Before writing a
  branch, name where it merges; if you can't, "you're writing two games."
- **Mid-scene reconvergence** is the high-leverage trick: branch at choice 1,
  fold at 3, branch at 5 → the player feels they shaped the scene; you wrote one
  scene with branch points, not eight scenes.
- The **invisible bottleneck** (branches end on similar nodes without explicitly
  rejoining) is the polished illusion of choice.

## Storylet & salience models (taming combinatorics)

When branching trees explode, switch from authored sequence to **systemic
selection**:

- **Quality-Based Narrative (QBN)** — Failbetter / *Fallen London* (tool:
  StoryNexus). Narrative = **storylets** (atomic chunks: setup → choice → result)
  gated by **qualities** (numeric vars). Each result describes its effects as
  quality changes → the world returns to a stable state, so you "can't get lost
  in big unfinished trees." Handles "gather 3 clues in any order" as 4 storylets
  vs ugly tree repetition.
- **Salience-Based Narrative (SBN)** — the *system* picks the **most specific
  matching** storylet from a pool (specific tags = rare-but-relevant, generic =
  fallback). Easy to add coverage incrementally. Shipped: Left 4 Dead, Firewatch,
  Reigns (weighted-deck variant), Wildermyth.
- **The Valve rule-DB** (Elan Ruskin, GDC 2012): world state as a flat **fact
  dictionary**; a spoken line = a **rule** (criteria set); the engine fuzzy-matches
  and picks the line satisfying the *most* criteria. Writers add special cases /
  running gags as data, no programmer. This is the answer to the 100-condition
  node (pitfalls #14) — and it generalizes beyond dialogue.

## Events out

The dialogue notifies; consumers decide. End-of-talk is a quest event
(`QUEST_CONTENT_COMPLETE_TALK` — the `quest-system` bridge); mid-flow Action
events give items, set flags, play animations. The dialogue system owns none of
these outcomes.

## Versioning is additive by construction

Stable hashes/IDs mean each patch adds TextMap entries (~14,850/version measured
in Genshin) and dialog nodes without touching existing ones; a text fix is a hash
entry replacement, never a graph change.

## Flagged gaps — do NOT invent

TalkExcelConfigData begin-condition fields (obfuscated) · BotW total MSBT message
count · "string of pearls" is industry vernacular, not in Ashwell's named set.

## Sources

GenshinDialog / GenshinTexts datamines · Grasscutter (quest-talk conditions) ·
zeldamods (BFEVFL, MSBT tags, AISchedule) · Sam Kabo Ashwell "Standard Patterns
in Choice-Based Games" (2015) · Failbetter StoryNexus dev diaries (QBN) · Emily
Short "Beyond Branching" (salience/storylets) · Elan Ruskin GDC 2012 (fuzzy
pattern matching).
