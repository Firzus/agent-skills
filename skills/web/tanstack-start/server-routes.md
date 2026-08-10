# Server Routes

Server routes are HTTP endpoints defined by adding a `server` property to a
`createFileRoute` call. They live in `./src/routes` alongside app routes and are
handled automatically by the Start server.

Use them for raw HTTP: webhooks, OAuth callbacks, form posts, public APIs —
anything called from outside your Start app. For app-internal calls, prefer
[server functions](./server-functions.md), which handle serialization for you.

## Basic Shape

```ts
// src/routes/hello.ts
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/hello')({
  server: {
    handlers: {
      GET: async ({ request }) => new Response('Hello, World!'),
    },
  },
})
```

The `server` property takes:

- `handlers` — an object mapping HTTP methods to handlers, or a function
  receiving `createHandlers` for per-method middleware.
- `middleware` — optional array applied to all handlers on the route.

A single file can serve both a page and an endpoint: keep `component` and add
`server` next to it.

## Handler Context

Each handler receives:

- `request` — the incoming `Request`.
- `params` — dynamic path params, e.g. `{ id: '123' }` for `/users/$id`.
- `context` — data passed down from middleware.

Return a `Response` or `Promise<Response>`.

## File Conventions

Same file-based conventions as TanStack Router:

| File | Route |
|------|-------|
| `routes/users.ts` | `/users` |
| `routes/users/$id.ts` | `/users/$id` |
| `routes/users.$id.posts.ts` | `/users/$id/posts` |
| `routes/api/file/$.ts` | `/api/file/$` (splat) |
| `routes/my-script[.]js.ts` | `/my-script.js` (escaped) |

Each route path may have only one handler file. `routes/users.ts`,
`routes/users.index.ts`, and `routes/users/index.ts` all resolve to `/users` and
will error if combined.

Pathless layout routes group middleware across routes; break-out routes escape
parent middleware.

## Params

```ts
// src/routes/users/$id/posts/$postId.ts
export const Route = createFileRoute('/users/$id/posts/$postId')({
  server: {
    handlers: {
      GET: async ({ params }) =>
        new Response(`User ${params.id}, Post ${params.postId}`),
    },
  },
})
```

Splat params arrive as `params._splat`:

```ts
// src/routes/file/$.ts
export const Route = createFileRoute('/file/$')({
  server: {
    handlers: {
      GET: async ({ params }) => new Response(`File: ${params._splat}`),
    },
  },
})
```

## Bodies, JSON, Status, Headers

```ts
export const Route = createFileRoute('/hello')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json() // also .text(), .formData()
        if (!body.name) {
          return new Response('Missing name', { status: 400 })
        }
        return Response.json({ message: `Hello, ${body.name}!` })
      },
    },
  },
})
```

`Response.json()` sets `Content-Type: application/json` and serializes for you.

## Middleware on Routes

```tsx
export const Route = createFileRoute('/hello')({
  server: {
    middleware: [authMiddleware], // runs first, for every handler
    handlers: ({ createHandlers }) =>
      createHandlers({
        GET: async () => new Response('Hello, World!'),
        POST: {
          middleware: [validationMiddleware], // only POST, after authMiddleware
          handler: async ({ request }) => {
            const body = await request.json()
            return new Response(`Hello, ${body.name}!`)
          },
        },
      }),
  },
})
```

Server routes are public by default. Unlike server functions, they get no
automatic CSRF protection — `createCsrfMiddleware()` can be attached to a route
explicitly when it should be same-origin only. See
[middleware.md](./middleware.md).

## Request Handling

Requests are matched and dispatched by Start's handler automatically, or by
`createStartHandler` if the project defines a custom `src/server.ts` entry
point.
