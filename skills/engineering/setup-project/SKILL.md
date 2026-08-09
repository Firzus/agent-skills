---
name: setup-project
description: Configure a project's AGENTS.md and install the relevant skills from this library. Run once when starting work in a new repository.
disable-model-invocation: true
---

# Set up a project for agents

Compose the target repository's `AGENTS.md` from the fragments in this skill folder, then propose the skills worth installing.

Two mechanisms, one rule each:

- **`AGENTS.md`** holds what must be true at all times. It is the only file an agent is guaranteed to load.
- **Skills** hold what fires at a moment. A skill's description is always visible, so the agent reaches it on its own.

A pointer to some other file is neither. Codex reads `AGENTS.md` on the path from the repository root to the working directory and nothing else automatically, so anything non-negotiable belongs inline.

This is a prompt-driven skill. Explore, present what you found, confirm with the user, then write.

## Process

### 1. Explore

Read the target repository before asking anything. Ask only what exploration cannot settle.

- `git remote -v` — is this GitHub? Which repo? What is the default branch (`git symbolic-ref refs/remotes/origin/HEAD`)?
- `AGENTS.md` and `CLAUDE.md` at the root — does either exist? Does it already carry a `<!-- setup-project -->` block?
- Stack signals: `package.json`, `*.csproj` plus `ProjectSettings/` (Unity), `*.uproject` (Unreal), `Cargo.toml`, `pyproject.toml`, `astro.config.*`, `src-tauri/`
- Test signals: an existing test directory, a `test` script, `#[cfg(test)]` modules
- `CONTEXT.md` — if present, domain vocabulary is already owned there; leave it alone
- `.editorconfig`, `eslint.config.*`, `clippy.toml` — rules already enforced here are excluded from the fragment

### 2. Present findings and ask

Summarise what you found and what is missing. Then take the sections in order, one section and one answer at a time.

Lead each section with the recommended answer so the user can accept it in a word. Skip a section outright when exploration already settled it, and say you skipped it.

**Section A — Git workflow.** Read [git-workflow.md](./git-workflow.md). Confirm the branch type list and whether the draft-PR lifecycle applies. Skip the PR half entirely when there is no remote.

Ask here whether the repository itself still needs configuring — squash-only merges and a protected default branch. This is a one-time action rather than a rule, so it is carried out in step 5 and never written into `AGENTS.md`. Skip it when there is no GitHub remote, or when `gh ruleset list` already returns a ruleset.

**Section B — Guardrails.** Read [guardrails.md](./guardrails.md). Propose the rows matching the detected stack. A guardrail earns its place only when the repo does not already confess it.

**Section C — Testing.** Read [testing.md](./testing.md). This section is decisions, not commands. Skip it when the repo has no tests and the user does not want a policy yet.

**Section D — Architecture.** Read the matching file in [architecture/](./architecture/). Skip when the project is small enough to have no placement rules worth stating.

**Section E — Code standards.** Read the matching file in [code-standards/](./code-standards/). Cut every rule already enforced by the tooling found in step 1.

**Section F — Comments.** Read [comments.md](./comments.md). The default is a module header where a file carries a decision, and no inline commentary. Skip the doc-comment rows when the project has no exported API surface.

### 3. Confirm

Show the user the drafted block before writing it. Let them edit.

### 4. Write

Pick the file:

- If `CLAUDE.md` exists, edit it.
- Else if `AGENTS.md` exists, edit it.
- If neither exists, ask which to create.

Edit the file that is already there. Creating the second one splits the source of truth.

Write between markers so a re-run updates in place:

```markdown
<!-- setup-project:start source=agent-skills@<commit-sha> -->
...composed sections...
<!-- setup-project:end -->
```

Record the short SHA of this repository's `HEAD` in the marker. It is what makes a later re-sync possible.

When a block already exists, replace its contents and leave every surrounding section untouched.

Apply `writing-for-agents` discipline to everything you write — read that skill first if it is installed:

- **State the target, not the ban.** `Use rg` beats `Don't use grep`. Models process negation unreliably and are drawn toward whatever is named, so a prohibition is a weak instruction.
- **Keep an outright prohibition only where the downside is irreversible** — secrets, history rewriting — and pair it with the legal alternative.
- **Give the reason.** A rule with a rationale covers cases the rule did not anticipate.
- **Leave out what the environment already says.** The test command is in `package.json`; restating it is a copy that goes stale.
- **One meaning, one place.** Say it in the fragment or in a skill, never both.

Aim for 30–150 lines total. Past that, the rules that matter get diluted by the ones that do not.

### 5. Configure the repository, if asked

If the user accepted in section A, follow [repo-setup.md](./repo-setup.md): set squash-only merges, then create the ruleset protecting the default branch.

Show each command and its effect before running it. These settings change how everyone merges, and a ruleset can lock the author out of their own repository when the review count is set above zero on a solo project.

Verify with `gh ruleset check --default` and report what applied.

### 6. Propose skills

Read `.claude-plugin/marketplace.json` in this repository and propose the skills matching the detected stack. Present the list and let the user cut it.

Then print the install command for the user to run **in the target project**:

```bash
npx skills add Firzus/agent-skills --skill <name>
```

Print it; the user runs it. Running it from inside this repository would overwrite the sources being developed here.

### 7. Done

Tell the user which sections were written, which were skipped and why, what was configured on the repository, and which skills were proposed. Mention that editing the block by hand is fine — re-running this skill is only needed to resync with an updated library.
