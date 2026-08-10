# TanStack Query Integration

The router can store data itself, or it can **coordinate** an external cache. The
decision is about who owns freshness, deduplication, and mutations.

## Store Or Coordinate

The built-in router cache handles deduping, preloading, stale-while-revalidate,
background refetching, and garbage collection per route, with zero dependencies
and SSR that just works. What it does not have: persistence adapters, shared
caching between routes, built-in mutation APIs, or cache-level optimistic
updates.

Use the router cache for smaller apps that share little data between routes. Move
to TanStack Query when several routes read the same resource, when mutations and
optimistic updates matter, or when persistence is required. Any library returning
a promise works the same way — SWR, RTK Query, urql, Relay, Apollo.

## The Core Pattern

The loader ensures data exists; the component reads it and subscribes.

```tsx
// src/routes/posts.tsx
const postsQueryOptions = queryOptions({
  queryKey: ['posts'],
  queryFn: () => fetchPosts(),
})

export const Route = createFileRoute('/posts')({
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQueryOptions),
  component: PostsPage,
})

function PostsPage() {
  const { data } = useSuspenseQuery(postsQueryOptions)
  return <div>{data.map((post) => post.title).join(', ')}</div>
}
```

Preloading in the loader is what removes loading flashes, avoids component-level
waterfalls, and keeps data present at render time for search engines.

## Wiring The QueryClient Into Context

```tsx
// src/routes/__root.tsx
export interface MyRouterContext {
  queryClient: QueryClient
}
export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: App,
})
```

Create the `QueryClient` **inside** the router factory, never at module scope, so
each SSR request gets its own instance.

## Setting defaultPreloadStaleTime

With an external cache, set `defaultPreloadStaleTime: 0` on the router. Settled
preload data then becomes immediately stale in the router, handing the
fetch-or-not decision to Query. Retention still follows `preloadGcTime`, and
overlapping preload and navigation consumers still share in-flight work.

## The SSR Query Integration Package

`@tanstack/react-router-ssr-query` automates dehydration, hydration, streaming,
and redirect handling.

```tsx
// src/router.tsx
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient()

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    scrollRestoration: true,
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}
```

Options worth knowing:

- `wrapQueryClient: false` when the app already renders its own
  `QueryClientProvider`; the integration wraps by default.
- `handleRedirects: false` to take over redirect handling. By default a
  `redirect()` thrown from a query or mutation is intercepted on the client and
  turned into a router navigation.
- `dehydrateOptions.shouldDehydrateQuery` to keep specific queries out of the
  HTML payload.
- `hydrateOptions.defaultOptions.queries.gcTime` to control how long hydrated SSR
  queries survive on the client.
- `dehydrateOptions.serializeData` with
  `hydrateOptions.defaultOptions.deserializeData` for custom serialization.

This same setup applies inside TanStack Start, which runs this router underneath.

## useSuspenseQuery Versus useQuery

| Hook | Server | Use for |
|------|--------|---------|
| `useSuspenseQuery` | Runs during SSR, streams as it resolves | Data required for the initial render. |
| `useQuery` | Does not run on the server; fetches after hydration | Data not needed for SSR. |

## Blocking Versus Streaming In A Loader

Whether the loader awaits decides the SSR behavior:

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ context: { queryClient } }) => {
    // Started on the server, streamed to the client, does not block SSR
    queryClient.prefetchQuery(slowDataOptions())

    // Awaited: blocks until resolved
    await queryClient.ensureQueryData(fastDataOptions())
  },
})
```

Returning the promise also blocks. Neither awaiting nor returning it starts the
query on the server and streams the result. In the component, read the fast data
directly and put the slow one behind its own `<Suspense>` boundary.

## Error Handling

Suspense-based queries need an explicit reset, or a retry re-renders straight
back into the error:

```tsx
export const Route = createFileRoute('/')({
  loader: () => queryClient.ensureQueryData(postsQueryOptions),
  errorComponent: ({ error }) => {
    const router = useRouter()
    const queryErrorResetBoundary = useQueryErrorResetBoundary()

    useEffect(() => {
      queryErrorResetBoundary.reset()
    }, [queryErrorResetBoundary])

    return (
      <div>
        {error.message}
        <button onClick={() => router.invalidate()}>retry</button>
      </div>
    )
  },
})
```

Resetting in an effect as the error component mounts also covers the case where
the user navigates away instead of clicking retry.

## Manual Dehydration Without The Package

If the integration package is not in use, the router's own `dehydrate` and
`hydrate` options carry the query cache across the wire, with `Wrap` supplying
the provider:

```tsx
createRouter({
  routeTree,
  context: { queryClient },
  dehydrate: () => ({ queryClientState: dehydrate(queryClient) }),
  hydrate: (dehydrated) => hydrate(queryClient, dehydrated.queryClientState),
  Wrap: ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  ),
})
```

## Keep Loader Types Out Of The Route Tree

A loader that only warms the cache should return `void`:

```tsx
loader: async ({ context: { queryClient }, params: { postId } }) => {
  await queryClient.ensureQueryData(postQueryOptions(postId))
},
```

Returning `queryClient.ensureQueryData(...)` forces TypeScript to infer the full
loader data type for every prefetching route, which slows editor performance as
the tree grows. Awaiting moves that inference to the first `useSuspenseQuery`.
