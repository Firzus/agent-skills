---
name: astryx
description: >-
  Astryx (@astryxdesign) — Meta's open-source, agent-ready React + StyleX design
  system. Covers setup (npm packages, npx astryx init, StyleX compiler), the
  agent discovery loop (astryx template/component/docs, MCP server, --dense),
  per-component subpath imports, the xstyle styling order, design tokens, the
  Theme provider and defineTheme theming, cascade-layer CSS wiring, Tailwind and
  library interop, layout primitives, and incremental migration. Use when the
  user mentions Astryx, @astryxdesign, npx astryx, xstyle, defineTheme, or wants
  to set up, build UI with, theme, review, or migrate to the Astryx design system.
---

# Astryx Design System

Astryx is Meta's open-source **React + StyleX** design system: 150+ accessible, themeable components with pre-compiled CSS, distributed as `@astryxdesign/*` npm packages and driven by a CLI (`npx astryx`) plus a hosted MCP server. Its defining trait is **agent-ready** — humans and AI build from the same API, so let the CLI/MCP be your source of truth, not the HTML docsite or memory. Astryx is in **beta** (`v0.x`); package names and flags may still shift.

Apply this skill when setting up, building UI with, theming, reviewing, or migrating an Astryx project.

**Done when:** every component is imported from its own subpath and reads design **tokens** (never hardcoded colors/spacing); styling follows the `xstyle → Tailwind → className` order with no `!important`; exactly one `<Theme>` provider owns color mode; the cascade-`@layer` line is declared once before CSS imports; swizzled components have a StyleX build plugin wired; and `npx astryx doctor` reports no failures.

## Setup

```bash
# 1. Install (npm or pnpm — both are shown in the docs)
npm install @astryxdesign/core @astryxdesign/theme-neutral @astryxdesign/cli

# 2. Scaffold: installs packages, wires theming, writes AI agent docs
npx astryx init

# 3. Generate agent context for THIS repo's installed version
npx astryx init --features agents --agent claude   # -> CLAUDE.md
#   ...--agent cursor -> .cursorrules   |   --agent codex -> AGENTS.md

# 4. Verify the setup (CI-friendly exit code)
npx astryx doctor
```

Do **not** invent Node or React version floors — the docs print none. Run `npx astryx doctor` to surface environment problems instead. Full install, framework wiring, and the mandatory StyleX-compiler rules: → [setup.md](./setup.md).

## The discovery loop

The single biggest correctness lever. **Never write Astryx UI from memory** — query the installed version first, in this order:

```bash
npx astryx template --list                 # 1. find a page/block pattern
npx astryx template <Name> --skeleton      # 2. inspect its layout
npx astryx component <Name>                 # 3. read real props + usage
```

Add `--dense` for token-efficient output in context-limited tools, `--json` for machine-readable output in scripts/CI. The same reference is reachable over the hosted **MCP server** (`search`/`get` tools). Full CLI surface, MCP config, and agent workflows: → [cli-and-agents.md](./cli-and-agents.md).

## Golden rules

High-leverage rules. Each links to deeper reference.

1. **Discover before you write.** Run the template→skeleton→component loop above; don't guess props or import paths. There is **no `astryx add`** — add UI via `template <name> [path]`, `swizzle <Component>`, or plain imports. → [cli-and-agents.md](./cli-and-agents.md)
2. **Per-component subpath imports.** `import {Button} from '@astryxdesign/core/Button'` — never a barrel root. → [styling-components.md](./styling-components.md)
3. **Styling order of preference.** `xstyle` (StyleX from `stylex.create()` **only** — never inline objects or classNames) → Tailwind utilities → `className`/`style`. No `!important` (`xstyle` merges last). Guard every StyleX `:hover` with `@media (hover: hover)`. → [styling-components.md](./styling-components.md)
4. **Tokens, never literals.** Use `var(--color-*/--spacing-*/--radius-*)` or the typed `*Vars` objects so theme + light/dark resolve automatically. Sass variables are compile-time and break theming. → [theming-tokens.md](./theming-tokens.md)
5. **One color-mode owner.** The `<Theme mode>` provider owns light/dark (`mode` default `'system'`); never run a second dark-mode provider. Watch the import split: `Theme` from `@astryxdesign/core`, but `useTheme`/`defineTheme` from `@astryxdesign/core/theme`. → [theming-tokens.md](./theming-tokens.md)
6. **Declare the cascade layer once.** Put `@layer reset, theme, base, astryx-base, astryx-theme, components, utilities;` before your CSS imports — unlayered or late styles silently override Astryx. → [styling-components.md](./styling-components.md)
7. **Swizzle needs a StyleX compiler.** Swizzled (copied-source) components render **completely unstyled with no error** if the bundler lacks a StyleX plugin. Pre-compiled components need none. Next.js App Router uses `@stylexswc/nextjs-plugin`; adding `@stylexjs/babel-plugin` disables SWC and breaks `next/font`. → [setup.md](./setup.md)
8. **Migrate the frame, not the classes.** Incremental, one route at a time: wrap root in `Theme`, fix `@layer` order, then replace primitives. → [migration-layout-i18n.md](./migration-layout-i18n.md)

## Reference map

Load on demand:

| When | File |
|------|------|
| Install, `npx astryx init`, packages, StyleX compiler per bundler, browser support | [setup.md](./setup.md) |
| Full CLI command surface, discovery loop, MCP server, agent context files, `--dense`/`--json` | [cli-and-agents.md](./cli-and-agents.md) |
| Import conventions, `xstyle`, cascade layers, `data-*` targeting, Tailwind & library interop | [styling-components.md](./styling-components.md) |
| `<Theme>`, `defineTheme`, dark mode, theme packages, the design-token catalog | [theming-tokens.md](./theming-tokens.md) |
| Design principles, layout primitives (AppShell/Layout), migration path, i18n | [migration-layout-i18n.md](./migration-layout-i18n.md) |
</content>
</invoke>
