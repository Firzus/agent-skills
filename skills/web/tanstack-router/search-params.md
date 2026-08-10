# Search Params

TanStack Router treats the query string as typed application state rather than a
bag of strings. Two mechanisms make that work: JSON-first parsing, and
`validateSearch` as the validation boundary.

## JSON-First Parsing

The first level of the search string stays flat and `URLSearchParams`-compliant,
so other tools can still read and write simple params. Non-string first-level
values are preserved as real numbers and booleans, and nested structures are
serialized as URL-safe JSON.

```tsx
<Link
  to="/shop"
  search={{
    pageIndex: 3,
    includeCategories: ['electronics', 'gifts'],
    sortBy: 'price',
    desc: true,
  }}
/>
```

produces

```
/shop?pageIndex=3&includeCategories=%5B%22electronics%22%2C%22gifts%22%5D&sortBy=price&desc=true
```

and parses back to the original JSON, arrays and booleans intact.

## validateSearch

`validateSearch` receives the JSON-parsed but unvalidated params as
`Record<string, unknown>` and returns the typed object. That type propagates to
the route's other options **and to every child route** — search params merge
downward, so a child's `beforeLoad` sees the parent's validated search.

```tsx
type ProductSearch = {
  page: number
  filter: string
  sort: 'newest' | 'oldest' | 'price'
}

export const Route = createFileRoute('/shop/products')({
  validateSearch: (search: Record<string, unknown>): ProductSearch => ({
    page: Number(search?.page ?? 1),
    filter: (search.filter as string) || '',
    sort: (search.sort as ProductSearch['sort']) || 'newest',
  }),
})
```

Because the option also accepts an object exposing a `parse` method, a schema can
be handed over directly: `validateSearch: productSearchSchema`.

## Fallbacks Versus Errors

Search params are user-editable text. A malformed param usually should not halt
the app, which is why `.catch()` is preferred over `.default()` in Zod. When
`validateSearch` throws, the route's `onError` fires with `error.routerCode` set
to `VALIDATE_SEARCH` and the `errorComponent` renders in place of `component` —
use that deliberately when a bad param genuinely deserves an error screen.

## Validation Library Adapters

| Library | Adapter needed | Notes |
|---------|----------------|-------|
| Zod v3 | `zodValidator` from `@tanstack/zod-adapter` | `.default()` otherwise makes `search` required on every `Link`; `.catch()` erases types, so use the adapter's `fallback` helper. |
| Zod v4 | No | Use the schema directly; `catch` retains inference. |
| Valibot 1.0 | No | Implements Standard Schema. |
| ArkType 2.0-rc | No | Implements Standard Schema. |
| Effect/Schema | No | Via `S.standardSchemaV1`. |

The Zod v3 pattern that keeps both navigation and read types correct:

```tsx
import { fallback, zodValidator } from '@tanstack/zod-adapter'
import { z } from 'zod'

const productSearchSchema = z.object({
  page: fallback(z.number(), 1).default(1),
  filter: fallback(z.string(), '').default(''),
  sort: fallback(z.enum(['newest', 'oldest', 'price']), 'newest').default('newest'),
})

export const Route = createFileRoute('/shop/products/')({
  validateSearch: zodValidator(productSearchSchema),
})
```

`zodValidator` also accepts `{ schema, input, output }` when the output type is
the more accurate one to navigate with — flexible, but rarely needed.

## Reading

- Inside the route's own component: `Route.useSearch()`.
- Elsewhere with full type safety: `getRouteApi('/shop/products').useSearch()` or
  `useSearch({ from: Route.fullPath })`.
- In a component shared across routes: `useSearch({ strict: false })`, which
  returns each field as possibly `undefined` — an explicit, visible trade.
- In loaders: never directly. Route them through `loaderDeps` (see
  [data-loading.md](./data-loading.md)).

## Writing

`<Link search>`, `navigate({ search })`, `router.navigate({ search })`, and
`<Navigate search />` all share one shape. The function form receives the
previous search:

```tsx
<Link from={Route.fullPath} search={(prev) => ({ page: prev.page + 1 })}>
  Next Page
</Link>
```

For a generic component rendered under many routes, `to="."` gives loosely typed
access to the current route's params; `from="/posts"` narrows to one subtree,
which is both safer and much cheaper for TypeScript.

## Search Middlewares

Middlewares transform search params while hrefs are built for a route and its
descendants, and again on navigation after validation. Two built-ins cover the
common cases:

```tsx
import { createFileRoute, retainSearchParams, stripSearchParams } from '@tanstack/react-router'

const defaultValues = { one: 'abc', two: 'xyz' }

export const Route = createFileRoute('/hello')({
  validateSearch: searchSchema,
  search: {
    middlewares: [
      retainSearchParams(['rootValue']),
      stripSearchParams(defaultValues),
    ],
  },
})
```

- `retainSearchParams([...])` carries listed params onto every generated link
  unless the link sets them explicitly. Good for a persistent tenant or locale.
- `stripSearchParams(defaults)` removes params sitting at their default value,
  keeping URLs clean.

Middlewares chain in order, and a custom one is just a function of
`({ search, next })` returning the final object.

## Traps

- A param the loader reads but `loaderDeps` omits produces stale or mismatched
  cached data.
- Zod v3 `.default()` without the adapter silently makes `search` a required prop
  on every `Link` pointing at that route.
- `<Link to="." search={...} />` in a generic component resolves `search` against
  the union of every route's params — correct, but a real TypeScript performance
  cost at scale. Narrow with `from` where you can.
