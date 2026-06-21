---
name: workflows
description: >-
  Orchestrate many subagents to handle work one context can't hold:
  decompose-and-cover in parallel (comprehensive), independent perspectives plus
  adversarial checks (confident), or broad sweeps (migrations, audits, research).
  Use when the user explicitly opts into multi-agent orchestration — mentions
  "workflow"/"workflows", says "fan out agents" / "orchestrate with subagents" /
  "run a workflow", enables an ultracode-style exhaustive mode, or invokes a
  skill that calls for it. Runs on the host's Task / subagent tool; no special
  runtime required. Skip for single-pass tasks the agent can do alone.
---

# Workflows

A workflow structures work across many subagents — to be **comprehensive** (decompose and cover in parallel), to be **confident** (independent perspectives and adversarial checks before committing), or to take on **scale** one context can't hold (migrations, audits, broad sweeps). You encode that structure as a sequence of subagent dispatches: what fans out, what verifies, what synthesizes.

This skill is **agent-driven**: you (the orchestrator) run each step yourself with the host's Task / subagent tool. There is no separate workflow runtime — the primitives below (`agent`, `pipeline`, `parallel`) are *patterns you execute*, not functions a runtime provides. See [execution-model.md](./execution-model.md) for the exact mapping.

## Opt-in (required)

Multi-agent orchestration can spawn many subagents and burn a lot of tokens. Only engage it when the user has **explicitly opted in** — the scale must be requested, not inferred. Opt-in means one of:

- The user wrote `workflow` / `workflows`, or asked in their own words: `run a workflow`, `fan out agents`, `orchestrate this with subagents`.
- An exhaustive/ultracode-style mode is active (orchestrate substantive tasks by default; lean toward thoroughness).
- The user invoked a skill or slash command whose instructions call for it.
- The user asked for a specific named or saved workflow.

For any other task — even one that would clearly benefit from parallelism — do **not** fan out. Use a single subagent, or briefly describe what a multi-agent workflow could do and roughly how costly it would be, then ask whether to run it. Mention they can say `workflow` next time to skip the ask.

## Hybrid: scout, then fan out

The right move is usually **hybrid**: scout inline first (list the files, find the call sites, scope the diff) to discover the work-list, then fan out over it. You don't need to know the shape before the *task* — only before the *orchestration step*.

Common single-phase shapes you can chain across turns:

- **Understand** — parallel readers over subsystems -> structured map
- **Design** — judge panel of N independent approaches -> scored synthesis
- **Review** — dimensions -> find -> adversarially verify
- **Research** — multi-modal sweep -> deep-read -> synthesize
- **Migrate** — discover sites -> transform each (isolated) -> verify

For larger work, run several in sequence — read each result before deciding the next phase. You stay in the loop; each fan-out is one well-scoped step.

## The core decision: independent vs barrier

This is the one mental model that matters. See [execution-model.md](./execution-model.md) for how to run each.

- **Independent (default, "pipeline")** — give each item its own subagent that runs all its stages end-to-end. Item A can be verifying while item B is still in its first stage. Wall-clock = the slowest single-item chain, not the sum of per-stage maxima.
- **Barrier ("parallel")** — wait for the full batch before the next step. Only correct when the next step genuinely needs **all** prior results together:
  - dedup/merge across the full result set before expensive downstream work,
  - early-exit when the total count is zero,
  - the next prompt compares one item against the others.

A barrier is **not** justified by "I need to flatten/map/filter first" (do that between dispatches without blocking), by "the stages are conceptually separate", or by "it's cleaner". Barrier latency is real: if the slowest finder takes 3x the fastest, a barrier wastes the fast ones' idle time. **When in doubt, keep items independent.**

## Scale to the request

Match effort to what was asked. `find any bugs` -> a few finders, single-vote verify. `thoroughly audit this` / `be comprehensive` -> larger finder pool, 3-5 vote adversarial pass, a synthesis step. When unsure, lean toward thoroughness for research/review/audit and toward brevity for quick checks. Respect the host's subagent concurrency limit — extra dispatches queue.

If you bound coverage (top-N, no retry, sampling), **say what you dropped** — silent truncation reads as "covered everything" when it didn't.

## Quality patterns

Pick and compose by task — see [patterns.md](./patterns.md) for each in detail:

- **Adversarial verify** — N skeptics try to *refute* each finding; keep it only if a majority fail to refute.
- **Perspective-diverse verify** — give each verifier a distinct lens (correctness, security, perf, reproducibility).
- **Judge panel** — N independent attempts from different angles, scored, synthesized from the winner.
- **Loop-until-dry** — keep spawning finders until K consecutive rounds surface nothing new.
- **Multi-modal sweep** — agents each searching a different way (by container, content, entity, time).
- **Completeness critic** — a final agent asks "what's missing?"; its answer is the next round.

These aren't exhaustive — compose novel harnesses when the task calls for it (tournament brackets, self-repair loops, staged escalation).

## Orchestrator owns coherence

Subagents lack the global view. You — the orchestrator — review every subagent's output, resolve conflicts (overlapping edits, divergent naming, incompatible contracts), and integrate centrally. Start from a clean git state and review the full combined diff before merging, so the result stays coherent.

## References

- [execution-model.md](./execution-model.md) — how to run each primitive (`agent`/`pipeline`/`parallel`/phases/structured output) with the host's Task tool, plus worked pseudo-code.
- [patterns.md](./patterns.md) — the quality-pattern catalog with concrete recipes.
