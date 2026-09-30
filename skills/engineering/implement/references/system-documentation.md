# Explain a system without duplicating its implementation

Use this reference when creating, substantially revising, auditing, or retiring
a system page. Keep small corrections local.

## Decide what needs explaining

A system page serves two purposes:

- Briefly situate the system: its purpose, boundaries, and place in the project.
- Explain consequential relationships, assumptions, or reasons that the code
  and its comments do not adequately convey.

Spanning several files is not sufficient reason to document a mechanism.
Identify the reader's actual comprehension gap before creating or expanding
a page. An existing overview may already provide enough orientation; not every
system needs its own document.

Reuse the project's documentation location and ownership. When a new page is
warranted and no convention exists, propose its location before writing.
The [system template](../templates/system.md) is a starting point, not a quota
of sections to fill.

## Establish the explanation

Read the relevant implementation, callers, configuration, tests, comments, and
existing documentation. Use documentation to locate evidence, not as proof of
current behavior. Verify the claims on which the task depends.

Separate observed behavior, accepted intent, historical rationale, and unknowns.
Do not infer an architectural reason from the implementation alone. Ask only
when an unavailable reason is necessary to explain a consequential choice.

For accepted domain-context changes, follow
[context delivery](intake-and-handoff.md#deliver-context-with-the-change).

## Write only what helps understanding

Start with two to four sentences of orientation. Follow with the explanations
needed to close the identified comprehension gap.

Prefer a compact diagram when it makes relationships, ownership, or a flow easier
to understand than prose. Show conceptual responsibilities, not every module.
Explain non-obvious consequences rather than narrating the diagram.

Keep each explanation where it is most useful:

- Local implementation rationale stays beside the code.
- Definitions remain in the project's glossary or context document.
- Contracts, runbooks, and decision records already in the repository are linked,
  not copied.
- Task progress and execution results remain in delivery records.

Omit file inventories, exhaustive behavior lists, and implementation details
already clear from code or comments. Include an exact value only when that value
is necessary to understand the explanation; link its authoritative source.

Use relative links to the few source files, tests, or documents present in the
repository version being documented. System pages must remain understandable
without external documents: no references to issues, pull requests, external
documentation, or hosted historical snapshots, including those of the same project.
When an external record holds an essential reason, verify it and retain only the
necessary explanation locally, not a copied discussion or a bare issue identifier.
If it cannot be verified, expose the uncertainty instead of inventing a reason.
Do not turn local links into a repository tour or a verification report.
A section with no useful content is omitted, not filled with "None".

## Maintain and verify

Update a page when a change affects its overview or retained explanations,
not merely because implementation files changed. Replace superseded passages
instead of appending a change history. Preserve the project's date convention,
but never treat a recent date as evidence that every claim remains correct.

During an authorized audit, remove redundant explanations rather than move them
into new documents. Preserve unique rationale and necessary operational guidance.
Preview page deletions and update incoming links within the authorized scope.
Project-instruction changes follow their own approval gate.

Check retained claims against their sources and validate affected links and
diagram relationships. Verify that documentary references resolve within the
current repository and no explanation depends on an external record.
Report unavailable evidence and documentary versus runtime verification in the
handoff. Repository documentation does not establish deployment or live external
behavior.

**Done:** a reader can quickly place the system, understand what its code and
comments leave unexplained, and find the relevant sources without reading a
second description of the implementation.
