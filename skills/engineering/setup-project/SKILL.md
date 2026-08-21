---
name: setup-project
description: Configure a project's AGENTS.md and install the skills it needs. Run once when starting work in a new repository.
disable-model-invocation: true
---

# Set up a project for agents

Give the target repository an `AGENTS.md` holding what only that repo knows, and install the skills its stack needs.

Every step below ends on a stated completion criterion. Reach it before moving on.

## What earns a place in the file

`AGENTS.md` holds what only this repository knows. Everything else already has a home that this skill leaves alone: the user's own global instructions, and the installed skills. Skill selection stays in the skill system; `AGENTS.md` carries no skill catalogue or mandatory-reading list.

So a line earns its place only when it survives two questions:

- **Does something else already carry it?** A standard restated here becomes a second copy that drifts, and the copy is where qualifying clauses get dropped. Leave it out rather than naming or quoting its skill. Testing is the clearest case: each framework has its own runner and layering, so the stack skill owns that workflow.
- **Is it recoverable once violated?** A guardrail is the exception to that principle. It protects against a loss no later reading repairs, so its text goes in full rather than behind a pointer.

## 1. Explore

Read the repository before asking anything. Ask only what reading cannot settle.

- `git remote -v`, and `git symbolic-ref refs/remotes/origin/HEAD` for the default branch.
- `AGENTS.md` and `CLAUDE.md` at the root: which exists, and does either already contain `## Guardrails` or `## Testing decisions`?
- Stack signals: `package.json`, `*.csproj` plus `ProjectSettings/`, `*.uproject`, `Cargo.toml`, `pyproject.toml`, `astro.config.*`, `src-tauri/`.
- Test signals: a test directory, a `test` script, `#[cfg(test)]` modules.
- `.editorconfig`, `eslint.config.*`, `clippy.toml` — what the tooling already enforces gets written nowhere else.
- Generated files, and registration points: the file that must list a thing for that thing to exist.
- `.agents/skills/` and `skills-lock.json`: the installed skills, each with the repository it came from. Step 2 uses them to avoid proposing an installation the repository already has.

**Done when:** every bullet is answered from the repository or explicitly marked absent, and the stack is named.

## 2. Propose, one decision at a time

Summarise what you found, then take the three decisions below in order. Lead each with your recommendation so the user can accept it in a word.

### The skills to install

Treat installed skills as capabilities, not permanent project instructions. Their own invocation metadata decides when agents read them, so their names and triggers stay out of `AGENTS.md`.

Use what step 1 found to identify skills the stack needs but the repository has not installed. `skills-lock.json` names every installed skill and the repository it came from. Each `.agents/skills/<name>/SKILL.md` carries the `description` stating when it applies. Sources include `payloadcms/payload`, `shadcn/ui` and `vercel-labs/agent-skills`. The project's own lockfile is the inventory, not any single library's manifest.

Propose only missing skills, with the source repository and the concrete stack signal that justifies each one:

```
- `unity` from `Firzus/agent-skills`: `ProjectSettings/` identifies a Unity project
- `payload` from `payloadcms/payload`: `payload.config.ts` identifies a Payload project
```

Take the user's answer on each proposal: install or skip. An installed skill needs no proposal and no entry in `AGENTS.md`.

**Done when:** every missing skill proposal has an install or skip decision, or the repository needs none.

### The guardrails

A guardrail is what only this repository knows — a stack standard belongs to its skill, and a linted constraint to the linter. Read [guardrails.md](./guardrails.md): it carries the three-question test a candidate must pass, where to look for each kind, and how to phrase a row.

Work through its four hunting grounds against what step 1 found: generated files, registration points, reachable destructive commands, local-only files. Propose each row with its reason attached.

**Done when:** every candidate has passed the three-question test, the user has ruled on each surviving row, and each kept row still carries its reason.

### The testing decisions

These are invisible from the code and no skill can supply them: what "unit" means here, which layer a new test defaults to, what is deliberately not tested, whether existing tests may be modified, whether a test ships with every change.

Ask for the deliberate exclusions explicitly — generated code, thin adapters and third-party wrappers are usually excluded on purpose, and an untested module otherwise reads as an oversight to fix. Skip the section when the repo has no tests and the user wants no policy yet.

**Done when:** each question has an answer or an explicit skip.

Ask here whether the repository itself needs configuring — squash-only merges and a protected default branch. That is a one-time action carried out in step 5, and it never enters `AGENTS.md`. Skip it with no GitHub remote, or when `gh ruleset list` already returns a ruleset.

## 3. Confirm

Show the exact `AGENTS.md` sections in full, with every guardrail and testing decision spelled out. Report approved skill installations separately because they never enter the file.

When the user wants a shared standard worded differently, change it at its source: their global instructions, or the library that owns that skill. Then every project inherits it, instead of one repository drifting.

**Done when:** the user has accepted the exact text about to be written.

## 4. Write

The accepted sections always go in `AGENTS.md`, which every agent reads. Create it when it is missing.

`CLAUDE.md` holds a pointer to it, never a copy:

```markdown
See the instructions in AGENTS.md.
```

Write that line when `CLAUDE.md` already exists, and leave the rest of the file alone. Skip the file entirely when it is absent — Claude Code reads `AGENTS.md` on its own, so an empty pointer file earns nothing.

Two copies of the same standard drift the moment one is edited, and the reader has no way to tell which one is current.

Replace an existing `## Guardrails` or `## Testing decisions` section under its heading. Append a missing section. Omit a heading when the user accepted no content for it. Leave every other section untouched.

```markdown
## Guardrails

Change a generated file at its source and regenerate it: `src/payload-types.ts` comes from the dev server, files in `src/migrations/` from `pnpm payload migrate:create`.

A new Payload admin component only exists once it is in the import map: run `pnpm generate:importmap` after adding one, or the admin panel silently renders nothing.

Restore `.env` and `.adsense-token.json` from the password manager when they go missing: they are gitignored, so no clone brings them back.

## Testing decisions

A unit test may use real collaborators when they are pure. A new test defaults to a unit test beside the code it covers. Payload collections and React components are verified against the dev server rather than unit-tested. Existing tests may be corrected, never weakened.
```

The guardrails go in as real text. Skill names, triggers and installation notes stay outside these sections.

Write in the `writing-for-agents` register — read that skill first when it is installed:

- **State the target.** `Use rg` beats `Don't use grep`: a prohibition drags the forbidden behaviour into context and half-reads as an instruction to do it. Keep an outright ban only where the loss is irreversible, and name the legal path beside it.
- **Give the reason.** An instruction with a rationale covers the case it did not anticipate.
- **Leave out what the environment already says.** The test command is in `package.json`; a copy of it goes stale.
- **One meaning, one place.** What the user's global instructions or an installed skill already carry never gets restated here.

**Done when:** each accepted section appears under its heading, the surrounding file is untouched, and every line traces to something the user accepted.

## 5. Configure the repository, if asked

Follow [repo-setup.md](./repo-setup.md): squash-only merges, then the ruleset protecting the default branch.

Show each command and its effect before running it. These settings change how everyone merges, and a ruleset locks the author out of a solo repository when the review count goes above zero.

**Done when:** `gh ruleset check --default` confirms what applied, and you have reported it.

## 6. Install what is missing

Only the skills the stack needs that no source has installed yet. Print one command per source repository, taking each source from where the skill actually lives:

```bash
npx skills add Firzus/agent-skills --skill unity
npx skills add payloadcms/payload --skill payload
```

Print them; the user runs them **in the target project**. An install run from a skill library overwrites the sources being developed there.

**Done when:** every skill approved for installation in step 2 is covered by a printed command.

## 7. Report

Name what was installed, which guardrails were written, what was configured on the repository, and what was skipped and why.

Close with where a standard changes: a shared one in the user's global instructions, a stack one in the library that owns that skill — edited at the source, then `npx skills update` in the projects. Editing an installed skill inside one repository drifts that project until the next update overwrites it.
