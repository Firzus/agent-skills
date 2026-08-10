---
name: payload-cms
description: >-
  Payload CMS 3.x, the Next.js-native TypeScript headless CMS. Use when working
  in payload.config.ts, collections, fields, access control, hooks, the Local
  API, versions and drafts, database or storage adapters, plugin authoring, or
  the official MCP plugin.
---

# Payload CMS

Payload 3.x runs inside a Next.js (or TanStack Start) app: the config is source
code, the admin panel is mounted routes, and the database schema is derived from
your collections. Prefer the project's existing conventions, then steer with
three leading words: **config is the schema**, **access is opt-in**, and
**thread the request**.

Branch-specific references, loaded on demand:

- [reference/collections.md](reference/collections.md) — collection config,
  auth, uploads, versions and drafts, globals.
- [reference/fields.md](reference/fields.md) — field types, virtual and join
  fields, the experimental `slug` field, validation, type guards.
- [reference/access-control.md](reference/access-control.md) — collection,
  field, and admin access; the Access Operation trap.
- [reference/hooks.md](reference/hooks.md) — hook families, argument shapes,
  `context`, loop prevention.
- [reference/queries.md](reference/queries.md) — operators, `depth`, `select`,
  Local API, transactions.
- [reference/mcp.md](reference/mcp.md) — the official `@payloadcms/plugin-mcp`
  server, its tools and its three authorization gates.
- [reference/extending.md](reference/extending.md) — plugin authoring, custom
  endpoints, jobs queue, storage adapters, localization.

## First Checks

1. Read `payload.config.ts` (repo root or beside `/app`) — `db`, `collections`,
   `plugins`, `localization` and versions defaults tell you what schema you are
   editing.
2. Read the installed versions of `payload`, `next`, and the `@payloadcms/*`
   packages from `package.json` and the lockfile. Every `@payloadcms/*` package
   is versioned in lockstep with core; a mismatch is a real bug source.
3. Find the database adapter — `@payloadcms/db-mongodb`, `@payloadcms/db-postgres`,
   or `@payloadcms/db-sqlite`. It decides migration workflow and transaction
   behaviour.
4. Check whether `@payloadcms/plugin-mcp` is configured. If it is, and a running
   app plus an API key are available, read [reference/mcp.md](reference/mcp.md)
   before touching document data by hand.

Done when: config path, Payload version, adapter, and MCP presence are each
stated — or their absence is.

## The Version Allow-List

Next.js compatibility is a **narrow allow-list, not a floor**: `15.2.9`–`15.2.x`,
`15.3.9`–`15.3.x`, `15.4.11`–`15.4.x`, and `16.2.6`+. "Latest Next.js" is not
automatically supported. Node 20.9.0+; pnpm, npm, or yarn 2+ — yarn 1 is
unsupported, and npm may need `--legacy-peer-deps`.

Check the project's `next` version against that list before blaming Payload for
an admin-panel or build failure.

## Minimal Config

```ts
import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export default buildConfig({
  collections: [Posts],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET,
  db: sqliteAdapter({ client: { url: process.env.DATABASE_URI } }),
})
```

`editor` is needed only for rich text, `sharp` only for image manipulation on
upload collections, `graphql` only for the GraphQL API. Lexical is the editor:
the Slate-based editor is deprecated and is removed in 4.0, so scaffold Lexical.

`tsconfig.json` must map `"@payload-config": ["./payload.config.ts"]` — that path
is what `import config from '@payload-config'` resolves against.

## Types Are Generated, Not Written

`payload generate:types` writes `payload-types.ts` and registers the types
globally through a `declare` statement. `payload build` regenerates the import
map and the types before delegating to `next build` / `vite build`, unless you
pass `--no-types`.

Treat `payload-types.ts` as build output, and regenerate after any field change
before trusting a type error.

## Choose The Workflow

Pick one branch. Complete its criterion before claiming the task done.

### Shaping the schema

**Config is the schema**: adding a field changes the database. Read
[reference/collections.md](reference/collections.md) and
[reference/fields.md](reference/fields.md) before adding or renaming fields.

With a SQL adapter a schema change needs a migration — check the project's
`migrations/` folder and its scripts rather than assuming auto-push.

Done when: types are regenerated, the migration situation is stated, and every
new field's `required` / `unique` / `localized` choice is deliberate.

### Reading or writing documents

Apply **access is opt-in**: the Local API skips access control entirely by
default. Passing `user` does not enable it — pass `overrideAccess: false` too.

```ts
const posts = await payload.find({
  collection: 'posts',
  where: { _status: { equals: 'published' } },
  overrideAccess: false,
  user: req.user,
})
```

Query `_status`, not `status`, once drafts are enabled. `depth` defaults to `2`
and fans out relationship queries silently — see
[reference/queries.md](reference/queries.md).

Done when: every Local API call made on behalf of an end user passes
`overrideAccess: false` with a `user`, and `depth` / `select` are set wherever
payload size matters.

### Access control

Read [reference/access-control.md](reference/access-control.md). The trap that
breaks admin panels: during the Access Operation, `id`, `data`, `doc`,
`siblingData` and `blockData` are all `undefined`, and a returned `Where` query
is not executed. Guard every dereference.

Done when: each access function survives being called with no `data` and no
`id`, and field-level rules return booleans only.

### Hooks

Read [reference/hooks.md](reference/hooks.md). Two rules carry most failures:
calling `payload.update()` on the document that triggered `afterChange` loops
forever unless a `context` flag gates it, and a field hook must return the same
*type* it received.

Done when: every hook that writes back is loop-guarded, and every hook running a
nested operation forwards `req`.

### Transactions

Apply **thread the request**: transactions run by default where the adapter
supports them, and the failure mode is *not propagating* `req`. Pass `req` to
every nested operation so it joins the same transaction.

The inverse trap: pass `req` only to promises you `await`. A detached promise
holding `req` lets the request return OK for data that was rolled back.

SQLite has transactions off by default (`transactionOptions: {}` enables them);
MongoDB needs a replica set.

Done when: every nested operation inside a hook or endpoint receives `req`, and
every promise holding `req` is awaited.

### Extending Payload

Read [reference/extending.md](reference/extending.md) for plugin authoring,
custom endpoints, the jobs queue, storage adapters, and localization.

Done when: the plugin preserves the config it receives — spreading existing
collections, fields, hooks, and plugins rather than replacing them.
