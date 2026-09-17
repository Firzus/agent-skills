# Adopt Cache Components

Read when enabling `cacheComponents`, resolving blocking prerender errors, or
deciding which `instant = false` exemptions can be removed. For an already
adopted route whose shell needs improvement, use
[navigation-optimization.md](navigation-optimization.md) instead.

Source: [next-cache-components-adoption](https://github.com/vercel/next.js/blob/3cf1f7418ff9e3ce0f54b4c3212964e421933237/skills/next-cache-components-adoption/SKILL.md).
Use the installed-version migration guide for per-API translations; the
[pinned guide](https://github.com/vercel/next.js/blob/3cf1f7418ff9e3ce0f54b4c3212964e421933237/docs/01-app/02-guides/migrating-to-cache-components.mdx)
records the source version behind this workflow.

## Establish the migration boundary

1. Resolve the project root, active app directory, and installed Next.js
   version. This procedure requires 16.3+. If older, report the required
   upgrade and settle its scope before enabling newer APIs.
2. A Pages-only project needs a separate App Router migration. In a hybrid
   app, only `app/` routes participate. Resolve shadowed app directories with
   the user rather than migrating an unbuilt tree.
3. Confirm the app starts with its required environment. Record any existing
   failures and the routes whose current contract is static rendering.
4. Apply [caching.md](caching.md) to incompatible configuration and existing
   caches. Remove the fatal `experimental.dynamicIO` key and the redundant
   `experimental.useCache` alias when enabling `cacheComponents`.

Done when: the active tree and version are known, the environment runs, and
incompatible exports and previously static routes are inventoried. A pre-flag
build may already fail if the app uses `use cache`; report that condition
instead of requiring an impossible passing baseline.

## Choose a checkpoint

Ask whether the user wants an initial change that enables the flag and defers
route adoption, followed by feature-sized changes, or adoption on one branch.
Honor an explicit choice; when unattended, default to the staged checkpoint
and record it. Both paths use the same route loop.

### Staged checkpoint

Enable `cacheComponents: true` and translate incompatible segment exports.
With user work preserved, run the official `cache-components-instant-false`
codemod against the resolved app directory using a compatible codemod release.
Check its reported files: a successful exit with zero processed files is not
proof of adoption. Inspect the diff; never force the codemod over unrelated work.

The codemod exempts `page`, `layout`, and `default` modules that do not already
declare `instant`, excluding modules marked `use client` or `use server`.
If unavailable, apply that same eligibility rule manually and record deferred
segments in the worklist. Client modules cannot export `instant`.

Fully migrate previously static routes now, removing ancestor exemptions that
would mask their validation. Confirm they still prerender; a cached data call
alone does not establish static rendering. Leave deferred routes explicitly
covered, including the root layout when appropriate. Framework routes such as
`/_not-found` are repaired through the root layout, not a synthetic user file.

Run the normal build and resolve remaining blockers. Exemptions do not suppress
every error: synchronous time or randomness reads can still block a build.
Use the reported file and linked error page; change only implicated code.
When needed, use `--debug-prerender` and `--debug-build-paths` to locate the
failing route, then rerun the normal build.

Done when: the build passes, static routes retain their contract, and every
deferred segment is identified. Report this checkpoint and pause unless the
user already requested completion of the full migration.

### Single-branch adoption

Enable the flag after translating incompatible configuration, then use the
reported blocking routes as the worklist. Temporary exemptions are not the
completion criterion.

## Adopt one feature end to end

Walk a bounded feature top-down: root and shared layouts before pages. The
highest explicit `instant` setting wins; removing a leaf exemption while an
ancestor still exempts it does not test that leaf. A layout is not proven
clean while descendant exemptions still mask its blocking reads.

For each route:

1. Remove the relevant exemption or reproduce the blocking error.
2. Use [dev-loop.md](dev-loop.md) to navigate the real route. Open the full
   documentation page linked by each distinct error before applying its fix.
3. Keep stable content outside narrow Suspense boundaries; defer only the
   request-dependent work. Apply cache choices through [caching.md](caching.md).
4. Verify the initial shell, resolving fallbacks, and final content. Recheck
   siblings whenever a shared layout or component changes.

If the fix could change access control, freshness, or a deliberately blocking
experience, read the pinned [per-page decisions](https://github.com/vercel/next.js/blob/3cf1f7418ff9e3ce0f54b4c3212964e421933237/skills/next-cache-components-adoption/references/per-page-decisions.md)
and resolve the product decision before editing. Preserve authorization at
protected data reads and actions; rendering children ahead of a security gate
is not a mechanical Suspense fix. Record intentional exemptions and their
reasons in the handoff rather than leaving unexplained deferrals.

## Verify and hand off

- Run the full build after the feature is adopted. Review every remaining
  exemption and temporary unblock, including `connection()` or `io()` calls.
- Visit every affected route and verify a useful shell, then real content.
  A `◐` route glyph proves only that some shell exists; an empty page also
  qualifies. `instant = false` itself does not determine the route glyph.
- Complete the [cache-change checks](caching.md#verify-a-cache-change) for any
  new or expanded cache. Reproduce suspected regressions on the pre-change
  behavior before attributing them to adoption.
- Report routes, what appears immediately, what streams, retained exemptions,
  and observed results. Demonstrate the result live or with screenshots.

When the development loop is blocked, use the available browser checks and
name what is missing. With no browser, scope builds to make progress, but label
partial routes shell-only verified and leave their browser checks outstanding.
If neither server nor build can run, report the environment blocker. A staged
checkpoint is shippable; incomplete runtime checks are not full adoption proof.
