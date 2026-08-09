# AGENTS.md

## Overview & Scope

`agent-skills`: community-maintained Agent Skills (Markdown + a few helper scripts) for AI coding assistants (Claude Code, Cursor, Codex, generic agents). Distributed via the [`skills` CLI](https://skills.sh) at `Firzus/agent-skills`. Pure documentation repo — no app, no build system, no package manager.

Applies to the entire repository. No nested `AGENTS.md` exist; if one is added later, the closest `AGENTS.md` to the edited file wins.

## Agent Role

Technical writer + skill author for AI coding agents. Treat each `skills/<section>/<name>/SKILL.md` as the public contract consumed by agents.

- Allowed: edit/add Markdown skill files, add reference docs, update `README.md`, fix typos, restructure skills, propose new skills.
- Not allowed: introduce a build system or package manager, add runtime code outside `skills/<section>/<name>/scripts/`, commit secrets, change the `LICENSE`, or invent install commands the user did not request.

## Repository Layout

```
.
├── README.md                  # User-facing index (install, skill list)
├── LICENSE                    # MIT
├── .gitignore
├── .cursor/                   # Cursor workspace metadata (kept empty in VCS)
├── .claude-plugin/
│   └── marketplace.json       # One plugin per section — drives the skills-CLI install groups
└── skills/
    ├── web/                   # Web & app development (frontend-design pipeline, frameworks, assets)
    ├── game/                  # Game development (Unity 6 / UE5 systems)
    └── engineering/           # Cross-cutting engineering (browser automation, code health, PR care)
```

Skills live one level below their section (`skills/web/tauri/`, `skills/game/combat-system/`). A new skill goes into the section it belongs to, **and** into that section's `skills` list in `.claude-plugin/marketplace.json` — the installer's grouping reads that list, not the directory tree.

Each skill folder follows the [progressive disclosure](https://skills.sh/docs) layout:

```
skills/<section>/<skill-name>/
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
ls skills/*/*/SKILL.md

# Verify each SKILL.md has YAML frontmatter (name + description)
head -n 5 skills/*/*/SKILL.md

# Line-count guard (SKILL.md should stay under ~500 lines)
wc -l skills/*/*/SKILL.md

# Every skill folder must be listed in the marketplace manifest
python3 -c "import json,glob; listed={s for p in json.load(open('.claude-plugin/marketplace.json'))['plugins'] for s in p['skills']}; found={'./'+d.rstrip('/') for d in glob.glob('skills/*/*/')}; print('missing from manifest:', sorted(found-listed)); print('stale in manifest:', sorted(listed-found))"

# Render-check a Markdown file locally (if pandoc installed)  (unverified)
pandoc skills/web/vite-plus-best-practices/SKILL.md -t plain | head
```

Skill install / distribution commands are documented in `README.md` and run by end users — do not execute them from this repo:

```bash
# End-user install via the skills CLI (do NOT run from this repo)  (unverified)
npx skills add Firzus/agent-skills
npx skills add Firzus/agent-skills --skill <skill-name>
```

## Safety & Guardrails

- Off-limits: secrets, credentials, license keys, internal-only URLs, end-user data.
- Never edit:
  - `LICENSE`
  - Other contributors' SKILL.md without preserving their authorial intent
- Never run:
  - `npx skills add …` / `npx skills update` from inside this repo
  - Image generation / `codex` / network installs as part of a normal edit task
- Safe to automate: Markdown edits, frontmatter fixes, README table updates, link checks, line-count audits.