# Mutations, Optimistic Updates & Invalidation

`useMutation` covers writes and server side-effects. Unlike queries it does not
run on mount and does not retry by default.

## Lifecycle

A mutation is in exactly one state: `idle`, `pending`, `error`, or `success`,
exposed both as `status` and as `isIdle` / `isPending` / `isError` /
`isSuccess`. `data` holds the resolved value, `error` the thrown one, and
`reset()` clears both.

```tsx
const mutation = useMutation({
  mutationFn: (newTodo: NewTodo) => api.createTodo(newTodo),
})

<button onClick={() => mutation.mutate({ title: 'Do laundry' })}>
  Create
</button>
```

`mutate` takes a **single** variable or object. Surface `isPending` to disable
duplicate submits.

## Callbacks

`onMutate`, `onError`, `onSuccess`, and `onSettled` fire in that order around
the request. Returning a promise from any of them awaits it before the next one
runs — that is how an invalidation keeps the mutation `pending` until the data
is actually refreshed.

```tsx
useMutation({
  mutationFn: addTodo,
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ['todos'] })
  },
})
```

Callbacks passed to `mutate` itself run **after** the ones on `useMutation`, and
only if the component is still mounted. For consecutive `mutate` calls, the
hook-level callbacks run for each call, while the `mutate`-level ones run once,
for the last call. Put cache work on the hook, component-specific side effects
(a toast, a redirect) on the call.

`mutateAsync` returns a promise that resolves or throws, for composing side
effects — it requires your own `try`/`catch`.

## Invalidation Strategy

After a write, invalidate every key whose data the write could change:

```tsx
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['todos'] }),
  queryClient.invalidateQueries({ queryKey: ['reminders'] }),
])
```

Matching options, from broadest to narrowest:

| Call | Matches |
|------|---------|
| `invalidateQueries()` | Every query in the cache. |
| `invalidateQueries({ queryKey: ['todos'] })` | Every key starting with `todos`, including `['todos', { page: 1 }]`. |
| `invalidateQueries({ queryKey: ['todos'], exact: true })` | Only `['todos']`. |
| `invalidateQueries({ predicate })` | Whatever the predicate returns true for. |

Filters also accept `type: 'active' | 'inactive' | 'all'`, `stale`, and
`fetchStatus` — the same shape used by `cancelQueries`, `refetchQueries`, and
`removeQueries`.

Invalidation marks queries stale (overriding `staleTime`) and refetches those
currently rendered. Prefer it over hand-maintaining a normalized cache; reach
for `setQueryData` only when the server response already contains the updated
entity.

## Optimistic Update Via The UI

The cheapest variant: do not touch the cache, render the pending `variables`.

```tsx
const { isPending, isError, variables, mutate } = useMutation({
  mutationFn: (text: string) => api.createTodo(text),
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
})

<ul>
  {todos.map((todo) => <li key={todo.id}>{todo.text}</li>)}
  {isPending && <li style={{ opacity: 0.5 }}>{variables}</li>}
</ul>
```

`variables` survive an error, so a retry button can re-submit them. When the
mutation and the list live in different components, give the mutation a
`mutationKey` and read its state elsewhere with `useMutationState`.

## Optimistic Update Via The Cache

Use this when several places on screen must reflect the change. Cancel, snapshot,
write, roll back, invalidate:

```tsx
useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo, context) => {
    await context.client.cancelQueries({ queryKey: ['todos'] })

    const previousTodos = context.client.getQueryData(['todos'])

    context.client.setQueryData(['todos'], (old) => [...old, newTodo])

    return { previousTodos }
  },
  onError: (error, newTodo, onMutateResult, context) => {
    context.client.setQueryData(['todos'], onMutateResult.previousTodos)
  },
  onSettled: (data, error, variables, onMutateResult, context) =>
    context.client.invalidateQueries({ queryKey: ['todos'] }),
})
```

- Cancelling first prevents an in-flight refetch from overwriting the optimistic
  value with the old server state.
- The value returned from `onMutate` reaches `onError` and `onSettled` as the
  `onMutateResult` argument — that snapshot is the rollback.
- Keep the optimistic shape identical to the resolved shape so no UI branch
  exists only during the mutation.

## Concurrency, Retry & Offline

- Mutations run in parallel by default, including repeated calls of the same
  one. Give them `scope: { id: 'todo' }` to serialize: later calls start
  `isPaused` and resume in order.
- `retry: 3` opts a mutation into retries. Mutations that failed because the
  device was offline are retried in order on reconnect.
- To resume mutations after a page reload, register the function with
  `queryClient.setMutationDefaults(['todos'], { mutationFn })` — only mutation
  *state* is persisted, never functions — then call
  `queryClient.resumePausedMutations()`.
