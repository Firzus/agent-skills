# Optimize instant navigation

Read when a route waits before painting, its shell is empty, or a navigation
needs an `instant()` regression guard. Requires Next.js 16.3+ and a passing
Cache Components build; otherwise first resolve the prerequisites in
[cache-components-adoption.md](cache-components-adoption.md).

Source: [next-cache-components-optimizer](https://github.com/vercel/next.js/blob/3cf1f7418ff9e3ce0f54b4c3212964e421933237/skills/next-cache-components-optimizer/SKILL.md).
Optimize one navigation at a time. The goal is meaningful content visible
while dynamic data is gated, not a faster stopwatch reading or a blank shell.

## Production test setup

This section also supplies the test setup for
[Partial Prefetching preservation](partial-prefetching.md); that workflow
has a passing flag-off baseline, not the optimizer's failing-route baseline.

Inspect existing build/start scripts, Playwright configuration, authentication
fixtures, and any `instant-nav.rig.md`. Reuse them. When the navigation task
needs a missing harness, set up only the minimal production-mode suite using
`@playwright/test` and `@next/playwright` on the same release line as `next`,
subject to the project's dependency policy. No host-specific deployment is
required. If credentials, policy, or unavailable tooling prevent this, report
the blocker rather than claiming deterministic verification.

Read the pinned [rig template](https://github.com/vercel/next.js/blob/3cf1f7418ff9e3ce0f54b4c3212964e421933237/skills/next-cache-components-optimizer/rig-template.md)
when configuring the harness. Record exact build/start/test commands, base URL,
test context, navigation contract, and artifact verification in the existing
rig record or a concise `instant-nav.rig.md`. Store no credentials or session
state in that document.

- Measure a `next build` artifact served by `next start`, or its equivalent
  preview/staging artifact. `next dev` is not a valid instant-test verdict.
- Enable `experimental.exposeTestingApiInProductionBuild` only for the isolated
  test artifact, through an explicit build-time condition. Merge into existing
  configuration. Setting it only when starting the server is too late.
- Verify the condition is false for real production builds and keep the test
  artifact out of production deployment. Missing test API support can make
  `instant()` silently pass without engaging its lock.
- Confirm the test URL serves the new artifact: check port ownership locally
  or the deployed commit remotely. Follow [dev-loop.md](dev-loop.md) to keep
  build output separate from a running development server.

Done when: the exact artifact runs, the testing API is enabled only there,
and the recorded test context reaches the intended destination.

## Establish a trustworthy failure

Read the pinned [test template](https://github.com/vercel/next.js/blob/3cf1f7418ff9e3ce0f54b4c3212964e421933237/skills/next-cache-components-optimizer/test-template.md)
before authoring tests. Select a real, visible static-shell marker that exists
for the test account's permissions, flags, locale, and data, including empty
states. Run the same navigation without the lock and confirm that marker.

| Navigation contract | Drive inside `instant()` |
| --- | --- |
| Initial load | `page.goto()` with `baseURL`; establish authentication through storage state or another page before measuring |
| Client navigation | Click the real source `<Link>`; assert the destination's shell, not the already-visible shared layout |

Wrap that navigation in `instant()` imported from `@next/playwright` and assert
the marker is visible under the lock. Obtain a repeatable failure on the
unfixed route. If it already passes, verify the lock and marker; do not invent
a failure or claim a nonexistent improvement.

Read [failure robustness](https://github.com/vercel/next.js/blob/3cf1f7418ff9e3ce0f54b4c3212964e421933237/skills/next-cache-components-optimizer/reference/red-test-robustness.md)
before trusting that failure, including when a blocked route cannot build.
Rule out redirects, missing data, guessed selectors, and stale artifacts.
Cookie/session reads alone are not reliable lock probes. For deferred content,
also assert its absence under the lock and arrival after release, making a
vacuous pass detectable. Use presence assertions, not custom timing races,
retries, or hover-warming to make the test pass.

Done when: the marker appears unlocked and fails under a verified lock for the
intended reason, on the same artifact and with the same test context.

## Grow the shell without changing behavior

Use [dev-loop.md](dev-loop.md) for diagnosis, then rerun the production test
after each focused change. Read [blocker patterns](https://github.com/vercel/next.js/blob/3cf1f7418ff9e3ce0f54b4c3212964e421933237/skills/next-cache-components-optimizer/reference/patterns.md)
when the build identifies a dynamic read; follow its linked error documentation.
For parallel routes, shared layouts, or responsive loading states, read
[real-app patterns](https://github.com/vercel/next.js/blob/3cf1f7418ff9e3ce0f54b4c3212964e421933237/skills/next-cache-components-optimizer/reference/real-app-patterns.md).

- Lift stable UI outside Suspense and push dynamic awaits into the smallest
  dependent leaf. Reuse the route's loading UI or colocated skeletons; avoid
  duplicating the whole page as a fallback.
- For client navigations, place boundaries below the lowest layout shared by
  source and destination. Test each affected parallel slot independently.
- Keep the useful heading and frame in the shell. An empty fallback is suitable
  for a component that intentionally renders nothing, not as a way to hide
  the page until its data arrives.
- Preserve authorization before protected reads and rendering. Apply an auth
  gate deferral only after verifying independent protection for every affected
  child; otherwise keep it blocking and resolve the security decision first.
- Preserve freshness. When caching intent is unclear, stream the read instead
  of inventing a lifetime; apply [caching.md](caching.md) for cache changes.

Done when: the locked test passes and the shell contains the intended visible
content, not just enough markup to satisfy a marker.

## Verify parity and causality

Run the guarded navigation at desktop and mobile widths. Confirm final data,
redirects, access control, interaction state, and loading-state layout remain
correct. Cover initial load and client navigation separately when both are in
scope; their shells can differ. Complete
[cache-change checks](caching.md#verify-a-cache-change) when applicable.

With user work preserved, temporarily reverse only the optimization and verify
the unchanged test fails; restore the fix and verify it passes. Use an isolated
checkout if a reversible local diff cannot be applied safely. Keep the locked
regression test, remove temporary baseline scaffolding, and record the results.

Done when: the production test, parity checks, and differential agree. Report
each navigation, what now paints immediately, and what streams. Demonstrate
the result; report any blocked check instead of calling the route verified.
