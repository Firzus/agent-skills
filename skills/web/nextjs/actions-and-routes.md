# Server Actions, Route Handlers, proxy, metadata

The server-side surface of a route: what runs on a request, and what each entry
point is allowed to do.

## Dynamic APIs are async

Every request-scoped API returns a promise. This is the most common source of
silent breakage when porting older code:

```tsx
const cookieStore = await cookies()
const token = cookieStore.get('token')?.value

const { id } = await params          // page, layout, and route params
const { q } = await searchParams
```

`params` is typed `Promise<{ … }>` in pages, layouts, and route handlers alike.
`generateImageMetadata`'s `id` is a promise too.

## Server Actions

A Server Action is a **public HTTP endpoint**. Next generates an ID for it and
anyone can call it — the fact that your UI only calls it behind a logged-in
screen protects nothing. Authenticate and authorize inside the action itself:

```ts
'use server'

export async function deletePost(id: string) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')
  if (!(await canDelete(session.user, id))) throw new Error('Forbidden')

  await db.post.delete({ where: { id } })
  updateTag(`posts-${session.user.id}`)
}
```

Return a discriminated union rather than throwing for expected failures, so the
caller narrows instead of parsing strings:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }
```

Validate every argument. Arguments arrive from the network regardless of the
TypeScript signature.

To call an action from a Client Component, it must live in a file with
`'use server'` at the top. Actions defined inline in a Server Component are
reachable only from that server tree.

## Route Handlers

`route.ts` exports one function per method: `GET`, `POST`, `PUT`, `PATCH`,
`DELETE`, `HEAD`, `OPTIONS`.

```ts
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest, ctx: RouteContext<'/users/[id]'>) {
  const { id } = await ctx.params
  const page = request.nextUrl.searchParams.get('page')
  return Response.json({ id, page })
}
```

`RouteContext<'/route'>` is generated from the filesystem — see
[typescript.md](typescript.md).

### Choosing between the two

One rule is hard rather than stylistic: **`updateTag` only works inside a
Server Action** and throws anywhere else. A webhook or any non-action caller
must use `revalidateTag` with a cache profile. That decides the choice whenever
read-your-own-writes semantics matter.

Otherwise: Server Actions for mutations driven by your own UI, where you want
progressive enhancement and no hand-written fetch. Route Handlers for anything
with a caller you do not control — webhooks, third-party integrations, public
APIs, non-JSON responses.

## `proxy.ts` (formerly `middleware.ts`)

The `middleware` file convention is **deprecated and renamed to `proxy`**. The
file sits at the project root or in `src/`, level with `app/`, and runs before
a route renders: rewrites, redirects, header and cookie changes, auth checks,
logging.

The rename makes the network boundary explicit, and that boundary is a real
design constraint: proxy code is invoked separately from render code and, in
optimized deployments, runs on the CDN. **Do not rely on shared modules or
module-level globals to communicate with your app.** Pass information onward
through headers, cookies, rewrites, redirects, or the URL.

Keep it thin. Work that needs the database or the session store usually belongs
in a layout or the action itself.

## Metadata

`metadata` and `generateMetadata` are supported **only in Server Components**,
and you **cannot export both from the same route segment**.

```ts
export async function generateMetadata(
  { params }: PageProps<'/blog/[slug]'>,
): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  return { title: post.title, description: post.excerpt }
}
```

Resolving metadata is part of rendering. If the page prerenders and the
function adds no dynamic behaviour, the tags land in the initial HTML;
otherwise they are **streamed after the initial UI**. A crawler that does not
execute streamed content sees the difference, so keep metadata resolution off
the dynamic path when it matters for SEO.
