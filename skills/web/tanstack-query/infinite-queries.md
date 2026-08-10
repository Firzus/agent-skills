# Infinite Queries

`useInfiniteQuery` backs "load more" and infinite-scroll lists. All pages of a
list share **one** cache entry under a single query key.

## Shape

```tsx
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetching,
  isFetchingNextPage,
  status,
} = useInfiniteQuery({
  queryKey: ['projects'],
  queryFn: ({ pageParam }) => fetchProjects(pageParam),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})
```

- `data.pages` is the array of fetched pages, `data.pageParams` the params used
  to fetch them. Render with `data.pages.flatMap(...)` or a nested map.
- `initialPageParam` is **required** in v5.
- `hasNextPage` is true while `getNextPageParam` returns something other than
  `null` or `undefined` — returning `undefined` is how you signal the end.
- `isFetchingNextPage` distinguishes "loading more" from a background refresh
  (`isFetching`).
- `initialData` and `placeholderData` must have the same
  `{ pages, pageParams }` shape.

## Guard Concurrent Fetches

There can only be one ongoing fetch per infinite query. Calling `fetchNextPage`
while another fetch runs risks overwriting data:

```tsx
<List onEndReached={() => hasNextPage && !isFetching && fetchNextPage()} />
```

`fetchNextPage({ cancelRefetch: false })` allows simultaneous fetching when you
deliberately want it (the default is `true`).

## Refetch Behavior

When an infinite query goes stale, every page is refetched **sequentially** from
the first, so cursors stay consistent and records are neither duplicated nor
skipped. A list that has grown to dozens of pages therefore costs dozens of
requests on refetch — cap it:

```tsx
useInfiniteQuery({
  queryKey: ['projects'],
  queryFn: fetchProjects,
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  getPreviousPageParam: (firstPage) => firstPage.prevCursor,
  maxPages: 3,
})
```

If the entry is garbage collected, pagination restarts from
`initialPageParam`.

## Bi-directional And Reversed Lists

`getPreviousPageParam`, `fetchPreviousPage`, `hasPreviousPage`, and
`isFetchingPreviousPage` mirror the forward API (chat histories, calendars).

To render newest-first without refetching, reverse in `select`:

```tsx
select: (data) => ({
  pages: [...data.pages].reverse(),
  pageParams: [...data.pageParams].reverse(),
})
```

## APIs Without A Cursor

`getNextPageParam` also receives all pages and the current page param, so an
offset can be derived:

```tsx
getNextPageParam: (lastPage, allPages, lastPageParam) =>
  lastPage.length === 0 ? undefined : lastPageParam + 1,
```

## Manual Cache Edits

`setQueryData` on an infinite query must return the same
`{ pages, pageParams }` structure — dropping `pageParams` breaks subsequent
fetches:

```tsx
queryClient.setQueryData(['projects'], (data) => ({
  pages: data.pages.map((page) => page.filter((item) => item.id !== removedId)),
  pageParams: data.pageParams,
}))
```

Prefer invalidation after a write; edit pages by hand only for a targeted
removal that must feel instant.

## Related Helpers

- `infiniteQueryOptions` colocates key, function, and page params the way
  `queryOptions` does for regular queries.
- `placeholderData` works here too, keeping the previous list visible while an
  infinite query key changes.
- On the server, prefetch with `queryClient.prefetchInfiniteQuery`, optionally
  with `pages: n` to prefetch several pages at once.
