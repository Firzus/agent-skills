# Server Rendering & Hydration

Server rendering with TanStack Query is three steps: **prefetch** on the server,
**dehydrate** the client into a serializable state, **hydrate** it into the
browser cache so the data is not fetched twice.

## One QueryClient Per Request

Never create the `QueryClient` at module scope on the server — the cache would
be shared across all requests and leak one user's data to another. Create it in
React state, or behind an environment check.

```tsx
export default function App({ Component, pageProps }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  )
}
```

A `staleTime` above `0` matters here: staleness is measured from when the query
was fetched **on the server**, so with the default `0` every hydrated query
refetches immediately on load, wasting the prefetch.

## Prefetch, Dehydrate, Hydrate

```tsx
// server: loader, getServerSideProps, or a Server Component
const queryClient = new QueryClient()

await queryClient.prefetchQuery({ queryKey: ['posts'], queryFn: getPosts })

const dehydratedState = dehydrate(queryClient)
```

```tsx
// client
<HydrationBoundary state={dehydratedState}>
  <Posts />
</HydrationBoundary>
```

Inside `Posts`, the ordinary `useQuery({ queryKey: ['posts'], queryFn: getPosts })`
finds the data already in the cache — at any depth in the tree, no prop drilling.
`HydrationBoundary` can be used in several places and fed by several dehydrated
clients.

- Prefetch in parallel with `await Promise.all([...])`; sequential awaits
  recreate a server-side waterfall.
- Not every query needs prefetching. Data below the fold or behind an
  interaction is fine to fetch on the client.
- `prefetchQuery` respects the client's `staleTime`; `ensureQueryData` returns
  cached data regardless.

## initialData: The Shortcut And Its Cost

Passing loader data straight into `initialData` skips the hydration APIs
entirely, but: it must be drilled down to the hook, `dataUpdatedAt` reflects
page load rather than fetch time, and it **never overwrites data already in the
cache** — so navigating back to a route shows the stale first payload even
though the loader re-ran. Prefer the hydration APIs beyond trivial cases.

## Next.js App Router & Server Components

Treat a Server Component as another loader: prefetch there, hydrate into the
Client Component.

```tsx
// app/posts/page.tsx
export default async function PostsPage() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({ queryKey: ['posts'], queryFn: getPosts })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Posts />
    </HydrationBoundary>
  )
}
```

The provider must live in a `'use client'` file, and `getQueryClient()` returns
a fresh client on the server while reusing a module-level singleton in the
browser — so React suspending during the initial render does not throw the
cache away.

Rules that bite in this setup:

- Prefetch in Server Components, but do not render the fetched result there and
  pass it around. React Query cannot revalidate a Server Component, so a client
  refetch leaves server-rendered copies out of sync.
- Do **not** call Server Actions from a `queryFn`: they run serially, which
  conflicts with how queries fetch, and passing an action reference fails
  serialization. Server Actions are a fine fit for `useMutation`.
- The `HydrationBoundary` boilerplate cannot be hoisted away with Server
  Components the way it can in the Pages Router.

## Streaming Pending Queries

Since v5.40.0, pending queries can be dehydrated, so a prefetch does not have to
be awaited and does not block its Suspense boundary:

```tsx
dehydrate: {
  shouldDehydrateQuery: (query) =>
    defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
}
```

The promise lands in the client cache, where `useSuspenseQuery` consumes it.
With plain `useQuery` the component renders as `pending` instead and opts out of
server-rendered content.

## Errors, Serialization, Memory

- `prefetchQuery` never throws and `dehydrate` only ships successful queries, so
  a failed prefetch degrades to a client-side retry. Use `fetchQuery` inside
  `try`/`catch` when a failure should produce a 404 or 500.
- Only JSON-safe values survive the boundary: no `undefined`, `Date`, `Map`,
  `Set`, `BigInt`, `NaN`, `Infinity`. Use `dehydrate.serializeData` /
  `hydrate.deserializeData` for the rest.
- In a custom SSR setup, never `JSON.stringify` the state into the markup
  unescaped — that is an XSS hole. Use `devalue` or `serialize-javascript`.
- On the server `gcTime` defaults to `Infinity`, and memory is released when the
  request ends. If you override it, call `queryClient.clear()` after responding,
  and never set `gcTime: 0` (the boundary's data can be collected mid-render,
  causing hydration errors); `2 * 1000` is the practical floor.
- With `useSuspenseQuery`, prefetch **every** query it reads. A missed prefetch
  produces a markup hydration mismatch, not just a slower load.
