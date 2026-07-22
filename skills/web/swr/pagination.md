# Pagination And Infinite Loading

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

Rules:

- Return `null` from `getKey` when there are no more pages.
- Include filter/search inputs in the key so changing filters resets cache
  identity.
- Use `keepPreviousData` to keep the old list visible while the next key's
  fetch is in flight.
- Verify list mutation behavior: updating a detail cache leaves paginated
  lists containing that item stale — invalidate them explicitly.
