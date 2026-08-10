---
name: nextjs
description: >-
  Next.js 16+ App Router with React Server Components and TypeScript. Use when
  working in app/, layouts, pages, route handlers, proxy.ts, Server Actions,
  "use client"/"use server"/"use cache" boundaries, caching and revalidation,
  typed routes, or view transitions.
---

# Next.js

Reference for Next.js 16+ App Router projects. Prefer the project's existing
conventions, then steer with four leading words: **boundary**, **dynamic by
default**, **pass-through**, and **generated types**.

Verified against Next.js 16.3 docs. Where this skill and the installed version
disagree, the installed version wins — read `node_modules/next/dist/docs/`,
which ships version-accurate docs, or query the MCP server below.

Branch-specific references, loaded on demand:

- [boundary.md](boundary.md) — server/client split, providers, `server-only`,
  where state and files go.
- [caching.md](caching.md) — `use cache`, `cacheLife`, `updateTag` vs
  `revalidateTag`, and the traps that pass `next build`.
- [actions-and-routes.md](actions-and-routes.md) — Server Actions, Route
  Handlers, `proxy.ts`, metadata.
- [typescript.md](typescript.md) — `PageProps`/`LayoutProps`/`RouteContext`,
  `typedRoutes`, `satisfies`, discriminated unions.
- [view-transitions.md](view-transitions.md) — `<ViewTransition>`, canary-only.
- [migration.md](migration.md) — what changed from 15, renames, removals.

## First Checks

1. Read `next.config.ts` for `cacheComponents`, `typedRoutes`, and
   `experimental.*` flags. `cacheComponents` decides the whole caching branch.
2. Get the exact version from the lockfile. Major-version drift makes most of
   this skill's specifics wrong.
3. Locate the routing root (`app/` or `src/app/`), `proxy.ts`, and whether the
   project still has a `middleware.ts` to migrate.
4. Find existing data-fetching, auth, and error-handling conventions before
   introducing new ones.

Done when: the installed Next version is stated, `cacheComponents` is known to
be on or off, and the routing root is located.

## Reach For The MCP Server

Next.js 16+ runs a built-in MCP endpoint at `/_next/mcp` inside the dev server;
the `next-devtools-mcp` package connects an agent to it. It reports real build,
runtime and type errors (`get_errors`), dev logs (`get_logs`), the route table
(`get_routes`), a page's rendering info (`get_page_metadata`), and maps a
Server Action ID back to its source (`get_server_action_by_id`).
`get_compilation_issues` and `compile_route` need Turbopack.

Prefer it over guessing whenever a dev server is running: it answers from the
running app rather than from this file. It is development-time only, and its
tool list grows between releases.

Setup is `.mcp.json` at the project root:

```json
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```

If tools are missing: check Next 16+, confirm the dev server is running, and
restart it if it was started before the config landed.

## Choose The Workflow

Pick one branch. Complete its criterion before claiming the task done.

### Adding or changing a component

Apply **boundary**: layouts and pages are Server Components by default;
`"use client"` marks an entry point, and every module it imports joins the
client bundle. Push the directive down to the interactive leaf.

Apply **pass-through** to escape it: Server Components handed to a Client
Component as `children` or props are not in its module graph — they render on
the server and arrive as rendered output. This is what lets state live in a
small client shell wrapped around server content.

Read [boundary.md](boundary.md) before adding a directive, a provider, or a
piece of shared state.

Done when: each new `"use client"` sits at the smallest component that needs
it, server-only modules reachable from the change import `server-only`, and
props crossing the boundary are serializable — no functions, no class
instances.

### Fetching or caching data

Apply **dynamic by default**: under `cacheComponents`, nothing is cached until
`use cache` says so, and a cached scope may not read `cookies()`, `headers()`
or `searchParams` anywhere in its call stack.

Read [caching.md](caching.md) before adding `use cache`, `cacheLife`,
`cacheTag`, or any revalidation call.

Done when: every cached scope's request-scoped inputs are read outside it and
passed in as arguments, each `use cache` has a deliberate `cacheLife` profile
or a stated reason to accept the default, and the invalidation verb matches the
need — `updateTag` for read-your-writes, `revalidateTag` with a profile
otherwise.

### Writing a Server Action or Route Handler

Read [actions-and-routes.md](actions-and-routes.md).

Done when: the action authenticates and authorizes internally, its result is a
discriminated union rather than a thrown string, and dynamic APIs (`params`,
`cookies()`, `headers()`) are awaited.

### Typing routes and boundaries

Apply **generated types**: `PageProps<'/route'>`, `LayoutProps<'/route'>` and
`RouteContext<'/route'>` are global, generated from the filesystem, and beat
hand-written param types. Regenerate with `next typegen`.

Read [typescript.md](typescript.md).

Done when: route components use the generated helpers rather than hand-written
`params` types, and type checking passes — never silenced with
`typescript.ignoreBuildErrors`.

### Animating between states or routes

Read [view-transitions.md](view-transitions.md) first — the API is React
canary, usable in the App Router only because Next bundles that channel.

Done when: the transition communicates a stated spatial relationship, it is
triggered by `startTransition`, `useDeferredValue` or `Suspense` rather than a
bare `setState`, and reduced motion is handled explicitly.

### Upgrading from Next.js 15

Read [migration.md](migration.md).

Done when: `middleware.ts` is renamed to `proxy.ts`, every dynamic API is
awaited, removed config is gone (`experimental.ppr`, `experimental.dynamicIO`,
`serverRuntimeConfig`, AMP, `next lint`), and the image defaults that flipped
are reviewed against the project's usage.

## Project Structure

Next.js is deliberately unopinionated here and names three valid strategies.
This skill standardizes on the third — **split by feature or route**:

- A feature owns its components, hooks and tests, colocated in its route
  segment. Colocation is safe: a segment is not routable until it holds a
  `page.tsx` or `route.ts`, and only what those return reaches the client.
- Shared code moves up to `src/lib/` or `src/components/ui/` only once a second
  feature needs it. `components` and `lib` carry no framework meaning.
- `_folder` (private) opts a folder out of routing — the practical reason is
  avoiding collisions with future Next.js file conventions.
- `(folder)` (route group) organizes by section, intent or team without
  touching the URL, and scopes a `layout.tsx` or `loading.tsx` to that group.

State follows the same logic: lift it to the closest common parent and no
higher, where that parent is the smallest possible Client Component. See
[boundary.md](boundary.md) for why height is expensive here specifically.

## Review Checklist

- Every `"use client"` is at a leaf that needs it, not on a layout.
- Server Components reach client shells through `children`, not imports.
- Server-only modules import `server-only`; secrets never sit in a module a
  client file can reach.
- Cached scopes take request data as arguments; none reads `cookies()`,
  `headers()` or `searchParams` transitively.
- Server Actions authenticate; none trusts its caller.
- Dynamic APIs are awaited (`params`, `searchParams`, `cookies()`, `headers()`).
- Route components use `PageProps` / `LayoutProps` / `RouteContext`.
- Independent async work runs under `Promise.all`, and each `await` sits in the
  branch that uses it rather than at the top of the component.
- Suspense boundaries exist where streaming is worth it.
- The build passes with type checking on.
