# Frameworks and the render path

Ad code is usually correct in isolation and wrong in a component tree. This is where AdSense integrations actually break: the tag is fine, but the framework never renders it, renders it twice, or reuses an element Google has already filled.

Google publishes no dedicated lifecycle guidance for standard AdSense units in SPAs. Its official examples establish the only pattern that matters: **one new `<ins class="adsbygoogle">` element, followed by exactly one `adsbygoogle.push({})`**. ([Ad code](https://support.google.com/adsense/answer/9190028?hl=en))

## The render-path audit

Run this before any placement work when ads are missing, inconsistent across templates, or "sometimes" absent.

Trace every condition between "component mounts" and "`<ins>` is in the DOM". List them. Each one is a place revenue can vanish with no error, no reporting anomaly, and no visible symptom beyond a coverage number nobody segmented.

Sort each condition by the question it asks. *"May this page carry an ad?"* is eligibility and belongs in the path. *"Will an ad probably succeed?"* is a guess — and a wrong guess costs every impression it suppresses.

| Condition found in the path | Asks | Verdict |
| --- | --- | --- |
| Publisher ID present | May it | Keep — the tag is meaningless without it |
| Consent state | May it | Keep, and outside the rule below |
| Real content on the screen (not loading, error, or empty) | May it | Keep — withholding here is required |
| Development/preview placeholder branch | May it | Keep |
| Ad-blocker probe or detection result | Will it | **Remove** |
| "Loader ready" / "script loaded" / availability flag | Will it | **Remove** |
| Feature flag defaulting to off on error | Will it | **Remove or invert** |
| `null` initial state that renders nothing until resolved | Will it | **Remove** — a guess wearing a lifecycle's clothes |

### fail-open — the rule, in one place

This section is the skill's single definition of **fail-open**; everywhere else points here.

A **custom technical** condition — one your code invents to guess whether serving an ad will work — should fail toward rendering. When its signal is missing, unresolved, or wrong, the slot still renders: an unfilled slot earns nothing but costs nothing, while a wrongly suppressed slot costs every impression it would have served, silently and indefinitely.

**[Heuristic, not policy.]** Google publishes no rule of this name and none of the pages cited in this skill prescribe it. It is a reliability judgement drawn from field-testing real integrations, and it rests on one asymmetry you can verify yourself: a false negative on a home-grown signal is invisible — no error, no reporting anomaly — while its upside is only avoiding a request Google would have declined anyway.

Two categories sit outside it, and neither is an inconsistency:

| Outside the rule | Why |
| --- | --- |
| **Consent** | The CMP and your legal basis decide what may be served, and sometimes that is nothing at all. Configure non-personalized or limited ads according to Google's signals and legal basis, and never infer consent from silence. ([Ad serving without consent](https://support.google.com/adsense/answer/7670312), [EU user consent policy](https://www.google.com/about/company/user-consent-policy/)) |
| **Page state and policy eligibility** | A loading, error, empty, or otherwise content-free screen must *not* carry ads, so a condition that withholds a slot there is doing required work. ([Publisher Policies](https://support.google.com/publisherpolicies/answer/10502938?hl=en)) |


### Self-gating is the expensive anti-pattern

Two custom gates recur in real codebases, and both invert the correct failure direction.

**Ad-blocker probes.** A local file named to look like ad infrastructure (`ads.js`, `sidead1.js`, `advert.js`) is fetched; failure is read as "ad blocker present" and slots are suppressed. The probe cannot distinguish an ad blocker from a 404 after a `public/` refactor, a CSP rule, a service worker intercepting the request, an offline PWA visit, or plain network latency. All of them produce the same outcome: no ads, for everyone affected, indefinitely.

It is also redundant. Ad-blocker handling belongs to Google Ad Blocking Recovery, which is the supported mechanism and the only one that can actually recover revenue. ([Ad blocking recovery](https://support.google.com/adsense/answer/11576085))

**Loader-ready flags.** The account script's `onLoad` sets a state flag, and slots render only once the flag flips. Any missed callback — a race, a strategy change, an error handler that never fires, a hydration mismatch — permanently pins the flag at "not ready" and suppresses every slot on the site.

Neither gate is needed. Render the `<ins>` and let the auction decide.

## React and Next.js

### Loading the account script

Load `adsbygoogle.js` **once** for the whole application, in the shell or root layout — never inside the ad component, or every mounted slot adds another loader.

With `next/script`, `afterInteractive` is the default and the appropriate strategy for advertising scripts; it loads client-side after some hydration. `beforeInteractive` must live in the root `app/layout.tsx` and cannot use client handlers like `onLoad` from a Server Component, and `lazyOnload` waits for browser idle, which delays ad requests further than most publishers want. ([next/script](https://nextjs.org/docs/app/api-reference/components/script))

Keep `onLoad` for observability only; the slot renders on its own schedule.

### The double-push error

`All 'ins' elements already have ads in them` means `push({})` ran when every existing `<ins class="adsbygoogle">` had already been initialized. In React the recurring causes are:

- an effect with no dependency array, so it runs on every render;
- a dependency that changes and reruns the effect against the same element;
- React `StrictMode` invoking effects twice in development;
- an SPA route change reusing an already-filled `<ins>`;
- more than one component or script initializing the same slot.

([AdSense Help thread](https://support.google.com/adsense/thread/123789630?hl=en); [React 18 discussion](https://stackoverflow.com/questions/74166623/how-to-cleanup-google-adsense-errors-in-react-18-with-new-useeffect-hook-automat))

Guard the push per element, and prefer checking the attribute Google itself sets:

```jsx
const slotRef = useRef(null)
const hasRequested = useRef(false)

useEffect(() => {
  const element = slotRef.current

  if (hasRequested.current || !element || element.getAttribute('data-adsbygoogle-status')) {
    return
  }

  hasRequested.current = true

  try {
    ;(window.adsbygoogle = window.adsbygoogle || []).push({})
  } catch (error) {
    hasRequested.current = false
    console.error('AdSense initialization failed:', error)
  }
}, [])
```

Catching the error only hides the symptom; preventing the duplicate push is the fix.

### Slot identity across navigation

A permanent "already requested" guard is wrong whenever the component survives a navigation. If the framework keeps the component mounted and only swaps props, a new slot ID renders into an `<ins>` Google has already filled, and no new request is made — the previous ad simply stays.

Give each intended ad a genuinely new DOM element. Key it on the route, or on full slot identity when one template renders several units:

```jsx
<AdUnit key={pathname} slot="1234567890" />
```

Push once per newly mounted slot, so a route carrying no ad slot issues no push at all.

### Server and client boundary

The `<ins>` element is inert markup, so only the `push({})` call needs a client component. Server-rendering the element puts it in the initial HTML, where its reserved space applies before hydration rather than after. **[Hypothesis — verify on your own templates]**: this ordering is a reasoned consequence of reserving space early ([minimize layout shift](https://developers.google.com/publisher-tag/guides/minimize-layout-shift)), not a documented Google or Next.js recommendation. Measure CLS both ways before treating it as settled.

## Infinite scroll and virtualized lists

List-inserted ads carry two risks the framework controls.

**Unbounded density.** An "ad every N items" rule has no upper bound when the list is infinite. Express density as a helper with an explicit interval and a lead-in of real content, and verify the ratio holds across a long scroll — not just on the first screen. A list of clickable cards is also the worst place for accidental clicks, since the ad shares the exact card footprint.

**Slot reuse on re-render.** Filtering, sorting, or refetching a list re-renders it. If ad slots are keyed by list index, a filter change can reuse a filled `<ins>` at the same index with a different meaning, or drop and remount slots repeatedly as the user types. Key ad slots by something stable, and keep them out of the re-render path of a live filter where possible.

**Virtualization** unmounts offscreen rows. An ad that unmounts and remounts as the user scrolls back and forth re-requests each time, which distorts impression RPM and viewability rather than breaking policy. **[Hypothesis — verify]**: keeping ad rows outside the virtualized window, or pinning them, avoids the churn; no Google guidance covers virtualized lists, so confirm against your own Active View and impression counts.

## Service workers, PWAs, and CSP

A service worker sits between the page and the network, so a caching strategy that intercepts same-origin requests can break anything an ad integration fetches from your own domain — which is exactly why local ad-blocker probes are so fragile in a PWA.

Leave ad requests to the network: serve them from the network rather than a cache or precache, so an offline visit renders no ad instead of a stale one. **[Hypothesis — verify]**: this follows from ad responses being personalized, auction-priced, and reported per request; Google publishes no service-worker caching policy for ad endpoints, so treat it as a safe default rather than a cited rule.

For CSP, follow Google's own AdSense integration guidance: a **nonce-based strict policy**, not a host allowlist. Google is explicit that ad-serving hosts change, so a domain-only policy breaks without notice — `'strict-dynamic'` lets the trusted loader pull its dependencies instead. Generate a unique nonce per HTTP response and apply it to both the loader and the inline `push({})`. Google's documented policy includes `'unsafe-eval'`; omitting it can interfere with serving. Roll out with `Content-Security-Policy-Report-Only` first. ([AdSense with CSP](https://support.google.com/adsense/answer/16283098?hl=en))

A tightened CSP is a common cause of ads disappearing after an unrelated security change — check it whenever ads stop rendering with no ad-code change.

## Framework checklist

1. The account script loads exactly once, application-wide.
2. No ad-blocker probe, loader flag, or availability state stands between a mount and an `<ins>`.
3. Each `<ins>` receives exactly one `push({})`, guarded per element.
4. Slot identity forces a new DOM element on navigation and on slot change.
5. Every slot reserves space at every breakpoint, including the mobile one.
6. Every page template is marked monetized or deliberately not — including mobile breakpoints.
7. The service worker does not intercept or cache ad requests.
8. CSP allows the Google ad and consent origins.
