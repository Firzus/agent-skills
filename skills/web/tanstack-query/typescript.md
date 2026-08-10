# TypeScript Patterns

TanStack Query v5 is written in TypeScript and infers most things. Annotate
only where inference cannot reach.

Type changes are released as **patch** versions, so pin the package to an exact
patch and expect types to move between releases. v5 supports TypeScript 5.4 and
newer.

## Let Inference Flow

```ts
const fetchGroups = (): Promise<Group[]> =>
  axios.get('/groups').then((response) => response.data)

const { data } = useQuery({ queryKey: ['groups'], queryFn: fetchGroups })
//      ^? Group[] | undefined
```

The whole chain depends on the query function having a real return type. Most
HTTP clients return `any`, so extract the call into a typed function rather than
passing generics to `useQuery` — supplying generics manually disables inference
for the others.

`select` re-types `data` for free:

```ts
const { data } = useQuery({
  ...groupOptions(),
  select: (data) => data.map((group) => group.name),
  //   ^? string[] | undefined
})
```

## Narrowing

The result is a discriminated union on `status` and its derived booleans:

```ts
const { data, isSuccess } = useQuery(groupOptions())

if (isSuccess) {
  data
  // ^? Group[]
}
```

`useSuspenseQuery` skips this entirely: `data` is defined by construction.

## queryOptions Carries Types

```ts
function groupOptions() {
  return queryOptions({
    queryKey: ['groups'],
    queryFn: fetchGroups,
    staleTime: 5 * 1000,
  })
}

const data = queryClient.getQueryData(groupOptions().queryKey)
//    ^? Group[] | undefined
```

The returned `queryKey` remembers the function attached to it, so cache reads
and writes are typed. Without the helper, `getQueryData(['groups'])` is
`unknown` unless a generic is passed. Inference does **not** carry through
`getQueriesData`, which returns heterogeneous tuples — annotate there:
`getQueriesData<Group[]>(...)`.

`mutationOptions` plays the same role for mutations, and feeds `useMutation`,
`useIsMutating`, and `queryClient.isMutating`.

## Typing Errors

`error` is `Error` by default. Rather than passing an error generic — which
kills the other inference — narrow at the use site:

```ts
const { error } = useQuery(groupOptions())

if (axios.isAxiosError(error)) {
  error
  // ^? AxiosError
}
```

## Global Registration

Module augmentation sets app-wide types without touching call sites:

```ts
import '@tanstack/react-query'

type AppQueryKey = ['dashboard' | 'marketing', ...ReadonlyArray<unknown>]

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: AppHttpError
    queryKey: AppQueryKey
    mutationKey: AppQueryKey
    queryMeta: AppMeta
    mutationMeta: AppMeta
  }
}
```

- `defaultError: unknown` forces every call site to narrow explicitly.
- A registered key type must extend `Array`; a registered meta type must extend
  `Record<string, unknown>`.

## skipToken

`skipToken` disables a query while keeping the parameter types honest, removing
the non-null assertion that `enabled` forces:

```ts
import { skipToken, useQuery } from '@tanstack/react-query'

const { data } = useQuery({
  queryKey: ['todos', filter],
  queryFn: filter ? () => fetchTodos(filter) : skipToken,
})
```

`refetch()` throws `Missing queryFn` on a query using `skipToken` — when manual
refetching is needed, use `enabled: false` instead.
