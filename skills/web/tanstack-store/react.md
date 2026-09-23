# React subscriptions and store ownership

Applies to `@tanstack/react-store` 0.11.1. For older APIs, use
[legacy.md](./legacy.md).

## Select the rendered value

`useSelector(source, selector?, { compare }?)` accepts a store or atom exposing
`get()` and `subscribe()`. Omitting the selector subscribes to the entire value.
The default selection comparison is `===`, distinct from core `Object.is`.

```tsx
import { shallow, useCreateStore, useSelector } from '@tanstack/react-store'

export function Counter() {
  const store = useCreateStore({ count: 0, label: 'Items', expanded: false })
  const summary = useSelector(
    store,
    (state) => ({ count: state.count, label: state.label }),
    { compare: shallow },
  )

  return (
    <button
      type="button"
      onClick={() => store.setState((state) => ({ ...state, count: state.count + 1 }))}
    >
      {summary.label}: {summary.count}
    </button>
  )
}
```

Prefer selecting a primitive or stable branch. When selecting a fresh aggregate,
use `shallow` only if top-level equality describes every rendered value. It is
not deep equality. A comparator returning true hides that update from the
consumer; never use it to conceal a real state change.

Inline selectors are supported. Test selectors depending on props when those
props change, even without a store write. Direct `.state` reads in JSX establish
no React subscription. Store equality also does not prevent rerenders caused
by parents, props, context, or local state.

Modern `useStore` is a deprecated alias with a different third argument:
`useStore(source, selector, compare)` takes a comparator function, whereas
`useSelector` takes an options object. Preserve legacy behavior when migrating.

## Create once at the ownership boundary

`useCreateStore(initialValue)` retains an instance for the component's lifetime.
The initializer is not reapplied when props change. Its function overload creates
a computed store, **not** a lazy initializer for writable state; a captured plain
prop is not a reactive Store dependency.

Use an existing store factory with React's lazy `useState` when the store needs
several related objects. A browser-only module singleton is appropriate only for
intentionally shared application state. Scope editors, tabs, and request-owned
state independently.

`createStoreContext<T>()` returns `StoreProvider` and `useStoreContext`. The
provider transports its `value`; it does not construct stores or hydrate them.

```tsx
import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import { createStore, createStoreContext, useSelector } from '@tanstack/react-store'

function createEditor(initialTitle: string) {
  return { document: createStore({ title: initialTitle }) }
}

const { StoreProvider, useStoreContext } =
  createStoreContext<ReturnType<typeof createEditor>>()

export function EditorProvider({
  initialTitle,
  children,
}: PropsWithChildren<{ initialTitle: string }>) {
  const [editor] = useState(() => createEditor(initialTitle))
  return <StoreProvider value={editor}>{children}</StoreProvider>
}

export function EditorTitle() {
  const { document } = useStoreContext()
  const title = useSelector(document, (state) => state.title)
  return <h1>{title}</h1>
}
```

Give prop-driven replacement explicit semantics: preserve the current draft,
apply a deliberate update, or remount by identity. Recreating stores on every
render silently resets state and subscriptions.

## Server rendering and persistence

The following are application-design recommendations derived from React's
external-store contract and the adapter implementation, not built-in TanStack
Store hydration features:

1. Create request-specific instances on the server. Keep mutable user data out
   of process-wide module singletons.
2. Transfer only the required serializable snapshot through the framework's
   safe serialization mechanism. Recreate the client instance from that same
   snapshot before hydration; transfer data, not subscriptions or store objects.
3. Keep browser storage reads out of server initialization. If persistence is
   required, restore validated data at a deliberate client lifecycle boundary
   after hydration and define how it interacts with newer edits.
4. Reuse existing persistence infrastructure. Define schema versioning, storage
   failure behavior, identity scoping, and logout/reset handling for any new
   adapter; persist only the allowlisted fields, never credentials or secrets.
5. Dispose manually attached persistence listeners. React's selection hook
   handles its own subscription, not application-created subscriptions.

Validate two independent server requests, matching server/client first renders,
and restoration without overwriting a newer edit when those paths are changed.
