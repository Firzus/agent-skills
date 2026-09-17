# Adopt Partial Prefetching

Read when enabling `partialPrefetching`, migrating route-level
`prefetch = 'partial'`, or preserving existing `<Link prefetch={true}>`
behavior. Requires Next.js 16.3+, `cacheComponents: true`, and a passing
Cache Components build. Otherwise start with
[cache-components-adoption.md](cache-components-adoption.md).

Source: [next-partial-prefetching-adoption](https://github.com/vercel/next.js/blob/3cf1f7418ff9e3ce0f54b4c3212964e421933237/skills/next-partial-prefetching-adoption/SKILL.md).
Read the installed-version [adoption guide](https://nextjs.org/docs/app/guides/adopting-partial-prefetching)
for preservation recipes. Partial Prefetching warms a shared App Shell;
explicit `prefetch={true}` can also resolve cached URL-specific content.
Adoption preserves the agreed existing experience before adding new prefetches.

## Audit before enabling

Keep the global flag off through the baseline. If enabled only in unshipped
work, recover the pre-flag behavior in an isolated checkout while preserving
that work. If no legacy baseline is available, report that limitation before
claiming preservation.

Trace `next/link` imports, re-exports, custom wrappers, and consumers across
the whole source tree, including shared packages. A text search is a candidate
list, not proof of coverage. Resolve conditional and forwarded props to their
effective production value.

| Call site | Treatment |
| --- | --- |
| Explicit `true`, bare `prefetch`, or expression resolving to `true` | Include in the legacy UI preservation contract |
| Default, `auto`, or `false` | Outside the legacy full-prefetch suite; retain behavior during adoption |
| `router.prefetch()` | Audit and verify separately; Link insights do not cover it |

Present a compact `Navigation | Immediately available UI | Streamed UI` table.
Ask only about ambiguous user-visible choices or freshness changes. Agree
whether to ship on one branch or destination-sized changes; the sequence stays
the same. If there are no effective `prefetch={true}` links, explicitly record
the empty preservation set and proceed to global activation without fabricating
tests. Keep manual-prefetch verification in scope.

Done when: every legacy full-prefetch navigation has an agreed preservation
target and manual prefetch sites have a separate worklist.

## Capture a passing flag-off baseline

Use [production test setup](navigation-optimization.md#production-test-setup)
and, when configuring preservation-specific contracts, the pinned
[preservation rig template](https://github.com/vercel/next.js/blob/3cf1f7418ff9e3ce0f54b4c3212964e421933237/skills/next-partial-prefetching-adoption/rig-template.md).
Reuse the project's suite and context; the helper is `instant()` from
`@next/playwright`, not `next/experimental/testmode/playwright`.

Write and run the complete locked preservation suite on a production-like
build with the global flag disabled. Assert the agreed UI after clicking real
links, with the testing lock proven active. Record the command and exit status.
Only test setup may change before this baseline: destination behavior, cache
boundaries, and Link props remain untouched.

Done when: every selected navigation's test has actually passed flag-off.
Writing tests or passing a build is not this checkpoint. If a concrete
environment or policy blocker prevents the rig, record it and the deferred
tests; capture the before/target experience manually in production instead.
Call that manual preservation, not test-backed verification. If neither can
run, report the blocked baseline rather than claiming it is established.

## Adopt destinations, then activate globally

With the flag still off, add the temporary `export const prefetch = 'partial'`
to each audited destination using the guide's route configuration. Restore
its agreed UI using the matching preservation recipe. Keep the assertions
unchanged; run affected tests after each destination and the complete suite
before global activation. On the manual path, compare every adopted navigation
with its recorded target instead.

Apply [caching.md](caching.md) to any cache changes. Keep proposed extra
URL-specific prefetches in a separate follow-up list rather than expanding
the baseline contract during adoption.

Once all audited destinations pass:

1. Set top-level `partialPrefetching: true` alongside `cacheComponents: true`.
2. Run the official `remove-partial-prefetch` codemod against the resolved app
   directory, using a compatible codemod release and preserving user work.
   Check the file count and diff. Remove only redundant `prefetch = 'partial'`
   exports and their generated guide comments; retain other values such as
   `force-disabled` and unrelated user content. If the codemod is unavailable,
   make the same scoped edit manually.
3. Rerun the complete unchanged suite, or the recorded production comparisons
   on the manual path, against the final global configuration.

Done when: all selected UI is preserved with the global flag on and the
temporary route exports removed.

## Inspect development insights

Build a route worklist from the app tree or build output. Use
[dev-loop.md](dev-loop.md) to visit each feature after activation and read each
distinct insight's linked documentation. This pass is separate from production
preservation; the baseline does not require starting a dev server.

URL-data insights identify `params` or `searchParams` reads that tie shared UI
to one URL. Move the read toward its dependent leaf using the documented
boundary. The new shell path may also reveal blocking runtime, uncached-data,
or synchronous-IO errors that the earlier Cache Components build did not
exercise; handle them through the adoption workflow.

Keep a useful shell rather than suspending the entire page. A quiet insight
log can be success, but does not prove a production prefetch occurred. If the
browser sweep is blocked, record unchecked routes and the missing evidence.

## Verify preservation and stop at adoption

- Confirm each changed link paints the intended shell and resolves its streamed
  content under `next start` or the equivalent production artifact.
- Verify every audited `router.prefetch()` separately against its flag-off
  behavior, comparing its RSC response or resource timing and preserved data.
  Follow the current manual-prefetch guide if semantics changed; an empty
  Link insight sweep does not cover this check.
- Complete [cache-change checks](caching.md#verify-a-cache-change), including
  authenticated runtime reads, and rerun the build. Reproduce suspected
  regressions flag-off before attributing them to Partial Prefetching.
- Report passing tests or manual comparisons, unresolved diagnostics, and any
  deferred checks. Show a production navigation, not a development prefetch demo.

Done when: the final preservation checks pass, the development sweep is
accounted for, and the user has a route-by-route description of the result.
Missing runtime evidence remains a stated limitation, not a completed check.

Treat additional per-link prefetching as a separate user decision and change:
it can add a server invocation per prefetchable link. Read the
[optimization guide](https://nextjs.org/docs/app/guides/optimizing-prefetching)
only when that follow-up is requested. Existing `prefetch={false}` links can
also be reviewed separately; adoption does not silently remove those opt-outs.
