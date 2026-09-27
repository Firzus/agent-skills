---
name: improve-architecture
description: Find evidenced architecture improvements and publish the approved ones as a Linear parent issue with one Task sub-issue per refactor, ready for implement.
disable-model-invocation: true
---

# Improve architecture

Identify architectural friction and turn the improvements the user approves into
Linear work. Prefer changes that hide implementation complexity behind a smaller,
clearer interface while preserving behavior. A review publishes one parent issue
and one Task sub-issue per refactor; `implement` delivers each sub-issue. The
request authorizes investigation and, after the user's approval, publication in
Linear. It does not authorize refactoring.

## 1. Scope the investigation

1. Read the request, project instructions, repository state, existing Linear work,
   and relevant design decisions. Use the project's actual glossary and document
   locations; do not require or create CONTEXT.md or an ADR directory by default.
2. Follow the user's named pain point or subsystem. Without one, inspect recent
   changes and callers to find a bounded area where change is costly. Expand only
   when evidence identifies another affected boundary.
3. Record the revision being examined and unrelated local changes.
4. Delegate independent scan questions when useful and supported. Give each worker
   a read-only scope, inputs, expected evidence, and stopping condition. No fixed
   agent quota, duplicate whole-repository scans, or recursive delegation.

Use established project terms, including component, service, API, or module where
appropriate. For each candidate, ask:

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

## 2. Present the recommendations

Present the candidates in the conversation as a numbered list, in the user's
language. For each one give a short title, affected paths, the observed friction
and its evidence, the proposed change (target interface, behavior to preserve,
exclusions), dependencies on other recommendations, and acceptance checks.
Add a Mermaid before/after diagram only where relationships need explanation.
Separate illustrative designs from observed implementation, and ask before
reopening an accepted design decision that conflicts with a recommendation.

Recommend where to start, then ask which recommendations to keep.

**Done:** the user has selected the recommendations to publish; the others stay
out of Linear.

## 3. Draft the issues and obtain approval

1. Draft the parent issue with the [review template](templates/review.md). It
   carries no Type label: it groups the review's sub-issues and is delivered
   through them.
2. Draft one sub-issue per selected recommendation with the
   [Task template](../triage/templates/task.md) and the Task label:
   - **User story:** as a maintainer of the area, the change and the concrete
     work it makes cheaper.
   - **Context:** observed friction, evidence, affected paths, and revision.
   - **Scope** and **Out of scope:** the target interface, the change, and its exclusions.
   - **Acceptance criteria:** Given/When/Then scenarios on the caller-visible
     behavior that stays the same and on the new interface.
   - **Verification:** the passing behavioral baseline to preserve, and the
     characterization tests to add first where that behavior is not covered.
3. Express each dependency between recommendations as a blocking relation between
   sub-issues.
4. Present the drafts and obtain approval of their content and publication.

**Done:** drafts approved. Otherwise keep them in the conversation.

## 4. Publish and hand over

Publish with the [triage publication rules](../triage/SKILL.md#4-publish-and-hand-over):
parent first, then sub-issues attached to it, all in Backlog, with native blocking
relations. Verify content, labels, parent membership, status, and relations.

The parent is complete when all its sub-issues are Done; Linear closes it
automatically when the team enables Parent auto-close. Return the named links,
the recommended first sub-issue, and point to `implement` to deliver it.

**Done:** publication verified and each sub-issue ready for `implement`.
