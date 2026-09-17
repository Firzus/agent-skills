# Caching and revalidation

Read this before adding `use cache`, `cacheLife`, `cacheTag`, or any
revalidation call. This is the area of Next.js that moved most between 15 and
16, so treat pre-16 advice found elsewhere in a codebase as suspect.

## The model: dynamic by default

Cache Components is enabled with `cacheComponents: true` in `next.config.ts`.
Under it, **data fetching is dynamic by default** and caching is opt-in through
the `use cache` directive. Next prerenders a static shell, serves it
immediately, and streams the dynamic content into it — static and dynamic mixed
in one route.

That mixing is Partial Prerendering, and it is now the default behaviour rather
than a flag: `experimental.ppr` and the `experimental_ppr` segment export have
been **removed**.

Two consequences to check first:

- Cache Components requires the **Node.js runtime**. A route exporting
  `runtime = 'edge'` must migrate; that export is deprecated.
- With Cache Components enabled, segment exports `dynamic`, `revalidate`, and
  `fetchCache` are incompatible, not merely deprecated. Translate their
  behavior using the [migration guide](https://github.com/vercel/next.js/blob/3cf1f7418ff9e3ce0f54b4c3212964e421933237/docs/01-app/02-guides/migrating-to-cache-components.mdx)
  before claiming adoption. `revalidate` moves to `cacheLife()` in a cached scope.

Existing `fetch` caches and `unstable_cache` can remain during adoption;
enabling the flag does not require rewriting them. For the migration sequence,
read [cache-components-adoption.md](cache-components-adoption.md).

## `use cache`

The directive marks a file, a component, or a function as cacheable:

```tsx
async function getUser(id: string) {
  'use cache'
  cacheLife('hours')
  cacheTag(`user-${id}`)

  const res = await fetch(`https://api.example.com/users/${id}`)
  return res.json()
}
```

The cache key is derived automatically from the function's identity (a hash of
its location and signature) and its **serializable arguments**. You do not
write the key.

Two serialization systems meet here, and they differ: arguments use Server
Component serialization, return values use Client Component serialization, and
**arguments are the more restrictive of the two**. You can return JSX from a
cached function but not accept it as an argument — except by pass-through.

**Pass-through** is the loophole that makes composition work: a
non-serializable value is acceptable as long as the cached scope does not
introspect it. That is why `children` and Server Actions can cross a cached
boundary untouched.

## The trap that passes the build

A cached scope cannot read `cookies()`, `headers()`, or `searchParams`. The
restriction **follows the call stack**: a helper three levels down that reads
one fails the whole scope with `next-request-in-use-cache`.

On a dynamically rendered route this surfaces at **run time**, so the code can
pass `next build` and fail under `next start`. Assume the build is not the gate
here.

The fix is always the same shape — read outside, pass in:

```tsx
export default async function Page() {
  const store = await cookies()
  const locale = store.get('locale')?.value ?? 'en'
  return <Content locale={locale} />
}
```

`draftMode().isEnabled` is the one exception readable inside a cached scope.

## `cacheLife`

Call it **inside** a cached scope. Three knobs, and the defaults are longer
than most people expect:

| Knob | Meaning | Default |
| --- | --- | --- |
| `stale` | how long a client may use the cached value without checking the server | 5 minutes |
| `revalidate` | after this, the next request triggers a background refresh | 15 minutes |
| `expire` | after this long with no requests, the next one waits for fresh content | never |

`expire` must exceed `revalidate`, or Next errors. Independently of
configuration, the client router enforces a **30-second minimum stale time**.

## Persistence is not what it was

`use cache` entries are in-memory by default and, unlike the `fetch` Data Cache
and the old `unstable_cache`, **do not persist across deployments or serverless
instances**. On serverless they typically do not survive between requests;
build-time caching works normally. Configure `cacheHandlers` in
`next.config.js` to change the storage.

Replacing `unstable_cache` is optional. When doing so, verify the storage
change deliberately; even durable `use cache` storage can recompute values
after a deployment.

Related directives exist for the cases the default cannot serve:
`'use cache: remote'` uses a platform-provided handler — a network roundtrip
and usually a platform cost — and `'use cache: private'` covers compliance
cases where runtime data cannot be refactored into arguments.

## Invalidation: three verbs

| Verb | Semantics | Callable from |
| --- | --- | --- |
| `updateTag(tag)` | read-your-own-writes: expires the tag, the next request **waits** for fresh data | Server Actions only — throws elsewhere |
| `revalidateTag(tag, profile)` | stale-while-revalidate; the cache profile is a **required** second argument | Server Actions and Route Handlers |
| `revalidatePath(path)` | unchanged from the previous model | Server Actions and Route Handlers |

Pick by what the user sees next. After a form submit whose result the user
immediately reads back, `updateTag` — anything else shows them stale data they
just changed. For a webhook or a background refresh, `revalidateTag`.

`refresh()` is the fourth, narrower tool: Server-Actions-only, it refreshes
**uncached data only and does not touch the cache**. Use it for a live counter
or metric sitting beside a cached shell.

## Verify a cache change

Run changed cached call paths under `next start`, with the real authentication
and request context, as well as building them. Include authorized and denied
access cases when a boundary moves; request-specific data must remain isolated
between users. A streaming optimization must preserve authorization before
protected reads and Server Actions.

For every new or expanded mutable cache, populate it, perform a representative
mutation, and confirm the next read follows the intended freshness contract.
Reuse or extend applicable tests; where none cover this lifecycle, record a
manual production-mode check and its expected and observed results. Check
invalidation and read-your-writes independently from navigation readiness:
an `instant()` pass does not establish cache correctness.

## Avoiding waterfalls

Caching does not rescue a sequential fetch chain. Independent work runs
together:

```tsx
const [user, posts] = await Promise.all([getUser(id), getPosts(id)])
```

Push each `await` into the branch that actually needs it rather than at the top
of the component, and put a Suspense boundary around anything slow so the shell
streams first. `React.cache()` dedupes a repeated call within one request.

## Navigation state

With `cacheComponents` on, Next uses React's `<Activity>` to mark the previous
route `"hidden"` rather than unmounting it: component state survives
navigation, back-navigation restores it, and effects are cleaned up on hide and
recreated on show. Only a few recent routes stay in the DOM. Code that assumed
unmount-on-navigate for cleanup needs review.
