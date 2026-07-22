---
name: swr
description: >-
  SWR v2 (stale-while-revalidate) data fetching for React and Next.js. Use when
  implementing or reviewing code that uses the `swr` package — useSWR hooks,
  cache keys, revalidation, mutations, pagination, or SWRConfig.
---

# SWR

Reference for SWR v2, the React Hooks library for stale-while-revalidate data
fetching. Prefer the project's existing data layer, fetchers, and hook
conventions; apply these rules on top so cache identity, revalidation, and
mutation behavior stay predictable.

Branch-specific references, loaded on demand:

- [pagination.md](./pagination.md) — `useSWRInfinite` for paginated and
  cursor-based lists.
- [subscriptions.md](./subscriptions.md) — `useSWRSubscription` for WebSocket
  and realtime sources.
- [nextjs.md](./nextjs.md) — App Router boundaries, server prefetch, and
  `fallback` hydration.

## First Checks

1. Confirm `swr` is installed (`package.json`, lockfile) and which package
   manager the project uses.
2. Find existing fetchers, API clients, auth token handling, error types, and
   reusable data hooks before introducing new patterns.
3. In Next.js App Router, identify the client/server boundary first — see
   [nextjs.md](./nextjs.md).

## Keys: The Key Is The Cache Identity

The SWR `key` is the sole identity of a cached resource. Every input that
changes the response belongs in the key: URL, query params, user scope, locale,
tenant, auth token, filters. A value read inside the fetcher but absent from
the key returns data under the wrong identity.

| Case | Pattern | Why |
|------|---------|-----|
| Simple resource | `useSWR('/api/user', fetcher)` | String key is passed to `fetcher`. |
| Conditional fetch | `useSWR(userId ? ['/api/user', userId] : null, fetcher)` | `null` disables the request while the hook call stays unconditional. |
| Dependent fetch | `useSWR(() => user.id ? ['/api/projects', user.id] : null, fetcher)` | Function keys wait for required data. |
| Auth or scope | `useSWR(['/api/user', token], ([url, token]) => fetchWithToken(url, token))` | Scope-changing inputs are part of the identity. |
| Object filters | `useSWR({ url: '/api/search', filters }, fetcher)` | Object-like keys are serialized by SWR. |

Rules:

- Call SWR hooks unconditionally; put the condition in the key (`null` or a
  function key that returns `null`).
- For array keys in SWR v2, the fetcher receives the full array, not spread
  arguments.
- Keep keys stable, serializable, and specific: when filters change the
  result, the key changes with them.
- Use a shared fetcher through `SWRConfig` when most hooks use the same
  transport; use local fetchers for special auth, GraphQL, or non-JSON
  responses.

## Core Pattern

Prefer small reusable hooks that hide SWR details from presentation
components:

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

- Fetchers throw on failed responses and preserve status/error details.
- Use `isLoading` for first-load UI, `isValidating` for background-refresh
  indicators over already-rendered stale data.
- `data` and `error` can coexist after a failed revalidation: keep useful
  stale data visible rather than replacing it with an error screen.
- Return domain names (`user`, `todos`) from reusable hooks instead of leaking
  raw SWR property names; annotate `useSWR<Data, ErrorType>` when the fetcher
  cannot infer the response type.

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

- `fallback` takes a map of prefetched values keyed by SWR cache keys;
  `fallbackData` is one hook's local initial value.
- Keep `revalidateOnFocus` on globally unless stale data is acceptable across
  the product.
- Tune `dedupingInterval`, `refreshInterval`, retry behavior, and focus
  throttling per endpoint cost and freshness needs.
- With custom cache providers, global `mutate` broadcasts within the provider
  scope.

## Mutations

Choose mutation APIs by intent:

| Need | API | Notes |
|------|-----|-------|
| Revalidate an existing resource | `mutate(key)` or bound `mutate()` | Marks the resource stale and refetches. |
| Update local cache after a known change | bound `mutate(nextData)` | Works well after an already-completed request. |
| Optimistic UI | `mutate(asyncUpdate, { optimisticData, rollbackOnError })` | Use rollback for failed remote writes. |
| User-triggered remote write | `useSWRMutation(key, mutationFetcher)` | Runs only on `trigger(arg)`. |

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

Mutation fetchers receive their payload as `arg` — type it:

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

Guidelines:

- Prefer bound `mutate` from the related `useSWR` hook when changing the same
  resource; use `useSWRConfig().mutate` for cross-component invalidation, such
  as after logout or a global settings change.
- After create/delete operations, invalidate every affected list and detail
  key — a filter function key can target multiple cached resources at once.
- Keep optimistic data shape identical to the resolved data shape so no UI
  branch exists only during mutation.
- Surface `isMutating` to disable duplicate submits.

## Review Checklist

- Every SWR hook has a key that includes all data-shaping inputs.
- Conditional behavior lives in the key (`null` or function keys); every hook
  call is unconditional.
- Fetchers throw on failed responses and preserve useful status/error details.
- First-load, background-refresh, empty, stale-with-error, and mutation states
  have coherent UI behavior.
- Mutations update or invalidate all affected cache keys and handle rollback.
- App Router hook usage is isolated to Client Components; `fallback` keys
  match hook keys, including serialized complex keys ([nextjs.md](./nextjs.md)).
- Pagination handles end-of-list, filter changes, loading-more state, and list
  item updates ([pagination.md](./pagination.md)).
- Revalidation and retry settings match endpoint freshness and cost.
