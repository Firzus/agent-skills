# Resume prepared work

## Route the issue

Read the current issue, comments, evidence, existing owner, and project agreements.
Reuse that issue; avoid taking over work already owned elsewhere without agreement.
Apply these checks in order; the first matching row decides:

| Check | Action |
| --- | --- |
| No Linear issue was given | Say that the request goes to `triage` first, and stop |
| Status Done, Canceled, or Duplicate | Report the status and stop. New work on it goes through `triage` |
| Grouping parent (no Type label, has sub-issues) | List its open sub-issues without a recommendation and ask which one to run; the parent keeps its status. If the user leaves the choice to the agent, choose one and state it as the agent's recommendation with its reason. Continue with the chosen sub-issue |
| Labeled Need triage | Say that it goes to `triage` first, and stop |
| Breaks the triage contract: no Type label, more than one, or a Research or Prototype issue with no Interview issue blocked by it | Refuse it: report the gap, point to `triage`, and stop without changing its status |
| Status Backlog or Todo | Move it to In Progress, then route it |
| Status In Progress or In Review | Continue from the recorded state |

Route by the Type label:

| Type | Route | Completion |
| --- | --- | --- |
| Task | Continue this workflow | Linear moves the issue to Done when the linked PR merges |
| Bug | Run `debug` to reproduce, diagnose, and fix, then continue at step 4 of this workflow | Linear moves the issue to Done when the linked PR merges |
| Prototype | Run `prototype` on the issue's question | User validates the result; push the reviewed commit, record the handoff, move to Done |
| Research | Run `deep-research` on the issue's question | Research complete; publish the report as a Linear document, record the answer, remaining uncertainty, and document link, move to Done |
| Interview | Run `interview` on the issue's decision, with the results of its blocking issues | User accepts the decision; record it in the issue and in the work it informs, move to Done |

A Research issue closes when `deep-research` completes, without waiting for the
user. Teammates cannot open the local dossier, so publish its `overview.md` as a
Linear document attached to the issue, titled from its heading; on a rerun, update
the issue's existing report document instead of adding another. Replace links to
other local dossier files with their labels, keep public source links, and remove
secrets and private data. The closing comment links that document, not a local
path. If publication fails, keep the issue In Progress and report the pending upload.

For Prototype and Interview, the user's validation is the completion event:
present the result, ask whether it is accepted, and iterate within the issue's
scope until it is or the user stops. A rejected or inconclusive result stays In
Progress with its evidence recorded.

An accepted Interview decision reaches the work it informs in the same session,
so that work needs no further discovery. Rewrite affected passages within each
dependent issue's existing template: expected behavior and acceptance criteria for Task/Bug,
question and evidence for Research, experiment and judgment for Prototype, or
decision and inputs for Interview. Link the owning Interview in References;
use Accepted decisions where that section exists. Recheck readiness for the
dependent issue's type and retain any other unmet prerequisites. Work that no
issue covers yet is drafted with `triage` from its step 3, which obtains approval
and publishes it in Backlog.

A project without a selected issue calls for `triage`. Report an unavailable
skill or access instead of substituting another procedure.

For Bug, the `implement` invocation authorizes `debug` to fix. `debug` owns the
reproduction, diagnosis, regression test, and fix; this workflow then runs its
review, verification, recap, and PR steps. If `debug` ends without a verified fix
(no reproduction, unresolved cause, or blocked), open no PR: record the diagnosis
and the next needed evidence in the issue, keep it In Progress, and report.

For each blocking relation, identify the required outcome and its evidence:

- An accepted decision, an accessible artifact, and an integrated change are
  different requirements. A linked issue need not be merged if only its decision
  is required.
- Done or Canceled does not prove that outcome. Missing evidence leaves readiness
  unknown; check the owning record instead of inferring success from status.
- Resolve changed requirements or conflicting decisions before dependent edits.
- If Linear is unavailable, use an already available approved brief only where it
  supplies sufficient evidence. Report remaining gaps and pending synchronization.

**Done:** one authorized outcome, sufficient inputs, and explicit delivery boundary.
**Blocked:** record cause, resolution owner, prerequisite, and next action; preserve
the current phase and continue only independent authorized work.

## Use the validated prototype

When the issue references a prototype:

1. Read its accepted decision, branch, exact validated commit, launch instructions,
   assumptions, and untested behavior. Check the commit is accessible.
2. Inspect that version, not a newer branch tip. Run it when observation is needed
   and the environment permits; report missing runtime evidence.
3. Reuse suitable parts selectively in the implementation checkout. Preserve the
   prepared checkout and unrelated work; avoid automatic whole-branch merges.
4. Apply production tests and integration checks to reused code. Prototype approval
   establishes a design choice, not production correctness.

Keep the remote prototype branch and validated commit indefinitely, including after
delivery. No duplicate archive is required. If the version is unavailable, name the
missing evidence and resolve whether implementation can proceed without it; never
substitute an unvalidated version silently.

## Deliver context with the change

Use the project's designated context documents and glossaries for integrated
context; root `CONTEXT.md` applies only where that convention is adopted. Reuse
existing locations rather than introducing a parallel document. The owning issue
holds the accepted delta until integration.

1. Read relevant definitions, pending deltas, and affected system explanations.
   Use their links to locate sources and verify the current behavior on which
   the task depends; do not load all documentation or treat prose as proof.
2. Reconcile intervening changes. Resolve consequential conflicts with the decision
   owner, preserving public names/contracts and distinct meanings across contexts.
3. Implement this issue's accepted additions, changes, or removals in the owning
   context documents. Deliver them with its code in the same commit and PR.
4. For another issue's delta, link the required outcome as a dependency; preserve
   ownership rather than duplicate delivery. Clarify whether a decision, artifact,
   or integrated change is needed.
5. Verify definitions match delivered behavior, record the delivery reference, and
   mark the delta integrated only when integration is confirmed. A PR is not proof.

| Special case | Treatment |
| --- | --- |
| New term within accepted scope | Define meaning, context, and useful distinctions; keep detailed system rules with their owner |
| Missing context document, creation in scope | Create the accepted domain description and definitions at the agreed location |
| Missing document outside narrow scope | Report the gap; do not turn the task into project setup |
| No specialist vocabulary | State this briefly instead of inventing terms |
| Context-only clarification | Deliver a documentation change without artificial product edits |

Keep one definition per context; add aliases only when helpful. Proposed behavior
stays visibly distinct from implemented behavior. Terminology agreement does not
authorize renaming public code. Include approved ADR work in the same scoped delivery.

**Done:** the issue's code and context changes agree, other deltas retain their owners,
and publication/integration state is reported accurately.
