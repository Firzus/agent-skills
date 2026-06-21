# Execution model

The original `workflows` material was written for a native runtime that exposed
`agent()`, `pipeline()`, `parallel()`, `budget`, and resume-by-`runId` as
JavaScript hooks. That runtime is not present here. This skill is **agent-driven**:
you, the orchestrator, perform each step yourself with the host's Task / subagent
tool. The "primitives" are *patterns you execute by hand*, not functions you call.

The code blocks below are **pseudo-code** that describes the orchestration flow.
Do not submit them anywhere — read them as a recipe for which subagents to
launch, in what order, and when to wait.

## Primitive -> agent action

| Runtime primitive | What you actually do |
| --- | --- |
| `agent(prompt)` | Launch one subagent via the Task tool with that prompt; use its result. |
| `agent(prompt, {schema})` | Tell the subagent to return JSON matching the schema. Validate the result; if it doesn't conform, re-prompt once with the mismatch. |
| `pipeline(items, s1, s2, ...)` | One subagent per item that runs all stages end-to-end in its own context. Launch them together; no barrier between stages. |
| `parallel(thunks)` | Launch the whole batch at once and wait for every result before continuing (barrier). |
| `phase(title)` | Announce the phase and reflect it in your todo list so the user sees the group. |
| `log(message)` | Tell the user what's happening in plain text. |
| `args` | The task context you hand each subagent (target path, question, config). |
| `budget` | Judgment, not a hard ceiling: scale depth to what the user asked. No token cap is enforced for you. |
| `workflow(...)` | Run another fan-out (the same or a different shape from this skill) as a sequential sub-step, then read its result before the next; you stay in the loop between them. |
| concurrency cap | Respect the host Task tool's parallelism limit. Extra dispatches queue and run as slots free. |
| `resume` / `runId` | No automatic prefix cache. Checkpoint with git and your todo list so an interrupted run can continue from the last good state. |

## Structured output (the `schema` option)

When you need machine-usable data from a subagent rather than prose, instruct it
explicitly and validate yourself:

```text
Subagent prompt: "... Return ONLY JSON of the form
{ findings: [{ title, file, line, severity }] }. No prose."
```

Then parse it. If it doesn't match, re-dispatch once stating exactly what was
wrong. This replaces the runtime's automatic StructuredOutput validation/retry.

## Independent items (the default "pipeline")

Drive each item through every stage independently. **You — the orchestrator —
own the stage transitions**: a subagent runs one stage and returns; you read its
result and dispatch the next stage's subagent for that same item. Subagents do
not need to spawn their own subagents, so this works on any host with a flat
Task tool. The point is that you advance each item on its own — don't wait for
every item to finish a stage before starting the next stage.

```text
for each changed dimension (bugs, perf, ...):     # all launched together
  stage 1 -> subagent: review the dimension, returns findings
  for each finding it returned:
    stage 2 -> subagent: adversarially verify the finding, returns verdict
  (you dispatch stage 2 as soon as THIS dimension's stage 1 returns)
collect every {finding, verdict}; keep verdict.isReal
```

The `bugs` dimension can be in stage-2 verification while the slower `perf`
dimension is still in stage-1 review — because you advance each dimension as
soon as its own previous stage returns, not at a shared barrier.

## When a barrier IS correct

Only wait for the full batch when the next step needs all of it at once — for
example, dedup across every finding before expensive verification:

```text
launch all dimension reviews; WAIT for all          # barrier: need the full set
deduped = merge findings across dimensions by file+line
launch a verifier per deduped finding; WAIT for all
```

The barrier is justified here because dedup is meaningless until every
dimension's findings exist. Without that cross-item need, keep items independent.

## Phases and progress

Use your todo list as the progress tree the native runtime would have drawn.
One todo (or group) per phase; announce transitions with a short line so the
user can follow a long fan-out.

## Sequencing larger work

For multi-phase work (understand -> design -> implement -> review), run one
fan-out per phase, read the result, then decide the next. Don't chain phases
blindly — each phase's output should inform the next dispatch.
