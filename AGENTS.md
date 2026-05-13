# AGENTS.md

## Overview & Scope

`agent-skills`: community-maintained Agent Skills (Markdown + a few helper scripts) for AI coding assistants (Claude Code, Cursor, Codex, generic agents). Distributed via the [`skills` CLI](https://skills.sh) at `Firzus/agent-skills`. Pure documentation repo — no app, no build system, no package manager.

Applies to the entire repository. No nested `AGENTS.md` exist; if one is added later, the closest `AGENTS.md` to the edited file wins.

## Agent Role

Technical writer + skill author for AI coding agents. Treat each `skills/<name>/SKILL.md` as the public contract consumed by agents.

- Allowed: edit/add Markdown skill files, add reference docs, update `README.md`, fix typos, restructure skills, propose new skills.
- Not allowed: introduce a build system or package manager, add runtime code outside `skills/<name>/scripts/`, modify the existing helper scripts under `skills/imagegen/scripts/` (see Safety), commit secrets, change the `LICENSE`, or invent install commands the user did not request.

## Repository Layout

```
.
├── README.md                  # User-facing index (install, skill list)
├── LICENSE                    # MIT
├── .gitignore
├── .cursor/                   # Cursor workspace metadata (kept empty in VCS)
└── skills/
    ├── vite-plus-best-practices/   # SKILL.md + topical reference .md files
    ├── imagegen/                   # SKILL.md + references/ + scripts/ (gen.sh, *.py)
    ├── extract-theme/              # SKILL.md + extraction-recipes.md + output-format.md
    └── find-skills/                # SKILL.md (local-only skill discovery)
```

Each skill folder follows the [progressive disclosure](https://skills.sh/docs) layout:

```
skills/<skill-name>/
├── SKILL.md          # YAML frontmatter (name, description) + body, < 500 lines
├── <topic>.md        # optional reference, loaded on demand
├── references/       # optional, longer-form references
└── scripts/          # optional, executable helpers
```

## Build, Test & Validation Commands

No package manager, no test suite, no CI script. Validation is manual.

```bash
# Quick repo check
git status
git log --oneline -10

# Find all SKILL.md files
ls skills/*/SKILL.md

# Verify each SKILL.md has YAML frontmatter (name + description)
head -n 5 skills/*/SKILL.md

# Line-count guard (SKILL.md should stay under ~500 lines)
wc -l skills/*/SKILL.md

# Render-check a Markdown file locally (if pandoc installed)  (unverified)
pandoc skills/find-skills/SKILL.md -t plain | head
```

Skill install / distribution commands are documented in `README.md` and run by end users — do not execute them from this repo:

```bash
# End-user install via the skills CLI (do NOT run from this repo)  (unverified)
npx skills add Firzus/agent-skills
npx skills add Firzus/agent-skills --skill <skill-name>
```

## Conventions & Patterns

- **Filenames:** kebab-case (`vite-plus-best-practices`, `find-skills`). Skill folder name must match the `name:` field in the SKILL.md frontmatter.
- **SKILL.md frontmatter:** required keys are `name` and `description`. Use a YAML block scalar (`description: >-`) when the description spans multiple lines or contains quotes.
- **SKILL.md body:** Markdown, second-person voice aimed at the agent ("Use this skill when…"). Keep under ~500 lines; offload detail into sibling `.md` files referenced by relative path.
- **Reference files:** topical, single-purpose, linked from `SKILL.md` with relative paths (e.g. `[commands.md](./commands.md)`).
- **Scripts:** only under `skills/<name>/scripts/`. Bash + Python are the established choices (see `imagegen`).
- **README.md:** keep the "Available skills" table in sync with the contents of `skills/`.
- **No secrets, no API keys, no internal URLs** anywhere in the repo.

## Dos and Don'ts

- Do: keep each SKILL.md focused, short, and discoverable via its `description` field — agents match on it.
- Do: link to existing reference files instead of duplicating prose.
- Do: update `README.md`'s skill table when adding, renaming, or removing a skill.
- Do: use Conventional Commits (see Git rules below).
- Don't: add a `package.json`, lockfile, build, lint, or test tooling at the repo root.
- Don't: edit `skills/imagegen/scripts/gen.sh`, `extract_image.py`, or `remove_chroma_key.py` — the `imagegen` skill explicitly forbids it.
- Don't: invent CLI commands, flags, or skill capabilities that aren't in the source docs of the tool the skill covers.
- Don't: include time-sensitive notes ("as of 2026…") in skill bodies.

## Safety & Guardrails

- Off-limits: secrets, credentials, license keys, internal-only URLs, end-user data.
- Never edit:
  - `LICENSE`
  - `skills/imagegen/scripts/**` (frozen helper scripts referenced by the skill)
  - Other contributors' SKILL.md without preserving their authorial intent
- Never run:
  - `npx skills add …` / `npx skills update` from inside this repo
  - Image generation / `codex` / network installs as part of a normal edit task
- Safe to automate: Markdown edits, frontmatter fixes, README table updates, link checks, line-count audits.

## Git & PR Rules

- Default branch: `main`.
- Commit format: Conventional Commits — observed in history: `feat(skills): …`, `fix(<skill>): …`, `refactor(<skill>): …`, `docs: …`, `security: …`.
- One logical change per commit; group skill + README updates together when they ship as a pair.
- PR expectations:
  - Describe the skill change and the motivating use case.
  - List the affected `skills/<name>/` paths.
  - Confirm `README.md`'s skill table is up to date.
  - Confirm no secrets, no large binary assets, no new build tooling.
