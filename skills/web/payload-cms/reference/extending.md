# Extending Payload

Reference for the surfaces beyond the schema: plugins, custom endpoints, the
jobs queue, adapters, and localization.

## Plugins

A plugin is a function that receives the config and returns a config. The
options layer is your own factory around it:

```ts
import type { Config, Plugin } from 'payload'

export const myPlugin =
  (options: MyOptions): Plugin =>
  (config) => ({
    ...config,
    collections: (config.collections ?? []).map((collection) =>
      collection.slug === options.targetSlug
        ? { ...collection, fields: [...collection.fields, auditField] }
        : collection,
    ),
  })
```

The type is `(config: Config) => Config | Promise<Config>` — plugins may be
async, which is what lets one fetch remote schema at boot.

**Spread, never replace.** A plugin runs alongside the project's own config and
other plugins: map over `collections` rather than assigning a new array, and
append to `fields`, `hooks.beforeChange` and `plugins` rather than overwriting
them. Assignment is how a plugin silently deletes another one's work.

`order` (lower runs first) and `options` exist on the `Plugin` type but are
marked experimental in the source — treat position in the `plugins` array as the
dependable ordering mechanism.

## Custom endpoints

Endpoints attach to a collection, a global, or the root config, and receive the
same `req` as everything else — including the transaction and the user:

```ts
endpoints: [
  {
    path: '/publish/:id',
    method: 'post',
    handler: async (req) => {
      const doc = await req.payload.update({
        collection: 'posts',
        id: req.routeParams.id as string,
        data: { _status: 'published' },
        req,
        overrideAccess: false,
        user: req.user,
      })
      return Response.json(doc)
    },
  },
]
```

Custom endpoints do not inherit collection access control — the handler enforces
it, which is why `overrideAccess: false` and `user` belong in every operation it
performs on the caller's behalf.

## Jobs queue

Anything slow, retryable, or scheduled belongs here rather than in a hook.
Config lives under `jobs` in `buildConfig`, built from `tasks` (a unit of work
with typed input/output), `workflows` (ordered tasks with resumable state),
`queues` and `schedules`.

```ts
await req.payload.jobs.queue({ task: 'syncToCrm', input: { docId: doc.id }, req })
```

Jobs need a runner: either the endpoint invoked by a cron service, or Payload's
autorun. A queued job on a project with no runner never executes — check which
one the project uses before moving work into the queue.

## Adapters

**Database** — `@payloadcms/db-mongodb`, `@payloadcms/db-postgres`,
`@payloadcms/db-sqlite`. The SQL adapters need migrations for schema changes;
SQLite has transactions off by default and no `point` field support; MongoDB
needs a replica set for transactions.

**Storage** — `@payloadcms/storage-s3`, `-vercel-blob`, `-azure`, `-gcs`,
`-uploadthing`. They plug into upload collections and move the bytes off local
disk, which is what makes a containerised or serverless deployment survive a
restart.

**Email** — configured through `email` in `buildConfig` with the corresponding
`@payloadcms/email-*` adapter.

## Localization

```ts
localization: {
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  fallback: true,
}
```

Then `localized: true` per field. Two consequences:

- Payload **strips `localized: true` from sub-fields when a parent field is
  localized** — localize the array, not each field inside it.
- Reads take `locale` and `fallbackLocale`; `locale: 'all'` returns every
  translation as an object keyed by locale.
