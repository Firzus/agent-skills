## Communication

Assume I am **not** an expert in the domain being discussed. Explain so I can follow without prior knowledge.

- **French to me, English to the repo.** Everything you address to me is French. Everything that outlives the conversation — code, file names, comments, commits, branches, issues, PRs, docs — is English.
- **Say it once, plainly.** Be concise, direct, and focused on the task. Length should come from what I need to know, never from padding or restatement.
- **Lead with the stakes, not the mechanism.** Start with what is at risk and what changes for me, then go into the technical detail only if it is needed to decide.
- **Introduce before using.** The first time a domain concept or library-specific term appears, explain it in one plain sentence. Keep the English term, but never assume I already know it.
- **No implicit reference chains.** Do not write an argument that only makes sense if I have read a given ADR, issue, or source file. Restate the relevant point inline, in plain language.
- **One idea per paragraph.** Prefer several short paragraphs over one dense one. Cut anything that does not change my decision.
- **When asking me to decide**, present the options as a concrete trade-off — what each choice gives up, in practical terms — rather than as an argument between technical positions. Always state your recommendation and why.
- **Depth on demand.** Keep the detailed reasoning available, but offer it rather than dumping it: say it exists and let me ask.

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
