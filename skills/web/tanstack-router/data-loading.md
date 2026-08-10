# Data Loading

The router is the only part of the app that knows where the user is headed
before content renders, which makes it the right place to coordinate async
dependencies. Loaders run in parallel across matched routes.

## The Loading Lifecycle

Every URL/history update runs this sequence:

1. **Route matching (top-down)** — `route.params.parse`, then
   `route.validateSearch`.
2. **Pre-loading (serial)** — `route.beforeLoad`, then `route.onError` on
   failure, falling back through `route.errorComponent` →
   `parentRoute.errorComponent` → `router.defaultErrorComponent`.
3. **Loading (parallel)** — `route.component.preload?` and `route.loader`, with
   `route.pendingComponent` shown if slow, then `route.component`.

`beforeLoad` for a route runs before **all** of its children's `beforeLoad`
functions, making it an effective middleware for a whole subtree. Throwing there
stops every child from loading.

## Loader Shape And Arguments

```tsx
export const Route = createFileRoute('/posts')({
  loader: () => fetchPosts(),
})

// or, when loader-specific behavior is needed:
export const Route = createFileRoute('/posts')({
  loader: {
    handler: () => fetchPosts(),
    staleReloadMode: 'blocking',
  },
})
```

The loader receives one object:

| Property | Use |
|----------|-----|
| `abortController` | Signal to pass to `fetch`; shared between a preload and a navigation, cancelled once outdated with no consumers. |
| `cause` | `'enter'`, `'preload'`, or `'stay'`. |
| `context` | Parent context merged with this route's `beforeLoad` return. |
| `deps` | Whatever `loaderDeps` returned (`{}` if undefined). |
| `location` | Current location. |
| `params` | Path params. |
| `parentMatchPromise` | `Promise<RouteMatch>`; `undefined` at the root. |
| `preload` | `true` when preloading rather than loading. |
| `route` | The route itself. |

Read the result with `Route.useLoaderData()`, or `getRouteApi('/posts')
.useLoaderData()` from a component in another file — the latter avoids the
circular imports that come from importing the `Route` object.

## Cache Identity: loaderDeps

Loader data is cached against the parsed pathname **plus** the object returned by
`loaderDeps`, compared by deep equality. Search params are intentionally absent
from the loader's arguments so this dependency is always explicit.

```tsx
export const Route = createFileRoute('/posts')({
  validateSearch: z.object({ offset: z.number().int().nonnegative().catch(0) }),
  loaderDeps: ({ search: { offset } }) => ({ offset }),
  loader: ({ deps: { offset } }) => fetchPosts({ offset }),
})
```

Return only what the loader consumes. `loaderDeps: ({ search }) => search`
reloads the route whenever any unrelated param changes — a view mode toggle
refetching the list, for instance. `loaderDeps` defines a cache key during route
planning: it must be deterministic and side-effect-free for the same validated
search input, including any custom `toJSON`.

## Freshness And Retention Defaults

| Option | Default | Meaning |
|--------|---------|---------|
| `staleTime` / `defaultStaleTime` | `0` | Successful data is stale immediately; reuse revalidates in the background. |
| `preloadStaleTime` / `defaultPreloadStaleTime` | 30 s | A preload's data can serve the first navigation within this window. |
| `gcTime`, `preloadGcTime` | 5 min | Independent retention windows before pruning. |
| `staleReloadMode` | `'background'` | Stale matches render existing data while revalidating; `'blocking'` waits instead. |
| `pendingMs` / `defaultPendingMs` | 1 s | Threshold before `pendingComponent` renders. |
| `pendingMinMs` / `defaultPendingMinMs` | 500 ms | Minimum display time, to avoid a flash. |

Distinctions that matter:

- `staleTime: Infinity` stops a route from ever going stale.
- `staleReloadMode: 'blocking'` still allows stale reloads but waits for them.
- `shouldReload: false` combined with `gcTime: 0` reproduces Remix-style
  "load on entry or when deps change" behavior.
- `routeOptions.preload: false` is narrower than it looks: a speculative lane
  still runs `beforeLoad` and only skips the `loader`. Automatic link preloading
  is controlled by `routerOptions.defaultPreload`.
- `router.invalidate()` reloads active routes and marks cached inactive data
  stale; pass `sync: true` to wait rather than revalidate in the background.

## Router Context As Dependency Injection

Context is passed at router creation, then merged and extended at each route via
`beforeLoad`.

```tsx
// src/routes/__root.tsx
export const Route = createRootRouteWithContext<{
  fetchPosts: typeof fetchPosts
}>()() // the double call is intentional — it is a factory

// src/router.tsx
const router = createRouter({ routeTree, context: { fetchPosts } })

// src/routes/posts.tsx
export const Route = createFileRoute('/posts')({
  beforeLoad: () => ({ bar: true }),
  loader: ({ context }) => context.fetchPosts(),
})
```

`createRootRouteWithContext<T>()` only needs to describe what is passed directly
to `createRouter`; anything added in `beforeLoad` is inferred. Required
properties become a compile-time obligation at `createRouter`.

Hooks cannot run in `beforeLoad` or `loader`. Call the hook in a component that
wraps `<RouterProvider />` and inject the result:
`<RouterProvider router={router} context={{ auth }} />`. When external state
changes, `router.invalidate()` recomputes context for all routes.

Each route's own context object is also kept separately, which makes breadcrumbs
and per-route titles straightforward via
`useRouterState({ select: (s) => s.matches })`.

## Guards

```tsx
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    try {
      const user = await verifySession()
      if (!user) {
        throw redirect({ to: '/login', search: { redirect: location.href } })
      }
      return { user }
    } catch (error) {
      if (isRedirect(error)) throw error
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
})
```

`isRedirect(error)` separates intentional redirects from real failures — without
it, a try/catch swallows the redirect. Use `location.href` rather than
`router.state.resolvedLocation`, which can lag. To return the user afterwards,
`router.history.push(search.redirect)` suits better than `router.navigate`.

A route guard gates UI only. Any endpoint, server function, or server route
returning private data must authorize the request itself, since it can be called
independently of the route.

The alternative to redirecting is short-circuiting the `<Outlet />` and rendering
a login form in place, keeping the user on the same URL.

## Errors And Not-Found

```tsx
export const Route = createFileRoute('/posts')({
  loader: () => fetchPosts(),
  onError: ({ error }) => report(error),
  errorComponent: ({ error, reset }) => {
    const router = useRouter()
    return (
      <div>
        {error.message}
        <button onClick={() => router.invalidate()}>retry</button>
      </div>
    )
  },
})
```

- `reset` only resets the internal `CatchBoundary`. For a **load** failure,
  `router.invalidate()` is correct: it reloads and resets the boundary together.
- `onCatch` fires whenever the router's CatchBoundary catches something.
- Fall back to the built-in `ErrorComponent` for errors you do not recognize.

Not-found handling has two sources: unmatched pathnames (the router throws), and
missing resources (you throw `notFound()` from `beforeLoad` or `loader`).
`notFoundMode` decides where automatic ones land — `'fuzzy'` (default) picks the
nearest route with a `notFoundComponent`, preserving parent layout; `'root'`
sends everything to the root route.

`notFound({ routeId })` targets a specific boundary, and `rootRouteId` targets
the root. Inside `notFoundComponent`, `useLoaderData` may be undefined — pass
anything the component needs through `notFound({ data })` and validate it there;
`useParams`, `useSearch`, and `useRouteContext` stay reliable.

Leaf routes never render an `<Outlet />` and therefore cannot host a not-found
boundary. Give the root a `notFoundComponent` or set
`defaultNotFoundComponent` on the router; the built-in fallback is deliberately
bare (`<p>Not Found</p>`).

## Deferring Slow Data

Return an unawaited promise alongside awaited data, then resolve it in the
component:

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async () => {
    const slowDataPromise = fetchSlowData()
    const fastData = await fetchFastData()
    return { fastData, deferredSlowData: slowDataPromise }
  },
  component: PostIdComponent,
})

function PostIdComponent() {
  const { deferredSlowData } = Route.useLoaderData()
  return (
    <Await promise={deferredSlowData} fallback={<div>Loading...</div>}>
      {(data) => <div>{data}</div>}
    </Await>
  )
}
```

`Await` suspends the nearest boundary and throws serialized rejections to the
nearest error boundary. On React 19, `use()` works in its place. With an external
cache, defer differently: kick off `prefetchQuery` without awaiting, `await` only
the critical `ensureQueryData`, and read both with the library's hooks
([tanstack-query.md](./tanstack-query.md)).

## TypeScript Performance

When a loader only warms an external cache, do not let its return type leak into
the route tree:

```tsx
loader: async ({ context: { queryClient }, params: { postId } }) => {
  await queryClient.ensureQueryData(postQueryOptions(postId))
},
```

Returning the promise forces TS to infer a complex loader type for every such
route; `await`ing it and returning `void` moves inference to the first
`useSuspenseQuery` instead.
