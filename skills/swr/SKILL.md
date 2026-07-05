---
name: swr
description: >-
  SWR v2 data fetching guidance for React and Next.js applications. Use when
  implementing or reviewing client-side data fetching, cache keys, revalidation,
  mutations, optimistic UI, pagination, infinite loading, subscriptions, global
  SWRConfig, fallback data, or TypeScript patterns with the `swr` package.
---

# SWR

Use this skill when working with SWR v2, the React Hooks library for
stale-while-revalidate data fetching. Prefer the project's existing data layer
and component conventions, then apply these rules to keep cache identity,
revalidation, mutation, and loading states predictable.

## First Checks

1. Inspect `package.json` and lockfiles to confirm `swr` is installed and which
   package manager the project uses. Do not add or upgrade dependencies unless
   the task requires it.
2. Identify the framework boundary. In Next.js App Router, SWR hooks must run in
   Client Components; Server Components may use `SWRConfig` and serialization
   helpers, but not `useSWR`, `useSWRInfinite`, or `useSWRMutation`.
3. Find existing fetchers, API clients, auth token handling, error types, and
   reusable data hooks before introducing new patterns.
4. Treat the SWR `key` as the cache identity. Include every input that changes
   the response: URL, query params, user scope, locale, tenant, auth token, and
   filters.

## Core Pattern

Prefer small reusable hooks that hide SWR details from presentation components:

```tsx
import useSWR from 'swr'

type User = {
  id: string
  name: string
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)

  if (!response.ok) {
    const error = new Error('Failed to fetch data')
    throw Object.assign(error, {
      status: response.status,
      info: await response.json().catch(() => undefined),
    })
  }

  return response.json()
}

export function useUser(userId: string | null) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<User>(
    userId ? `/api/users/${userId}` : null,
    fetcher,
  )

  return {
    user: data,
    error,
    isLoading,
    isValidating,
    refreshUser: mutate,
  }
}
```

Use `isLoading` for first-load UI when no loaded data exists. Use
`isValidating` for background refresh indicators when stale data may already be
rendered. Remember that `data` and `error` can both exist after a failed
revalidation, so do not always replace useful stale data with an error screen.

## Keys And Fetchers

| Case | Pattern | Why |
|------|---------|-----|
| Simple resource | `useSWR('/api/user', fetcher)` | String key is passed to `fetcher`. |
| Conditional fetch | `useSWR(userId ? ['/api/user', userId] : null, fetcher)` | `null` disables the request without calling hooks conditionally. |
| Dependent fetch | `useSWR(() => user.id ? ['/api/projects', user.id] : null, fetcher)` | Function keys can wait for required data. |
| Auth or scope | `useSWR(['/api/user', token], ([url, token]) => fetchWithToken(url, token))` | Scope-changing inputs must be part of the key. |
| Object filters | `useSWR({ url: '/api/search', filters }, fetcher)` | Object-like keys are serialized by SWR. |

Rules:

- Never call SWR hooks conditionally. Keep the hook call stable and make the key
  conditional.
- For array keys in SWR v2, the fetcher receives the full array, not spread
  arguments.
- Do not close over dynamic values in a fetcher unless those values are also in
  the key; otherwise SWR can return data for the wrong identity.
- Keep keys stable, serializable, and specific. Avoid broad keys such as
  `'/api/list'` when query filters change the result.
- Use a shared fetcher through `SWRConfig` when most hooks use the same transport,
  but allow local fetchers for special auth, GraphQL, or non-JSON responses.

## Global Configuration

Use `SWRConfig` for app-wide defaults:

```tsx
import { SWRConfig } from 'swr'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => fetch(url).then(response => {
          if (!response.ok) throw new Error('Request failed')
          return response.json()
        }),
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        shouldRetryOnError: true,
      }}
    >
      {children}
    </SWRConfig>
  )
}
```

- Use `fallback` for a map of prefetched values keyed by SWR cache keys.
- Use `fallbackData` for one hook's local initial value.
- Avoid disabling `revalidateOnFocus` globally unless stale data is acceptable
  across the product.
- Tune `dedupingInterval`, `refreshInterval`, retry behavior, and focus
  throttling based on endpoint cost and freshness needs.
- If custom cache providers are used, remember that global `mutate` broadcasts
  within the provider scope.

## Mutations

Choose mutation APIs by intent:

| Need | API | Notes |
|------|-----|-------|
| Revalidate an existing resource | `mutate(key)` or bound `mutate()` | Marks the resource stale and refetches. |
| Update local cache after a known change | bound `mutate(nextData)` | Works well after an already-completed request. |
| Optimistic UI | `mutate(asyncUpdate, { optimisticData, rollbackOnError })` | Use rollback for failed remote writes. |
| User-triggered remote write | `useSWRMutation(key, mutationFetcher)` | Does not run automatically; call `trigger(arg)`. |

Optimistic update pattern:

```tsx
await mutate(
  async current => {
    const updated = await updateTodo(todoId, { completed: true })
    return current?.map(todo => (todo.id === todoId ? updated : todo))
  },
  {
    optimisticData: current =>
      current?.map(todo =>
        todo.id === todoId ? { ...todo, completed: true } : todo,
      ),
    rollbackOnError: true,
    populateCache: true,
    revalidate: false,
  },
)
```

Guidelines:

- Prefer bound `mutate` from the related `useSWR` hook when changing the same
  resource.
- Use `useSWRConfig().mutate` for cross-component invalidation, such as after
  logout or a global settings change.
- After create/delete operations, invalidate all affected list/detail keys. A
  filter function key can target multiple cached resources when needed.
- Keep optimistic data shape identical to the resolved data shape to avoid UI
  branches that only exist during mutation.
- Surface `isMutating` from `useSWRMutation` to disable duplicate submits.

## Pagination And Infinite Loading

For page-indexed or cursor-based lists, use `useSWRInfinite` from
`swr/infinite`:

```tsx
import useSWRInfinite from 'swr/infinite'

type Page = {
  items: Todo[]
  nextCursor?: string
}

const getKey = (pageIndex: number, previousPageData: Page | null) => {
  if (previousPageData && !previousPageData.nextCursor) return null
  if (pageIndex === 0) return '/api/todos'
  return `/api/todos?cursor=${previousPageData?.nextCursor}`
}

const { data, error, size, setSize, isLoading, isValidating } =
  useSWRInfinite<Page>(getKey, fetcher)

const todos = data?.flatMap(page => page.items) ?? []
const isLoadingMore = isLoading || (size > 0 && data?.[size - 1] == null)
```

- Return `null` from `getKey` when there are no more pages.
- Include filter/search inputs in the key so changing filters resets cache
  identity.
- Use `keepPreviousData` for smoother key changes when the old data should stay
  visible during the next fetch.
- Validate list mutation behavior: updating a detail cache may not update every
  paginated list that includes that item.

## Subscriptions

Use `useSWRSubscription` from `swr/subscription` for realtime sources such as
WebSocket, Firebase, or event streams:

```tsx
import useSWRSubscription from 'swr/subscription'

export function useLivePrice(symbol: string) {
  return useSWRSubscription(['price', symbol], ([, currentSymbol], { next }) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(
      `${protocol}//${window.location.host}/api/prices?symbol=${encodeURIComponent(currentSymbol)}`,
    )

    socket.addEventListener('message', event => {
      next(null, JSON.parse(event.data))
    })

    socket.addEventListener('error', event => {
      next(event instanceof ErrorEvent ? event.error : new Error('Socket error'))
    })

    return () => socket.close()
  })
}
```

The subscribe function must return cleanup. Multiple mounted hooks with the same
key share one subscription, and the subscription closes after the last consumer
unmounts.

## Next.js App Router

- Add `'use client'` to files that call SWR hooks.
- Do not import `useSWR`, `useSWRInfinite`, or `useSWRMutation` in Server
  Components.
- Server Components may import `SWRConfig` and key serialization helpers such as
  `unstable_serialize` for prefetched fallback data.
- Pass prefetched data through `SWRConfig` `fallback` when a Client Component
  should hydrate from server-fetched data and then keep itself fresh.
- For array or complex keys in `fallback`, serialize with `unstable_serialize`
  so the fallback key matches the hook key.
- Prefer Next.js server data fetching for SEO-critical, static, or
  request-rendered content. Use SWR for client-owned freshness, user-specific
  dashboards, interactive filters, polling, and realtime views.

## TypeScript

- Prefer typed fetchers so `data` is inferred from the fetcher return type.
- Specify `useSWR<Data, ErrorType>(key, fetcher)` when the fetcher cannot infer
  the response or the project has a custom error type.
- Type reusable hooks by returning domain names (`user`, `todos`) rather than
  leaking raw SWR property names everywhere.
- For mutation fetchers, type the `arg` payload:

```tsx
import useSWRMutation from 'swr/mutation'

type UpdateUserInput = { name: string }

async function updateUser(
  url: string,
  { arg }: { arg: UpdateUserInput },
) {
  const response = await fetch(url, {
    method: 'PATCH',
    body: JSON.stringify(arg),
  })

  if (!response.ok) throw new Error('Failed to update user')
  return response.json()
}

const { trigger, isMutating } = useSWRMutation('/api/user', updateUser)
```

## Review Checklist

- Every SWR hook has a key that includes all data-shaping inputs.
- Conditional behavior uses `null` or function keys, not conditional hook calls.
- Fetchers throw on failed responses and preserve useful status/error details.
- First-load, background-refresh, empty, stale-with-error, and mutation states
  have coherent UI behavior.
- Mutations update or invalidate all affected cache keys and handle rollback.
- App Router hook usage is isolated to Client Components.
- `fallback` keys match hook keys, including serialized complex keys.
- Pagination handles end-of-list, filter changes, loading-more state, and list
  item updates.
- Revalidation and retry settings match endpoint freshness and cost.
