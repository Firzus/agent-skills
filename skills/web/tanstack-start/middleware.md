# Middleware

Middleware customizes the behavior of server requests — SSR requests, server
routes, and server functions. It is composable: one middleware can depend on
others, and the chain executes dependency-first.

## Two Types

| Feature | Request middleware | Server function middleware |
|---------|--------------------|----------------------------|
| Created by | `createMiddleware()` | `createMiddleware({ type: 'function' })` |
| Scope | All server requests | Server functions only |
| Methods | `.server()` | `.client()`, `.server()` |
| Input validation | no | yes, via `.validator()` |
| Dependencies | request middleware only | both types |

Request middleware cannot depend on function middleware; function middleware
can depend on request middleware.

With TypeScript, the method order is enforced by the type system
(`.middleware()` → `.validator()` → `.client()` → `.server()`) to maximize
inference.

## Progressing the Chain

Every middleware must call `next()` to continue. Not calling it short-circuits
the chain — which is how you reject a request early.

```tsx
const loggingMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next()
  return result
})

const authMiddleware = createMiddleware()
  .middleware([loggingMiddleware])
  .server(async ({ next, request }) => {
    const session = await auth.getSession({ headers: request.headers })
    if (!session) throw new Error('Unauthorized')
    return next({ context: { session } })
  })
```

## Context

`next({ context })` merges properties into the context passed to nested
middleware and the handler.

Client context is **not** sent to the server by default — you must ask for it
with `sendContext`, which serializes the values across the boundary:

```tsx
const requestLogger = createMiddleware({ type: 'function' })
  .client(async ({ next, context }) =>
    next({ sendContext: { workspaceId: context.workspaceId } }),
  )
  .middleware([authMiddleware]) // session comes from the server, not sendContext
  .server(async ({ next, context }) => {
    const workspaceId = z.string().uuid().parse(context.workspaceId)
    const member = await db.memberships.find({
      userId: context.session.userId,
      workspaceId,
    })
    if (!member) throw new Error('Not a member of this workspace')
    return next({ context: { workspaceId } })
  })
```

`sendContext` is type-safe but not runtime-validated. Anything the client can
send, the client can lie about — validate shape *and* access before using it as
a query key. Always derive the session server-side.

The server can send context back with `sendContext` from `.server()`; the
client middleware reads it on the resolved value of `next()`. The return type
of `next()` in `.client()` is only inferred from middleware known in the
current chain, so it is most accurate at the end of the chain.

## Validators

Function middleware can reshape `data` before it reaches nested middleware and
the handler:

```tsx
import { zodValidator } from '@tanstack/zod-adapter'

const workspaceMiddleware = createMiddleware({ type: 'function' })
  .validator(zodValidator(z.object({ workspaceId: z.string() })))
  .server(({ next, data }) => next())
```

## Attaching Middleware

```tsx
// To a server function
const fn = createServerFn().middleware([loggingMiddleware]).handler(async () => {})

// To every handler of a server route
export const Route = createFileRoute('/foo')({
  server: {
    middleware: [loggingMiddleware],
    handlers: { GET: () => {}, POST: () => {} },
  },
})

// To one method, via createHandlers
export const Route = createFileRoute('/foo')({
  server: {
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: { middleware: [loggingMiddleware], handler: () => {} },
      }),
  },
})
```

Route-level middleware runs before handler-specific middleware.

## Global Middleware

`src/start.ts` is not in the default template; create it when you need global
configuration.

```tsx
// src/start.ts
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => ({
  requestMiddleware: [myGlobalMiddleware],   // every request: SSR, routes, fns
  functionMiddleware: [loggingMiddleware],   // every server function
}))
```

Execution order is dependency-first: global middleware, then server-function
middleware, then the handler.

## CSRF

Server functions are same-origin RPC endpoints. If the app has **no**
`src/start.ts`, Start installs `createCsrfMiddleware()` for server functions
automatically. As soon as you create `src/start.ts`, that automatic install
stops — add it yourself:

```tsx
import { createStart, createCsrfMiddleware } from '@tanstack/react-start'

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}))
```

It verifies same-origin browser metadata via `Sec-Fetch-Site`, `Origin`, or
`Referer`, and rejects requests it cannot prove same-origin — including
requests carrying none of those headers. Options:

- `origin: 'https://app.example.com'` — allow a different public origin.
- `allowRequestsWithoutOriginCheck: true` — only when another layer guarantees
  same-origin and your deployment strips those headers.

Start warns in development if `src/start.ts` exists without CSRF middleware.
Silence it deliberately with `tanstackStart({ serverFns: { disableCsrfMiddlewareWarning: true } })`.

## Client-Side Request Shaping

`.client()` runs in a different context from `.server()`, so the server
response helpers do not apply. Modify the outgoing request through `next()`:

```tsx
const authHeader = createMiddleware({ type: 'function' }).client(async ({ next }) =>
  next({ headers: { Authorization: `Bearer ${getToken()}` } }),
)
```

Headers from multiple middleware merge; later values override earlier ones, and
call-site headers (`myServerFn({ data, headers })`) override all middleware.

A custom `fetch` can be supplied for retries, telemetry, or mocking. Precedence,
highest first: call site → later middleware → earlier middleware →
`createStart({ serverFns: { fetch } })` → global `fetch`. Custom fetch applies
on the client only; during SSR, server functions are called directly.

## Middleware Factories

Parameterize a middleware by wrapping its creation in a function — the common
case being authorization levels composed on top of a static `authMiddleware`:

```tsx
export function authorizationMiddleware(permissions: Record<string, string[]>) {
  return createMiddleware({ type: 'function' })
    .middleware([authMiddleware])
    .server(async ({ next, context }) => {
      if (!(await auth.hasPermission(context.session, permissions))) {
        throw new Error('Forbidden')
      }
      return next()
    })
}

export const getClients = createServerFn()
  .middleware([authorizationMiddleware({ client: ['read'] })])
  .handler(async () => ({ message: 'The user can read clients.' }))
```

## Tree Shaking

Middleware is tree-shaken per environment. On the client, everything used in
`.server()` is removed from the bundle, along with `data` validation code. On
the server, nothing is removed.
