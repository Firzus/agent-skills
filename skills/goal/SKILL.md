---
name: goal
description: >-
  Keep an AI coding agent working toward one explicit completion condition across
  turns. Use when the user invokes `/goal`, asks to keep working until a condition
  is met, wants an autonomous loop with verifiable completion, or needs guidance
  writing effective goal conditions.
---

# Goal

Use this skill when the user wants the agent to keep working toward one measurable condition instead of stopping after a single turn.

## Core Behavior

`/goal` is a session-scoped autonomous workflow:

1. The user states a completion condition.
2. The agent immediately works toward that condition.
3. After each turn, evaluate whether the condition is satisfied using only evidence surfaced in the conversation.
4. If the condition is not satisfied, continue with the next concrete step.
5. Stop when the condition is met, the user clears it, or a stated bound is reached.

Maintain exactly one active goal per session. If the user sets a new goal, replace the previous active goal.

## Command Handling

### Set a goal

When the user writes `/goal <condition>`:

- Treat `<condition>` as the directive for the next turn; do not ask for a separate prompt.
- Restate the goal briefly.
- Identify the proof needed to demonstrate completion.
- Begin work immediately unless the condition is unsafe, impossible, or too ambiguous.

Example:

```text
/goal all tests in test/auth pass and the lint step is clean
```

### Check status

When the user writes `/goal` with no argument, report:

- Active condition, or the most recently achieved/cleared condition.
- Current status: active, achieved, cleared, blocked, or not set.
- Evidence gathered so far.
- Next step if active.

### Clear a goal

When the user writes `/goal clear`, `/goal stop`, `/goal off`, `/goal reset`, `/goal none`, or `/goal cancel`:

- Clear the active goal.
- Stop autonomous continuation.
- Summarize what was completed and what remains.

## Writing Effective Goal Conditions

If the user asks for help writing a goal, shape it around:

- **One measurable end state**: passing tests, clean build, empty queue, file count, migration complete.
- **A stated check**: the command, inspection, or transcript evidence that proves completion.
- **Important constraints**: files not to modify, compatibility requirements, maximum scope.
- **Optional stop bound**: a turn limit or explicit fallback condition, expressed without estimating task duration.

Prefer conditions like:

```text
/goal `npm test -- test/auth` exits 0, `npm run lint` exits 0, and no files outside src/auth and test/auth are modified
```

Avoid vague conditions like:

```text
/goal make auth better
```

## Evaluation Rules

Evaluate goals from surfaced evidence only:

- Do not assume success without command output, file inspection, or a clear transcript result.
- If a check is required, run or inspect it when safe and appropriate.
- If a check cannot be run, state the limitation and use the strongest available evidence.
- If the goal depends on external state, credentials, manual approval, or unavailable services, mark it blocked and ask for the missing input.

After each work cycle, decide:

```text
Goal status: achieved | continue | blocked | cleared
Reason: <short evidence-based reason>
Next: <next action, only if continuing>
```

## When to Recommend Other Workflows

- Use a scheduled task when the work should run independently of the current session.
- Use a deterministic hook or script when completion must be checked by exact machine logic.
- Use a manual checklist when the task has many subjective acceptance criteria.
- Use normal single-turn work when the request is small and does not need autonomous continuation.

## Guardrails

- Keep the loop focused on the active condition; do not expand scope opportunistically.
- Continue only while there is a clear, safe next step.
- Surface blockers instead of retrying blindly.
- Preserve repository and user constraints, including test, git, and cleanup rules.
- Do not claim parity with Claude Code internals; implement the workflow behavior for the current agent environment.
