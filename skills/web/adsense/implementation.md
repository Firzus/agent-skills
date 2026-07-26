# Implementation and performance

Ad code is third-party JavaScript that injects variable-height content into the layout, so it attacks CLS, LCP, and INP at once. Ship it deliberately.

Component-tree concerns — where the `<ins>` renders, how many times it is pushed, and what conditions gate it — live in [frameworks.md](./frameworks.md). Read that first when the integration sits inside React, Next.js, or any SPA.

## Ad code

| Technique | Recommendation | Source |
| --- | --- | --- |
| Async script | Use the official asynchronous AdSense code exactly as generated, and load the account script once. Duplicate or altered loaders add work and create unpredictable behavior. | [Ad code](https://support.google.com/adsense/answer/9274019) |
| Render preconditions | Sort every condition with the **fail-open** audit before shipping a slot. | [Render-path audit](./frameworks.md) |
| `data-ad-client` | Identifies the account (`ca-pub-…`). Never substitute another publisher's ID. | [Ad code](https://support.google.com/adsense/answer/9274019) |
| `data-ad-slot` | Identifies a manual unit. Preserve the generated value when moving units through templates. | [Ad code](https://support.google.com/adsense/answer/9274019) |
| `data-ad-format="auto"`, `data-full-width-responsive="true"` | Enables responsive behavior — the container still needs a valid calculable width. | [Responsive behavior](https://support.google.com/adsense/answer/9183460) |
| `data-ad-format="fluid"` | Native in-feed and in-article units only, and it expects the `data-ad-layout-key` generated with the unit. Not a display-slot setting. | [In-feed](https://support.google.com/adsense/answer/9189560) |
| Native `loading="lazy"` | This attribute applies to `img` and `iframe`, not as a drop-in control on the AdSense `<ins>` tag. Use product-supported behavior and leave the internal ad iframe alone. | [MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading) |
| GPT versus AdSense | GPT is Ad Manager's tagging library with slot definitions, SRA, lazy load, and controlled refresh. Standard AdSense code is a different integration under AdSense placement and code policies. | [GPT](https://developers.google.com/publisher-tag/guides/get-started), [AdSense code](https://support.google.com/adsense/answer/9274019) |

**The provenance boundary.** SRA, `refresh()`, competitive exclusions, and roadblocks are GAM/GPT features. They are not AdSense optimization switches, and no amount of official-looking GPT documentation makes them permissible on AdSense tags.

## Core Web Vitals

**CLS — reserve space.** Google's guidance is to reserve the size most likely to serve based on historical fill. Reserving the largest possible size avoids all shift but leaves blank space; collapsing unfilled slots itself shifts layout. Fluid ads inherently have no fully known height before rendering, so accept a bounded compromise rather than chasing zero. ([Minimize layout shift](https://developers.google.com/publisher-tag/guides/minimize-layout-shift), [reserve space sample](https://developers.google.com/publisher-tag/samples/reserve-space))

In practice, put a breakpoint-specific `min-height` or `aspect-ratio` on the slot wrapper, with values matching plausible served sizes:

```css
.ad-slot {
  min-height: 280px; /* matches 300x250 / 336x280 in-content inventory */
  display: block;
}

@media (min-width: 1024px) {
  .ad-slot--sidebar {
    min-height: 600px; /* 300x600 half-page */
  }
}
```

Values must track real inventory. A `min-height` far above what serves trades a layout shift for a permanent empty hole.

**LCP.** Prioritize the page's hero or main content resource. Ad libraries and above-fold auctions compete for network and main-thread capacity, so request only the inventory likely to be seen initially. ([Optimize LCP](https://web.dev/articles/optimize-lcp), [GPT best practices](https://developers.google.com/publisher-tag/guides/ad-best-practices?hl=en))

**INP.** Third-party ad JavaScript, callbacks, layout, and creative work occupy the main thread and delay interaction. Measure long tasks and field INP per template and device instead of blaming one script. ([Optimize INP](https://web.dev/articles/optimize-inp), [third-party JS](https://web.dev/articles/third-party-javascript))

**Lazy loading.** Load above-fold slots first and defer below-fold slots until near the viewport. Excessively narrow fetch margins harm viewability, because the creative arrives after the slot is already on screen. ([GPT best practices](https://developers.google.com/publisher-tag/guides/ad-best-practices?hl=en))

## Environments

**AMP.** Use `<amp-ad>` with a supported AdSense configuration; AMP's component model owns lifecycle and layout. Ordinary ad code pasted as arbitrary JavaScript does not work. ([amp-ad](https://amp.dev/documentation/components/amp-ad/), [AdSense AMP](https://support.google.com/adsense/answer/9183363))

**SPA.** Tie every ad request to a genuine new-content event: a route that mounted a new slot, or a user-requested refresh. Client-side navigation otherwise builds an accidental refresh loop, which collides with the AdSense refresh policy. Leave loading, error, modal-only, and empty states unmonetized.

## Verification checklist

1. Compare field CWV at the 75th percentile per template and device, before and after ad changes. ([Vitals](https://web.dev/articles/vitals))
2. Load every monetized template, at mobile and desktop widths, and confirm an `<ins class="adsbygoogle">` reaches the DOM with a non-zero width.
3. Confirm no console error reads `All 'ins' elements already have ads in them`.
4. Confirm every above-fold slot has reserved dimensions and no content overlap. ([Layout shift](https://developers.google.com/publisher-tag/guides/minimize-layout-shift))
5. Confirm deep slots stay unrequested until reasonably near the viewport. ([GPT best practices](https://developers.google.com/publisher-tag/guides/ad-best-practices?hl=en))
6. Use Chrome DevTools Performance and Network to find long tasks, duplicate script loads, request waterfalls, and layout shifts. ([DevTools](https://developer.chrome.com/docs/devtools/performance/))
7. Check reserved space holds at every breakpoint, and that no slot parent collapses to zero width.
8. Confirm the account script loads exactly once and the generated code is otherwise unmodified.
9. On GPT pages, use Publisher Console for delivery inspection — it does not replace AdSense account diagnostics on plain AdSense pages. ([Publisher Console](https://developers.google.com/publisher-tag/guides/publisher-console))
