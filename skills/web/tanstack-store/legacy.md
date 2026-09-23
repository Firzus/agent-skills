# Legacy maintenance and migration

Use this branch when the project exposes `Derived`, `Effect`, or the pre-signals
Store contract. The legacy example is verified against **v0.8.0**; inspect exact
installed types for earlier versions. The breaking signals rewrite landed in
**0.9.0**, readonly factory typing was fixed in **0.9.1**, and the modern selector
hook family landed in **0.11.0**.

## Maintain the installed contract

```ts
import { Derived, Store } from '@tanstack/store'

const count = new Store(1)
const double = new Derived({
  deps: [count],
  fn: () => count.state * 2,
})
const unmount = double.mount()
const observedValues: number[] = []
const unsubscribe = double.subscribe(({ currentVal }) => {
  observedValues.push(currentVal)
})

count.setState((value) => value + 1)

unsubscribe()
unmount()
```

Legacy derived nodes declare every dependency in `deps` and need `mount()` for
ongoing synchronization. Keep the returned cleanup at the same lifetime boundary.
The getter can receive `prevVal`, `prevDepVals`, and `currDepVals`; inspect their
initial-value behavior before relying on previous values.

Legacy `Effect({ deps, fn, eager })` also needs `mount()`. `eager` defaults to
false; true executes `fn` during construction, not just after mounting. Account
for that execution when moving effects into framework lifecycle hooks.

## Upgrade only when requested

Inventory every direct import, derived dependency, custom Store option,
subscription, and adapter consumer before editing. `new Store` exists in both
generations, so that spelling alone does not identify the contract.

| v0.8.0 contract | Modern 0.11.1 replacement or decision |
| --- | --- |
| `new Store(initialValue)` | `createStore(initialValue)` is the factory entry point; inspect custom constructor options separately. |
| `setState(value)` | `setState(() => value)`; updater form remains valid. |
| `new Derived({ deps, fn })` and `.mount()` | `createStore(() => ...)`, dependencies read inside the getter, no manual mount. |
| Public `Effect` | Owned subscription or framework effect, with an explicit initial run if required. |
| Listener receives `{ prevVal, currentVal }` | Listener receives the new value; track previous snapshots explicitly only if needed. |
| Subscription returns cleanup function | Subscription returns `{ unsubscribe }`. |
| React `useStore(store, selector, { equal })` | `useSelector(store, selector, { compare })`. |
| React selection defaults to `shallow` | Modern default is `===`; preserve aggregate equality explicitly where needed. |
| `StoreOptions.updateFn`, `onUpdate`, `onSubscribe`, or `prevState` | No drop-in promise; inspect each use and preserve its observable behavior. |

Update the project's direct core and adapter dependencies as a compatible pair
using their dependency declarations; adapter version numbers need not be equal.
Keep third-party libraries' private dependency resolutions outside the migration.

Verify derived branch switching, effect initial execution, notification counts,
selector equality, and disposal before declaring compatibility. An import rename
alone cannot establish those guarantees.
