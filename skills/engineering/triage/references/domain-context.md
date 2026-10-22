# Define context without changing the repository

## Read and reconcile

Context documents hold the domain meanings integrated into the repository. Use the
project's existing names and locations; otherwise these conventions apply:

| Project state | Context documents |
| --- | --- |
| Root `CONTEXT-MAP.md` | Several contexts. The map lists each context with its purpose and a link to its `CONTEXT.md`, and records the relationships between contexts |
| Root `CONTEXT.md`, no map | One context |
| Neither, or an involved context without its document | None for that context; accepted meanings stay in the owning issue's Accepted decisions, and its Context changes is None, unless the user asks for that document ([prepare the context delta](#prepare-the-context-delta)) |

A map links documents, not code locations, and holds no term definitions:

```markdown
# Context map

## Contexts
- [<Context name>](<path>/CONTEXT.md): <one-sentence purpose of the context>.

## Relationships
- <Context A> → <Context B>: <what crosses the boundary, and which meaning a shared term takes there>.
```

The owning Linear issue holds accepted changes awaiting integration; it is not a
second complete context document.

1. Identify the contexts the request involves from the terms it uses and the
   behavior it changes, using the purposes in the map, and read the `CONTEXT.md` of
   each. A request can involve several contexts. When a term or behavior could
   belong to more than one context, which one applies is a decision for `interview`,
   unless the map's relationships already settle it.
2. Read the pending changes in open issues for those contexts. Verify integration
   from linked delivery evidence, not issue status alone. For a context without its
   document, also search Linear issues, including closed ones, for accepted
   meanings of the request's terms.
3. Separate current behavior from intended behavior. Send ambiguous meanings and
   conflicting pending changes to `interview`, and record dependencies;
   inaccessible decisions leave affected readiness unknown.

Record accepted terms with the rules of `interview`'s domain meaning. Each context
keeps its own definition of a term. A term that means something else in another
context keeps both definitions, and the map's relationship between the two contexts
states which meaning applies where they meet. Include aliases or translations only
when useful.

**Done:** involved contexts identified; relevant meanings and conflicts resolved;
unknown domain meaning stays open.

## Prepare the context delta

Leave repository context files unchanged during triage. Put only the delta in the
Task's "Context changes (accepted, not integrated)" section. A fix that needs a
context change alters accepted behavior, so it is a Task holding the delta.

- One entry per target document: the `CONTEXT.md` of each affected context, or
  `CONTEXT-MAP.md` when a relationship changes or a context is added, split,
  renamed, or removed.
- Each entry gives the section, the addition, change, or removal, and its rationale;
  for each term, its meaning and important distinctions.
- For a delta owned by another issue: a link to it instead of a copy, and whether
  this work needs its decision, an accessible artifact, or its integrated change.
  A required integrated change is also a blocking relation.
- When the user asks for a new context document, including a first `CONTEXT.md` or
  `CONTEXT-MAP.md`, its entry gives the location, a short domain description, and
  the accepted definitions, plus the map entry that links it when a map exists. A
  request for a second context includes creating the map; the existing root
  `CONTEXT.md` becomes one of its listed contexts, in place unless the user asks to
  move it.

A context-only clarification gets a bounded documentation task rather than waiting
for an unrelated feature. Triage prepares the issue; `implement` reconciles,
delivers, and verifies the delta with the issue's code. Keep definitions/deltas
accessible to the implementer; missing required artifacts are prerequisites.

**Done:** the accepted delta, and for another issue's delta the required outcome,
are in the approved issue.
**Pending publication:** retain the draft until Linear publication is authorized
and available. Domain definition is required before product implementation is ready.
