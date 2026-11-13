---
name: debug
description: Use when asked to debug, diagnose, or fix a bug, failing test, crash, unexpected behavior, or performance regression whose cause is not established, or when /work routes a bug here.
---

# Debug with evidence

Find the cause of the reported failure, not a change that hides it. A request to
diagnose allows inspection only; a request to fix also allows a local fix and its
verification. When `/work` sent you here, stop at **Ready to fix** and return the
cause and the proposed fix: `/work` sizes it, and once the fix may proceed, its
build follows step 3 below. Never deploy, experiment on production, or replay
requests with real side effects without permission, and keep credentials out of
logs and shared output.

## 1. Reproduce

Record expected versus actual behavior, inputs, environment, and versions. Facts
only the reporter holds (what exactly they saw, when, who was affected, what they
already did about it) change the next check or the remedy: ask for them in one
message, at the latest with your diagnosis, and record the rest as unknown. Never
advise an action on the damage, such as a refund, without asking whether it was
already done. Then build the
smallest check that reaches the real failure: a test, a command, a request, or a
browser interaction that asserts the reported outcome. Record its output before
changing anything.

- **Intermittent:** count failures over attempts under controlled conditions
  (seed, time, ordering) instead of retrying until it passes.
- **Performance:** fix the metric and workload, and measure repeated baseline
  runs before profiling.
- **No reproduction:** reason from traces, logs, and code with explicitly
  provisional hypotheses, and ask for the smallest missing capture or access.

## 2. Find the cause

Trace the bad value or state across callers and boundaries, and compare a working
case with the failing one. For each plausible cause, state what it predicts and
run the cheapest check that could rule it out, changing one thing at a time.
Recent changes are leads, not proof; bisect only with a trustworthy good and bad
state, in a separate checkout. After a failed experiment, revise the explanation
before the next change. When checks stop teaching you anything, report what is
ruled out and the evidence still needed instead of stacking speculative patches.

**Ready to fix:** evidence connects the trigger, the faulty behavior, and the
symptom. A diagnosis-only request stops here with the cause and a proposed fix.

## 3. Fix and verify

1. Capture the failure in a regression test before the fix and watch it fail for
   the right reason. If no automated check is feasible, keep the reproducer and
   say so.
2. Make the smallest fix the evidence supports. Do not mask the failure with
   sleeps, broad catches, retries, or fallbacks.
3. Rerun the regression test, the original scenario, and the project's checks.
   Compare failure counts or measurements under the same conditions for
   intermittent and performance problems.
4. Remove your temporary probes.

Report the cause and its evidence, the fix, the checks run, and what remains
uncertain, distinguishing diagnosed, mitigated, and fixed-and-verified.
