# Deployment and Environment

Start is designed to work with any hosting provider. Cloudflare, Netlify, and
Railway are the official hosting partners.

## Targets

### Cloudflare Workers

Uses Vite through `@cloudflare/vite-plugin`.

```ts
// vite.config.ts
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    viteReact(),
  ],
})
```

```json
// wrangler.jsonc
{
  "name": "tanstack-start-app",
  "compatibility_date": "2025-09-02",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry"
}
```

Deploy with `wrangler deploy`; drop the Node `start` script, since Workers do
not run `node .output/server/index.mjs`.

### Netlify

Install `@netlify/vite-plugin-tanstack-start` and add `netlify()` anywhere in
the plugin array. It configures the build and emulates the Netlify production
platform in local dev. Deploy with `npx netlify deploy`. Manual alternative —
`netlify.toml` with `command = "vite build"` and `publish = "dist/client"`.

### Nitro (and Vercel, Railway, Bun)

Nitro is the agnostic layer covering a wide range of hosts. Install `nitro` and
add `nitro()` to the Vite plugins. The `nitro/vite` plugin is under active
development.

- **Vercel** and **Railway**: follow the Nitro path; both auto-detect the build.
- **Bun**: requires React 19+; optionally set `nitro({ preset: 'bun' })`.
- **Node.js**: `"build": "vite build"`, `"start": "node .output/server/index.mjs"`.

On Node with Nitro (which uses srvx), swapping the global `Response` for srvx's
`FastResponse` in `src/server.ts` buys roughly 5% throughput:

```ts
import { FastResponse } from 'srvx'
globalThis.Response = FastResponse
```

### Rsbuild on Node

An Rsbuild production build emits client assets to `dist/client` and a server
bundle to `dist/server/index.js` exporting a fetch-style entry:

```ts
type ServerEntry = { fetch(request: Request): Response | Promise<Response> }
```

Serve `dist/client` statically and forward everything else to that `fetch`
handler — via `srvx --prod -s ../client dist/server/index.js`, Express, or any
custom server.

## Environment Variables

Loaded automatically, in order: `.env.local`, `.env.production`,
`.env.development`, `.env`.

| Context | Access | Visibility |
|---------|--------|------------|
| Server functions, middleware, server routes | `process.env.ANY_VAR` | never sent to the client |
| Client code (Vite) | `import.meta.env.VITE_*` | inlined into the bundle |
| Client code (Rsbuild) | `import.meta.env.PUBLIC_*` | inlined into the bundle |

Rules:

- Secrets carry **no** public prefix. A `VITE_`-prefixed API key ships to every
  visitor.
- Read `process.env` inside `.handler()`, middleware `.server()`, or a route
  handler — not at module scope. On Cloudflare Workers and other edge runtimes
  env is injected per request, so module-scope reads are `undefined` even on the
  server. (On Workers, the `cloudflare:workers` env binding is the canonical way
  to read env from anywhere.)
- Zod validation of server env belongs in a function called per request, not a
  module-level `envSchema.parse(process.env)`. Client env validation against
  `import.meta.env` is build-time and safe at module scope.

### Runtime Values on the Client

Public prefixes are replaced at bundle time, so they cannot carry per-deployment
runtime values. Pass those down instead:

```tsx
const getRuntimeVar = createServerFn({ method: 'GET' }).handler(
  () => process.env.MY_RUNTIME_VAR,
)

export const Route = createFileRoute('/')({
  loader: async () => ({ foo: await getRuntimeVar() }),
})
```

### Typing

Declare `ImportMetaEnv` for client variables and `NodeJS.ProcessEnv` for server
variables in `src/env.d.ts`, alongside
`/// <reference types="vite/client" />` (or `@rsbuild/core/types`).

### Undefined Variable Checklist

1. Missing public prefix for client access.
2. Dev server not restarted after adding the variable.
3. `.env` not in the project root.
4. Variable not present in the **build** environment — it must be set at build
   time to be inlined (`VITE_API_KEY=abc npm run build`).

## `staticNodeEnv`

By default Start statically replaces `process.env.NODE_ENV` in **server**
builds, enabling dead-code elimination of development-only paths. The value is
resolved from build-time `process.env.NODE_ENV`, then the build tool `mode`,
then `"production"`.

```ts
tanstackStart({ server: { build: { staticNodeEnv: false } } })
```

Disable it when shipping one artifact to several environments, or when code
must detect the runtime environment. If you disable it, you **must** set
`NODE_ENV=production` at runtime — otherwise React runs in development mode,
significantly slower.

## Pre-Deploy Checklist

- Sensitive variables carry no `VITE_` / `PUBLIC_` prefix.
- `.env.local` is gitignored; production values are set on the platform.
- Required variables are validated, and validated per request on edge runtimes.
- Build output path matches the host's expectation (`.output` for Nitro,
  `dist/client` + `dist/server` for Rsbuild, `dist/client` for Netlify).
- The host adapter plugin is present and ordered correctly in the plugin array.
- SPA-mode deployments allow `/_serverFn/*` and server-route paths through
  ([rendering.md](./rendering.md)).
