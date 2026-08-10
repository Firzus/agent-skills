# Navigation

Every navigation is relative: it has an origin (`from`) and a destination (`to`).
Without `from`, the router assumes the root `/` and only autocompletes absolute
paths.

## One Shared Interface

`ToOptions` is the core, extended by `NavigateOptions`, extended by
`LinkOptions`. Learn it once and it applies to `Link`, `useNavigate`,
`router.navigate`, `Navigate`, `redirect`, `useMatchRoute`, and `MatchRoute`.

`ToOptions`:

| Field | Notes |
|-------|-------|
| `from` | Origin route ID or path. Commonly `Route.fullPath`. |
| `to` | Destination route pattern. **Never interpolate params, hash, or search into it.** |
| `params` | Object or `(prev) => next`. The only way to fill dynamic segments. |
| `search` | Object or `(prev) => next`. |
| `hash` | String or `(prev) => next`. |
| `state` | History-API state; for data you do not want in the URL. |
| `mask` | A nested navigation object used to display a different URL. |

`NavigateOptions` adds `replace`, `resetScroll`, `hashScrollIntoView`,
`viewTransition`, `ignoreBlocker`, `reloadDocument`, and `href`.

`LinkOptions` adds `target`, `activeOptions`, `preload`, `preloadDelay`, and
`disabled`. `LinkProps` adds `activeProps` and `inactiveProps`.

## Which API

| API | When |
|-----|------|
| `<Link>` | Anything the user clicks. Renders a real `<a href>`, so cmd/ctrl-click and new-tab work. |
| `useNavigate()` | Side-effect navigation, e.g. after a successful submit. |
| `<Navigate />` | Immediate redirect on mount, without a `useEffect`. |
| `router.navigate()` | Anywhere the router instance is reachable, including outside the framework. |

None of these replace a server-side redirect. If a user must be redirected before
the app mounts, do it on the server.

## Relative Paths

```tsx
<Link to=".">Reload the current route</Link>
<Link to="..">Go to the parent route</Link>
<Link from="/posts" to="..">Go to root</Link>
```

`route.fullPath` is preferable to a literal string for `from` because it survives
refactors, though a string stays type-checked. Two pitfalls: `Route.useNavigate`
pins `from` to its own route, and inside a **pathless** layout route `from`
resolves to that layout's parent, since the layout has no path of its own.

## Params

```tsx
<Link to="/blog/$postId" params={{ postId: '123' }}>Post 123</Link>
<Link to="/blog/$postId" params={(prev) => ({ ...prev, postId: '123' })}>Post</Link>
```

Params are usually strings, but take whatever type `params.parse` produces, and
are type-checked either way. For optional params (`{-$category}`), `params: {}`
inherits current values while an explicit `undefined` removes the segment:

```tsx
<Link to="/posts/{-$category}" params={{ category: undefined }}>All Posts</Link>
```

## Active State

Three interchangeable mechanisms: `activeProps`/`inactiveProps` (styles merge,
classes concatenate, other props override), the `data-status="active"` attribute,
and a function child receiving `{ isActive }`.

`activeOptions` defaults to matching the resulting **pathname as a prefix**, with
any supplied search params compared inclusively and the hash ignored:

| Option | Default | Effect |
|--------|---------|--------|
| `exact` | `false` | Match the full path only, excluding child routes. |
| `includeHash` | `false` | Require the hash to match too. |
| `includeSearch` | `true` | Compare search params inclusively. |
| `explicitUndefined` | `false` | Params explicitly `undefined` must be absent from the URL. |

A home link almost always wants `activeOptions={{ exact: true }}`.

## Reusable Options With linkOptions

An object literal spread into `Link` is checked too late and infers `to` as
`string`. `linkOptions` type-checks eagerly and returns the input as-is:

```tsx
const dashboardLinkOptions = linkOptions({ to: '/dashboard', search: { search: '' } })

throw redirect(dashboardLinkOptions)   // in beforeLoad
navigate(dashboardLinkOptions)          // imperative
<Link {...dashboardLinkOptions} />      // declarative
```

It also accepts an array, which is how nav bars get built without losing types —
extra keys such as `label` are inferred and returned alongside the link props.

## Preloading

`preload` accepts `false`, `'intent'` (focus, hover, or touch), `'viewport'`
(entering the viewport), or `'render'`. Set `defaultPreload: 'intent'` on the
router for the whole app and override per link.

Intent preloading waits `preloadDelay` (default **50 ms**) of sustained hover or
focus and cancels if it ends first; touch preloads immediately.
`defaultPreloadDelay` sets the router-wide value.

Preloaded data is fresh for 30 s by default (`defaultPreloadStaleTime`) and
retained per `preloadGcTime`. With an external cache owning freshness, set
`defaultPreloadStaleTime: 0` so that cache decides whether to fetch.

## Route Masking

Masking shows one URL while the router runs another — a modal at
`/photos/$photoId/modal` displayed as `/photos/$photoId`. It works by storing the
real location in `location.state.__tempLocation`.

Imperatively:

```tsx
<Link
  to="/photos/$photoId/modal"
  params={{ photoId: 5 }}
  mask={{ to: '/photos/$photoId', params: { photoId: 5 } }}
>
  Open Photo
</Link>
```

Declaratively, so every navigation matching a pattern is masked:

```tsx
const photoModalToPhotoMask = createRouteMask({
  routeTree,
  from: '/photos/$photoId/modal',
  to: '/photos/$photoId',
  params: (prev) => ({ photoId: prev.photoId }),
})

const router = createRouter({ routeTree, routeMasks: [photoModalToPhotoMask] })
```

Both forms are type-safe. Shared URLs unmask automatically, because the masking
data lives in the local history entry and cannot survive a copy-paste. Local
reloads keep the mask by default; `unmaskOnReload: true` changes that, applied on
the router, on `createRouteMask`, or per navigation in ascending priority.

## Matching Without Navigating

`useMatchRoute()` and `<MatchRoute>` take the same `ToOptions` and report whether
a route is currently matched. The `pending` option is the useful one — it shows
optimistic UI while a navigation to that route is in flight:

```tsx
<Link to="/users">
  Users
  <MatchRoute to="/users" pending>
    <Spinner />
  </MatchRoute>
</Link>
```

## TypeScript Cost

`<Link to=".." search={{ page: 0 }} />` without `from` resolves `search` against
the union of every route's search params, and that check grows linearly with the
route count. Narrow it — `from={Route.fullPath}`, a branch path like
`from="/posts"`, or even a union of the few relevant paths.

Never annotate a bare object as `LinkProps`; it is an enormous type. Use
`as const satisfies LinkProps` — or better, narrowed generics — so the comparison
stays cheap. Inverting control with a render prop
(`renderLink={() => <Link to="/absolute" />}`) is cheapest of all.
