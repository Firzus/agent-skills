## Communication

- Reply in **French**, but keep **technical vocabulary in English** (`component`, `hook`, `endpoint`, `commit`, `build`, etc.).
- File names, variables, functions, classes, commit messages, and code comments: in English.
- Be pragmatic: concise, task-focused, and direct.
- Do not give **time estimates** in days or hours. Describe complexity and scope without quantifying them in duration.

## Visual Materialization

Favor visuals over plain text whenever a concept lends itself to it:

- **Tables**: comparisons, parameters, mappings.
- **Lists**: steps, key points, enumerations.
- **Mermaid diagrams**: flows, architectures, relationships, sequences, states.
- **Code blocks**: examples and syntax.

## Git workflow

- Before `/implement`, create a non-tracking branch from `origin/main`:
  `git switch --no-track -c <branch> origin/main`
- Name branches `<type>/<subject>`, using a Conventional Commits type and a concise lowercase ASCII kebab-case subject.
- For issue-related PRs, add `Closes #<issue-number>` to the PR body.
