---
name: tanstack-start
description: >-
  TanStack Start, the full-stack React framework built on TanStack Router with
  Vite or Rsbuild. Use when setting up or reviewing a `@tanstack/react-start`
  project — the build-tool plugin, SSR and selective SSR, server functions
  (`createServerFn`), server routes, middleware, prerendering, SPA mode,
  environment variables, or deployment targets.
---

# TanStack Start

Reference for TanStack Start, a full-stack React framework powered by TanStack
Router. Start adds full-document SSR, streaming, server functions, server
routes, middleware, and full-stack builds on top of Router; Router itself still
owns routing, loaders, search params, and navigation.

Routing belongs to the sibling skill — see
[tanstack-router](../tanstack-router/SKILL.md) for file-based routes, loaders,
search-param validation, and navigation. This skill covers only what Start adds
on top. For server-state caching inside components, see
[tanstack-query](../tanstack-query/SKILL.md).

Start is at Release Candidate stage: the API is considered stable and
feature-complete, but not bug-free.

Branch-specific references, loaded on demand:

- [server-functions.md](./server-functions.md) — `createServerFn`, validators,
  serialization, errors, redirects, streaming, static server functions.
- [middleware.md](./middleware.md) — request vs function middleware, context
  passing, global middleware in `src/start.ts`, CSRF.
- [server-routes.md](./server-routes.md) — HTTP endpoints defined with the
  `server` property on file routes.
- [rendering.md](./rendering.md) — selective SSR, SPA mode, static
  prerendering, and ISR-style cache headers.
- [deployment.md](./deployment.md) — hosting targets, environment variables,
  and build outputs.

## First Checks

1. Confirm `@tanstack/react-start` and `@tanstack/react-router` are installed,
   and which build tool the project uses — Vite
   (`@tanstack/react-start/plugin/vite`) or Rsbuild
   (`@tanstack/react-start/plugin/rsbuild`). The plugin import path and several
   config shapes differ between them.
2. Read the build config (`vite.config.ts` / `rsbuild.config.ts`) before
   changing anything: `prerender`, `spa`, `pages`, `serverFns`, and
   `server.build` all live in the `tanstackStart()` options.
3. Look for `src/start.ts`. If it exists, Start does **not** auto-install the
   CSRF middleware — that file owns global request and function middleware.
4. Find `src/router.tsx` (router creation) and `src/routes/__root.tsx` (the
   document shell with `HeadContent` and `Scripts`); both are required.
5. Check whether a host adapter plugin is already wired in (Cloudflare, Netlify,
   Nitro) — plugin order in the array matters.

## Project Setup

Scaffold with `npx @tanstack/cli@latest create`, or clone an official example
with `npx gitpick TanStack/router/tree/main/examples/react/start-basic`.

Minimal dependency set: `@tanstack/react-start`, `@tanstack/react-router`,
`react`, `react-dom`, plus the build tool (`vite` + `@vitejs/plugin-react`, or
`@rsbuild/core` + `@rsbuild/plugin-react`).

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    tanstackStart(),
    // react's vite plugin must come after start's vite plugin
    viteReact(),
  ],
})
```

Rules that bite:

- The React plugin must come **after** `tanstackStart()` in the Vite plugin
  array.
- `package.json` needs `"type": "module"`.
- In `tsconfig.json`, keep `verbatimModuleSyntax` **disabled** — enabling it can
  leak server bundles into client bundles. Use `"jsx": "react-jsx"`,
  `"moduleResolution": "Bundler"`, `"module": "ESNext"`, `strictNullChecks`.
- `src/routeTree.gen.ts` is generated on first run; do not hand-edit it.

Two files are required beyond the config:

```tsx
// src/router.tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({ routeTree, scrollRestoration: true })
}
```

```tsx
// src/routes/__root.tsx
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { title: 'App' }],
  }),
  component: () => (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
})
```

`HeadContent` and `Scripts` are not optional: without them, head tags and the
client bundle never reach the document.

## Server Functions vs Server Routes

Both run on the server; they answer different questions.

| Need | Use | Why |
|------|-----|-----|
| Call server logic from your own app (loaders, components, handlers) | `createServerFn` | Start handles serialization and typing across the boundary. |
| An HTTP endpoint called from outside the app (webhooks, third parties, OAuth callbacks) | Server route (`server.handlers` on a file route) | Raw `Request`/`Response`, no Start client required. |

Server functions are same-origin RPC endpoints protected by CSRF checks; they
are not a public API surface. Server routes are.

```tsx
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const CreateUser = z.object({ name: z.string().min(1) })

export const createUser = createServerFn({ method: 'POST' })
  .validator(CreateUser)
  .handler(async ({ data }) => {
    return db.users.create(data)
  })
```

Details in [server-functions.md](./server-functions.md) and
[server-routes.md](./server-routes.md).

## Where Code Runs

Route `loader` and `beforeLoad` are **isomorphic**: they run on the server for
the initial request and on the client for subsequent navigations. Reading
`process.env.SECRET` in a loader exposes it to the client bundle. Put
server-only work behind a server function.

```tsx
import {
  createServerOnlyFn,
  createClientOnlyFn,
  createIsomorphicFn,
} from '@tanstack/react-start'

const getSecret = createServerOnlyFn(() => process.env.API_SECRET)
const saveLocal = createClientOnlyFn((v: string) => localStorage.setItem('k', v))
const log = createIsomorphicFn()
  .server((m: string) => console.log(`[SERVER] ${m}`))
  .client((m: string) => console.log(`[CLIENT] ${m}`))
```

Server functions can be statically imported anywhere, including client
components — the build replaces the implementation with an RPC stub. Avoid
`await import()` of server-function modules; dynamic imports break that
transformation.

## Rendering Strategy

Every route matching the initial request is server-rendered by default. Narrow
it per route with `ssr`:

| Value | `beforeLoad` / `loader` on server | Component SSR |
|-------|-----------------------------------|---------------|
| `true` (default) | yes | yes |
| `'data-only'` | yes | no |
| `false` | no | no |

Change the app-wide default with `defaultSsr` in `createStart`. Inheritance is
one-way: a child can only make the inherited value **more** restrictive, so
`ssr: true` under a parent with `ssr: false` has no effect.

For a fully client-rendered app, use SPA mode (`spa: { enabled: true }`), which
prerenders a shell to `/_shell.html`. See [rendering.md](./rendering.md).

## Middleware

`createMiddleware()` produces request middleware, which runs for every server
request including SSR and server functions.
`createMiddleware({ type: 'function' })` produces server-function middleware,
which additionally supports `.client()` and `.validator()`.

```tsx
import { createMiddleware } from '@tanstack/react-start'

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const session = await auth.getSession({ headers: request.headers })
    if (!session) throw new Error('Unauthorized')
    return next({ context: { session } })
  },
)
```

Always call `next()`; the chain stops otherwise. Attach auth middleware to
every server function that reads or writes private data — a route `beforeLoad`
guard is UX, not the data boundary, because server functions are reachable
independently of the UI that calls them. Full model in
[middleware.md](./middleware.md).

## Environment Variables

Start loads `.env`, `.env.development`, `.env.production`, and `.env.local`
automatically.

- Server code reads any variable from `process.env`.
- Client code only sees the build tool's public prefix: `VITE_` for Vite,
  `PUBLIC_` for Rsbuild, via `import.meta.env`.
- Read `process.env` **inside** handlers and middleware, not at module scope.
  On Cloudflare Workers and similar edge runtimes, env is injected per request,
  so module-scope reads evaluate to `undefined`.
- To get a runtime (not build-time) value to the client, return it from a
  server function and pass it through a loader.

More, including typing and `staticNodeEnv`, in [deployment.md](./deployment.md).

## Review Checklist

- Build config is coherent: `tanstackStart()` before the React plugin (Vite),
  `"type": "module"`, `verbatimModuleSyntax` disabled.
- `__root.tsx` renders `HeadContent` and `Scripts`; `routeTree.gen.ts` is
  generated, not hand-edited.
- Every server function has a `.validator()` when it takes input, and the
  validated value is checked for **authorization**, not just shape — a
  well-formed id is not an authorized id.
- Auth middleware is attached to the server functions and server routes that
  touch private data, not only to route `beforeLoad`.
- `src/start.ts`, when present, installs `createCsrfMiddleware()` explicitly.
- No secret is read at module scope, and no secret sits behind a `VITE_` or
  `PUBLIC_` prefix.
- Loaders contain no server-only assumptions; server work goes through
  `createServerFn` or `createServerOnlyFn`.
- `Cache-Control` on anything identity-dependent is `private` or `no-store`,
  never `public` ([rendering.md](./rendering.md)).
- Routes needing browser APIs set `ssr: false` or `'data-only'` and provide a
  `pendingComponent` fallback.
- SPA-mode and static-host redirects allow `/_serverFn/*` and server-route
  paths through to the server ([rendering.md](./rendering.md)).
- Deployment target matches the build output and start script
  ([deployment.md](./deployment.md)).
