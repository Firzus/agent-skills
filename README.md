# agent-skills

Practical workflows for your coding agent: review a change, explore a design,
investigate a question, or implement a scoped feature.

[![skills.sh](https://skills.sh/b/Firzus/agent-skills)](https://skills.sh/Firzus/agent-skills)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](./LICENSE)

A skill is a folder of instructions, references, and optional helpers that your
agent loads for a particular task. Start with one skill on a small project; you
do not need to install the whole collection or replace your global instructions.

These are independent, community-maintained skills, not official vendor products.

[Try a skill](#try-a-skill) · [Choose by task](#choose-by-task) · [Requirements](#requirements) · [All skills](#all-skills) · [Contribute](#contribute)

## Try a skill

You need a coding agent that supports skills, plus Node.js and npm for the installer.

1. Open a terminal in the project where you want to use the skill.
2. Install a focused review workflow:

   ```bash
   npx skills add Firzus/agent-skills --skill code-review
   ```

3. Follow the installer's prompts to choose your agent and destination.
   Installation defaults to project scope; use `-g` only if you want global installation.
4. Select **code-review** through your agent's skill picker or supported invocation
   syntax. If it is not discovered, check the installation location and restart the session.
5. Ask it to review a small, clearly identified change. Provide the intended behavior,
   the files or diff to review, and a read-only scope.

The result should be findings and verification limits, not automatic edits or a
published pull request. This workflow uses independent reviewers, so check that
your agent supports subagents before trying it.

<details>
<summary>Browse, update, or remove installed skills</summary>

```bash
# Browse the collection without installing it
npx skills add Firzus/agent-skills --list

# Choose skills interactively
npx skills add Firzus/agent-skills

# Manage installed skills
npx skills list
npx skills update code-review
npx skills remove code-review
```

See the [skills CLI documentation](https://github.com/vercel-labs/skills)
for supported agents, installation modes, and troubleshooting.

</details>

## Choose by task

| I want to… | Start with |
| --- | --- |
| Review an existing change without modifying it | [code-review](./skills/engineering/code-review/SKILL.md) |
| Compare interface ideas or test feasibility | [prototype](./skills/engineering/prototype/SKILL.md) |
| Investigate a question across multiple sources | [deep-research](./skills/engineering/deep-research/SKILL.md) |
| Turn an unclear objective into bounded, approved work | [interview](./skills/engineering/interview/SKILL.md) |
| Implement a defined change and verify it | [implement](./skills/engineering/implement/SKILL.md) |
| Read an architecture report or track recommendations visually | [canvas](./skills/engineering/canvas/SKILL.md) |
| Design a frontend, from visual direction to real content | [frontend-design](./skills/web/frontend-design/SKILL.md) |

Research, prototyping, preparation, and implementation are different entry points,
not mandatory consecutive phases. Some workflows call other skills; install the
ones referenced by the workflow you choose.

## Requirements

Installing instructions does not install every tool they describe or authorize
every action they can perform. Check the selected skill's prerequisites first.

| Workflow | Additional requirements |
| --- | --- |
| Independent reviews, delegated research, architectural refactors | An agent with subagent support |
| Figma or Linear workflows | The relevant integration, account access, and approval for external writes |
| Technical Canvas reader | Node.js 22.12 or later and the reader's npm dependencies |
| Video reports | FFmpeg and access to the application being recorded |
| YouTube transcription | Available captions, or the audio/transcription tools required by the selected route |
| Image generation | An authenticated Codex CLI setup with the image-generation capability described by the skill |

Host support for installing skills does not guarantee identical behavior or tool
availability. Explicit-invocation workflows such as **interview**, **implement**,
**improve-architecture**, and **setup-codex** should be selected deliberately.

### Optional: personal Codex instructions

[setup-codex](./skills/engineering/setup-codex/SKILL.md) creates a reviewed
**Codex Operating Policy** file and points `model_instructions_file` in the
user-level `config.toml` to it. It updates the file on later runs. The skill asks
for language choices, previews the file and config change, and waits for approval.
It offers `model_verbosity = "low"` with separate user approval. Read its
[policy template](./skills/engineering/setup-codex/SKILL.md#policy-template)
before choosing it.

## All skills

### Engineering

| Skill | Purpose |
| --- | --- |
| [canvas](./skills/engineering/canvas/SKILL.md) | Technical reports, architecture findings, and progress views. |
| [code-review](./skills/engineering/code-review/SKILL.md) | Independent read-only review of a scoped change. |
| [deep-research](./skills/engineering/deep-research/SKILL.md) | Multi-source investigation with a reusable evidence dossier. |
| [gamification](./skills/engineering/gamification/SKILL.md) | Engagement mechanics, motivation, and ethical design checks. |
| [imagegen](./skills/engineering/imagegen/SKILL.md) | Generate or edit raster images through Codex. |
| [implement](./skills/engineering/implement/SKILL.md) | Deliver a defined change with tests and documentation. |
| [improve-architecture](./skills/engineering/improve-architecture/SKILL.md) | Find architectural friction and execute selected refactors. |
| [interview](./skills/engineering/interview/SKILL.md) | Clarify decisions and prepare approved Linear work. |
| [prototype](./skills/engineering/prototype/SKILL.md) | Answer a design or feasibility question through an experiment. |
| [setup-codex](./skills/engineering/setup-codex/SKILL.md) | Configure a reviewed Codex Operating Policy through `model_instructions_file`. |
| [skills](./skills/engineering/skills/SKILL.md) | Discover, install, maintain, and author agent skills. |
| [slop-audit](./skills/engineering/slop-audit/SKILL.md) | Investigate dead code and justify scoped cleanup. |
| [video-report](./skills/engineering/video-report/SKILL.md) | Record video evidence of real application behavior. |
| [writing-for-agents](./skills/engineering/writing-for-agents/SKILL.md) | Write useful skills and project instructions. |
| [youtube-transcript](./skills/engineering/youtube-transcript/SKILL.md) | Turn video speech and visual evidence into a learning report. |

### Web and app development

| Skill | Purpose |
| --- | --- |
| [adsense](./skills/web/adsense/SKILL.md) | Publisher monetization, ad placement, policy, and performance. |
| [astryx](./skills/web/astryx/SKILL.md) | Build interfaces with the Astryx design system. |
| [design-references](./skills/web/design-references/SKILL.md) | Research relevant visual and interaction references. |
| [design-system](./skills/web/design-system/SKILL.md) | Define design tokens, themes, and visual direction. |
| [dokploy-best-practices](./skills/web/dokploy-best-practices/SKILL.md) | Deploy and operate applications with Dokploy. |
| [extract-theme](./skills/web/extract-theme/SKILL.md) | Extract a website's design tokens for Tailwind and shadcn/ui. |
| [figma-to-code](./skills/web/figma-to-code/SKILL.md) | Implement Figma designs and verify the visual result. |
| [frontend-design](./skills/web/frontend-design/SKILL.md) | Coordinate design-system, layout, and content workflows. |
| [greyboxing](./skills/web/greyboxing/SKILL.md) | Explore page layouts and interactions before final content. |
| [nextjs](./skills/web/nextjs/SKILL.md) | Build and migrate Next.js applications. |
| [payload-cms](./skills/web/payload-cms/SKILL.md) | Model content, access rules, and hooks with Payload CMS. |
| [real-content](./skills/web/real-content/SKILL.md) | Replace placeholders with real copy, imagery, and data. |
| [shaders](./skills/web/shaders/SKILL.md) | Add GPU-driven visual effects to React interfaces. |
| [swr](./skills/web/swr/SKILL.md) | Manage React data fetching, caching, and mutations. |
| [tanstack-query](./skills/web/tanstack-query/SKILL.md) | Manage asynchronous server state with TanStack Query. |
| [tanstack-router](./skills/web/tanstack-router/SKILL.md) | Build type-safe routes with TanStack Router. |
| [tanstack-start](./skills/web/tanstack-start/SKILL.md) | Build full-stack applications with TanStack Start. |
| [tanstack-store](./skills/web/tanstack-store/SKILL.md) | Manage reactive client state with TanStack Store. |
| [tauri](./skills/web/tauri/SKILL.md) | Build and validate Tauri desktop and mobile applications. |
| [vite-plus](./skills/web/vite-plus/SKILL.md) | Configure Vite+ tooling, checks, and workspace tasks. |
| [web-assets-optimization](./skills/web/web-assets-optimization/SKILL.md) | Optimize images, video, fonts, SVG, and asset delivery. |
| [web-extension](./skills/web/web-extension/SKILL.md) | Build and package browser extensions. |
| [zod](./skills/web/zod/SKILL.md) | Validate data and evolve schemas with Zod. |

### Game development

| Skill | Purpose |
| --- | --- |
| [figma-to-unity](./skills/game/figma-to-unity/SKILL.md) | Implement Figma designs in Unity UI Toolkit. |
| [unity](./skills/game/unity/SKILL.md) | Choose the appropriate tools for Unity development tasks. |

## Contribute

Found a problem? [Open an issue](https://github.com/Firzus/agent-skills/issues)
with the skill name, agent and version, expected result, and actual result.
Remove secrets and private project data from examples.

For repository changes, read [AGENTS.md](./AGENTS.md) for contribution boundaries
and validation. A skill lives at `skills/<section>/<name>/SKILL.md`; supporting
references and helpers stay in its folder. Keep the README catalog and
[marketplace manifest](./.claude-plugin/marketplace.json) aligned with skill folders.

The [documentary knowledge base](./doc/README.md) contains source material,
not installable skills. It is separate from the skill catalog.

Licensed under [MIT](./LICENSE).
