# Performance and LCP

Adapted from the upstream `debug-optimize-lcp` skill for the CLI; see
[NOTICE](../NOTICE). Use it for LCP, Core Web Vitals (LCP, INP, CLS), slow page
loads, and trace analysis. `lighthouse_audit` excludes performance: use a trace.

For a private, internal, or localhost URL, start the daemon with
`--performanceCrux=false` before tracing; otherwise trace URLs are sent to the CrUX
API to fetch field data.

## LCP thresholds and subparts

LCP is the time from navigation start until the largest image or text block in the
viewport renders. Good: 2.5 s or less; needs improvement: 2.5 to 4.0 s; poor: above
4.0 s.

| Subpart | Ideal share | Measures |
| --- | --- | --- |
| Time to First Byte (TTFB) | about 40% | Navigation start to the first byte of HTML |
| Resource load delay | under 10% | TTFB to the start of the LCP resource download |
| Resource load duration | about 40% | Download of the LCP resource |
| Element render delay | under 10% | Resource loaded to LCP element rendered |

The subparts add up to the LCP with no gap. A text LCP element without a resource
has only TTFB and render delay. Optimize the largest subpart first: shrinking an
image does not help when render delay is the bottleneck, because the saved time
moves into render delay.

## Workflow

1. Navigate first, then record a reload trace:

   ```sh
   chrome-devtools navigate_page <pageId> --url <url>
   chrome-devtools performance_start_trace <pageId> --reload true --autoStop true --filePath <abs>/trace.json.gz
   ```

   Add `--ignoreCache true` for a cold load. The summary lists metrics and, under
   "Available insight sets", ids such as `NAVIGATION_0` with their insight names.
   For an interaction (INP), run `performance_start_trace <pageId> --reload false --autoStop false`,
   perform the interaction, then `performance_stop_trace <pageId> --filePath <abs>`.
2. Drill into insights, using only ids and names listed in the summary:

   ```sh
   chrome-devtools performance_analyze_insight <pageId> NAVIGATION_0 LCPBreakdown
   ```

   Relevant insights when listed: `LCPBreakdown` (subpart timings),
   `DocumentLatency` (TTFB), `RenderBlocking`, and `LCPDiscovery` (whether the
   resource was discoverable early).
3. Identify the LCP element with the snippet below. An empty `url` means a text
   element.
4. Check the waterfall: `list_network_requests <pageId> --resourceTypes image font`,
   then `get_network_request <pageId> --reqid <n>` for the LCP resource. A late start
   relative to the document indicates load delay; a long duration indicates size or
   server speed.
5. Audit the DOM for common causes with the second snippet.
6. Verify a fix by re-running the same trace command and comparing the subparts.

Save each snippet to a file and run it with
`chrome-devtools evaluate_script --pageId <pageId> --sourcePath <abs-file>`.

Identify the LCP element:

```js
async () => {
  return await new Promise(resolve => {
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      resolve({
        element: last.element?.tagName,
        id: last.element?.id,
        className: last.element?.className,
        url: last.url,
        startTime: last.startTime,
        renderTime: last.renderTime,
        loadTime: last.loadTime,
        size: last.size,
      });
    }).observe({type: 'largest-contentful-paint', buffered: true});
  });
}
```

Audit common issues:

```js
() => {
  const issues = [];
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    if (img.getBoundingClientRect().top < window.innerHeight) {
      issues.push({issue: 'lazy-loaded image in viewport', element: img.outerHTML.substring(0, 200)});
    }
  });
  document.querySelectorAll('img:not([fetchpriority])').forEach(img => {
    const rect = img.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.width * rect.height > 50000) {
      issues.push({issue: 'large viewport image without fetchpriority', element: img.outerHTML.substring(0, 200)});
    }
  });
  document.querySelectorAll('head script:not([async]):not([defer]):not([type="module"])').forEach(script => {
    if (script.src) {
      issues.push({issue: 'render-blocking script in head', element: script.outerHTML.substring(0, 200)});
    }
  });
  return {issueCount: issues.length, issues};
}
```

## LCP element candidates

Candidates are `<img>`, `<image>` inside `<svg>`, `<video>` (poster or first frame),
elements with a CSS `url()` background image, and block-level elements containing
text. Chromium excludes elements with opacity 0, elements covering the full
viewport, and low-entropy placeholder images. Size is the visible area within the
viewport, excluding margins, padding, and borders; for images, the smaller of the
visible and intrinsic sizes.

## Fixes by bottleneck

| Bottleneck | Usual causes | Fixes |
| --- | --- | --- |
| Resource load delay | Image injected by JS or CSS, `data-src`, `loading="lazy"`, cross-origin host | Plain `<img src>` in the initial HTML; never lazy-load the LCP image; `fetchpriority="high"`; `<link rel="preload" fetchpriority="high">` when not discoverable; `preconnect` to its origin |
| Element render delay | Render-blocking CSS, synchronous scripts in `<head>`, long tasks, client-side rendering | Inline critical CSS and defer the rest; `async`/`defer` scripts; break up long tasks; server-side rendering |
| Resource load duration | Oversized file, distant or slow server, bandwidth contention | AVIF/WebP, `srcset`, compression; CDN; `Cache-Control`; `fetchpriority="high"`; `font-display: swap` for text blocked by a web font |
| TTFB | Redirects, slow server, uncached HTML | Remove redirects; cache HTML at the edge; make the page eligible for the back/forward cache |

## Throttled measurement

Lab results on a fast machine hide problems. Emulate a slower device in one call,
trace, then reset:

```sh
chrome-devtools emulate <pageId> --networkConditions "Fast 3G" --cpuThrottlingRate 4
chrome-devtools performance_start_trace <pageId> --reload true --autoStop true
chrome-devtools emulate <pageId>
```

The trace summary reports the applied CPU and network throttling; cite it with the
results.
