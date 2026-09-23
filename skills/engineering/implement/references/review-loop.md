# Review, correct, and verify

Keep the user in this implementation conversation. The available `code-review`
skill supplies independent read-only findings; implement owns edits and test runs.

## Prepare the checkpoint

1. Record the task's base before edits, or recover its verified baseline. Separate
   task-owned changes from unrelated local work.
2. Supply base/head, committed and uncommitted scope including untracked files,
   requirements, accepted prototype commit where relevant, and check evidence.
   A commit is not required just to make local work reviewable.
3. Pause edits during review. Use the available `code-review` skill; if unavailable,
   report review pending instead of claiming independent review occurred.

## Correct confirmed findings

Track finding IDs, evidence, disposition, correction, and verification in the
existing task record or conversation:

| Finding | Action |
| --- | --- |
| Confirmed in-scope defect or requirement breach | Correct with the normal test-first loop and affected documentation |
| Unestablished claim | Inspect sources or run a focused safe check before editing |
| Rejected claim | Record the evidence-based reason |
| Optional improvement or unrelated existing issue | Report separately; keep out of the current diff |
| Missing decision, unsafe action, or material scope expansion | Ask the owner and pause dependent changes |

Re-run affected tests. Send the new checkpoint, findings, correction delta, and
results to `code-review` for targeted follow-up. Review affected interactions when
scope changes, not just the edited lines.

## Stop on evidence

- Continue while confirmed in-scope problems remain and corrections make progress.
- Finish when all confirmed in-scope findings have explicit dispositions, no blocking
  finding remains, acceptance holds, and required checks pass. Deferring a non-blocking
  finding requires an accepted project triage rule or owner agreement; report its risk.
- Missing review evidence is pending, not a clean pass. Review does not replace
  runtime checks, designated acceptance, or delivery authorization.
- After two attempts at the same failure without new evidence or a changed approach,
  stop that correction path and report cause, attempts, owner, and next action.
  Escalate an oscillating or expanding loop instead of repeating it indefinitely.

Return to final integrated checks and reporting. If those checks require another
code change, repeat targeted review of the affected scope before completion.
Preserve the prototype branch throughout.
