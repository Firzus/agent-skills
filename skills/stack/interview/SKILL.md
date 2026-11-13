---
name: interview
description: Use when the user asks to be interviewed or to have a plan challenged, or when another skill hands over decisions the user owns. Not for choices the agent can take itself or that research or an experiment can settle.
---

# Settle decisions by interview

Reach a shared understanding of what will be built, with every decision the user
owns taken by the user and every other choice taken by you. Return the result to
the caller, or to the user when run on its own.

## What to ask

A question is for the user only when its answer changes what gets built and the
user owns it: behavior, scope, cost, what happens when things go wrong, or a step
that is hard to undo. Record the choices you take yourself with their reason. A
choice that an experiment or research could settle is a need for the caller, not
a question.

Before asking, walk through the normal case and the cases that matter for this
work: empty or invalid input, failure halfway, repetition, two people acting at
once, existing data, and who is allowed to do what. Ask only where the answer is
not already evident.

## Rounds

1. Ask every independent question in one round, most consequential first. Keep a
   question that depends on an unanswered one for a later round. Prefer fewer,
   sharper questions: if a question would not change the work, drop it.
2. Wait for the answers. Keep partial answers and leave the rest open.
3. When the user says "you choose", take the decision and record it as yours with
   its reason.
4. Trace each answer's consequences; ask the follow-up questions they open.
5. When nothing consequential remains open, summarize the decisions, including
   yours, and what stays out of scope, and ask the user to confirm it. A caller
   may merge this summary into its own agreement message.

## What each question contains

Give each question what the user needs to decide from the message alone: the
question, its context written to the decision format of the operating policy,
the options, each on its own line and lettered so the user can answer briefly
(such as `1b`), and your recommendation with its reason.

## Return

Return the accepted decisions with their consequences and who took each, the
exclusions, open questions, needs for research or an experiment, and out-of-scope
findings kept apart.

**Done:** the user confirmed the summary. **Waiting:** a question or the
confirmation is unanswered. **Stopped:** the user ended it; return the partial
result with its open questions.
