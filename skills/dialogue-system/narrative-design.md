# Narrative design — checks, wheels, reactivity, real-time

The dialogue *mechanics* layer: how conversation becomes gameplay. Complementary
to the data model in [graph.md](./graph.md). Sources inline; uncertainty flagged.

## Skill-check / stat-gated dialogue

**Disco Elysium** — the deepest stat-gated system shipped (24 skills, each also a
personified internal voice):

- **Passive checks** run silently; auto-pass if `skill + modifiers ≥ difficulty`
  (effective resolution ≈ `skill + 6`). Success *unlocks* extra lines/info.
- **Active checks** are chosen as options, resolved by **2d6 + skill + modifiers ≥
  difficulty** (double 1 = auto-fail, double 6 = auto-success; probability shown
  on hover).
- **White vs red**: white checks are **retryable** (raise the skill or change
  conditions); red checks are **one-shot and permanent** — and *failing a red
  check sometimes yields a better story outcome than passing*. **Failure is
  content, not a dead end** — the single most important lesson for branch design.
- **Modifiers are the reactivity engine**: one check can stack ~10 modifiers from
  prior choices, clothing, internalized thoughts, or drugs.

**Baldur's Gate 3** — visible-DC tabletop dice: `d20 + ability + proficiency ≥
DC` (DC ladder 5/10/15/20+; crit 1 auto-fail), with **Inspiration** re-rolls
(earned by acting to your Background, shared across party, cap 4) and
Advantage/Disadvantage (roll 2d20 keep higher/lower). Choices are **full-text**.

**Fallout** — two eras: NV gates on SPECIAL + skills + perks with the threshold
shown inline (`[Speech 50]`, largely deterministic); Fallout 4 **removed** skill
checks (Charisma-only, color-tiered, no number) — the regression case. Cyberpunk
2077 / Pentiment gate on attribute minimums / background traits (deterministic,
not a roll).

**Two philosophies**: *expose the math* (DE %, BG3 DC) builds tension and trust;
*hide it* (Fallout 4 color tiers) risks feeling arbitrary. Visible DCs + delayed
*consequences* is the modern sweet spot.

## Dialogue wheels vs full-text

**Mass Effect's position-encoded wheel**: top = Paragon, bottom = Renegade, left
= investigate, right = advance — position encodes *tone*, not content. The wheel
shows an **abridged paraphrase**; the spoken line occasionally diverges in tone →
the "betrayal" community reaction ("save before conversations").

**Fallout 4's 4-option cross** is the canonical failure: one-word labels that
collapse to filler when content < 4, and map ambiguously to the spoken line
(sometimes triggering unintended combat).

**The lesson**: backlash tracks **fidelity + consequence**, not the wheel/list
form — Witcher 3 uses paraphrase too and was praised. The design axis: *paraphrase
wheel* (voiced protagonist, cinematic, position-encoded, risk of misread) vs
*full-text list* (silent/limited-VO protagonist, precise, verbose — DE/BG3). Pick
per your protagonist's voicing.

## The reactivity budget

Reactivity is **a budget, not a feature**. Lead writer David Gaider's lesson:
honoring past choices "always feels like it's never enough" because players who
want reactivity actually want a whole diversionary plot a game can't afford
(Dragon Age: The Veilguard carried over only 3 Inquisition choices).

Author for **line-level reuse across state** instead of alternate chapters:

- Ask "can this *existing* scene read differently based on prior state?" not "can
  we afford an alternate scene?"
- Layer consequences in **3 tiers**: immediate social reaction → medium-term
  access/info change → long-term perception.
- Track state as flags (quest done), enums (faction standing), counters
  (companion approval — Dragon Age gives each of 9 companions an independent
  approval value modified even when not addressed).
- Reconverge every branch (the foldback in [graph.md](./graph.md)).

**Delayed consequence (Witcher 3)** — CDPR deliberately delays the payoff of
choices so you can't reload-and-retry, "granting each decision a sense of
inescapable authenticity" (the Bloody Baron arc). It depends on world geometry:
you revisit the same locations in later acts to *see* consequences cheaply —
harder in Cyberpunk, "you rarely come back to the places you've seen."

## Timed / real-time conversation

Trades *deliberation* for *presence* — makes silence expressive but multiplies
audio/branch cost and demands a **default (no-response) path**:

- **Oxenfree** — 3 speech bubbles appear in real time, often before the NPC
  finishes; you interrupt, wait, or stay silent (silence is the default of not
  picking). The interrupt model required huge extra audio: snippets ("So like I
  was saying…") so an interrupted NPC can resume their point, tone-matched. A mute
  playthrough is fully supported.
- **Firewatch** — interruptible radio: hold to respond; declining to answer is
  supported and the conversation continues.
- **Telltale** — a depleting timer; no choice = a choice; the "X will remember
  that" toast is the explicit reactivity-flagged-into-state signal.

## Internal-voice / tone systems

- **Disco Elysium** — the 24 skills are a Greek chorus, each a personified
  internal voice that speaks through the *same dialogue-tree UI* as external NPCs.
  More skill points → more interjections → the self becomes "a chaotic multitude"
  (self-balancing difficulty: a maxed build floods you with conflicting advice).
- **Citizen Sleeper** — expresses relationship/tone state through visible,
  ticking **clocks** (from Blades in the Dark) rather than chatty skills: Step
  Clocks advance via dice actions and drive new scenes; Cycle Clocks fire
  events/threats. The body's Condition is itself an agency budget (fewer dice as
  you wear down).

## Cross-cutting takeaways

- **Failure-as-content** decouples "fail" from "dead end" (DE red checks, BG3
  fail-branches).
- **Paraphrase vs full-text** is the single biggest UX flashpoint — reception
  tracks fidelity + consequence.
- **Reactivity is a budget** — reuse lines across state, reconverge branches,
  prefer mid-scene reconvergence to alternate scenes.
- **Real-time dialogue makes silence expressive** but needs a default path and
  multiplies audio cost.

## Flagged gaps — do NOT invent

Exact Fallout NV pass model (deterministic threshold + some perk bonuses) ·
Cyberpunk/Pentiment exact check thresholds · the Todd Howard FO4-dialogue mea
culpa exact quote.

## Sources

Disco Elysium Wiki (Skills, Thought Cabinet) · gamepressure (DE checks) · bg3.wiki
(Dice rolls, Inspiration) · Mass Effect Wiki (Dialogue) · Game Developer (Witcher
3 vs Fallout 4 case study) · IGN "Masters of Choice and Consequence" (Sasko) ·
thegamer (Gaider reactivity interview) · Oxenfree dev interviews (mcvuk, Adam
Hines) · Citizen Sleeper Wiki (Dice, Clocks).
