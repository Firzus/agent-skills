---
name: improve-architecture
description: Find evidenced architecture improvements, present recommendations, and delegate each selected refactor through verified delivery and report updates.
disable-model-invocation: true
---

# Improve architecture

Identify architectural friction and deliver only the recommendations the user
selects. Prefer changes that hide implementation complexity behind a smaller,
clearer interface while preserving behavior. The main agent owns scoping,
delegation, review, report updates, and the final response. Implementation workers
own their bounded code changes; they do not independently expand the project.

## 1. Scope the investigation

1. Read the request, project instructions, repository state, existing task record,
   and relevant design decisions. Use the project's actual glossary and document
   locations; do not require or create CONTEXT.md or an ADR directory by default.
2. Follow the user's named pain point or subsystem. Without one, inspect recent
   changes and callers to find a bounded area where change is costly. Expand only
   when evidence identifies another affected boundary.
3. Record unrelated local changes and the revision or snapshot being examined.
   A request for an architecture review authorizes investigation, not refactoring.
4. Delegate independent scan questions when useful and supported. Give each worker
   a read-only scope, inputs, expected evidence, and stopping condition. No fixed
   agent quota, duplicate whole-repository scans, or recursive delegation.

Use established project terms, including component, service, API, or module where
appropriate. No external vocabulary skill is required. For each candidate, ask:

- Which concrete change requires understanding or editing too many places?
- Does an abstraction hide complexity, or merely forward calls and expose details?
- Can removing or merging a layer improve clarity without losing useful behavior?
- Are tests coupled to internal details instead of the caller-visible contract?
- Which existing callers, checks, or incidents support the proposed improvement?

Names, file counts, and unfamiliar style alone are not defects. A speculative
benefit stays a hypothesis, not a promised performance or reliability gain.

**Done:** each retained candidate has affected paths, observed friction, a scoped
proposal, a reason to prefer it over leaving the code alone, and acceptance checks.
If no candidate survives, report that result without manufacturing work.

## 2. Prepare the report and await selection

Use the technical branch of [canvas](../canvas/SKILL.md) and its
[Markdown contract](../canvas/technical.md). Keep one task-specific reader and
source report throughout the work. Do not change the reader's design or edit its
bundled example to conduct a real architecture review. If the reader cannot run,
preserve the Markdown and report the preview limitation; do not claim it opened.

Write in the user's chosen report language. Keep stable IDs such as ARCH-01,
short sidebar titles of at most four words, and full explanations in the sections.
The current reader uses French tracker headers and statuses; follow its documented
language limitations rather than silently using an incompatible schema.

Include these facts for each recommendation:

| Fact | Required content |
| --- | --- |
| Identity | Stable ID, short title, affected paths, and relevant snapshot |
| Problem | Observed friction and supporting evidence |
| Proposed change | Target interface, behavior to preserve, and exclusions |
| Dependencies | Explicit prerequisite IDs and unresolved decisions |
| Acceptance | Focused baseline, regression checks, and required runtime evidence |
| Delivery | Agreed local result, commit, or PR boundary; mark unresolved choices |
| Tracking | Status and next action, blocker, or verified delivery evidence |

Use Mermaid before/after diagrams only where relationships need explanation.
Do not mandate cards, diagrams for every finding, or tutorial blocks. Separate
illustrative designs from observed implementation. Identify conflicting accepted
design decisions and ask before reopening them.

The main agent is the sole writer of report state. The Markdown is the reader's
content source; where a project tracker exists, follow that record's authority
and authorized update rules rather than creating a competing backlog.

Use only these statuses in the French reader:

| Status | Meaning |
| --- | --- |
| À lancer | Work has not started, including recommendations awaiting prerequisites or deferred by the user |
| En cours | Work has started; implementation, corrections, review, or agreed delivery remains |
| Terminé | Required checks, acceptance, and the agreed delivery boundary are satisfied |

Blockage, deferral, failed verification, and pending publication are notes, not
extra statuses. Never mark a blocked or rejected recommendation completed.
Place prerequisites before dependents in the table and retain dependency IDs
after completion; the reader projects its supported hierarchy from those entries.

Recommend the next useful item, then await selection unless the current request
already names it. A message such as "Exécute ARCH-01" selects that recommendation;
resolve it from the existing report without requiring the user to repeat context.
An `agent-action` fence may supply a short copyable instruction naming the ID and
scope. Copying it, navigating, or checking a personal checkbox launches nothing.

**Done:** the report is reviewable, the chosen IDs are explicit, and unselected
recommendations remain untouched. A request for one item does not select the rest.

## 3. Dispatch the selected refactor

Before dispatch, recheck the selected recommendation against current code, accepted
scope, dependencies, and available evidence. A completed prerequisite must also
be available in the worker's actual revision or worktree. Stale or missing evidence,
a dependency cycle, or an unresolved decision pauses the dependent assignment.
Do not silently implement prerequisites the user did not select.

Reuse an existing worker for a continuation when appropriate. Independent selected
items may run in parallel only with disjoint write ownership and safe shared
resource use. Sequence overlapping or dependent changes. Respect available tools,
concurrency limits, and user budgets. Workers do not create user-owned conversations.

Give each implementation worker this bounded brief:

```text
Recommendation ID and objective:
Repository, branch/worktree, baseline, and existing task record:
Authoritative requirements, project instructions, and accepted decisions:
Prerequisites and evidence they are available:
Permitted files/areas, callers to check, exclusions, and unrelated local work:
Target interface and behaviors/public contracts to preserve:
Acceptance checks, passing baseline or characterization tests, runtime evidence:
Affected documentation and context changes:
Delivery boundary and explicitly authorized Git/external operations:
Return: scoped diff/checkpoint, changed paths, checks actually run and results,
remaining limitations, real commit/PR identifiers if produced, and next action.

Work only within this assignment. Do not edit the coordinator's report, start
other recommendations, recursively delegate, or publish outside the authorized
scope. Report a necessary scope expansion before proceeding with it.
```

Apply the [implementation verification rules](../implement/SKILL.md) to the
assignment without assuming a manually invoked skill was automatically launched.
For refactoring, establish a passing behavioral baseline and preserve it. Add
characterization coverage first when the behavior is not adequately protected.
Run focused and project-required checks; do not demand the entire test suite for
every change or treat unrelated failures as new regressions.

Set En cours only after work actually starts, not merely when a launch is attempted.
If delegation is unavailable, keep the selected item pending and report the missing
capability. Do not quietly replace the agreed worker flow with main-agent coding.

**Done:** the worker returns a reviewable checkpoint and evidence, or an explicit
failure with preserved partial work. Dispatch alone is not implementation evidence.

## 4. Verify, correct, and deliver

1. Inspect the returned diff against the assignment, including callers, public
   contracts, required documentation, and unrelated work. Treat the worker's summary
   as a claim to check, not proof of completion.
2. Use the [review-correction loop](../implement/references/review-loop.md) and the
   available [code-review](../code-review/SKILL.md) procedure. The main agent verifies
   findings; the implementation worker corrects confirmed in-scope problems.
   Request targeted follow-up on the resulting checkpoint. Missing required review
   remains pending, not an independent pass.
3. Re-run relevant checks on the integrated result. Verify connected user-visible
   behavior where applicable. Keep failed checks and blockers in the report notes
   while the started recommendation remains En cours.
4. Apply the [delivery boundary](../implement/references/delivery.md). A worker may
   prepare an authorized scoped commit or PR, but the main agent verifies its actual
   content and result. A local edit request does not authorize push, PR, merge,
   deployment, or tracker writes. Ask only for missing material authorization.
5. Update the report with actual outcomes, checks, and delivery links. Record any
   authorized project-tracker update separately and verify it. Report a failed write
   with the last confirmed state; do not claim synchronization.

Update relevant existing system documentation and domain terms within the approved
change. Do not create global project agreements or an ADR as an incidental side
effect. Propose a lasting decision record only when the decision warrants one.

**Done:** mark Terminé only when verification, acceptance, and agreed delivery hold.
A draft PR can be the agreed handoff, but does not establish merge or deployment.
If any required step remains, preserve En cours and name the pending action.

## 5. Report back and stop

Return to the main conversation with the selected ID, outcome, affected paths,
checks, real delivery identifiers, and material limitations. Link the existing
report and state whether its update was verified. Keep completed, accepted,
committed, published, integrated, and deployed facts distinct.

After one selected recommendation, wait for the next instruction. A previously
approved batch may continue within its stated scope and dependency order; never
start unselected work automatically. On resume, reconcile the existing report,
code, delivery evidence, and project record before dispatching another worker.

**Done:** the user can see what actually finished and what remains. Blocked work is
an incomplete result, not successful completion of the run.
