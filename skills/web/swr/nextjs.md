# Next.js App Router

SWR hooks (`useSWR`, `useSWRInfinite`, `useSWRMutation`, `useSWRSubscription`)
run only in Client Components — add `'use client'` to files that call them.
Server Components may import `SWRConfig` and key serialization helpers such as
`unstable_serialize`.

## Choosing SWR vs server fetching

Prefer Next.js server data fetching for SEO-critical, static, or
request-rendered content. Use SWR for client-owned freshness: user-specific
dashboards, interactive filters, polling, and realtime views.

## Hydrating from server-fetched data

Pass prefetched data through `SWRConfig` `fallback` when a Client Component
should hydrate from server data and then keep itself fresh:

```tsx
// app/users/[id]/page.tsx (Server Component)
import { SWRConfig, unstable_serialize } from 'swr'
import { UserProfile } from './user-profile'

export default async function Page({ params }: { params: { id: string } }) {
  const user = await getUser(params.id)

  return (
    <SWRConfig
      value={{ fallback: { [unstable_serialize(['/api/users', params.id])]: user } }}
    >
      <UserProfile userId={params.id} />
    </SWRConfig>
  )
}
```

For array or complex keys, serialize with `unstable_serialize` so the
`fallback` key matches the hook key exactly — a mismatched key silently skips
hydration.
