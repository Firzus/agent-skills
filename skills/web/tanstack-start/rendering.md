# Rendering: Selective SSR, SPA Mode, Prerendering, ISR

## Selective SSR

Routes matching the initial request run `beforeLoad` and `loader` on the server
and render there; the HTML is hydrated on the client. Disable parts of that per
route when a route depends on browser-only APIs (`localStorage`, `canvas`).

```tsx
export const Route = createFileRoute('/posts/$postId')({
  ssr: 'data-only', // 'true' | 'data-only' | false
})
```

| `ssr` | `beforeLoad` / `loader` on server | Component rendered on server |
|-------|-----------------------------------|------------------------------|
| `true` (default) | yes | yes |
| `'data-only'` | yes | no |
| `false` | no (runs on client during hydration) | no |

Change the default globally with `createStart(() => ({ defaultSsr: false }))`.

### Functional Form

```tsx
export const Route = createFileRoute('/docs/$docType/$docId')({
  validateSearch: z.object({ details: z.boolean().optional() }),
  ssr: ({ params, search }) => {
    if (params.status === 'success' && params.value.docType === 'sheet') return false
    if (search.status === 'success' && search.value.details) return 'data-only'
  },
})
```

`params` and `search` arrive as a discriminated union after validation:
`{ status: 'success', value }` or `{ status: 'error', error }`. The `ssr`
function runs only on the server during the initial request and is stripped
from the client bundle.

### Inheritance

A child inherits its parent's value and can only make it **more** restrictive
(`true` → `'data-only'` → `false`). A child setting `ssr: true` under a parent
with `ssr: false` has no effect — a common source of "why is this still not
server-rendered".

### Fallbacks

For the first route with `ssr: false` or `'data-only'`, the server renders the
route's `pendingComponent`, falling back to `defaultPendingComponent`, and to
nothing if neither exists. On the client, that fallback shows for at least
`minPendingMs` / `defaultPendingMinMs`.

### Disabling SSR on the Root

The `<html>` shell must always be server-rendered. Move it into
`shellComponent`, which always SSRs and wraps the root `component`,
`errorComponent`, or `notFoundComponent`:

```tsx
export const Route = createRootRoute({
  shellComponent: ({ children }) => (
    <html>
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  ),
  component: RootComponent,
  ssr: false,
})
```

## Static Prerendering

Configured in the `tanstackStart()` plugin options:

```ts
tanstackStart({
  prerender: {
    enabled: true,
    autoSubfolderIndex: true,      // false → /page.html instead of /page/index.html
    autoStaticPathsDiscovery: true,
    concurrency: 14,
    crawlLinks: true,              // follow links found in prerendered HTML
    filter: ({ path }) => !path.startsWith('/do-not-render-me'),
    retryCount: 2,
    retryDelay: 1000,
    maxRedirects: 5,
    failOnError: true,
    onSuccess: ({ page }) => console.log(`Rendered ${page.path}!`),
  },
  pages: [
    { path: '/my-page', prerender: { enabled: true, outputPath: '/my-page/index.html' } },
  ],
})
```

Automatic discovery finds static paths and merges them with `pages`. Excluded
from discovery: routes with path params (`/users/$userId`), layout routes
(`_`-prefixed), and routes without components such as API routes. Dynamic
routes can still be prerendered when `crawlLinks` finds a link to them.

## SPA Mode

```ts
tanstackStart({ spa: { enabled: true } })
```

The build prerenders the **root route only**, rendering the configured pending
fallback where matched routes would go, and writes the result to `/_shell.html`.
Default 404 rewrites point at that shell.

SPA mode does not give up server features — server functions and server routes
still work. It only means the initial document has no rendered app content.

Trade-off: cheaper hosting (a static CDN suffices), simpler hydration story;
slower time to full content and weaker SEO for crawlers that do not execute JS.

Shell prerender defaults differ from the general prerender defaults:
`outputPath: '/_shell.html'`, `crawlLinks: false`, `retryCount: 0`. Override
them under `spa.prerender`. `spa.maskPath` changes the pathname used to
generate the shell; keeping the default `/` is recommended.

`useRouter().isShell()` reports whether the shell is being rendered. After
hydration the router immediately navigates to the real route and it turns
false, so guard against flashes of unstyled content.

Since the shell is prerendered with the SSR build, a `loader` on the **root
route** runs at prerender time and its data is baked into the shell.

### Redirects

Static hosts need rewrite rules, in priority order: serve real static assets,
allow-list dynamic subpaths, then catch-all to the shell. Netlify `_redirects`:

```
/_serverFn/* /_serverFn/:splat 200
/api/* /api/:splat 200
/* /_shell.html 200
```

Forgetting the first two lines sends server-function calls to the shell HTML.

## ISR via Cache Headers

Start has no framework-specific ISR API; it uses standard HTTP cache headers,
so any CDN works. Page routes set them with `headers`:

```tsx
export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => fetchPost(params.slug),
  headers: () => ({
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=604800',
  }),
  staleTime: 5 * 60_000, // client-side freshness, independent of the CDN
})
```

Directives worth keeping straight: `s-maxage` overrides `max-age` for shared
caches; `stale-while-revalidate` serves stale content while regenerating in the
background; `immutable` for hash-named assets.

For user-specific pages use `'private, max-age=60'` — never `public`, which
lets a CDN replay one user's page to another.

Server routes set headers on the `Response`, or through middleware that mutates
`result.response.headers` after `await next()`. On-demand invalidation is a
server route that verifies a secret and calls your CDN's purge API.

Start conservative (`max-age=300`) and lengthen once you know how often content
actually changes.
