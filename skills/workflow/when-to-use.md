# When to use the workflow

This workflow trades more time and compute for better planning and parallelism.
That trade-off only pays off on tasks that are genuinely large, complex, or
interconnected. Use the criteria below to decide.

## Mental model

If the task is the kind of thing a senior engineer would spend an hour planning
before touching any code, the workflow is the right tool. If they would just
start typing, skip it.

## Use the workflow when

- **Large-scale refactors** — touching dozens of files across multiple modules.
  Deep reasoning maps the dependencies; parallel sub-agents work on independent
  components at once.
- **Complex architectural changes** — migrating databases or ORMs, switching
  frameworks, redesigning APIs. These have cascading effects that benefit from
  deep upfront analysis.
- **Codebase-wide analysis** — finding security vulnerabilities, performance
  bottlenecks, or technical debt across an entire project. This is exactly the
  kind of parallel scanning sub-agents handle well.
- **Features with many dependencies** — when one feature needs coordinated
  changes across backend, frontend, database schema, and tests simultaneously.
- **Unfamiliar codebases** — when the project must be understood before any
  change. The extended reasoning period acts like a careful review before action.

## Skip the workflow when

- You are writing a single function or fixing one specific bug.
- The task is well-defined with minimal cross-cutting concerns.
- You need a fast response and the task does not require deep analysis.
- You are iterating quickly on a prototype and prefer speed over thoroughness.

## Cost and time trade-off

Extended reasoning and parallel sub-agents both consume more compute than a
single-pass approach. The exact cost scales with task scope and how many
sub-agents you spin up.

- For large, parallel, interconnected work, the gains in output quality and
  time-to-completion typically justify the higher cost.
- For small or well-defined work, a single-pass approach is faster and cheaper —
  default to it.

When in doubt, run the **Assess** phase first: if scope, coupling, and risk are
all low, drop back to a normal single-pass approach.
