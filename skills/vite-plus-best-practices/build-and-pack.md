# Building & Packaging

Vite+ has two production-build commands. Pick the right one for what you ship.

| Command | For | Powered by |
|---------|-----|------------|
| `vp build` | **Applications** (SPAs, SSR apps, sites) | Vite 8 + Rolldown |
| `vp pack` | **Libraries** and **CLIs / binaries** | tsdown (on Rolldown) |

## vp build (applications)

```bash
vp build
vp build --watch
vp build --sourcemap
vp preview         # serve the production build locally
```

Always runs the built-in Vite production build. If a `package.json` `"build"` script exists and should be used instead, run `vp run build`.

Use standard Vite config in `vite.config.ts` (`build`, `server`, `preview`) — see [Vite config docs](https://vite.dev/config/).

## vp pack (libraries & CLIs)

```bash
vp pack
vp pack src/index.ts --dts
vp pack --watch
```

Put tsdown config in the `pack` block of `vite.config.ts`. Do **not** create `tsdown.config.ts`.

```ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/index.ts'],
    dts: true,
    format: ['esm', 'cjs'],
    sourcemap: true,
  },
});
```

Covers out of the box:
- [Declaration files (`dts`)](https://tsdown.dev/options/dts) — generation + bundling
- [Output formats](https://tsdown.dev/options/output-format) — ESM, CJS, IIFE
- [Watch mode](https://tsdown.dev/options/watch-mode)
- Automatic `package.json` exports generation

## Standalone Executables

`vp pack` can emit standalone native executables (via tsdown's experimental [`exe` option](https://tsdown.dev/options/exe#executable)):

```ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/cli.ts'],
    exe: true,
  },
});
```

Use when shipping a CLI as a binary that does not require Node.js on the user's machine.

## Choosing Between `build` and `pack`

- Shipping HTML + assets to a web host or CDN → `vp build`
- Publishing an npm package consumed by other code → `vp pack`
- Shipping a CLI (`bin` in `package.json`) → `vp pack` with `entry` pointing at the CLI entry
- Shipping a native executable for distribution outside npm → `vp pack` with `exe: true`

Never use `vp build` for a library; the application build pipeline is not the same as tsdown's library packaging.
