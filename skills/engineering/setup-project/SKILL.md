---
name: setup-project
description: Configure a project's AGENTS.md and install the skills it needs. Run once when starting work in a new repository.
disable-model-invocation: true
---

# Set up a project for agents

Give the target repository an `AGENTS.md` holding what only that repo knows, and a list of the skills its agents must read before acting.

Every step below ends on a stated completion criterion. Reach it before moving on.

## What earns a place in the file

`AGENTS.md` holds what only this repository knows. Everything else already has a home that this skill leaves alone: the user's own global instructions, and the installed skills.

So a line earns its place only when it survives two questions:

- **Does something else already carry it?** A standard restated here becomes a second copy that drifts, and the copy is where qualifying clauses get dropped — turning a rule into a suggestion. Name the skill instead of quoting it. Testing is the clearest case: each framework has its own runner, layering and definition of a unit, so the stack skill owns that workflow.
- **Is it recoverable once violated?** A guardrail is the exception to the rule above. It protects against a loss no later reading repairs, so its text goes in full rather than behind a pointer.

## 1. Explore

Read the repository before asking anything. Ask only what reading cannot settle.

- `git remote -v`, and `git symbolic-ref refs/remotes/origin/HEAD` for the default branch.
- `AGENTS.md` and `CLAUDE.md` at the root — which exists, and does either already carry a `<!-- setup-project -->` block? A block sitting in `CLAUDE.md` is a copy from an earlier run, and step 4 replaces it with a pointer.
- Stack signals: `package.json`, `*.csproj` plus `ProjectSettings/`, `*.uproject`, `Cargo.toml`, `pyproject.toml`, `astro.config.*`, `src-tauri/`.
- Test signals: a test directory, a `test` script, `#[cfg(test)]` modules.
- `.editorconfig`, `eslint.config.*`, `clippy.toml` — what the tooling already enforces gets written nowhere else.
- Generated files, and registration points: the file that must list a thing for that thing to exist.
- `.agents/skills/` and `skills-lock.json` — the installed skills, each with the repository it came from. This is the catalogue step 2 works from.

**Done when:** every bullet is answered from the repository or explicitly marked absent, and the stack is named.

## 2. Propose, one decision at a time

Summarise what you found, then take the three decisions below in order. Lead each with your recommendation so the user can accept it in a word.

### The rules list

A rule is a skill the agent must open before acting. The list holds the skills carrying standards for code this repo writes; a skill that is a tool reached on demand — `agent-browser`, `imagegen` — gets installed without being listed, since mixing the two turns an obligation into a catalogue.

Build the list from what step 1 found in the target repository: `skills-lock.json` names every installed skill and the repository it came from, and each `.agents/skills/<name>/SKILL.md` carries the `description` stating when it fires. Skills arrive from many sources — `payloadcms/payload`, `shadcn/ui`, `vercel-labs/agent-skills` — so the project's own lockfile is the catalogue, not any single library's manifest.

Take each entry's trigger from that skill's `description`, condensed to the moment it applies here:

```
- `unity` — before writing C#, adding a script, folder or assembly
- `payload` — before touching a collection, hook or migration
```

When the stack needs a skill nothing has installed yet, propose it too and mark it as pending installation in step 6.

Read the list back entry by entry and take the user's answer on each: kept, dropped, or a different trigger wording.

**Done when:** the user has ruled on every entry.

### The guardrails

A guardrail is what only this repository knows — a stack standard belongs to its skill, and a linted rule to the linter. Read [guardrails.md](./guardrails.md): it carries the three-question test a candidate must pass, where to look for each kind, and how to phrase a row.

Work through its four hunting grounds against what step 1 found: generated files, registration points, reachable destructive commands, local-only files. Propose each row with its reason attached.

**Done when:** every candidate has passed the three-question test, the user has ruled on each surviving row, and each kept row still carries its reason.

### The testing decisions

These are invisible from the code and no skill can supply them: what "unit" means here, which layer a new test defaults to, what is deliberately not tested, whether existing tests may be modified, whether a test ships with every change.

Ask for the deliberate exclusions explicitly — generated code, thin adapters and third-party wrappers are usually excluded on purpose, and an untested module otherwise reads as an oversight to fix. Skip the section when the repo has no tests and the user wants no policy yet.

**Done when:** each question has an answer or an explicit skip.

Ask here whether the repository itself needs configuring — squash-only merges and a protected default branch. That is a one-time action carried out in step 5, and it never enters `AGENTS.md`. Skip it with no GitHub remote, or when `gh ruleset list` already returns a ruleset.

## 3. Confirm

Show the assembled block in full — the rules list and the guardrail text, every row spelled out. A summary such as "four rules, plus guardrails" hides what the user is agreeing to.

When the user wants a shared standard worded differently, change it at its source: their global instructions, or the library that owns that skill. Then every project inherits it, instead of one repository drifting.

**Done when:** the user has accepted the exact text about to be written.

## 4. Write

The block always goes in `AGENTS.md`, which every agent reads. Create it when it is missing.

`CLAUDE.md` holds a pointer to it, never a copy:

```markdown
See the instructions in AGENTS.md.
```

Write that line when `CLAUDE.md` already exists, and leave the rest of the file alone. Skip the file entirely when it is absent — Claude Code reads `AGENTS.md` on its own, so an empty pointer file earns nothing.

Two copies of the same standard drift the moment one is edited, and the reader has no way to tell which one is current.

Write between markers so a re-run updates in place, leaving every surrounding section untouched:

```markdown
<!-- setup-project:start written=<YYYY-MM-DD> -->
## Rules

Read the ones that apply to what you are about to touch, before you touch it.

- `unity` — before writing C#, adding a script, folder or assembly
- `payload` — before touching a collection, hook or migration

## Guardrails

Change a generated file at its source and regenerate it: `src/payload-types.ts` comes from the dev server, files in `src/migrations/` from `pnpm payload migrate:create`.

A new Payload admin component only exists once it is in the import map: run `pnpm generate:importmap` after adding one, or the admin panel silently renders nothing.

Restore `.env` and `.adsense-token.json` from the password manager when they go missing: they are gitignored, so no clone brings them back.

## Testing decisions

A unit test may use real collaborators when they are pure. A new test defaults to a unit test beside the code it covers. Payload collections and React components are verified against the dev server rather than unit-tested. Existing tests may be corrected, never weakened.
<!-- setup-project:end -->
```

The rules list goes in exactly as validated in step 2 — same entries, same triggers. The guardrails go in as real text: this block is the whole guardrail section, which is the point.

Date the marker. This skill runs from its installed copy with the target repository as the working directory, so no skill library's commit SHA is in reach — a date is what the agent can actually record, and it tells a later run how stale the block is. `skills-lock.json` already pins the version of every installed skill.

Write in the `writing-for-agents` register — read that skill first when it is installed:

- **State the target.** `Use rg` beats `Don't use grep`: a prohibition drags the forbidden behaviour into context and half-reads as an instruction to do it. Keep an outright ban only where the loss is irreversible, and name the legal path beside it.
- **Give the reason.** A rule with a rationale covers the case it did not anticipate.
- **Leave out what the environment already says.** The test command is in `package.json`; a copy of it goes stale.
- **One meaning, one place.** What the user's global instructions or an installed skill already carry never gets restated here.

**Done when:** the block sits between its markers, the surrounding file is untouched, and every line traces to something the user accepted.

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

**Done when:** every skill in the rules list is either installed already or covered by a printed command.

## 7. Report

Name what was installed, which of those the rules list obliges reading, which guardrails were written, what was configured on the repository, and what was skipped and why.

Close with where a standard changes: a shared one in the user's global instructions, a stack one in the library that owns that skill — edited at the source, then `npx skills update` in the projects. Editing an installed skill inside one repository drifts that project until the next update overwrites it.
