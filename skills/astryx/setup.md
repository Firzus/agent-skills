# Setup: Install, Init, StyleX Compiler, Browser Support

Everything to get an Astryx project running. Astryx is **beta** — confirm current package versions via the changelog and `npx astryx doctor` rather than pinning from memory.

## Packages

| Package | Role |
|---------|------|
| `@astryxdesign/core` | Components, layout primitives, hooks, design tokens, `reset.css` + `astryx.css` |
| `@astryxdesign/theme-<name>` | A theme's CSS + named theme export (`neutral`, `butter`, `chocolate`, `gothic`, `matcha`, `stone`, `y2k`) |
| `@astryxdesign/cli` | The `astryx` CLI (can be a dev dependency) |

```bash
npm install @astryxdesign/core @astryxdesign/theme-neutral @astryxdesign/cli
# pnpm install ... is also shown in the docs; yarn/bun are unconfirmed
```

Start from `@astryxdesign/theme-neutral`. `gothic` is **dark-only**, so light-mode wiring differs.

## `npx astryx init`

Runs a setup wizard: installs packages, wires theming, and writes AI agent docs by default.

```bash
npx astryx init                                    # base setup
npx astryx init --features agents                  # generate agent context files
npx astryx init --features agents --agent claude   # -> CLAUDE.md
npx astryx init --features agents --agent cursor   # -> .cursorrules
npx astryx init --features agents --agent codex    # -> AGENTS.md
```

`--features agents` writes a component index, behavioral rules (no raw divs, no inline styles, tokens over magic values), and a CLI reference **pulled from the installed version** — keeping agent context in sync with the actual dependency. Other `init` flags beyond these are not fully documented; run `npx astryx --help`.

## Global CSS wiring

Import the reset, base, and theme CSS once (order matters):

```css
@import '@astryxdesign/core/reset.css';
@import '@astryxdesign/core/astryx.css';
@import '@astryxdesign/theme-neutral/theme.css';
```

For SSR/production, prefer the pre-built theme entrypoint over runtime injection: `import {neutralTheme} from '@astryxdesign/theme-neutral/built'` plus its `theme.css`. Cascade-layer ordering (required for Tailwind coexistence) lives in [styling-components.md](./styling-components.md).

## StyleX compiler (only for swizzled components)

**Pre-compiled components ship ready-to-use CSS and need NO StyleX setup.** A build-time StyleX plugin becomes mandatory **only** when you:

- `npx astryx swizzle <Component>` (copies raw StyleX source into your app), or
- write `xstyle` overrides with `stylex.create()`.

Missing compiler = the component renders **with no styles and no error/warning**. Wire the plugin for your bundler:

| Bundler | Plugin |
|---------|--------|
| Next.js App Router (SWC) | `@stylexswc/nextjs-plugin` |
| Webpack | `@stylexjs/webpack-plugin` |
| Vite / Rollup | `@stylexjs/rollup-plugin` |
| Babel | `@stylexjs/babel-plugin` + `@stylexjs/postcss-plugin` |

```js
// next.config — App Router
import stylexPlugin from '@stylexswc/nextjs-plugin';
export default stylexPlugin({
  rsOptions: { aliases: { '@/*': ['./src/*'] }, unstable_moduleResolution: { type: 'commonJS' } },
})({ /* existing next config */ });
```

⚠️ On Next.js App Router, do **not** add `@stylexjs/babel-plugin` — introducing Babel config disables SWC and breaks `next/font`.

## Reliable CLI invocation

For deterministic invocation across environments (and by agents), add a script alias:

```json
{ "scripts": { "astryx": "node node_modules/@astryxdesign/cli/bin/astryx.mjs" } }
```

Per-component docs are also available offline: `node node_modules/@astryxdesign/core/docs.mjs Button`.

## Browser support

Three tiers, gated on CSS Anchor Positioning, the Popover API, and CSS `light-dark()`:

| Tier | Meaning | Baseline |
|------|---------|----------|
| **1 — Full fidelity** | Everything, incl. anchor positioning | Chrome/Edge 125+, Safari 26+, Firefox 147+ |
| **2 — Functional** | Usable; anchor positioning missing | Chrome/Edge 114+, Safari 17+, Firefox 125+ |
| **3 — Best-effort** | "Does not crash" only | Older |

On Tier 2, anchor-positioned components (Tooltip, HoverCard, Popover, ContextMenu, Selector, MultiSelector, Tokenizer, Carousel) position incorrectly and need a polyfill or JS positioning fallback. Feature-detect when needed:

```js
const hasPopover = typeof HTMLElement.prototype.showPopover === 'function';
const hasAnchorPositioning = CSS.supports('anchor-name', '--x');
const hasLightDark = CSS.supports('color', 'light-dark(#000, #fff)');
```
</content>
