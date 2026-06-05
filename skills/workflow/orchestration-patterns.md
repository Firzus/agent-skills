# Orchestration patterns

Concrete patterns for the **Decompose → Dispatch → Synthesize → Verify** phases.
The orchestrator is the primary agent; sub-agents are separate instances it
launches in parallel (via whatever Task / sub-agent mechanism your agent
platform provides).

## Context-aware decomposition

Split by what makes sense for *this* codebase, not a rigid template. Good splits
produce sub-tasks that are independent enough to run concurrently:

- **By layer** — API layer, database layer, frontend, test suite.
- **By module** — separate bounded contexts or packages that do not share
  in-progress state.
- **By concern (for analysis)** — one sub-agent per scan type: security,
  performance, dead code, dependency audit.

A sub-task is a good candidate for parallelism only if it can complete without
waiting on another in-progress sub-task's output.

## Parallel dispatch

- Launch one sub-agent per independent sub-task, all at once.
- Give each sub-agent a **clear, self-contained scope** plus the context it
  needs: relevant files, constraints, known issues, and the acceptance criteria.
- Prefer scope over bare tasks. "Migrate the `users` repository to the new ORM,
  keeping the public method signatures stable" beats "update the database code".
- Keep sub-agent outputs comparable: ask each to report what it changed and any
  cross-cutting assumptions it made, so synthesis is easier.

## Synthesis and conflict resolution

When sub-agents finish, the orchestrator — not the individual sub-agents — owns
integration:

1. Review every sub-agent's output and stated assumptions.
2. Detect conflicts: overlapping edits, incompatible interface changes,
   duplicated helpers, divergent naming.
3. Resolve centrally so the combined result stays internally consistent.
4. Reconcile shared contracts (types, schemas, API signatures) across pieces.

This central coordination is what prevents the "too many cooks" problem that
naive parallelization creates.

## Git checkpoints

Because this workflow can change many files at once, treat each session like a
branch:

- **Start clean** — ensure a clean git state before dispatching, so the combined
  diff is attributable to this session.
- **Checkpoint between phases** — commit or stash a known-good state after
  synthesis, before broad follow-up edits.
- **Review the full diff** — read the entire diff before merging, not just
  individual sub-agent outputs. Coherence is judged on the whole.

## Anti-patterns

- **Parallelizing dependent sub-tasks** — if B needs A's finished output, do not
  run them concurrently; sequence them or merge into one sub-agent.
- **Too many cooks** — over-splitting into tiny overlapping sub-tasks multiplies
  conflicts and synthesis cost. Split along natural seams.
- **Dispatching before planning** — launching sub-agents before the plan is
  solid leads to wasted parallel work that must be redone.
- **Leaving conflict resolution to sub-agents** — they lack the global view;
  integration belongs to the orchestrator.
- **Vague scope** — under-specified sub-tasks produce inconsistent results that
  are expensive to reconcile.
