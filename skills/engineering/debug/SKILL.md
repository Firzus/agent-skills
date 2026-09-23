---
name: debug
description: Investigate bugs, failing tests, crashes, unexpected behavior, and performance regressions through reproducible evidence and hypothesis testing. Use when asked to debug or diagnose; apply and verify a fix only when authorized.
---

# Debug with evidence

Find the cause of the reported failure, not merely a change that hides it.
Accept a symptom, failing command, or captured artifact; ask only for missing
information that prevents the next useful check. Feature work is outside this skill.

## 1. Establish the failure

- Read applicable instructions, relevant code, callers, tests, and recent changes.
  Record expected versus actual behavior, affected inputs, environment, and versions.
- Confirm scope: diagnosis permits inspection, not source edits. A fix request permits
  local implementation and verification, not deployment or production experiments.
  Obtain authorization for instrumentation or other writes outside that scope.
- Protect existing work. Sanitize commands, logs, traces, and fixtures before sharing;
  never dump credentials or replay requests with real side effects without permission.
- During an incident, separate authorized service-restoration measures from diagnosis;
  retain available evidence before disruptive actions. Recovery does not prove cause.

**Ready:** a precise symptom and a safe investigation scope; otherwise request the
missing observation or access without inventing a diagnosis.

## 2. Build a discriminating check

- Run the smallest available test, CLI/API invocation, browser interaction, or replay
  that reaches the real failure. Assert the reported outcome, not merely absence of
  errors. Record the invocation, relevant output, and baseline before changing behavior.
- Reduce inputs and steps while preserving the same failure. Stop when the check is
  useful for iteration; do not require a globally minimal example or fixed runtime.
- **Intermittent:** record failures/attempts and conditions; control seeds, time, state,
  and scheduling where useful. Use bounded repetition or isolated stress, not retries
  until green. Instrumentation can alter timing; preserve representative conditions.
- **Performance:** define the metric and representative workload, measure repeated
  baseline runs and variability, then profile the suspected bottleneck.

**Ready:** observed failure with a repeatable check or a measured failure rate.
**No reproduction:** inspect existing traces, dumps, and code to form explicitly
provisional hypotheses. Request the smallest missing capture, environment, or approved
probe; do not present an untested patch as a verified fix. If automation is unavailable,
give exact manual steps and distinguish user observations from checks you executed.

## 3. Test explanations

- Trace the bad value or state through callers and component boundaries; compare a
  working case with the failing one. Treat recent changes as leads, not proof.
- Rank plausible causes from the evidence. For each, state a prediction and a check
  that could disprove it. Consider alternatives without inventing a quota.
- Choose the safest, cheapest probe that distinguishes explanations: debugger, targeted
  trace/log, differential run, or history bisection. Change one causal variable at a time.
  Tag temporary instrumentation for cleanup; record observation and hypothesis verdict.
- Use bisection only with known good/bad states and a trustworthy classifier, in an
  isolated checkout. Skip untestable revisions, not failures of the target build or test.
- After a failed experiment, revise the explanation before trying another change.
  If checks stop adding information, summarize ruled-out causes and the next needed
  evidence; request help or access instead of stacking speculative patches.

**Ready to fix:** evidence connects the trigger, faulty behavior, and reported symptom;
unresolved alternatives remain explicit. Diagnosis-only work stops with findings and
a proposed correction. Broader architectural work requires separate scope.

## 4. Correct and verify

- When authorized, capture the failure in a regression test before the fix, at a
  boundary that exercises the actual interaction. Observe it fail for the right reason.
  If no suitable automated check is feasible, retain the reproducer and state the gap;
  do not substitute a shallow test or infer that a redesign is automatically required.
- Make the smallest correction supported by the evidence. Do not hide failures with
  arbitrary sleeps, blanket catches, retries, or fallbacks; add handling only when the
  failure contract requires it. Remove only your unsuccessful experimental changes.
- Rerun the regression test, original scenario, affected interactions, and required
  project checks. For intermittent failures, compare before/after counts under the
  same conditions; zero observed failures is not proof of elimination. For performance,
  compare equivalent repeated workloads, not a single favorable measurement.
- Remove your temporary probes and review the final diff for unrelated changes and
  sensitive artifacts. Preserve useful regression coverage and pre-existing work.

**Return:** cause and evidence (or remaining uncertainty), changes, executed checks and
results, and verification gaps. Distinguish diagnosed, mitigated, fixed-and-verified,
and blocked outcomes. Before interruption, record the reproducer, hypothesis results,
artifact locations, and next check in the existing task record. Never claim completion
from an unrun command or an unrelated green test.
