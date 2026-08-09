# Fragment: architecture — React

Architecture answers where code goes and what it may depend on. Style stays in `code-standards/typescript.md`.

React publishes no official folder structure. Present feature-first as a project convention, not as a React recommendation — the only thing React documents is where state lives.

## The core section

```markdown
## Architecture

Group by feature, not by file type. A feature folder owns its components, hooks and tests; shared code moves up only once a second feature needs it.

Lift state to the closest common parent of the components that read it, and no higher.
```

## Optional rows

- **Colocation** — keep a file next to what uses it; distance from its consumer is the cost being minimised.
- **Enforcement** — when the layering matters, encode it in `dependency-cruiser` and run it in CI. A rule a build can fail on outlives a rule a reviewer has to remember.

## Sources

- <https://react.dev/learn/sharing-state-between-components>
