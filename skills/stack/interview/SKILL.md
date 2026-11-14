---
name: interview
description: Use when the user asks to be interviewed or to have a plan challenged, or when another skill hands over decisions the user owns. Not for choices the agent can take itself or that research or an experiment can settle.
---

# Settle decisions by interview

Reach a shared understanding of what will be built, with every decision the user
owns taken by the user and every other choice taken by you.

## What to ask

A question is for the user only when its answer changes what gets built and the
user owns it: behavior, scope, cost, what happens when things go wrong, or a step
that is hard to undo. A choice that an experiment or research could settle is a
need for the caller, not a question.

Before asking, walk through the normal case and the cases that matter for this
work: empty or invalid input, failure halfway, repetition, two people acting at
once, existing data, and who is allowed to do what. Ask only where the answer is
not already evident.

## Rounds

1. Ask every independent question in one round, most consequential first. Keep a
   question that depends on an unanswered one for a later round.
2. "You choose" makes the decision yours, recorded with its reason. Ask the
   follow-up questions each answer opens.
3. When nothing consequential remains open, summarize the decisions, including
   yours, and what stays out of scope, and ask the user to confirm it. A caller
   may merge this summary into its own agreement message.

## What each question contains

Write each question to the decision format of the operating policy, with each
option on its own line and lettered so the user can answer briefly (such as
`1b`). Ask in a plain message, never through a question tool the harness
provides: its short labels and limited options cannot carry each option's
gains, costs, and reversibility, nor the whole round in one place.

## Return

Return the accepted decisions with their consequences and who took each, the
exclusions, open questions, needs for research or an experiment, and out-of-scope
findings kept apart.

**Done:** the user confirmed the summary. **Waiting:** a question or the
confirmation is unanswered. **Stopped:** the user ended it; return the partial
result.
