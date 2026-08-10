---
name: tanstack-router
description: >-
  TanStack Router v1 for React — file-based routing, type-safe navigation,
  validated search params, loaders and router context. Use when working in a
  project that uses `@tanstack/react-router` — routeTree.gen.ts, createFileRoute,
  Link/useNavigate, validateSearch, loaderDeps, route masking, or code splitting.
---

# TanStack Router

Reference for TanStack Router v1 with React. This skill covers **client-side
routing only**. For the full-stack framework built on top of this router —
server routes, server functions, SSR wiring, deployment — use the sibling
`tanstack-start` skill. Everything here still applies inside a Start app: Start
uses this router underneath.

Prefer the project's existing route layout, validation library, and data layer;
apply these rules on top so route identity, type inference, and cache keys stay
predictable.

Branch-specific references, loaded on demand:

- [file-routing.md](./file-routing.md) — naming conventions, the generated route
  tree, layouts, groups, splat and optional params.
- [search-params.md](./search-params.md) — `validateSearch`, schema adapters,
  search middlewares, reading and writing search state.
- [data-loading.md](./data-loading.md) — loaders, `loaderDeps`, caching options,
  router context, pending/error/not-found components, deferred data.
- [navigation.md](./navigation.md) — `Link`, `useNavigate`, relative paths,
  `linkOptions`, preloading, route masking.
- [tanstack-query.md](./tanstack-query.md) — router as coordinator, the SSR query
  integration, and the split of responsibilities with TanStack Query.

## First Checks

1. Confirm `@tanstack/react-router` is installed and read the lockfile version.
   This skill targets v1.
2. Find the router instance (usually `src/router.tsx`). Read `createRouter` for
   `defaultPreload`, `defaultPreloadStaleTime`, `defaultStaleTime`,
   `notFoundMode`, and `routeMasks` — these change the correct advice for
   loaders and links.
3. Confirm the `Register` declaration merging block exists. Without it, top-level
   `Link`, `useNavigate`, and `useSearch` lose all route types.
4. Check whether routes come from the file-based generator (`routeTree.gen.ts`
   plus the bundler plugin) or from code-based `createRoute` calls. Never edit
   `routeTree.gen.ts` by hand.
5. Check the bundler config for `tanstackRouter({ autoCodeSplitting: true })` —
   it decides whether `.lazy.tsx` files are needed at all.
6. If a `queryClient` sits in the router context, treat the router as a
   coordinator, not a cache ([tanstack-query.md](./tanstack-query.md)).

## Registering The Router

Type safety across the whole project depends on two things: the generated route
tree, and declaration merging.

```tsx
// src/router.tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

Without the `Register` block, every bare import from the library falls back to
loose types and autocomplete for `to`, `params`, and `search` disappears.

## Anatomy Of A Route

Every non-root route is created with `createFileRoute`, whose single string
argument is **written and maintained by the generator**. Do not hand-edit it;
move or rename the file and let the plugin update it.

```tsx
// src/routes/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posts/$postId')({
  loader: ({ params }) => fetchPost(params.postId),
  component: PostComponent,
})

function PostComponent() {
  const { postId } = Route.useParams()
  const post = Route.useLoaderData()

  return <h1>{post.title}</h1>
}
```

The root route is different: `createRootRoute()`, or
`createRootRouteWithContext<T>()()` when the router carries context. It has no
path, is always matched, and its component always renders. It does **not**
support code splitting.

The `Route` object exposes typed hooks — `useParams`, `useSearch`,
`useLoaderData`, `useLoaderDeps`, `useMatch`, `useRouteContext`. Use them instead
of the bare exports whenever you are inside the route's own component.

## File Naming, In One Table

Full detail in [file-routing.md](./file-routing.md); this is the working subset.

| Token | Meaning |
|-------|---------|
| `__root.tsx` | Root route file, at the top of `routesDirectory`. |
| `.` | Nesting separator — `posts.$postId.tsx` nests under `posts.tsx`. |
| `$label` | Dynamic segment, captured into `params.label`. |
| `$` alone | Splat route; the rest of the pathname lands in `params._splat`. |
| `{-$label}` | Optional segment — matches with or without it. |
| `_` prefix | Pathless layout route: wraps children without adding a path. |
| `_` suffix | Non-nested route: escapes its parent's component tree. |
| `-` prefix | Excluded from the route tree; use it to colocate components. |
| `(folder)` | Route group — organizational only, contributes no path segment. |
| `index` | Matches the parent path exactly. |
| `route.tsx` | The route file for its containing directory. |
| `[x]` | Escapes a special character — `script[.]js.tsx` becomes `/script.js`. |

Directory nesting and `.` nesting are interchangeable and mixable. Choose per
subtree: directories for wide hierarchies, dots for a few deep ones.

## Type-Safe Navigation

Every navigation is relative and has both an origin (`from`) and a destination
(`to`). Without `from`, the router assumes the root and only autocompletes
absolute paths.

```tsx
<Link to="/posts/$postId" params={{ postId: '123' }} hash="comments">
  Post 123
</Link>
```

Rules that prevent most navigation bugs:

- Never interpolate values into `to`. Path params go in `params`, query state in
  `search`, the fragment in `hash`. `to` stays a literal route pattern.
- `params` and `search` accept a function of the previous value — use it to
  preserve existing state instead of rebuilding it.
- `to="."` reloads the current (or `from`) location; `to=".."` goes to the
  parent. Both are relative to `from` when supplied.
- Prefer `<Link>` for anything clickable — it renders a real `<a href>`, so
  cmd/ctrl-click and middle-click work. Reach for `useNavigate` only for
  side-effect navigation, such as after a successful submit.
- `redirect()` thrown from `beforeLoad` is the right tool for guards; a
  client-side navigation is not a substitute for a server redirect.
- Pass `from={Route.fullPath}` rather than a hand-written string, so refactors
  follow.

Active state is available three ways: `activeProps`/`inactiveProps`, the
`data-status="active"` attribute, and a function child receiving `{ isActive }`.
By default a link is active on **pathname prefix** match with search params
compared inclusively; pass `activeOptions={{ exact: true }}` for a home link.

See [navigation.md](./navigation.md) for `linkOptions`, preloading strategies,
and route masking.

## Search Params Are Typed State

TanStack Router parses the query string into **JSON**, not flat strings, and
`validateSearch` is the boundary that turns it into a type your app can trust.
The resulting type flows into the route's own options *and every child route*.

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const productSearchSchema = z.object({
  page: z.number().catch(1),
  filter: z.string().catch(''),
  sort: z.enum(['newest', 'oldest', 'price']).catch('newest'),
})

export const Route = createFileRoute('/shop/products')({
  validateSearch: productSearchSchema,
  component: ProductList,
})

function ProductList() {
  const { page, filter, sort } = Route.useSearch()
  return <div>...</div>
}
```

Key points:

- `validateSearch` accepts a function or any object with a `parse` method, so a
  schema can be passed directly.
- Malformed params come from user-editable text. Prefer a fallback (`.catch()`)
  over a hard failure unless an error screen is genuinely the right UX — a throw
  triggers `onError` with `error.routerCode` set to `VALIDATE_SEARCH` and renders
  the `errorComponent`.
- With Zod v3 and `.default()`, `search` becomes *required* on every `Link` to
  that route. Use `@tanstack/zod-adapter`'s `zodValidator` (plus its `fallback`
  helper) to keep input and output types distinct. Zod v4, Valibot, ArkType, and
  Effect/Schema implement Standard Schema and need no adapter.
- Write search params with `<Link search={prev => ...}>` or
  `navigate({ search })`. From a component shared across routes, use `to="."` or
  `strict: false` to opt into looser types deliberately.

## Loaders, Context, Dependencies

A loader runs before the route renders, in parallel with sibling loaders, and
its result is cached under the route's parsed pathname **plus** whatever
`loaderDeps` returns.

```tsx
export const Route = createFileRoute('/posts')({
  validateSearch: z.object({ offset: z.number().catch(0) }),
  loaderDeps: ({ search: { offset } }) => ({ offset }),
  loader: ({ deps: { offset }, context, abortController }) =>
    context.fetchPosts({ offset, signal: abortController.signal }),
})
```

- Search params are deliberately absent from `loader` arguments. Anything the
  loader reads from search must pass through `loaderDeps`, otherwise the cache
  and preloading key on the wrong identity.
- Return only the deps you actually use. `loaderDeps: ({ search }) => search`
  reloads the route when any unrelated param changes.
- `loaderDeps` and `params.parse` run during route planning, possibly more than
  once. Keep them deterministic and side-effect-free.
- `beforeLoad` runs before the loader and before **all** child `beforeLoad`s. Its
  return value merges into the context for the route and its descendants. Throw
  `redirect()` here for guards, and re-throw redirects caught in a try/catch —
  `isRedirect(error)` tells them apart from real failures.
- Context is the dependency-injection channel: type it with
  `createRootRouteWithContext<T>()`, seed it in `createRouter({ context })`, and
  extend it per route via `beforeLoad`.

Defaults worth knowing: `staleTime` is `0` (stale immediately, revalidated in the
background), preloaded data is fresh for **30 s**, garbage collection windows are
**5 min**, the pending component appears after **1 s** and then stays for at
least **500 ms**. Full options in [data-loading.md](./data-loading.md).

## Errors, Pending, Not Found

| Situation | Route option | Notes |
|-----------|--------------|-------|
| Loader threw | `errorComponent` | Receives `error` and `reset`. |
| Loader is slow | `pendingComponent` | Gated by `pendingMs` / `pendingMinMs`. |
| Resource missing | `notFoundComponent` | Throw `notFound()` from the loader. |
| Side-effect on failure | `onError` / `onCatch` | Logging, reporting. |

- After a **load** failure, prefer `router.invalidate()` over `reset()`: it
  reruns the loader and resets the boundary together.
- Throw `notFound()` in the loader, not in the component — that keeps loader data
  correctly typed and avoids a flicker.
- Inside `notFoundComponent`, `useLoaderData` may be undefined; `useParams`,
  `useSearch`, and `useRouteContext` remain safe.
- Only routes that render an `<Outlet />` can host a not-found boundary, so give
  the root route a `notFoundComponent` or the router a
  `defaultNotFoundComponent`.

## Code Splitting

The router splits critical config (path parsing, `validateSearch`, `beforeLoad`,
`loader`, context) from non-critical config (`component`, `errorComponent`,
`pendingComponent`, `notFoundComponent`). The loader is intentionally **not**
split: it is already an async boundary and it is the most valuable thing to
preload.

Prefer `autoCodeSplitting: true` in the bundler plugin. It requires file-based
routing with a supported bundler and does not work with the CLI alone. Otherwise
move the non-critical exports into a `<route>.lazy.tsx` file using
`createLazyFileRoute`, which accepts only those four component options.

When a component lives outside its route file, reach for `getRouteApi('/path')`
instead of importing the `Route` object — same typed hooks, no circular import.

## Review Checklist

- The router is registered via `declare module` declaration merging, and
  `routeTree.gen.ts` is generated, not hand-edited.
- Route file names express the intended tree: `_` for pathless layouts, `(...)`
  for grouping, `-` for colocated non-route files, `index` for exact matches.
- No value is interpolated into `to`; params, search, and hash use their own
  props, and `from={Route.fullPath}` is used for relative navigation.
- Every route reading query state defines `validateSearch`, with fallbacks for
  malformed input and an adapter where the validation library needs one.
- `loaderDeps` returns exactly the search values the loader consumes — no more.
- `beforeLoad` guards throw `redirect()` and re-throw caught redirects via
  `isRedirect`; the guard is not treated as an authorization boundary for data.
- `staleTime`, `preloadStaleTime`, and `gcTime` are set deliberately per route
  where the defaults do not fit; `defaultPreloadStaleTime: 0` when an external
  cache owns freshness.
- Error, pending, and not-found components exist at the levels that render an
  `<Outlet />`; loader-failure retries call `router.invalidate()`.
- Components outside their route file use `getRouteApi`, not a `Route` import.
- Shared components either narrow with `from`/`to` or opt into `strict: false`
  explicitly — never rely on the accidental union.
- Full-stack concerns (server routes, server functions, SSR setup) live in the
  `tanstack-start` skill, not here.
