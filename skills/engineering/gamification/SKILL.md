---
name: gamification
description: >-
  Gamification design for products, apps, and game meta-layers: design an
  engagement, habit, or retention system; choose or audit mechanics (points,
  badges, leaderboards, streaks, progress bars, variable rewards); diagnose
  mechanics that backfire (novelty decay, demotivated users, streak churn);
  or run an ethics / dark-pattern check.
---

# Gamification

Design game elements into a non-game context so they serve a real behavioral
objective — not "add points and badges". The evidence says gamification works
**modestly and contextually**: small effect sizes that shrink further under
methodological rigor, and benefits that decay with novelty. So every mechanic
must earn its place by mapping to a motivational need.

Two reference files, loaded on demand:

- [mechanics.md](./mechanics.md) — per-mechanic catalog: evidence, when to use, when it backfires.
- [frameworks.md](./frameworks.md) — the named frameworks (Octalysis, 6D, HEXAD, Hooked, RECIPE) and how they fit together.

## Motivation core

Four load-bearing facts. Every design decision below leans on at least one.

1. **SDT — three needs drive intrinsic motivation** (Deci & Ryan; PENS):
   **competence** (mastery, granular feedback, tuned difficulty), **autonomy**
   (meaningful choice, no coercion), **relatedness** (teams, community).
   Mechanics are only delivery vehicles for these needs.
2. **Overjustification** (Deci, Koestner & Ryan meta-analysis): expected
   tangible rewards for an already-interesting activity *reduce* intrinsic
   motivation. Informational feedback (progress, mastery signals, praise) and
   unexpected rewards do not. Never bolt rewards onto what users already love.
3. **Flow channel** (Csikszentmihalyi): challenge must track skill — too far
   above → anxiety, too far below → boredom. Onboarding starts below current
   skill and ramps; let users pick their own challenge level where possible.
4. **B = MAP** (Fogg): a behavior fires only when Motivation, Ability, and a
   Prompt converge. If the missing piece is ability, **simplify the action
   instead of gamifying it**.

## Design process

Follow the steps in order. Mechanics are step 5, not step 1 — mechanics-first
copying of points-badges-leaderboards is the failure mode behind Gartner's
famous 80%-failure prediction (a practitioner prediction, not a study, but
its rationale matches the empirical failure literature).

### 1. Define the objective

Name the business or behavioral outcome and a measurable target that is *not*
an engagement vanity metric (DAU, session length). "Users complete their first
project within a week", not "users open the app more".

**Done when**: the objective is written down with a metric a stakeholder
outside the feature would recognize as valuable.

### 2. Delineate target behaviors

List the specific, observable user actions that produce the objective. Run
each through B=MAP: is the blocker motivation, ability, or prompt? Behaviors
blocked on ability get simplified, not gamified; behaviors blocked on prompt
get a trigger, not a reward.

**Done when**: every behavior has a named blocker (M, A, or P) and only the
motivation-blocked ones proceed to gamification.

### 3. Describe the players

Segment the audience (HEXAD types in [frameworks.md](./frameworks.md) — most
users respond to meaning, autonomy, and social connection, not competition)
and assess baseline intrinsic interest. High existing interest triggers the
overjustification rule: informational feedback only, no tangible rewards.

**Done when**: you can state which segments exist, what each responds to, and
whether the tangible-reward path is open or closed.

### 4. Design activity loops

Two loops, both explicit:

- **Engagement loop** (short): action → feedback → next action. Feedback is
  immediate and informational.
- **Progression loop** (long): onboarding → mastery → endgame. Keep the
  difficulty inside the flow channel across the whole arc.

Plan past the honeymoon: novelty decay is a recurring finding across the
literature, and a **post-reward reset** (effort dips right after a goal is
reached) is documented — so design what a month-three user does, not just a
day-one user.

**Done when**: both loops are sketched, and the post-novelty / post-reward
phases each have a designed answer.

### 5. Choose mechanics from motivation, not fashion

For each candidate mechanic, write the SDT need (or Octalysis drive) it
serves; a mechanic with no mapping is decoration and gets cut. Cross-cutting
defaults that survive the literature:

- Informational feedback over controlling rewards.
- Cooperation over global competition.
- White-hat drives (epic meaning, accomplishment, creative empowerment) as
  the foundation; black-hat drives (scarcity, unpredictability, loss) only
  as short accents, never the engine.

The per-mechanic rules — evidence, use-when, backfires-when, and the
non-negotiables like relative leaderboards, streak **forgiveness**, and goal
chaining — live in [mechanics.md](./mechanics.md); apply them from there.

**Done when**: every kept mechanic has a written need→mechanic mapping,
passes its mechanics.md entry, and every cut is deliberate.

### 6. Ethics gate

Run before build, not after launch:

- **Alignment test**: does the designer's incentive point the same way as the
  user's genuine goal? (Streaks that help you learn: aligned. Spend
  mechanics dressed as play: not.)
- **Manipulation Matrix** (Eyal): build habit loops only where you would use
  the product yourself *and* it materially improves users' lives.
- **Black-hat dosage**: retention running primarily on FOMO/loss/scarcity
  fails this gate.
- **Long-term change test** (Nicholson): if the goal is durable behavior
  change, avoid rewards entirely — design for reflection, choice, and
  personal meaning instead (RECIPE, in [frameworks.md](./frameworks.md)).
- **Regulatory floor**: the EU DSA bans manipulative interface design (dark
  patterns); loot-box-like mechanics and anything touching minors face
  escalating regulatory scrutiny.

**Done when**: each check has an explicit pass, or the design changed.

### 7. Deploy, measure, iterate

A/B against the step-1 objective. Watch specifically for: metric gaming
(quantity over quality), bottom-of-leaderboard churn, streak-cliff
abandonment, and the novelty-decay curve. Expect small effects and compound
them; a flat result against the real objective beats a big win on a vanity
metric.

**Done when**: the objective metric moved, or the losing mechanic was removed
rather than tuned harder.

## Anti-patterns

The process already blocks most documented failures: rewarding the
already-interested (step 3), novelty-only design (step 4), global
leaderboards and bare streaks (step 5 via mechanics.md), black-hat engines
(step 6). Three more to reject on sight:

| Anti-pattern | Why it fails |
|---|---|
| **Pointsification** — PBL (points-badges-leaderboards) slapped on without the process above | Tracking, not design; the core critique the field accepted |
| One mechanic set for all users | HEXAD data: preferences differ systematically by user type |
| Gamifying a broken core product | Gamification amplifies value; it cannot substitute for it |
