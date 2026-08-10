# File-Based Routing

File-based routing is the recommended configuration mode. The bundler plugin (or
the CLI) generates `routeTree.gen.ts` during dev and build; that file is the only
place the tree exists, and it is never hand-edited.

## Two Ways To Nest

Directories and `.` separators are equivalent and can be mixed freely in the same
project. Directories suit wide hierarchies; dots keep a few deep routes from
spawning nested folders.

| Flat file | Directory equivalent | Route path |
|-----------|----------------------|------------|
| `posts.tsx` | `posts.tsx` | `/posts` |
| `posts.index.tsx` | `posts/index.tsx` | `/posts` (exact) |
| `posts.$postId.tsx` | `posts/$postId.tsx` | `/posts/$postId` |
| `posts_.$postId.edit.tsx` | `posts_/$postId/edit.tsx` | `/posts/$postId/edit`, un-nested |
| `account.tsx` | `account/route.tsx` | `/account` |
| `files.$.tsx` | `files/$.tsx` | `/files/$` |

## Naming Tokens

- **`__root.tsx`** — required, at the top of the configured `routesDirectory`.
- **`.`** — nesting separator between segments.
- **`$label`** — dynamic segment; lands in `params.label`. Works at every
  segment, so `/posts/$postId/$revisionId` captures both.
- **`$`** — splat/catch-all. The remainder of the pathname is available under the
  special `_splat` key. (v1 also exposes `*` for backwards compatibility; it is
  slated for removal in v2.)
- **`{-$label}`** — optional segment. `posts.{-$category}.tsx` matches both
  `/posts` and `/posts/tech`. Optional-param routes rank *below* exact matches,
  so `/posts/featured` still wins over `/posts/{-$category}`.
- **`_` prefix** — pathless layout route. Wraps children with a component or
  logic without consuming a URL segment. The text after the `_` is the route ID
  and is required for uniqueness. Pathless layouts cannot carry dynamic
  segments — `_$postId/` is invalid.
- **`_` suffix** — non-nested route. `posts_.$postId.edit.tsx` renders
  `<PostEditor>` alone rather than inside `<Posts>`.
- **`-` prefix** — excluded from the tree. Use it for colocated components:
  `-components/header.tsx` next to `posts.tsx` never reaches `routeTree.gen.ts`.
- **`(folder)`** — pathless route group. Purely organizational; `(auth)/login.tsx`
  serves `/login`.
- **`index`** — matches the parent path exactly. Configurable via `indexToken`.
- **`route.tsx`** — the route file for its directory. Configurable via
  `routeToken`.
- **`[x]`** — escapes a character with routing meaning. `script[.]js.tsx` serves
  `/script.js`.

Both `indexToken` and `routeToken` accept strings or regex patterns, so a
project's conventions may legitimately differ from the defaults — check the
plugin options before assuming.

## Layout Routes

A route with children wraps them, provided it renders an `<Outlet />`:

```tsx
// src/routes/app.tsx
import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app')({
  component: AppLayoutComponent,
})

function AppLayoutComponent() {
  return (
    <div>
      <h1>App Layout</h1>
      <Outlet />
    </div>
  )
}
```

Layout routes are the right home for a shared loader requirement, shared search
param validation, shared context, and fallback error or pending components — all
of which then apply to every descendant.

A pathless layout does the same without a URL segment:

```
routes/
├── _pathlessLayout.tsx        →  wraps, matches nothing
├── _pathlessLayout.a.tsx      →  /a
├── _pathlessLayout.b.tsx      →  /b
```

## Encapsulating A Route's Files

To gather a route's files in one directory, move `posts.tsx` to
`posts/route.tsx`. Nothing else changes — no config, no import updates. Combine
with `-` prefixed files to keep components, tables, and helpers beside the route
they serve.

## Virtual Routes

If every option moves out of a route file into its `.lazy.tsx` counterpart, the
original file becomes empty. Delete it. The generator emits a virtual route
directly into the generated tree to anchor the lazy file.

## Route Matching Priority

Static segments beat dynamic, which beat optional and wildcard. Among competing
candidates that define `params.parse`, higher `params.priority` is tried first
(default `0`), and returning `false` from `parse` falls through to the next
candidate:

```tsx
export const Route = createFileRoute('/posts/$postId')({
  params: {
    priority: 10,
    parse: ({ postId }) => {
      if (!/^\d+$/.test(postId)) return false
      return { postId: Number(postId) }
    },
    stringify: ({ postId }) => ({ postId: String(postId) }),
  },
})
```

This lets `/posts/123` hit a numeric route while `/posts/hello-world` falls
through to a `$slug` route. `params.priority` never overrides normal specificity:
static routes still match first.

`params.parse` runs during route planning and may be evaluated more than once —
keep it deterministic and free of side effects.

## When The Conventions Do Not Fit

Virtual file routes let you define the tree's source explicitly while keeping the
generator's performance and type generation. Reach for them before abandoning
file-based routing for code-based routing.
