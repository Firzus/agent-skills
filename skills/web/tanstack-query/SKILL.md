---
name: tanstack-query
description: >-
  TanStack Query v5 (React Query) async state management for React. Use when
  implementing or reviewing code that uses `@tanstack/react-query` — query keys,
  queryOptions, useQuery/useSuspenseQuery, mutations and invalidation,
  QueryClient defaults, SSR hydration, or infinite queries.
---

# TanStack Query

Reference for TanStack Query v5 (`@tanstack/react-query`), the async state
manager for server data in React. Prefer the project's existing API client,
query-key conventions, and hook layer; apply these rules on top so cache
identity, staleness, and invalidation stay predictable.

TanStack Query owns *server state*: data it did not create, stored elsewhere,
potentially stale at any moment. It is not a replacement for client state
(form inputs, modal toggles, wizard steps) — keep those in React state.

Branch-specific references, loaded on demand:

- [ssr.md](./ssr.md) — prefetch, `dehydrate`, `HydrationBoundary`, Next.js App
  Router and Server Components.
- [mutations.md](./mutations.md) — `useMutation` lifecycle, optimistic updates,
  rollback, invalidation strategy.
- [infinite-queries.md](./infinite-queries.md) — `useInfiniteQuery`, cursors,
  bi-directional lists, page-limited caches.
- [typescript.md](./typescript.md) — inference, narrowing, global `Register`
  types, `skipToken`.

## First Checks

1. Confirm `@tanstack/react-query` is installed and on **v5** (`package.json`,
   lockfile). v4 code differs on renamed options — `cacheTime` became `gcTime`,
   `useErrorBoundary` became `throwOnError`, `keepPreviousData` became
   `placeholderData: keepPreviousData`.
2. Find where the `QueryClient` is created and which `defaultOptions` are set —
   `staleTime`, `gcTime`, `retry` change the behavior of every hook below.
3. Find the existing query-key convention (flat arrays, key factories, or
   `queryOptions` functions) and reuse it instead of inventing a new one.
4. Find the existing fetch layer: query functions must throw on failure, and
   `fetch` does not throw on a 4xx/5xx by itself.
5. If the app server-renders, identify the prefetch boundary before writing any
   hook — see [ssr.md](./ssr.md).

## Keys: The Key Is The Cache Identity

A query key is an **array**, serializable with `JSON.stringify`, and unique to
the data it describes. Every variable the query function reads and that
*changes* the response belongs in the key. Keys act as dependencies: when the
key changes, the query is a different cache entry and refetches.

| Case | Pattern | Why |
|------|---------|-----|
| Generic list | `queryKey: ['todos']` | Constant key for a non-hierarchical resource. |
| Item by id | `queryKey: ['todo', 5]` | Primitive identifies the item. |
| Extra parameters | `queryKey: ['todos', { status, page }]` | Object holds the parameters that shape the response. |
| Scope | `queryKey: ['todos', tenantId, { status }]` | Scope-changing inputs are part of the identity. |

Hashing rules that decide whether two keys are the same entry:

- Object keys are hashed **deterministically**: `{ status, page }` and
  `{ page, status }` are the same key, and a property set to `undefined` is
  ignored.
- Array item **order matters**: `['todos', status, page]` and
  `['todos', page, status]` are two different entries.
- Prefix matching drives invalidation: `['todos']` matches `['todos', { page: 1 }]`
  unless `exact: true` is passed. Order keys from generic to specific so the
  prefix you want to invalidate is the leftmost segment.

## Colocate With `queryOptions`

`queryOptions` returns its input unchanged at runtime, but it ties `queryKey`
and `queryFn` together and carries the result type into every consumer. Prefer
it over loose key constants as soon as a query is used in more than one place.

```ts
import { queryOptions } from '@tanstack/react-query'

export function todoOptions(todoId: string) {
  return queryOptions({
    queryKey: ['todos', todoId],
    queryFn: () => fetchTodoById(todoId),
    staleTime: 5 * 60 * 1000,
  })
}

useQuery(todoOptions('5'))
useSuspenseQuery(todoOptions('5'))
queryClient.prefetchQuery(todoOptions('5'))
queryClient.setQueryData(todoOptions('5').queryKey, nextTodo)
```

- `useQueries({ queries: [todoOptions('1'), todoOptions('2')] })` runs them in
  parallel from the same definition.
- Override per component with a spread: `useQuery({ ...todoOptions(id), select })`.
- `infiniteQueryOptions` is the equivalent helper for infinite queries;
  `mutationOptions` for mutations.
- `queryClient.getQueryData(todoOptions(id).queryKey)` is typed thanks to the
  helper — without it the result is `unknown` ([typescript.md](./typescript.md)).

## Query Functions

A query function returns a promise that resolves the data or throws.

```tsx
useQuery({
  queryKey: ['todos', todoId],
  queryFn: async ({ signal }) => {
    const response = await fetch(`/api/todos/${todoId}`, { signal })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }

    return response.json()
  },
})
```

- Resolving `undefined` is treated as a **failed** query. Resolve `null` to
  store "nothing" as a success.
- `fetch` does not throw on HTTP error statuses — throw explicitly.
- The function receives a `QueryFunctionContext`: `queryKey`, `client`,
  `signal` (pass it through for cancellation), and `meta`.

## Defaults That Decide Behavior

v5 defaults, worth knowing because they explain most surprises:

| Option | Default | Effect |
|--------|---------|--------|
| `staleTime` | `0` | Cached data is stale immediately, so it refetches on mount, window focus, and reconnect. |
| `gcTime` | `5 * 60 * 1000` | Inactive entries (no mounted observer) are garbage collected after 5 minutes. |
| `retry` | `3` | Failures retry three times with exponential backoff before surfacing an error. |
| `structuralSharing` | `true` | Unchanged parts of the response keep their reference, so consumers do not re-render. |
| mutation `retry` | `0` | Mutations do not retry by default. |

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: (failureCount, error) =>
        error instanceof HttpError && error.status < 500 ? false : failureCount < 3,
    },
  },
})
```

- `staleTime` is the main lever against excessive refetching; tune it per
  endpoint (via `queryOptions`) rather than disabling `refetchOnWindowFocus`
  globally.
- `staleTime: Infinity` stops staleness-based refetching but still responds to
  `invalidateQueries`. `staleTime: 'static'` also ignores manual invalidation
  and `refetchOn*: 'always'` — reserve it for data that cannot change while the
  app runs (boot-time feature flags, permissions loaded at login).
- `gcTime` is a cache-retention timer, not a freshness timer; it only starts
  once a query has no observers.
- Never retry blindly on 4xx: a `retry` predicate that inspects the status
  avoids three doomed round-trips on every 404.

## Reading A Query

```tsx
const { data, error, status, isPending, isFetching, isError } = useQuery(
  todoOptions(todoId),
)
```

- `status: 'pending' | 'error' | 'success'` describes **the data**;
  `fetchStatus: 'fetching' | 'paused' | 'idle'` describes **the request**. A
  query with cached data that is refetching is `success` + `fetching`.
- `isPending` means "no data yet". Use `isFetching` for background-refresh
  indicators over already-rendered data.
- For disabled or lazy queries use `isLoading` (`isPending && isFetching`) —
  a disabled query is `pending` forever and would pin a spinner on screen.
- `select` subscribes the component to a slice of the data and re-runs only
  when `data` or the function reference changes; extract it to a stable
  reference or wrap it in `useCallback` instead of inlining.
- Re-renders are tracked per accessed property via a Proxy. Object rest
  destructuring (`const { data, ...rest }`) touches every property and disables
  that optimization.

## Disabling And Dependent Queries

Call hooks unconditionally; put the condition in `enabled` or in the query
function.

```tsx
const { data: user } = useQuery({
  queryKey: ['user', email],
  queryFn: () => getUserByEmail(email),
})

const { data: projects } = useQuery({
  queryKey: ['projects', user?.id],
  queryFn: () => getProjectsByUser(user!.id),
  enabled: !!user?.id,
})
```

- A disabled query ignores `invalidateQueries` and `refetchQueries`, does not
  fetch on mount, and does not refetch in the background.
- `skipToken` as the `queryFn` is the type-safe alternative to `enabled: false`
  and removes the non-null assertion — but `refetch()` then fails with
  `Missing queryFn`. Use `enabled: false` when manual `refetch()` is required.
- Dependent queries are a client-side waterfall. When both are needed for the
  first paint, prefetch them on the server ([ssr.md](./ssr.md)).

## Suspense

```tsx
const { data } = useSuspenseQuery(todoOptions(todoId))
```

- `data` is guaranteed defined, so no `status` handling is needed; loading goes
  to `<Suspense>` and errors to an error boundary.
- The trade-off: no `enabled`, no `placeholderData`, and queries inside one
  component fetch **in serial**. Use `useSuspenseQueries` to parallelize.
- Errors are only thrown to the boundary when there is no data to show
  (`throwOnError` defaults to `(error, query) => typeof query.state.data === 'undefined'`).
  Throw manually if every error must reach the boundary.
- Reset errors on retry with `QueryErrorResetBoundary` or
  `useQueryErrorResetBoundary`, wired to the error boundary's `onReset`.
- Wrap key changes in `startTransition` so the fallback does not replace the
  rendered UI on every update.
- With SSR, only use `useSuspenseQuery` for queries that are **always**
  prefetched — a forgotten prefetch produces a hydration mismatch.

## Mutations And Invalidation

```tsx
const queryClient = useQueryClient()

const { mutate, isPending } = useMutation({
  mutationFn: addTodo,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
})
```

- `invalidateQueries` marks matching queries stale — overriding their
  `staleTime` — and refetches the ones currently rendered.
- Match by prefix by default; add `exact: true` to hit a single entry, or
  `predicate` for anything finer.
- Return the promise from `onSuccess`/`onSettled` to keep the mutation
  `isPending` until the refetch lands.
- `mutate` is fire-and-forget with callbacks; `mutateAsync` returns a promise
  you must catch yourself.

Optimistic updates, rollback, `useMutationState`, and offline behavior are in
[mutations.md](./mutations.md).

## Pagination

Put the page in the key and keep the previous page on screen while the next one
loads:

```tsx
import { keepPreviousData, useQuery } from '@tanstack/react-query'

const { data, isPlaceholderData } = useQuery({
  queryKey: ['projects', page],
  queryFn: () => fetchProjects(page),
  placeholderData: keepPreviousData,
})
```

Without it the UI flips between `pending` and `success` on every page change.
Guard the "next" control with `isPlaceholderData` so a page is not skipped.
`placeholderData` is never written to the cache; `initialData` is.

For "load more" and infinite scroll, see
[infinite-queries.md](./infinite-queries.md).

## Review Checklist

- Every query key is an array that contains all variables shaping the response,
  ordered generic-to-specific so prefix invalidation works.
- Shared queries go through a `queryOptions` function rather than duplicated
  key/fn pairs.
- Query functions throw on HTTP errors and never resolve `undefined`.
- `staleTime` is set deliberately per endpoint; `retry` does not retry
  client-error responses.
- Loading UI uses `isPending`/`isLoading` correctly and distinguishes
  background refetches via `isFetching`.
- Conditional fetching uses `enabled` or `skipToken`, never a conditional hook
  call.
- Suspense queries are always prefetched on server-rendered routes, and error
  boundaries can be reset.
- Mutations invalidate or update every affected key, and optimistic updates
  cancel in-flight queries, snapshot, and roll back
  ([mutations.md](./mutations.md)).
- Server rendering creates one `QueryClient` per request and hydrates through
  `HydrationBoundary` ([ssr.md](./ssr.md)).
- Infinite queries define `initialPageParam` and return `undefined` from
  `getNextPageParam` at the end of the list
  ([infinite-queries.md](./infinite-queries.md)).
