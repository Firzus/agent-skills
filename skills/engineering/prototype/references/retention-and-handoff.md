# Retain the experiment and hand it back

This workflow's durable handoff is the retained remote branch and existing Linear
record. Experiment completion and handoff completion are separate: a local result
can answer the question while remote publication remains pending. Preparation or
experiment authorization never grants those external-write permissions implicitly.
When `implement` runs a Prototype issue, that invocation grants them for the
dedicated branch and the originating issue.

## Establish a dedicated branch

1. Verify repository, base revision, existing work, and project Git conventions.
   Reuse a branch already dedicated to this experiment or create
   `feature/<identifier>-prototype-<subject>` for a Linear issue, such as
   `feature/fir-12-prototype-checkout-flow`, otherwise `feature/prototype-<subject>`.
   Do not repurpose unrelated work.
2. Preserve the task's prepared checkout and uncommitted changes. Use a separate
   worktree when needed rather than switching an active checkout or stashing work
   without agreement. Include required task inputs deliberately, not all local changes.
3. Keep code/scenes and authorized necessary assets together; launch instructions
   go in the Prototype result, not in a new file. Record prerequisites for assets
   that cannot be stored on the branch; never commit secrets, private data, or
   resources whose publication is not authorized.

**Done:** isolated versionable experiment and base identified. Missing repository or
conflicting branch instructions require a decision, not automatic provisioning.

## Capture the reviewed version

1. Identify exactly which files and configuration produced the reviewed behavior.
   Commit that version only within the approved delivery
   scope, using project commit conventions. Without commit authorization, preserve
   the local files and review evidence; report the versioned handoff as pending.
2. Associate observations and the user's judgment with that exact commit; a moving
   branch name alone is insufficient. Label an unaccepted or inconclusive result as
   such. Do not transfer approval to later changes without review.
3. Push only when the action and remote are authorized. Verify the remote branch
   contains the reviewed commit and all required versioned artifacts.
4. After an uncertain push, inspect remote state before retrying. Keep confirmed
   identifiers and report unavailable assets or publication separately.

**Done:** reviewed commit available on the remote, with its launch instructions
recorded in the Prototype result.
**Pending:** preserve local work and its evidence; name missing permission, access,
or artifact. Local acceptance alone is not a remotely available handoff.

## Update the existing work record

Use project tracking conventions and actual Linear schemas. Reuse the originating
issue; `triage` drafts any new executable issue, and other new work is captured
only with approval as a Need triage issue, labeled only Need triage, in Backlog, with the Observed and Source sections.
Confirm destination and write scope, re-read before updating, preserve concurrent
content, and verify the returned or re-read result. Git push approval is not Linear
publication approval outside an `implement` run.

Use this compact handoff, omitting empty optional fields:

```markdown
## Prototype result
- Question and bounded scope:
- Reviewed branch and exact commit:
- Launch/reset instructions and prerequisites:
- Observed scenarios or measurements:
- Result: accepted / disputed / pending / ended without acceptance.
- Outcome: supported / contradicted / unresolved.
- Assumptions, simulations, and untested limits:
- Input for the Interview decision: preference or choice stated, with its scope.
- Remaining prerequisite and next question:
- Publication: local / remote verified / tracker update pending or verified.
```

Retain accepted domain changes as proposed deltas in their owning record under
project conventions; an experiment does not authorize changing integrated context.
An issue's completion requires its agreed evidence/delivery boundary, not merely
a successful process or an attractive result. Leave the issue status to `implement`.

**Done:** verified record links the experiment, its outcome, and resume point.
**Pending:** return the draft and last confirmed state in the conversation without
creating a competing backlog or claiming synchronization.

## Retention and subsequent implementation

| Artifact | Rule |
| --- | --- |
| Remote prototype branch and reviewed commits | Keep indefinitely, including rejected variants and after implementation; exclude from routine cleanup |
| Launch instructions and useful evidence | Keep in the Prototype result of the owning issue; no duplicate archive required |
| Task-owned processes, scratch outputs, temporary services | Stop or clean up only within authorized scope, after identifying targets and preserving required artifacts; preview deletions |
| Implementation work | Consult the validated commit and reuse suitable parts selectively, not by automatic whole-branch merge |

Keep the review surface available until the user's review ends. Before releasing a worktree
or temporary resource, ensure it is not the only copy of required work. No cleanup
may delete the retained branch or its necessary version history.
