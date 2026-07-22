# Delivery Strategy Reference

How importance, viewport placement, and loading context translate into concrete attributes and headers. Use this file when applying the Step 3 strategy matrix to markup and server/CDN config.

Quick decision summary (details in the sections below):

| Situation | Attributes / headers |
| --- | --- |
| The single LCP image | eager (no `loading` attribute), `fetchpriority="high"`, dimensions set |
| LCP image from CSS `background-image` | `<link rel="preload" as="image" fetchpriority="high">` in `<head>` |
| LCP video poster | `<link rel="preload" as="image" fetchpriority="high">` in `<head>` — never `fetchpriority` on `<video>`; pattern in [video.md](./video.md) |
| Above-fold, non-LCP image | eager, default priority, dimensions set |
| Below-fold image or iframe | `loading="lazy"`, `decoding="async"`, dimensions set |
| Offscreen-conditional (modal, carousel, tab) | `loading="lazy"` or fetch on trigger interaction; `fetchpriority="low"` on prefetched carousel slides |
| Late-discovered critical font | preload `as="font" type="font/woff2" crossorigin` |
| Third-party asset origin | `preconnect` (with `crossorigin` for fonts/CORS), ~2-4 origins max |
| Long offscreen section | `content-visibility: auto` + `contain-intrinsic-size` |
| Hashed asset filename | `Cache-Control: max-age=31536000, immutable` |

## LCP candidates and targets

Elements that can be the Largest Contentful Paint:

- `<img>` — including the first frame of animated GIF/AVIF.
- `<image>` inside an inline `<svg>`.
- `<video>` — the poster image load time OR the first-frame presentation time, whichever comes first. Video posters ARE LCP candidates.
- CSS `background-image` loaded via `url()` (gradients do not count).
- Block-level text elements.

Thresholds at the 75th percentile (mobile and desktop): good <= 2.5 s, poor > 4.0 s.

Budget the LCP time across its subparts:

| Subpart | Target share |
| --- | --- |
| TTFB | ~40% |
| Resource load delay | < 10% |
| Resource load duration | ~40% |
| Element render delay | < 10% |

A high TTFB can make 2.5 s unreachable no matter how well the asset is optimized — flag it as a server/CDN follow-up.

**Discoverability rule:** the LCP resource must be visible to the browser's preload scanner in the initial HTML (`src`/`srcset` in markup). An LCP image loaded from CSS `background-image` is late-discovered — add:

```html
<link rel="preload" as="image" href="/hero.avif" fetchpriority="high">
```

## fetchpriority

Default request priorities the attribute overrides:

| Resource | Default priority |
| --- | --- |
| Images | Low, boosted to High after layout finds them in-viewport (Chrome 117+: first 5 large images get Medium) |
| CSS in `<head>` | Highest |
| Fonts | Highest (preloaded fonts: High) |
| Blocking scripts | High |
| `async`/`defer` scripts | Low |

- Put `fetchpriority="high"` on the **single** LCP image only. It starts the fetch before layout would boost it. High on many images cancels the benefit — they compete again.
- Use `fetchpriority="low"` for offscreen carousel slides and non-critical preloads so they stop competing with critical resources.
- fetchpriority complements preload: preload gives early discovery, fetchpriority sets queue priority. Combine both for late-discovered LCP resources.
- Support is version-gated (Chrome/Edge 102+, Safari 17.2+, Firefox 132+); unsupported browsers ignore the attribute, so it is always safe to add.

## Lazy loading

- `loading="lazy"` works on `<img>` and `<iframe>`; the fetch is deferred until the element is within a distance threshold of the viewport (Chromium: ~1250 px on 4G, ~2500 px on 3G — generous by design).
- **Never** lazy-load above-the-fold or LCP images: the browser cannot fetch until layout computes the element's position, which always adds load delay — a direct LCP regression.
- Missing `width`/`height` makes lazy images 0x0; they may all intersect the viewport at once and load immediately, defeating lazy loading. Dimensions are mandatory on every lazy image.
- Rule of thumb: eager above the fold (`fetchpriority="high"` on the LCP image), `loading="lazy"` below.

```html
<!-- LCP hero: eager + high priority -->
<img src="/hero-1024.avif" width="1024" height="576" fetchpriority="high" alt="…">

<!-- Below the fold: lazy + async decode, dimensions mandatory -->
<img src="/team-640.avif" width="640" height="427" loading="lazy" decoding="async" alt="…">
```

Markup detail for `srcset`/`sizes`/`<picture>` on lazy and eager images: [responsive-images.md](./responsive-images.md).

## decoding

`decoding="async"` hints that the image may be decoded off the main thread so decode does not block painting other content. Measurable benefit is small and mostly limited to very large images; the default `auto` is usually fine. Treat it as a minor add-on — far lower priority than the fetchpriority and lazy-loading decisions.

## Preload

```html
<link rel="preload" href="/late-discovered.woff2" as="font" type="font/woff2" crossorigin>
```

- Valid `as` values include `image`, `font`, `style`, `script`, `fetch`, `track`. `video` is **not** a valid `as` value — for video, use `preload="metadata"` or `preload="auto"` on the `<video>` element itself and preload the poster with `as="image"`. Patterns in [video.md](./video.md).
- Responsive image preload: add `imagesrcset` and `imagesizes` to the `as="image"` preload so it matches the `srcset` pick; add `media` for viewport-conditional preloads:

```html
<link rel="preload" as="image" fetchpriority="high"
      imagesrcset="/hero-640.avif 640w, /hero-1024.avif 1024w, /hero-1536.avif 1536w"
      imagesizes="100vw">
```

  Keep the preload's `imagesrcset`/`imagesizes` identical to the `<img>`'s `srcset`/`sizes` (see [responsive-images.md](./responsive-images.md)), or the browser may fetch two different variants.
- Fonts: always `as="font" type="font/woff2" crossorigin`. `crossorigin` is mandatory for font (and `fetch`) preloads even same-origin — omitting it causes a double download.
- Only preload late-discovered resources: fonts referenced from CSS, CSS background images, critical JS-injected assets. Resources already in the initial HTML are found by the preload scanner without help.
- Never preload multiple formats of the same asset (e.g. both AVIF and WebP) — the browser downloads all of them.
- Unused preloads waste bandwidth; Chrome warns in the console when a preload is not used within a few seconds. Treat that warning as a bug.
- ES modules: use `rel="modulepreload"` instead of `as="script"` preload.

## Preconnect and Early Hints

- `<link rel="preconnect" href="https://cdn.example.com" crossorigin>` performs DNS + TCP + TLS ahead of the first request. Limit it to ~2-4 critical origins; each connection has a cost.
- Add `crossorigin` when the origin serves fonts or other CORS-mode fetches — those use a separate connection pool, so a non-CORS preconnect would be wasted.
- Use `dns-prefetch` as the cheap fallback for remaining origins.

```html
<link rel="preconnect" href="https://cdn.example.com">
<link rel="preconnect" href="https://fonts.example.com" crossorigin>
<link rel="dns-prefetch" href="https://analytics.example.com">
```

- HTTP 103 Early Hints lets the server send preload/preconnect hints before the final response, reclaiming server think-time. It is a CDN/server-level feature — mention it in the report as a follow-up option, not something to encode in markup.

## content-visibility

- Apply `content-visibility: auto` to long offscreen sections (footers, comment lists, below-fold article sections). It adds layout/style/paint containment; offscreen subtrees skip rendering and hit-testing and are rendered just-in-time near the viewport. Rendering-cost cuts of 50%+ are common.
- Pair it with `contain-intrinsic-size` (or `contain-intrinsic-size: auto <fallback>`) as a size placeholder, otherwise the skipped section collapses and causes scrollbar jumps and CLS.

```css
.below-fold-section {
  content-visibility: auto;
  contain-intrinsic-size: auto 800px;
}
```

- Content stays in the DOM and accessibility tree, and find-in-page still works — this is not `display: none`.
- Caveat: DOM APIs that force layout on skipped subtrees (`offsetTop`, `getBoundingClientRect`, etc.) render them anyway and defeat the optimization.
- `content-visibility: hidden` behaves like `display: none` but preserves the cached rendering state for fast re-show (tabs, virtualized lists).

## CLS

- Set `width` + `height` attributes (or CSS `aspect-ratio`) on every `<img>` AND `<video>` so the browser reserves space before the asset loads.
- Reserve space for iframes, embeds, and ad slots with `min-height` or `aspect-ratio` — their content arrives late and unsized:

```css
.embed-slot {
  aspect-ratio: 16 / 9;   /* known ratio */
}
.ad-slot {
  min-height: 250px;      /* unknown ratio: reserve the tallest common size */
}
```
- Fonts: `font-display: optional` avoids swap-induced shifts entirely; otherwise pair `swap`/`fallback` with metric overrides (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) on a sane fallback family so the swap is shift-free. Full strategy in [fonts.md](./fonts.md).
- Keep pages bfcache-eligible: no `unload` handlers, no `Cache-Control: no-store` on HTML. Instant back/forward restores eliminate reload-related CLS (and LCP) on a very common navigation.

## Caching and compression

| Asset | Header |
| --- | --- |
| Hashed/fingerprinted filenames (`app.3f9c1b.js`, `hero.a1b2c3.avif`) | `Cache-Control: max-age=31536000, immutable` |
| Unversioned entry points (HTML) | `Cache-Control: no-cache` (revalidate each use; allows 304 via ETag/Last-Modified) |
| Must never be cached | `Cache-Control: no-store` (rare; blocks bfcache on HTML) |

- With immutable caching, deploy updates by changing the URL, never by editing a file in place. `immutable` is ignored by some browsers, which is harmless.
- Apply brotli (preferred) or gzip only to text-based assets: HTML, CSS, JS, JSON, and SVG (SVG is XML text — big wins).
- Never recompress already-compressed media: JPEG, WebP, AVIF, PNG, WOFF2 (internal brotli), MP4, WebM. It wastes CPU for near-zero gain.

## Measurement

Workflow: field data to find the problem, lab tools to diagnose it, Network panel to verify fixes.

1. **Field**: CrUX for real-user 75th-percentile LCP/CLS; the `web-vitals` JS library (`onLCP`, `onCLS`, `onINP`) with the attribution build identifies the LCP element and shift sources in production.
2. **Lab**: Lighthouse flags missing dimensions, lazy-loaded LCP, preload opportunities, short cache TTLs, and unoptimized images, and names the LCP element in diagnostics. The Chrome DevTools Performance panel shows the LCP marker with its subpart breakdown (TTFB / load delay / load duration / render delay) and a layout-shift track for CLS attribution.
3. **Verify**: the DevTools Network panel Priority column confirms that `fetchpriority` and preload changes actually moved a request's queue priority.
