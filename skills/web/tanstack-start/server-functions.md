# Server Functions

`createServerFn` defines server-only logic callable from anywhere in the app —
loaders, components, event handlers, or other server functions. On the client,
calls become `fetch` requests; the build replaces the implementation with an
RPC stub, so the server code never reaches the browser.

Use server functions for your own app. For endpoints called from outside the
app, use [server routes](./server-routes.md).

## Shape

```tsx
import { createServerFn } from '@tanstack/react-start'

// GET is the default
export const getServerTime = createServerFn().handler(async () => {
  return new Date().toISOString()
})

export const saveData = createServerFn({ method: 'POST' }).handler(async () => {
  return { success: true }
})
```

A server function takes a single `data` argument, passed as
`myFn({ data: ... })`.

## Validators

`.validator()` runs before the handler and types `data`. Because the payload
crosses the network, treat it as untrusted input.

```tsx
import { z } from 'zod'

const UserSchema = z.object({ name: z.string().min(1), age: z.number().min(0) })

export const createUser = createServerFn({ method: 'POST' })
  .validator(UserSchema)
  .handler(async ({ data }) => `Created ${data.name}, age ${data.age}`)
```

A plain function works too, which is the idiomatic way to accept `FormData`
(allowed only for `POST`):

```tsx
export const submitForm = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) throw new Error('Expected FormData')
    return {
      name: data.get('name')?.toString() || '',
      email: data.get('email')?.toString() || '',
    }
  })
  .handler(async ({ data }) => ({ success: true }))
```

Validation proves shape, not permission. If the validated value selects rows —
an id, a tenant, a workspace — verify the session principal may access it
before using it as a query key.

## Serialization Checks

By default (`strict: true`), TypeScript checks that validator input and handler
return types are serializable. `FormData` is allowed as input for `POST`;
`Response` objects are allowed as output.

Opt out only with a reason:

```tsx
createServerFn({ strict: false })            // input and output
createServerFn({ strict: { input: false } }) // input only
createServerFn({ strict: { output: false } })// output only
```

`strict: false` relaxes only the type-level check. The runtime serialization
layer still has to handle the value.

## Calling Them

```tsx
// In a route loader
export const Route = createFileRoute('/posts')({
  loader: () => getServerPosts(),
})

// In a component
function PostList() {
  const getPosts = useServerFn(getServerPosts)
  const { data } = useQuery({ queryKey: ['posts'], queryFn: () => getPosts() })
}
```

`useServerFn()` matters in components: it routes thrown redirects and
not-found responses through the router instead of leaving them as raw errors.

## File Organization

```
src/utils/
├── users.functions.ts   # createServerFn wrappers — importable anywhere
├── users.server.ts      # server-only helpers, imported only inside handlers
└── schemas.ts           # client-safe types, schemas, constants
```

Static imports of `.functions.ts` from client components are safe. Dynamic
imports (`await import('./users.functions')`) can break the bundler transform —
avoid them.

## Errors, Redirects, Not Found

Thrown values are serialized to the caller. When called from a route lifecycle
or via `useServerFn()`, redirects and not-found are handled automatically.

```tsx
import { redirect, notFound } from '@tanstack/react-router'

export const requireAuth = createServerFn().handler(async () => {
  const user = await getCurrentUser()
  if (!user) throw redirect({ to: '/login' })
  return user
})

export const getPost = createServerFn()
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const post = await db.findPost(data.id)
    if (!post) throw notFound()
    return post
  })
```

## Request and Response Context

From `@tanstack/react-start/server`:

- `getRequest()` — the full `Request`
- `getRequestHeader(name)` — read one request header
- `setResponseHeader(name, value)` / `setResponseHeaders(headers)`
- `setResponseStatus(code)`

```tsx
import { setResponseHeaders } from '@tanstack/react-start/server'

export const getMyOrders = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await requireSession()
  setResponseHeaders(
    new Headers({
      'Cache-Control': 'private, max-age=60',
      Vary: 'Cookie, Authorization',
    }),
  )
  return db.orders.findMany({ where: { userId: session.userId } })
})
```

`Cache-Control: public` tells every proxy the response may be served to anyone.
If the handler reads a session, cookie, or auth header, `public` replays one
user's data to the next. Use `private`, or `no-store` for sensitive data.

## Streaming

Return a typed `ReadableStream`, or write an async generator handler — chunks
stay typed on the client.

```tsx
type Message = { content: string }

const streamMessages = createServerFn().handler(async function* () {
  for (const msg of generateMessages()) {
    yield msg satisfies Message
  }
})

// Client
for await (const msg of await streamMessages()) {
  setMessages((prev) => prev + msg.content)
}
```

## Static Server Functions (experimental)

With `staticFunctionMiddleware` from `@tanstack/start-static-server-functions`,
a server function is executed during build-time prerendering and its result
cached as a static JSON file. The prerendered HTML embeds the data; later
client calls fetch the JSON instead of hitting the server.

```tsx
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'

const myServerFn = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .handler(async () => 'Hello, world!')
```

`staticFunctionMiddleware` must be the **final** middleware in the array.

## Function IDs

Server functions are addressed by a generated stable ID (a SHA256 hash by
default) embedded in the client and SSR bundles. Collisions are de-duplicated
with a `_1`, `_2` suffix. `serverFns.generateFunctionId` in the plugin options
can override generation; keep inputs deterministic (filename + function name)
so IDs stay stable across builds. This customization is experimental.
