# Domain context

Context documents hold the domain meanings the repository already implements, so
an agent uses the project's words and rules rather than inventing its own. Use
the project's existing names and locations; otherwise these conventions apply:

| Project state | Context documents |
| --- | --- |
| Root `CONTEXT-MAP.md` | Several contexts: the map links each context's `CONTEXT.md` with its purpose and states the relationships between contexts |
| Root `CONTEXT.md`, no map | One context |
| Neither | None; create one only when the user asks |

## Read

Identify the contexts the request involves from the terms it uses and the
behavior it changes, and read their `CONTEXT.md` before settling decisions. For
a project, also read the meanings accepted in its "Decisions so far" that no
unit has integrated yet. When a term is missing, means something else in another
context, or conflicts with the request, its meaning is a decision for
`interview`, unless the map's relationships already settle it.

## Update

A change that alters a domain meaning (a new term, a changed rule, a renamed
concept) updates the affected `CONTEXT.md` in the same change as its code, and
the agreement names that update. In a project, a meaning accepted before the
unit that implements it stays in "Decisions so far" until that unit integrates
it.

Each context keeps its own definition of a term; when two contexts use one term
differently, the map's relationship states which meaning applies where they
meet. A map links documents, not code, and holds no definitions:

```markdown
# Context map

## Contexts
- [<Context name>](<path>/CONTEXT.md): <one-sentence purpose>.

## Relationships
- <Context A> → <Context B>: <what crosses the boundary, and which meaning a shared term takes there>.
```
