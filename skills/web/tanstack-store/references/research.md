# TanStack Store research

Checked on 2026-09-17. This is a source audit, not a promise that future `latest` releases preserve these contracts.

## Evidence and release baseline

- The npm `latest` metadata returned `0.11.1` for both `@tanstack/store` and `@tanstack/react-store`; the React package depends on exactly `@tanstack/store: 0.11.1`. Its declared peers include React and ReactDOM 16.8, 17, 18, and 19. [Core metadata](https://registry.npmjs.org/@tanstack/store/0.11.1), [React metadata](https://registry.npmjs.org/@tanstack/react-store/0.11.1).
- Repository inspection used commit `6ae9e8131b034725be57711f9fddb8d10f59d6f7`. The published core and React tarballs were downloaded to a temporary directory without installing dependencies. Whitespace-normalized comparisons matched published `store.ts`, `atom.ts`, `useSelector.ts`, `useCreateStore.ts`, and `createStoreContext.tsx` against that commit. [Repository snapshot](https://github.com/TanStack/store/tree/6ae9e8131b034725be57711f9fddb8d10f59d6f7), [Core archive](https://registry.npmjs.org/@tanstack/store/-/store-0.11.1.tgz), [React archive](https://registry.npmjs.org/@tanstack/react-store/-/react-store-0.11.1.tgz).
- Version 0.9.0 replaced the old derived/effect model; 0.9.1 corrected derived factory return types to readonly; 0.9.2 fixed mutable state accidentally becoming undefined during graph cleanup. Version 0.11.0 introduced the new adapter hooks; 0.11.1 concerns generated-build tree shaking. [Core changelog](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/CHANGELOG.md), [React changelog](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/react-store/CHANGELOG.md).

Recommendation: inspect the consuming project's lockfile, installed declarations, and actual imports first. Do not silently upgrade a pre-0.9 application or substitute current examples for its installed contract.

## Core contracts at 0.11.1

`createStore(value)` returns a writable store. `createStore(getter)` returns `ReadonlyStore`; a function argument denotes a computation, not a lazy initial-value factory or function-valued state. Both expose `.state`, `.get()`, and `.subscribe()`. Writable stores expose `setState(updater)` and optionally an actions object created by a second-argument factory receiving `get` and `setState`. The updater returns the complete next state, not a partial merge. `Store` remains exported even though the changelog recommends the factory. [Store implementation](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/src/store.ts).

Recommendation: preserve unaffected object fields and replace changed nested references. This follows from replacement updates and identity comparison; it is not an Immer integration. Keep writable state and action names explicit. Function-valued data should be wrapped in an object rather than passed directly to the factory. [Store implementation](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/src/store.ts), [Atom implementation](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/src/atom.ts).

### Update timing, subscription ownership, and batching

Source findings: writes update the snapshot synchronously. Default core comparison is `Object.is`; unchanged references normally suppress propagation. A subscription receives the new value, skips an initial notification, and returns an object with `unsubscribe()`. `batch` delays notification flushing until its outermost synchronous callback finishes; it does not delay state assignment. Computed getters track synchronous reads automatically and refresh lazily when read or observed. Unsubscription removes observer dependencies; computed stores do not require `mount()`. [Atom implementation](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/src/atom.ts), [Synchronous batch regression](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/tests/batch.test.ts).

Consequences and recommendations:

- Keep the returned unsubscribe function with the owner of the subscription; call it when that owner is disposed.
- If an integration needs an initial side effect, initialize it explicitly rather than assuming `subscribe` calls immediately.
- Do not use an async batch callback to group work across `await`: the implementation finishes its batch when the callback returns, without awaiting a promise.
- Batching is notification coalescing, not a rollback transaction. The `finally` block flushes even if the callback throws; previous writes are not undone.
- Keep computed callbacks free of side effects. A previous-value argument describes the previous computation, not a reliable log of every source transition. Reads after an async boundary are outside synchronous dependency tracking.

These are deductions from the implementation's synchronous control flow, not additional public guarantees. [Batch and reactive tracking implementation](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/src/atom.ts).

The upstream derived tests cover diamond dependencies, composition, repeated subscription lifecycles, and avoiding unnecessary recomputation. Some test titles still say “mount” or “old and new values”; read their bodies rather than treating historical titles as current API documentation. [Derived tests](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/tests/derived.test.ts).

## React integration

`useSelector(source, selector?, { compare }?)` accepts sources exposing `get()` and `subscribe()`. Its default selected-value equality is `===`, not shallow equality. It adapts object-shaped subscription cleanup to the function expected by React and supplies the same snapshot getter for server and client rendering. The deprecated `useStore(source, selector?, compare?)` delegates to it, but takes a bare comparison function as its third argument. [Selector implementation](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/react-store/src/useSelector.ts), [Deprecated alias](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/react-store/src/useStore.ts).

Recommendation: select a primitive or stable subvalue when possible. For selectors returning fresh object or array wrappers, use `{ compare: shallow }` if shallow comparison expresses the intended rendering contract. The core helper compares top-level values and has cases for Maps, Sets, Dates, and symbol keys; it is not deep equality. [Shallow helper](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/src/shallow.ts). Adapter tests cover custom comparison, selected-state rendering, and a selector change that suspends without replacing the committed selector. [React tests](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/react-store/tests/index.test.tsx).

`useCreateStore` uses a React state initializer to retain one store per mounted component; it mirrors value/computed/action overloads. `createStoreContext<T>()` returns `StoreProvider` and `useStoreContext`; its provider transports the given object, and the hook throws without a matching provider. Neither API automatically synchronizes later prop changes into an existing store. [Creation hook](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/react-store/src/useCreateStore.ts), [Context implementation](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/react-store/src/createStoreContext.tsx).

Recommendations: keep store identities stable, distinguish initialization from controlled updates, and avoid computed callbacks that accidentally capture stale props. A plain `.state` read in JSX is not a subscription; use the adapter hook for reactive rendering. [Creation hook](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/react-store/src/useCreateStore.ts), [React quick start](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/docs/framework/react/quick-start.md).

### Server rendering and hydration

React requires immutable, cached snapshots and matching server/client initial snapshots during hydration. TanStack's selector hook does not expose a separate hydration-state parameter: it passes `source.get()` for both snapshot functions. Therefore request-specific store creation and identical initial data on the client are application responsibilities. Never place private request state in a mutable server module singleton. The last two statements are architectural safety recommendations inferred from the hook contract, not a built-in TanStack request-isolation feature. [React external-store contract](https://react.dev/reference/react/useSyncExternalStore), [TanStack selector implementation](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/react-store/src/useSelector.ts).

## Framework adapters

The installation guide covers React, Preact, Vue, Angular, Solid, Svelte, Lit, and Octane. Package versions are not synchronized numerically; inspect each package's own dependency and peer requirements rather than insisting every adapter match the core version. [Installation guide](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/docs/installation.md).

| Package suffix | npm latest observed | Declared framework peer |
| --- | --- | --- |
| `react-store` | 0.11.1 | React and ReactDOM 16.8/17/18/19 |
| `preact-store` | 0.13.2 | Preact 10 |
| `vue-store` | 0.11.1 | Vue 2.5 or 3; composition API peer also declared |
| `angular-store` | 0.11.1 | Angular core/common >=19 |
| `solid-store` | 0.11.1 | Solid >=1.6 within major 1 |
| `svelte-store` | 0.12.1 | Svelte 5 |
| `lit-store` | 0.14.1 | Lit 3 |
| `octane-store` | 0.12.2 | Octane exactly 0.1.21 |

Table sources: [React](https://registry.npmjs.org/@tanstack/react-store/0.11.1), [Preact](https://registry.npmjs.org/@tanstack/preact-store/0.13.2), [Vue](https://registry.npmjs.org/@tanstack/vue-store/0.11.1), [Angular](https://registry.npmjs.org/@tanstack/angular-store/0.11.1), [Solid](https://registry.npmjs.org/@tanstack/solid-store/0.11.1), [Svelte](https://registry.npmjs.org/@tanstack/svelte-store/0.12.1), [Lit](https://registry.npmjs.org/@tanstack/lit-store/0.14.1), [Octane](https://registry.npmjs.org/@tanstack/octane-store/0.12.2).

The installation guide describes ReactDOM support, not React Native support. Do not infer adapter compatibility solely from the framework-independent core. [Installation guide](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/docs/installation.md).

For adapter-specific usage, follow the pinned quick start rather than translating React hook signatures: [Preact](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/docs/framework/preact/quick-start.md), [Vue](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/docs/framework/vue/quick-start.md), [Angular](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/docs/framework/angular/quick-start.md), [Solid](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/docs/framework/solid/quick-start.md), [Svelte](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/docs/framework/svelte/quick-start.md), [Lit](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/docs/framework/lit/quick-start.md), [Octane](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/docs/framework/octane/quick-start.md).

## Legacy migration hazards

The historical baseline here is tag `v0.8.0`, commit `edf475dedce5c14c9edd7d382081c7c60cbab017`; earlier 0.x versions must be checked individually. [Historical snapshot](https://github.com/TanStack/store/tree/edf475dedce5c14c9edd7d382081c7c60cbab017).

| v0.8.0 contract | Current 0.11.1 equivalent or concern |
| --- | --- |
| `new Store(value, options)` with `updateFn`, `onSubscribe`, `onUpdate` | Prefer `createStore(value)`; old options are not a current factory options object |
| `setState(value)` or updater | Current store signature requires an updater |
| Listener receives `{ prevVal, currentVal }` | Listener receives the new state directly |
| `subscribe` returns a callable cleanup | Returns `{ unsubscribe }` |
| `new Derived({ deps, fn })`, explicit `mount()` | `createStore(() => source.state...)`, tracked reads, no mount |
| Derived callback receives dependency arrays and previous value | Computed callback receives optional previous computed value |
| `new Effect({ deps, fn, eager })` | Explicit subscription; initialize separately if needed |
| React `useStore(store, selector, { equal })`, default `shallow` | `useSelector(store, selector, { compare })`, default `===` |

Historical evidence: [Store](https://github.com/TanStack/store/blob/edf475dedce5c14c9edd7d382081c7c60cbab017/packages/store/src/store.ts), [Listener types](https://github.com/TanStack/store/blob/edf475dedce5c14c9edd7d382081c7c60cbab017/packages/store/src/types.ts), [Derived](https://github.com/TanStack/store/blob/edf475dedce5c14c9edd7d382081c7c60cbab017/packages/store/src/derived.ts), [Effect](https://github.com/TanStack/store/blob/edf475dedce5c14c9edd7d382081c7c60cbab017/packages/store/src/effect.ts), [React adapter](https://github.com/TanStack/store/blob/edf475dedce5c14c9edd7d382081c7c60cbab017/packages/react-store/src/index.ts). Current equivalents: [Core factory](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/src/store.ts), [Selector](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/react-store/src/useSelector.ts).

Legacy `Derived.mount()` returns graph cleanup; subscribing does not replace that mounting step. `Effect` defaults to non-eager behavior; `eager: true` invokes its callback during construction, and `mount()` delegates to its derived object's lifecycle. Preserve both subscription cleanup and graph cleanup when maintaining legacy code. [Legacy Derived](https://github.com/TanStack/store/blob/edf475dedce5c14c9edd7d382081c7c60cbab017/packages/store/src/derived.ts), [Legacy Effect](https://github.com/TanStack/store/blob/edf475dedce5c14c9edd7d382081c7c60cbab017/packages/store/src/effect.ts).

## Lower-level APIs and boundaries

`createAtom(value, { compare }?)` produces a writable atom with `get`, `set`, and `subscribe`; `createAtom(getter)` produces a readonly atom. Its setter supports values and updater functions. `createAsyncAtom` is exported and represents pending/done/error outcomes, but the inspected implementation has no request-identity guard, cancellation, retry, or cache configuration. Recommendation: do not infer latest-request-wins semantics or a server-state cache from this primitive. [Atom types](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/src/types.ts), [Async implementation](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/src/atom.ts).

The inspected core export surface contains atoms, stores, types, and shallow comparison, not persistence or a devtools plugin. This is a scoped negative finding, not a claim that no third-party integration exists. If persistence is requested, reuse a project's existing adapter and explicitly handle serialization, storage failure, subscription lifetime, and SSR timing. Do not invent a `persist` middleware or devtools import. [Core exports](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/src/index.ts), [Core factory](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/src/store.ts).

For fetching, deduplication, invalidation, and server-state caching, consider the application's existing TanStack Query integration rather than reimplementing those policies in a client store. This is a division-of-responsibility recommendation; TanStack Query explicitly targets server-state management. [Query overview](https://tanstack.com/query/latest/docs/framework/react/overview).

## Validation performed and remaining limits

A dependency-free Node smoke check against the downloaded published core 0.11.1 build passed: no initial subscription callback; immediate reads during batching; one final notification for two batched writes; current computed reads before and after updates; unsubscribe preventing later notifications; same-value atom updates suppressed. This is a narrow execution check, not the upstream test suite or a React hydration test. The upstream source/tests linked above supply the additional evidence; browser adapters other than React were inspected at metadata/documentation level, not executed.

The two core TypeScript examples in this skill were also executed against that published build after Node stripped their types. Assertions passed for immutable/no-op updates, independent factory instances, a final total of 36 with one batched notification, cleanup, and conditional computed dependencies. The React JSX examples were inspected against declarations but were not typechecked or executed in a React environment.

The website labels this documentation `v0 Latest`, so that label alone cannot distinguish the incompatible API generations. The release changelog's statement that `new Store` became `createStore` also does not mean the class disappeared: current source still exports it. Prefer resolved package declarations and pinned implementation over ambiguous version labels or historical prose. [Live overview](https://tanstack.com/store/latest/docs/overview), [Core changelog](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/CHANGELOG.md), [Current Store class](https://github.com/TanStack/store/blob/6ae9e8131b034725be57711f9fddb8d10f59d6f7/packages/store/src/store.ts).
