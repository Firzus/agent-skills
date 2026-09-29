---
name: triage
description: Turn a new request, a Need triage issue, or a Linear project to continue into approved Linear work by finding existing records, choosing the work type and structure, settling open decisions through interview, drafting with strict templates, and publishing in Backlog.
disable-model-invocation: true
---

# Triage a request into Linear work

Every request for work starts here, including small changes: `implement` executes
only published Linear issues. Triage reads Linear and the repository, decides which
issues are needed, runs `interview` for open decisions, drafts the issues, and
publishes them after approval. `implement` re-enters this skill at step 3 to
publish the follow-up work of an Interview issue.

| Term | Meaning |
| --- | --- |
| Executable issue | An issue with exactly one Type label: Task, Bug, Prototype, Research, or Interview |
| Grouping parent | An issue without a Type label whose only role is to group sub-issues |
| Consequential decision | A choice whose answer changes an issue's type, scope, acceptance criteria, structure, or blocking relations. Every other choice is routine and belongs to implementation |
| Discoverable fact | Information available in the repository, Linear, linked records, or documentation. Triage looks it up and never asks the user for it |
| Approval | An explicit user message accepting the draft as last presented, including its publication. Silence, or approval of an earlier version, is not approval |

| Situation | Rule |
| --- | --- |
| Implementation or bug fix | Publish the issue; an `implement` run on it delivers the change |
| Question needing substantial research | Prepare a Research issue and an Interview issue blocked by it |
| Behavior that must be observed | Prepare a Prototype issue and an Interview issue blocked by it |
| Repository context change | Describe it in the issue; `implement` delivers it |
| Read-only or planning mode | Keep drafts in the conversation; make no writes |

## 1. Establish the starting point

1. Identify the entry:

   | Invocation | Entry |
   | --- | --- |
   | New request | Continue with step 1.2 |
   | Issue labeled Need triage | The outcome is that issue, rewritten ([Need triage](references/issue-contract.md#need-triage)) |
   | Project link or name | [Continue the project](references/large-work.md#continue-a-project) |

2. Read the request, project instructions, and relevant code and tests. Search Linear
   for issues, projects, and decisions about the same outcome, including their
   comments and linked evidence. Treat each match by its relation to the request:

   | Existing record | Treatment |
   | --- | --- |
   | Open issue with the same outcome | Reuse it; create no duplicate |
   | Issue whose result the requested work requires | Reuse it without changing its parent; add its blocking relation to the requested work and apply the [rewrite rule](references/issue-contract.md#labels-status-and-relations) to the existing issue |
   | Issue that the requested work unblocks | Add a blocking relation from the new work; apply the [rewrite rule](references/issue-contract.md#labels-status-and-relations) to the existing issue |
   | Other related issue, open or closed | Cite it in References; create no native relation |

3. Read [domain context](references/domain-context.md) to reconcile integrated
   definitions with accepted changes still pending.
4. Identify audience, problem, expected outcome, exclusions, and current behavior.
   Resolve repository, Linear team, and product from evidence. Without access to
   the code, mark technical statements as unverified.
5. For a defect, record the report: steps, expected behavior, actual behavior,
   environment, and source. Ask the reporter for missing report facts, together with
   the first interview questions when there are any; write "Unknown" for facts the
   reporter does not know. Reproduction and diagnosis belong to `debug`.
6. When the request needs more than one executable issue, or its delivery exceeds the
   project's agreed limits, apply [large work](references/large-work.md).

**Done:** starting point and existing records identified; discoverable facts looked
up and separated from decisions that need the user. Inaccessible evidence blocks
only the preparation that depends on it.

## 2. Choose the work and settle decisions

1. Choose each issue's type with [routing](references/issue-contract.md#choose-the-next-work)
   and the structure with [large work](references/large-work.md#choose-the-structure).
2. List the consequential decisions still open. When the list is not empty, run
   `interview` with those decisions, the evidence gathered, and the resume point.
   When it is empty, skip `interview`. It returns accepted decisions, remaining
   questions, and needs for research or observation.
3. Turn each returned need into issues with
   [bound missing evidence](references/issue-contract.md#bound-missing-evidence).
4. When the request depends on work that no issue covers, triage that prerequisite
   in the same run as its own issue, blocking the dependent one. If its consequential
   decisions cannot be settled now, it becomes a need handled as in step 2.3.

**Done:** type, structure, and consequential decisions of the selected work are
accepted, or each open decision has its prepared issues.
**Waiting:** a user decision is unanswered in `interview`.

## 3. Draft and obtain approval

1. Record the accepted decisions without reopening them.
2. Draft each executable issue with the [template of its type](references/issue-contract.md#issue-templates)
   and a project with the [project template](templates/project.md). A grouping
   parent contains its outcome in one sentence. Its sub-issues are represented by
   native Linear parent-child relations.
   Write for a reader without this conversation, then run the
   [readiness review](references/issue-contract.md#readiness-review).
3. Draft no issue whose content depends on a decision still open in an Interview
   issue. That work is drafted when the Interview issue completes, through this step.
4. Present every draft in full with its structure, labels, status, blocking
   relations, and destination, then ask for approval.
5. Apply feedback only to the affected decisions and passages. When feedback opens a
   consequential decision, run `interview` again. Present the revised draft; only
   the approved version is published.

**Done:** drafts and structure approved. Otherwise keep the draft. A Research or
Prototype issue can be approved without the blocked work it informs.

## 4. Publish and hand over

1. Check approval, destination, write permissions, and the actual Linear tool schemas.
2. Re-read each existing record before updating it; preserve concurrent and
   unrelated content.
3. Publish in this order: the project (created, or its description updated), the
   issues, the blocking relations, then the project description again to add the
   new issue links to its user stories.
4. Apply [labels, status, and relations](references/issue-contract.md#labels-status-and-relations).
   Triage closes an issue only as Duplicate or Canceled, with approval;
   `implement` closes executed issues.
5. Re-read every written record and verify content, labels, status, relations, and
   project membership.
6. After a failed or uncertain write, re-read before retrying; list the confirmed
   identifiers and the pending operations.
7. Return the links, statuses, blocking relations, and pending context changes, and
   name the issues ready for `implement`. For a project, tell the user to run
   `triage` with the project link in a new conversation once its open issues are
   closed. Stop here: publication does not authorize execution.

**Done:** publication verified and handoff returned.
**Pending publication:** return the approved draft and the exact remaining
operations; keep Linear as the destination rather than creating another backlog.

## Resume

Recover accepted decisions, evidence, open questions, and the resume point from
the existing record or conversation, and continue there.
