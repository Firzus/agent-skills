# Finding this repository's guardrails

A guardrail is a trap no config file confesses: something an agent cannot deduce
by reading the repo, and that costs a session when violated. What a linter
already enforces is noise; what a skill already carries belongs to that skill.

This is the one section written into the project's `AGENTS.md` in full rather
than left to an installed skill, because a guardrail protects against a loss no
later reading repairs. It has to be loaded before the first action.

That makes this file a detection method rather than a catalogue. Stack standards
— committing `Cargo.lock`, `.meta` sidecars, asmdef boundaries — live in the
stack skills. What follows finds what only *this* repository knows.

## The test a candidate must pass

Three questions, in order. A row that fails any of them stays out.

1. **Can the agent deduce it by reading the repo?** If a config file, a script or a directory layout states it, the environment is already the source of truth.
2. **Does a linter or an installed skill already carry it?** Then it is enforced or documented elsewhere, and a second copy drifts.
3. **Is the damage recoverable by reading the instruction afterwards?** A rebuild fixes stale output; a dropped GUID or an overwritten migration does not. Only the unrecoverable earns permanent context.

## Where to look

### Generated files

The agent cannot tell a generated file from a written one — they are ordinary
source in the same directories. Name each one, with the command that produces
it, or the agent hand-edits it and its next regeneration silently reverts the work.

Signals: a header comment saying the file is generated, a `*.generated.*` name,
a path under `src/migrations/` or `Generated/`, a type file matching a schema, a
lockfile, an import map. Cross-check against the scripts in `package.json`, the
build files, and `.gitattributes` marking paths as generated.

### Registration points

A file that must be listed somewhere else to exist at all. The failure is
invisible from inside the file itself: the code compiles, and nothing runs.

Signals: a manifest, an index, a glob in a config, a generated map. Ask what
happens when the entry is missing — a silent no-op is the shape that costs a
session.

Examples across stacks: a Unity assembly listing its references in an `.asmdef`;
a Django app in `INSTALLED_APPS`; a Payload admin component in the import map; a
monorepo package matching the root `workspaces` glob. In this library, a skill
folder listed in `.claude-plugin/marketplace.json`.

### Reachable destructive commands

A command the repo makes available whose damage is irreversible: a script that
drops a database, a deploy that overwrites production, a migration with no down
step. Read the scripts the project defines rather than assuming the usual set.

### Local-only files

Files that exist on the machine and nowhere else — `.env`, a token cache, local
credentials. They are gitignored precisely because they are irreplaceable, which
also means no clone can restore them. Name them when a routine command can
remove them.

## Phrasing a row

State the target and give the reason: an instruction with a rationale covers the case it
did not anticipate. Reserve an outright prohibition for the irreversible, and
name the legal path beside it — a ban drags the forbidden behaviour into context
and half-reads as an instruction to do it.

Write "Change a generated file at its source and regenerate it: `src/payload-types.ts`
comes from the dev server", rather than a bare interdiction to edit it.

Both Codex and Claude Code keep hard floors even in their full-bypass modes —
Codex protects `.git` recursively under `workspace-write`, Claude Code still
prompts on `rm -rf /` and `rm -rf ~`. A project's own guardrails should hold at
least that line.

## What lives elsewhere

- **Git** — `git stash push -u` before rewriting the tree, `git clean -fdX` over `-fdx`, `--force-with-lease --force-if-includes`. These sit in the machine-level `AGENTS.md`, documented in this repository's `README.md` under Global instructions.
- **Stack standards** — Unity `.meta` GUIDs, binary merges and asmdef boundaries in the `unity` skill; `Cargo.lock` and Rust discipline in `tauri`. A project repeats none of them.

## Sources

- <https://developers.openai.com/codex/sandbox>, <https://docs.claude.com/en/docs/claude-code/permissions>
