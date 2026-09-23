# Resume prepared work

## Select executable scope

Read the current issue, comments, evidence, existing owner, and project agreements.
Reuse that issue; avoid taking over work already owned elsewhere without agreement.
A precise direct request can establish local scope without a forced interview or
unapproved ticket creation. Record any project-required tracking as pending.

| Input | Action |
| --- | --- |
| Implementation issue or defined direct change | Verify acceptance criteria, prerequisites, and authorization |
| Decision issue or consequential unresolved choice | Propose `interview`; keep dependent implementation pending |
| Research issue | Propose `deep-research`, not production implementation |
| Prototype issue | Propose `prototype`, not production implementation |
| Broad map, project, or milestone | Identify the selected bounded implementation issue; otherwise propose `interview` |

These are handoff suggestions, not automatic skill invocation. Report unavailable
skills or access; do not silently replace missing preparation with guesses.

For each prerequisite, identify the required outcome and its evidence:

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

1. Read relevant definitions, pending deltas, and affected system pages. Follow owning
   source links rather than loading all documentation.
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
