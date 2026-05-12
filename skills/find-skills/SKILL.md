---
name: find-skills
description: >-
  Helps users discover and recommend agent skills that are ALREADY installed
  locally on the host (Claude Code, Cursor, Codex, generic agents), without any
  network call or external CLI. Use when the user asks "how do I do X", "is
  there a skill for X", "find a skill", "what skills do I have", "list my
  skills", "which skills are installed", "do I have a skill that can…", or
  expresses interest in extending capabilities with what's already on disk.
  Strictly local: never runs `npx skills find`, `npx skills add`, `npx skills
  update`, or fetches from skills.sh.
---

# Find Skills (Local-Only)

This skill helps you discover which agent skills are **already installed** on the user's machine and recommend the right one for the task at hand. It never talks to the skills registry, never installs anything automatically, and never reaches the network.

## When to Use This Skill

Use this skill when the user:

- Asks "how do I do X" where X might be covered by an installed skill.
- Says "find a skill for X", "is there a skill for X", "do I have a skill that can…".
- Asks "what skills do I have", "list my skills", "which skills are installed".
- Expresses interest in extending agent capabilities using what's already on disk.
- Wants to know which of Claude Code / Cursor / Codex / generic agent currently exposes a given capability.

## Strict Local-Only Policy

This skill is intentionally offline. **Do not** run any of the following, even if a related skill suggests them:

- `npx skills find` / `npx skills add` / `npx skills update` / `npx skills check` / `npx skills init`
- Any other command that talks to the skills registry, GitHub, or a remote index.
- `WebFetch`, `WebSearch`, or any HTTP request against `skills.sh` or similar.
- Auto-cloning repositories to install a new skill on behalf of the user.

If the user explicitly asks to install a new skill, **stop and ask first**. Then point them at the manual install path (clone the repo, copy the skill folder into the right agent directory). Do not run an install command silently.

## Inventory Sources

Skills can live in several locations depending on the host agent. Use, in this order:

1. **The `<available_skills>` block in the current agent context.** If the parent runtime injects a list of installed skills with paths and descriptions, that is the authoritative source. Read it first.
2. **Local skill directories on disk**, only as a fallback when `<available_skills>` is missing or incomplete:

| Agent host  | Default skills directory                                                    |
| ----------- | --------------------------------------------------------------------------- |
| Claude Code | `~/.claude/skills/<skill-name>/`                                            |
| Codex CLI   | `~/.codex/skills/<skill-name>/`                                             |
| Cursor      | `~/.cursor/skills/<skill-name>/` (user) or `.cursor/skills/<skill-name>/` (project) |
| Generic     | `~/.agents/skills/<skill-name>/`                                            |

Each skill is a folder containing a `SKILL.md`. The frontmatter (`name`, `description`) — or, if absent, the first heading and first paragraph of the file — is what you match against the user's need.

Do not load reference files (`references/*.md`, `scripts/*`) at discovery time. Stick to the `SKILL.md` index to keep things fast.

## Workflow

### Step 1 — Understand the Need

Identify two things in the user's request:

1. **Domain** — e.g. web dev, testing, design, animation, auth, image generation, performance.
2. **Specific task** — e.g. "write E2E tests", "build a landing page hero", "add 2FA", "audit LCP".

If the request is ambiguous, ask one short clarifying question before scanning the inventory.

### Step 2 — Scan the Installed Inventory

- Read the `<available_skills>` block end-to-end.
- If a category clearly applies (see table below), narrow the candidate list before matching.
- If `<available_skills>` is not present or empty, fall back to listing the relevant directories with the standard file tools (`Glob` on `**/SKILL.md` under each agent path). Never `find` / `grep` via the shell.

### Step 3 — Match Need to Description

For each candidate:

- Read the `description` from the YAML frontmatter (the field that lists trigger phrases).
- Score on **explicit trigger keywords** first, then on domain fit.
- Prefer skills whose description literally mentions the user's task or one of its synonyms.
- When multiple skills are close, keep them all and let the user pick — do not silently choose.

### Step 4 — Present the Options

For each recommended skill, return:

1. **Skill name** (from frontmatter `name`).
2. **Agent host** (Claude Code / Codex / Cursor / Generic) based on the path it was found under.
3. **Install path** on disk (absolute or `~`-prefixed).
4. **One-sentence summary** distilled from the description — not the full block.
5. (Optional) **Why it matches**: the trigger word or phrase that made it a hit.

Keep the answer compact. If only one skill is a clear winner, recommend it directly and offer to load it.

### Step 5 — Nothing Matches

If no installed skill fits:

1. Say so plainly — do not invent a match.
2. Offer to handle the task directly with general capabilities.
3. Optionally suggest a **manual** install path: "If you want, you can clone a skill repo and drop it under `~/.claude/skills/<name>/` (or the equivalent for your agent), then restart the session." Do not run the install yourself.
4. Never recommend `npx skills add` or any network command.

## Common Skill Categories

When narrowing the candidate list, these buckets cover most requests:

| Category          | Example tasks the user might mention                                       |
| ----------------- | -------------------------------------------------------------------------- |
| Web development   | React, Next.js, TanStack Router/Start, Vite+, Tailwind, shadcn             |
| Backend / data    | Convex, Redis, Stripe, Better Auth, schema design, migrations              |
| Testing & QA      | E2E tests, accessibility (a11y), security review, web performance / LCP   |
| Design & UI       | Frontend design, design systems, animation, polish, image optimization     |
| Image & media     | Image generation, video analysis (ffmpeg), PDF generation                  |
| Marketing & CRO   | Copywriting, page CRO, marketing psychology, SEO audit                     |
| Tooling & agents  | Cursor rules / hooks / skills authoring, status line, settings, SDK        |
| DevOps & process  | Dependency upgrades, CI debugging, security review, runtime debugging      |

If a user request lands in one of these buckets, scan `<available_skills>` for matching names/descriptions before going wider.

## Rules of Engagement

- **Never** execute `npx skills add`, `npx skills find`, `npx skills update`, or any network install command — even on user request, ask first and prefer the manual path.
- **Never** fetch from `skills.sh` or any other registry.
- **Never** modify, move, or delete installed skills as part of discovery.
- **Always** cite the install path and host agent so the user can audit the recommendation.
- **Always** prefer the `<available_skills>` block over filesystem scans when both are available.
- **Always** be honest when nothing matches — guessing is worse than admitting the gap.

## Output Template

```
You already have the following installed skill(s) that fit:

1. <skill-name>  (<agent-host>)
   Path: <install path>
   Why: <trigger phrase or domain match>
   Summary: <one sentence>

(Optional second/third candidate, same shape)

Want me to use <skill-name> for this task?
```

If nothing fits:

```
No installed skill matches "<user need>" on this machine.

I can handle this directly with general capabilities. If you'd rather
add a dedicated skill, you can install one manually by cloning its repo
into ~/.claude/skills/<name>/ (or ~/.codex/skills/, ~/.cursor/skills/,
~/.agents/skills/) and restarting the session.
```
