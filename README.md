# agent-skills

[![skills.sh](https://skills.sh/b/Firzus/agent-skills)](https://skills.sh/Firzus/agent-skills)

Community-maintained [Agent Skills](https://skills.sh) for AI coding assistants (Claude Code, Cursor, Codex, and 50+ others).

> These skills are **not** official products of the vendors they cover. They are independent, community-maintained reference material distilled from public documentation.

## Available skills

| Skill | Description |
|-------|-------------|
| [`vite-plus-best-practices`](./skills/vite-plus-best-practices) | Best practices for **Vite+** (`vp`), the unified web toolchain (Vite, Vitest, Oxlint, Oxfmt, Rolldown, tsdown, Vite Task). Covers the `vp` command surface, unified `vite.config.ts`, monorepo overrides, task caching, commit hooks, library packaging, and migration. |

## Install

Install everything from this repo with the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add Firzus/agent-skills
```

### Install a single skill

```bash
npx skills add Firzus/agent-skills --skill vite-plus-best-practices
```

### Useful flags

```bash
# Just list what's available, don't install
npx skills add Firzus/agent-skills --list

# Install globally (user-wide) for Claude Code, non-interactive
npx skills add Firzus/agent-skills \
  --skill vite-plus-best-practices \
  -g -a claude-code -y

# Install all skills, non-interactive
npx skills add Firzus/agent-skills --all -y
```

## Manual install

If you don't use the `skills` CLI, copy the skill directory directly into your agent's skill folder:

| Agent | Path |
|-------|------|
| Claude Code | `~/.claude/skills/<skill-name>/` |
| Codex CLI | `~/.codex/skills/<skill-name>/` |
| Cursor | `~/.cursor/skills/<skill-name>/` (personal) or `.cursor/skills/<skill-name>/` (project) |
| Generic | `~/.agents/skills/<skill-name>/` |

Example:

```bash
git clone https://github.com/Firzus/agent-skills.git
cp -r agent-skills/skills/vite-plus-best-practices ~/.claude/skills/
```

## Skill structure

Each skill is a folder containing a `SKILL.md` (YAML frontmatter + markdown body) plus optional reference files used via [progressive disclosure](https://skills.sh/docs):

```
skills/<skill-name>/
├── SKILL.md          # index — < 500 lines, auto-loaded by the agent
├── topic-a.md        # detailed reference, loaded on demand
└── topic-b.md
```

## License

[MIT](./LICENSE)
