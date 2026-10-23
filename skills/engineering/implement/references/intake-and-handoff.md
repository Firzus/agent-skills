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
| Labeled Need triage | Say that it goes to `triage` first, with this issue's link, and stop |
| Breaks the triage contract: no Type label, more than one, or a Research or Prototype issue with no Interview issue blocked by it | Refuse it: report the gap, point to `triage`, and stop without changing its status |
| A native blocker's required outcome is not established ([blocking checks](#blocking-checks)) | Report the blocker and stop without changing its status |
| Status Backlog or Todo | Move it to In Progress, then route it |
| Status In Progress or In Review | Continue from the recorded state |

Route by the Type label:

| Type | Route | Completion |
| --- | --- | --- |
| Task | Continue this workflow | Linear moves the issue to Done when the linked PR merges |
| Bug | Run `debug` to reproduce, diagnose, and fix, then continue at step 4 of this workflow | Linear moves the issue to Done when the linked PR merges |
| Prototype | Run `prototype` on the issue's question | User validates the result; push the reviewed commit when an experiment was built, record the handoff, move to Done |
| Research | Run `research` on the issue's question | Research complete; publish the report as a Linear document, record the answer, remaining uncertainty, and document link, move to Done |
| Interview | Run `interview` on the issue's decision, with the results of its blocking issues | `interview` completes with the user's confirmation; record the Interview result and update the existing issues it informs, move to Done |

Every Linear write in these routes, including updates to dependent issues, follows
[Update Linear at meaningful transitions](delivery.md#update-linear-at-meaningful-transitions).
Findings that answer the decision of the Interview issue a Research or Prototype
issue blocks go in this issue's result, for that Interview issue's run. Other
findings that `debug`, `prototype`, or `research` return follow step 1.4 of the
main workflow; a sub-skill settles no choice outside the issue's question.

When a Research or Prototype issue closes, name the Interview issue it unblocks as
the next `implement` run. End every route by telling the user which run comes next,
in a new conversation. A project without a selected issue calls for `triage`.
Report an unavailable skill or access instead of substituting another procedure.

### Return work to triage

When an issue's work needs `triage`, because its type, outcome, structure, or
blocking relations must change, its scope must extend, or it may no longer be
needed:

1. Add the Need triage label to the issue, keeping its Type label and status.
   Create the label, without a group, when the workspace lacks it.
2. Comment the reason. When the reason comes from an Interview result, end the
   comment with `From the Interview result of <link>.`
3. When it is the issue this run executes, stop work on it: commit nothing further,
   keep local changes, and name them in the comment.
4. Name `triage` with the issue's link as the next run; during an Interview run,
   the [Interview next-run table](#interview) names it instead.

`triage` removes the label once it has handled the issue; until then, intake refuses
it.

### Research

A Research issue closes when `research` completes, without waiting for the
user. Teammates cannot open the local dossier, so publish its `overview.md` as a
Linear document attached to the issue, titled from its heading; on a rerun, update
the issue's existing report document instead of adding another. Replace links to
other local dossier files with their labels, keep public source links, and remove
secrets and private data. The closing comment links that document, not a local
path. If publication fails, keep the issue In Progress and report the pending upload.

An incomplete or blocked result also stays In Progress, with its gaps and resume
point recorded in the issue. When its question must change,
[return it to triage](#return-work-to-triage).

### Prototype

The user's validation completes a Prototype: present the result, ask whether it is
accepted, and iterate within the issue's scope. A result is accepted when the user
agrees that its evidence answers the question, whether it supports or contradicts
the expected outcome. An inconclusive or disputed result stays In Progress with its
evidence recorded, and so does an experiment the user pauses. When the user ends
the experiment without accepting a result, or its question must change, record the
Prototype result and retain the reviewed version, then
[return it to triage](#return-work-to-triage).

### Interview

The user's confirmation that ends `interview` completes an Interview issue. Record
the result `interview` returns as a comment on the Interview issue; on a rerun,
update that comment instead of adding another, keeping the earlier entries of its
issue lists. The next run reads it:

```markdown
## Interview result
- Status: completed / blocked by evidence / stopped by the user.
- Accepted decisions, domain meanings, and consequences:
- Existing issues updated:
- Issues returned to triage:
- Out-of-scope findings, with any captured issue:
- Open questions and evidence needs:
- Unexplored branches, assumptions, and resume point:
```

The accepted decisions of a completed or evidence-blocked interview reach the
existing issues they inform in the same session, so that work needs no further
discovery. A stopped interview updates no other issue. For each dependent issue:

- When a decision calls for [returning it to triage](#return-work-to-triage), do
  so and list it under Issues returned to triage.
- Otherwise rewrite the affected passages within its template, refining without
  extending its scope: scope, out of scope, accepted decisions, acceptance criteria,
  and changes to existing context documents for a Task; accepted decisions, out of
  scope, and acceptance criteria for a Bug, leaving its
  Report unchanged; question and evidence for Research; experiment and judgment for
  Prototype; decision and inputs for Interview. Link the Interview issue in
  References, recheck that the issue can start, and retain any other unmet
  prerequisite. List it under Existing issues updated.

Follow-up work that no issue covers goes in the Interview issue's Work informed
section, as an entry without an issue link, updating an entry that already
describes it instead of adding another; only `triage` drafts it. Out-of-scope
findings follow step 1.4 of the main workflow. A blocked-by-evidence result also
[returns the Interview issue to triage](#return-work-to-triage), which prepares the
evidence it needs. A blocked or stopped Interview issue stays In Progress.

The first matching row decides:

| Interview result | Next run |
| --- | --- |
| Interview issue returned to triage, including every blocked-by-evidence result | `triage` with the Interview issue link |
| Stopped by the user | `implement` on the same issue, which resumes from the recorded result |
| Completed, with an issue returned to triage that still carries Need triage, or outside a project with Work informed entries without an issue link or disposition | `triage` with the Interview issue link; `implement` on an issue the decision unblocked that does not carry Need triage, if any |
| Completed, otherwise | `implement` on an issue the decision unblocked, if any; in a project, `triage` with the project link once its open issues are closed |

### Bug

For Bug, the `implement` invocation authorizes `debug` to fix. `debug` owns the
reproduction, diagnosis, regression test, and fix; this workflow then runs its
review, verification, recap, and PR steps. If `debug` ends without a verified fix
(no reproduction, unresolved cause, or blocked), open no PR; record the diagnosis
and the next needed evidence in the issue and keep it In Progress. Then:

- When obtaining that evidence needs research, observation, or other new work, or
  the diagnosis shows that the issue's type or outcome must change (the behavior
  matches what was accepted, or the fix needs a context change) or that it may no
  longer be needed, [return it to triage](#return-work-to-triage).
- Otherwise name `implement` on the same issue, once that evidence is available,
  as the next run.

### Blocking checks

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

Integrated context lives in the project's context documents: a root `CONTEXT.md`
for one context, or, with a root `CONTEXT-MAP.md`, the `CONTEXT.md` of each context
the map lists, under the project's own names when it uses others. The owning issue
holds the accepted delta until integration.

1. Read the definitions of the contexts this issue involves, the map's
   relationships between them, and pending deltas. Use their links to locate sources
   and verify the current behavior on which the task depends; do not load all
   documentation or treat prose as proof.
2. Reconcile intervening changes. Resolve consequential conflicts through step 1.4
   of the main workflow, preserving public names/contracts and distinct meanings across contexts.
3. Implement this issue's accepted additions, changes, or removals in the target
   document each entry names. Deliver them with its code in the same commit and PR.
4. For another issue's delta, link the required outcome as a dependency; preserve
   ownership rather than duplicate delivery. Clarify whether a decision, artifact,
   or integrated change is needed.
5. Verify definitions match delivered behavior, record the delivery reference, and
   mark the delta integrated only when integration is confirmed. A PR is not proof.

The first matching row decides:

| Special case | Treatment |
| --- | --- |
| Context document missing and not named in the issue | Keep the accepted meanings in the issue's Accepted decisions; create no document |
| New context document named in the issue | Create it at the location the issue gives, with the accepted domain description and definitions |
| New term within accepted scope | Define meaning, context, and useful distinctions; keep detailed behavior rules with their owning source |
| No specialist vocabulary | State this briefly instead of inventing terms |
| Context-only clarification | Deliver a documentation change without artificial product edits |

Keep one definition per context; add aliases only when helpful. Proposed behavior
stays visibly distinct from implemented behavior. Terminology agreement does not
authorize renaming public code.

**Done:** the issue's code and context changes agree, other deltas retain their owners,
and publication/integration state is reported accurately.
