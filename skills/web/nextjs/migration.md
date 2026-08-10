# Migrating from Next.js 15

What changed in 16, ordered by how likely it is to break a working app. Next.js
16 shipped 21 October 2025.

Codemods exist for the mechanical parts: `npx @next/codemod@canary <name> .`

## Version floors

**Node.js 20.9+** (Node 18 is unsupported), **TypeScript 5.1+**, and browsers
Chrome/Edge/Firefox 111+ and Safari 16.4+. Check these before anything else —
they gate the upgrade.

## Dynamic APIs became async

The broadest source of breakage. `params`, `searchParams`, `cookies()` and
`headers()` all return promises now, in pages, layouts, and route handlers.

```tsx
// before
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params

// after
export default async function Page(props: PageProps<'/items/[id]'>) {
  const { id } = await props.params
```

## `middleware.ts` → `proxy.ts`

Rename the file and the exported function; it runs on the Node.js runtime. The
`middleware` convention is deprecated. The rename makes the network boundary
explicit — see [actions-and-routes.md](actions-and-routes.md) for the design
constraint it implies.

## Caching: the model inverted

Implicit App Router caching gave way to **dynamic by default**, with caching
opted into via `cacheComponents: true` and `use cache`. Full treatment in
[caching.md](caching.md). The migration-specific points:

- `unstable_cacheLife` / `unstable_cacheTag` lost the prefix and import from
  `next/cache`. Codemod: `remove-unstable-prefix`.
- `unstable_cache` is replaced by `use cache` — and loses cross-deployment
  persistence in the process. That is a behaviour change, not a rename.
- `revalidateTag` now **requires a cache profile as its second argument**.
- `export const revalidate` gives way to `cacheLife()` inside a cached scope;
  `export const dynamic` is deprecated.
- Cache Components requires the Node.js runtime; `runtime = 'edge'` is
  deprecated.

## Turbopack is the default bundler

For all apps, with substantially faster Fast Refresh and builds. Opt out with
`next build --webpack` if a plugin blocks the move. `experimental.turbopack`
moved to a top-level `turbopack` key. Turbopack filesystem caching is beta.

## Image defaults that flipped

Silent visual or cost regressions hide here:

| Setting | Before | Now |
| --- | --- | --- |
| `images.minimumCacheTTL` | 60s | **4 hours** (14400s) |
| `images.qualities` | `[1..100]` | **`[75]`** — other values coerce to the nearest allowed |
| `images.imageSizes` | included 16 | 16 removed |
| local IP optimization | allowed | blocked unless `images.dangerouslyAllowLocalIP` |
| local `src` with a query string | allowed | needs `images.localPatterns` |

If the app renders images at a custom `quality`, add it to `images.qualities`
or accept the coercion.

## Removed outright

- `experimental.dynamicIO`, `experimental.useCache`, `experimental.ppr`,
  `experimental_ppr` — PPR is the default behaviour under `cacheComponents`.
- **AMP support**, all APIs and configs (`useAmp`, `export const config = { amp: true }`).
- **`next lint`** — `next build` no longer runs linting. Use ESLint or Biome
  directly. Codemod: `next-lint-to-eslint-cli`.
- `serverRuntimeConfig` / `publicRuntimeConfig` — use `.env` files.
- `devIndicators` options `appIsrStatus`, `buildActivity`,
  `buildActivityPosition`. The indicator itself stays.

## New APIs worth adopting

- `updateTag()` — read-your-own-writes invalidation, Server Actions only.
- `refresh()` — Server Actions only; refreshes uncached data without touching
  the cache. Good for a live count beside a cached shell.
- React Compiler support is stable — automatic memoization, which retires most
  hand-written `useMemo` and `useCallback`.
- Build Adapters API is alpha.

## After the upgrade

Run the dev server and read `get_errors` from the MCP server (see
[SKILL.md](SKILL.md)) rather than trusting a clean build: the cached-scope
request-API violation described in [caching.md](caching.md) passes
`next build` and fails at run time.
