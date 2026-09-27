---
name: triage
description: Turn a new request or a Need triage issue into approved Linear work by finding existing records, choosing the work type and structure, clarifying open decisions through interview, drafting with strict templates, and publishing in Backlog.
disable-model-invocation: true
---

# Triage a request into Linear work

Every new request starts here. Triage orchestrates the preparation: it reads Linear,
decides which work is needed, runs `interview` for open decisions, and publishes the
approved result. `implement` executes the published issues, and enters at step 3
to publish the follow-up work of an Interview issue.

| Boundary | Rule |
| --- | --- |
| Product implementation or bug fix | Requires an `implement` run on the published issue |
| Question needing substantial research | Prepare a Research issue, and an Interview issue blocked by it |
| Behavior that must be observed | Prepare a Prototype issue, and an Interview issue blocked by it |
| Repository context | Prepare changes in the issue; `implement` delivers them |
| Read-only or planning mode | Keep drafts in the conversation; defer all writes |

## 1. Establish the starting point

1. Read the request, project instructions, relevant code/tests, and existing work.
   Search Linear for equivalent issues, projects, and decisions, including linked
   issues' comments and evidence; reuse them. For an issue labeled Need triage,
   the rewritten issue is the outcome ([Need triage](references/issue-contract.md#need-triage)).
2. Read [domain context](references/domain-context.md) to reconcile integrated
   definitions with relevant accepted changes still pending.
3. Identify audience, problem, outcome, exclusions, current behavior, and unknowns.
   Resolve repository, Linear destination, and product from evidence. With no
   existing code, label technical assumptions unverified.
4. For a defect, record the report: steps, expected and actual behavior, environment,
   and source. `debug` reproduces and diagnoses it through the Bug issue.
5. For multiple outcomes or delivery/review limits that may be exceeded, use
   [large work](references/large-work.md) before drafting an execution issue.

**Done:** starting point and existing work identified; discoverable facts separated
from decisions that need the user. Inaccessible evidence blocks only dependent preparation.

## 2. Choose the work and clarify it

1. Choose the next work with [routing](references/issue-contract.md#choose-the-next-work)
   and its structure with [large work](references/large-work.md).
2. When consequential decisions remain open, run `interview` with the open questions,
   the evidence gathered, and the resume point. It returns accepted decisions,
   remaining questions, and needs for research or observation.
3. Turn each returned need into issues with
   [bound missing evidence](references/issue-contract.md#bound-missing-evidence).

**Done:** type, structure, and the consequential decisions for the selected work are
accepted, or each open decision has its prepared issues.
**Waiting:** a user decision is unanswered in `interview`.

## 3. Draft and obtain approval

1. Synthesize the accepted decisions without reopening them.
2. Draft executable issues with the [template of their type](references/issue-contract.md#issue-templates),
   and a broad goal with the [project template](templates/project.md). Write for
   someone without this chat, then run the
   [readiness review](references/issue-contract.md#readiness-review).
   A grouping-only parent summarizes its approved sub-issues using the owning
   workflow's parent template when provided; execution readiness belongs to its children.
3. Present the draft, readiness, and proposed structure. Obtain approval of content,
   publication action, destination, and any project, document, issues, or milestones.
4. Apply feedback only to affected decisions and passages; run `interview` again
   when feedback opens a new decision.

**Done:** content and breakdown approved. Otherwise retain the draft. An investigation
can be approved independently of the blocked implementation it informs.

## 4. Publish and hand over

1. Check approval, destination, write permissions, and actual Linear tool schemas.
2. Re-read existing records before updates; preserve concurrent and unrelated content.
   Apply [labels, status, and relations](references/issue-contract.md#labels-status-and-relations):
   one Type label per executable issue, none on grouping-only parents,
   one Product label per project, Backlog for every issue,
   and native blocking relations. Triage closes an issue only as Duplicate or
   Canceled; `implement` closes executed issues.
3. Publish approved containers/documents, then issues and relationships using returned
   identifiers. Verify content, destination, labels, status, memberships, and relations.
4. After a partial or uncertain write, inspect before retrying; retain confirmed IDs
   and name pending operations.
5. Return named links, status and blocking relations, and pending context changes.
   Point to `implement` for issues the user selects. Stop before executing handed-off
   work: publication grants no execution authorization.

**Done:** publication verified and handoff usable.
**Pending publication:** return the approved draft and exact remaining operation;
retain Linear as the destination rather than creating another backlog.

## Resume

Recover accepted decisions, evidence, open questions, and the resume point from
the existing authorized record or conversation, and continue there.
