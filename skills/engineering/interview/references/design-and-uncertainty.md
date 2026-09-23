# Resolve design uncertainty

## Inspect existing behavior

- Trace callers, responsible modules, dependencies, and tests.
- Describe caller-facing contracts: inputs, results, errors, ordering, invariants.
  Reuse project vocabulary. A module owns behavior behind an interface; a seam
  allows that behavior to be substituted.
- Prefer small interfaces containing complexity; justify a new abstraction by a
  concrete variation or constraint. Check whether removing a layer simplifies the
  system or duplicates responsibilities.
- Use tests at caller-facing boundaries. Compare alternatives only when outcome,
  compatibility, testability, or reversal cost could change.
- Obtain consequential choices in plain language; record contracts and verification
  boundaries, leaving routine internals to implementation.

**Done:** consequential design choices accepted and verification boundaries identified.

## Bound missing evidence

Use [routing](issue-contract.md#choose-the-next-work) for work type and
[large-work framing](large-work.md) before designing a broad ambition.

| Missing input | Next action |
| --- | --- |
| Discoverable project fact | Inspect its owner or run a safe existing check |
| Disputed external fact | Bound the research question and required evidence |
| Behavior requiring observation | Define a prototype and how it will be judged |
| Domain intent or preference | Ask a concrete question |
| Access or external prerequisite | Name the required action and owner |

For each blocker, record: **question, importance, prerequisites, stopping evidence,
resume point**. Keep it in the current brief unless independent follow-up is needed.
Direct lookups stay in the interview. Substantial research/prototypes require
authorized scope and the appropriate available skill; otherwise propose the next
action. Report missing capabilities instead of inventing them or provisioning services.

**Done:** findings return to the same decision record.
**Blocked:** required evidence is missing; retain the bounded investigation.

## Prototype during preparation

Prototype only when an important choice needs observed behavior: for example,
an interactive UI comparison or a simulation of ambiguous domain rules.
UI or critical logic alone does not require a prototype.

1. State the unresolved question and the observation needed to answer it.
2. Isolate work on `feature/prototype-<subject>`. Preserve unrelated work and the
   prepared checkout; use a separate worktree when needed.
3. Run the available prototype skill within authorized scope and mode; otherwise
   leave the experiment pending.
4. Review observations with the user. Commit the reviewed version and launch
   instructions only within the approved delivery scope. Without commit approval,
   preserve local work and evidence; report the versioned handoff as pending.
   Push only to the authorized remote with approval covering that action; verify
   the remote branch contains the reviewed commit.
5. Through the interview's publication approval, put the accepted decision, branch
   link, and exact validated commit in the Linear issue. Resume the interview.

| Retention / handoff | Rule |
| --- | --- |
| Remote branch | Keep indefinitely, including after implementation; exclude from cleanup and preserve validated commits |
| Archive | The branch is the retained artifact; no additional archive required |
| Implementation | Consult the validated version; reuse suitable parts selectively, not by automatic merge |
| Verification | Prototype approval settles a design choice, not production reliability; ordinary production tests still apply |

**Done:** reviewed version and launch instructions available remotely; approved issue
references branch and validated commit.
**Pending publication:** preserve local work and the draft; name missing permission,
access, or failed operation. An accepted design is not a completed handoff.
