---
name: tanstack-store
description: >-
  TanStack Store client-state management. Use when implementing or reviewing
  @tanstack/store or its framework adapters, immutable updates, derived stores,
  selectors, subscriptions, batching, scoped SSR state, or migrations from
  legacy Store/Derived/Effect APIs.
---

# TanStack Store

## 1. Establish the API generation and state owner

Read the installed core and adapter versions, lockfile resolutions, existing
store definitions, and consumers before choosing an API. This skill's modern
examples target core and React **0.11.1**, verified on **2026-09-17**. TanStack
still labels Store alpha; resolve newer or intermediate versions against their
installed declarations rather than assuming that all `0.x` releases agree.

| Evidence in the project | Path |
| --- | --- |
| Core 0.11.1, React 0.11.1 | Use the modern examples below. |
| Core 0.9–0.10 | Signals rewrite, but newer adapter hooks may be absent; verify exports. |
| Core through 0.8, explicit `Derived` / `Effect` | Read [legacy.md](./legacy.md) before changing code. |
| Multiple core versions, including transitive dependencies | Follow the package resolved by each consumer; retain unrelated library internals. |

Choose ownership before adding a store:

| State | Preferred owner |
| --- | --- |
| One component's temporary UI state | Framework-local state |
| Shared client-owned state or reactive calculations | TanStack Store |
| Shareable navigation, filters, pagination | Router URL/search state |
| Remote data, freshness, retries, mutations | Existing server-state cache, such as TanStack Query |
| Synchronized collections and relational live queries | Existing data layer, such as TanStack DB |

Finish this step with the resolved API generation, state owner, store lifetime,
and affected consumers identified. Preserve the project's existing state layer
unless the requested behavior needs a change.

## 2. Implement the state transition

`createStore(value)` creates writable state. `setState(updater)` replaces the
whole value with the updater's return value; it does not merge object fields.
Return new references along changed paths and retain unchanged branches.

```ts
import { createStore } from '@tanstack/store'

type Filters = {
  query: string
  status: 'all' | 'open' | 'closed'
}

export function createFiltersStore() {
  const store = createStore<Filters>({ query: '', status: 'all' })

  function setQuery(query: string) {
    store.setState((state) =>
      state.query === query ? state : { ...state, query },
    )
  }

  return { store, setQuery }
}
```

Keep update functions pure and synchronous. Use an explicit state type for
unions, nullable values, and empty collections. Core change detection uses
`Object.is`; mutating an object and returning the same reference can suppress
notifications. A direct `.state` or `.get()` read returns a snapshot, not a UI
subscription.

Reuse ordinary action functions like the example. When the installed API and
project use `createStore(initialValue, actionsFactory)`, actions are exposed
through `.actions`; this is optional, not a reason to restructure existing stores.

Finish when each requested transition preserves unrelated state and has one
authoritative write path.

## 3. Derive and observe

`createStore(getter)` creates a readonly computed store. Reads of other stores
inside its synchronous getter establish dependencies automatically, including
conditional dependencies. Read dependencies inside the getter rather than
closing over snapshots read beforehand.

```ts
import { batch, createStore } from '@tanstack/store'

const price = createStore(10)
const quantity = createStore(2)
const total = createStore(() => price.state * quantity.state)
const observedTotals: number[] = []
const subscription = total.subscribe((value) => observedTotals.push(value))

batch(() => {
  price.setState(() => 12)
  quantity.setState(() => 3)
})

subscription.unsubscribe()
```

The final total is `36`; the subscription receives that update, not an initial
value. Read `.state` separately when an initial snapshot is needed.

- Modern computed stores need no `.mount()`. Keep getters pure: evaluation is
  lazy and subscription-driven, not an event log. A getter's optional previous
  value is the previous computation result, not a guarantee to process every write.
- `subscribe` receives the new value and returns `{ unsubscribe }`. Attach its
  cleanup to the owner's disposal/unmount lifecycle; use it for external effects.
- `batch` delays notifications until the outermost synchronous batch ends.
  Writes still happen immediately; it is neither rollback nor an async transaction.
  After awaited work, batch only the synchronous writes that must notify together.
- Store computations track Store reads, not arbitrary framework props. Bridge
  changing inputs explicitly through the existing framework integration.

Finish when derived values have no duplicated writable copy and every manual
subscription has a cleanup owner.

## 4. Connect the framework and lifetime

- **React selectors, component-owned stores, context, SSR, or persistence:** read
  [react.md](./react.md). Subscribe to the slice rendered by the component.
- **Other frameworks:** read the matching adapter section in
  [references/research.md](./references/research.md#framework-adapters), then the
  linked official quick start and installed types. Vue refs, Solid accessors,
  Svelte `.current`, and Angular signals are different return contracts.
- **Legacy maintenance or an explicitly requested upgrade:** read
  [legacy.md](./legacy.md); migrate lifecycle and consumers together.
- **Atoms, async atoms, action factories, devtools, or disputed API behavior:**
  read [the research evidence](./references/research.md) before extending the
  implementation. Verify exports; custom persistence and request caching are
  not implicit Store capabilities.

Finish when the store survives the intended renders, is disposed at the right
boundary, and cannot leak request-specific state between server requests.

## 5. Validate the changed contract

Use the project's existing typecheck and nearest tests. Cover the paths changed:

- Consecutive updates use the latest state and preserve unrelated fields.
- A changed nested value gets new references; a no-op preserves its reference.
- Derived results update when active dependencies change, including branch switches.
- Batched writes expose the expected final notification; cleanup stops observation.
- A component reacts to its selected slice, including prop-dependent selectors;
  unrelated writes do not cause store-driven rerenders when selection is equal.
- Scoped instances remain independent; SSR hydration starts from matching data.

Report the resolved versions, checks run, and any untested runtime boundary.
The dated [research record](./references/research.md) contains primary-source
citations and distinguishes implementation facts from application recommendations.
