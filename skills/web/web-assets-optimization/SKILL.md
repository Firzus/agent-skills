---
name: web-assets-optimization
description: >-
  Audits and optimizes all web-app assets for performance: images (Sharp
  AVIF/WebP variants, responsive `img`/`picture`/`srcset`/`sizes`), video
  (ffmpeg H.264/VP9/AV1 encoding, posters, lazy loading), animated GIF
  replacement with video or animated WebP/AVIF, web fonts (WOFF2 subsetting,
  font-display, preload), and SVG (SVGO, sprites, currentColor). Builds a
  per-asset delivery strategy from importance, viewport placement, and LCP
  status (fetchpriority, lazy loading, preload, caching, CLS). Use when
  auditing asset weight, fixing LCP/CLS, compressing video, replacing GIFs,
  subsetting fonts, or adapting asset markup for Next.js, React, Vite, Astro,
  SvelteKit, or Nuxt.
---

# Web Assets Optimization

Optimize the assets the app actually ships: images, video, animated media, fonts, and SVG. Prefer safe, measurable wins: smaller files, modern formats, responsive markup, stable layout, deliberate loading order, and framework-compatible delivery.

Leading words for this skill:

- **pipeline** — extend the project's existing asset tooling; do not replace a working optimizer.
- **clean** — write final asset paths only; leave no temp folders, unused variants, orphaned heavy sources, or ffmpeg two-pass logs.
- **strategy** — every asset gets a deliberate decision from the matrix in Step 3 (importance x placement x loading context); no blanket policies.
- **LCP** — treat LCP candidates (hero image, video poster, CSS background) as highest priority; never lazy-load them.

## When not to use

- The user wants generated artwork from prompts → use an image-generation skill.
- The ask is a visual redesign with no asset-performance work.
- Assets are already transformed by a CMS/CDN pipeline, unless the task is markup or config around that CDN.
- Video editing/production work (cuts, color grading, subtitles) — this skill only compresses and delivers.
- Sources are proprietary, or destructive edits are requested without backups.

## Hard rules

- Stay **clean**: optimized files land in kept public/assets paths; remove old unoptimized sources once unreferenced; delete unused variants, experimental output dirs, and ffmpeg `-passlogfile` logs before finishing.
- Optimize referenced assets first; unused archives only if the user asks (or delete them when clearly safe).
- Detect the framework before patching markup; prefer framework-native primitives already in use.
- Do not add a package manager or root tooling to documentation-only repositories; in target apps, prefer existing package managers and scripts.
- Never lazy-load an LCP candidate — including video posters and CSS background LCP images.
- Always reserve space: `width`/`height` (or CSS `aspect-ratio`) on every `<img>` AND `<video>`.
- Video: never ship AV1-only; always keep an MP4/H.264 fallback `<source>`; H.264 requires `-pix_fmt yuv420p`, even dimensions, and `-movflags +faststart`.
- Animated GIFs used in pages: replace with `<video>` or animated WebP/AVIF unless the context only accepts image formats (README/Markdown renderers, email, Open Graph).
- Fonts: ship WOFF2 only; font preloads always carry `crossorigin`, even same-origin.
- Keep SVG logos/icons as vectors; when running SVGO, keep the `viewBox` (`removeViewBox: false`).
- Preserve semantics: meaningful `alt` for content images, `alt=""` only when decorative; `aria-label` or nearby text for meaningful `<video>` (no `alt` exists).

## Branches

| Ask | Path |
| --- | --- |
| Audit only | Steps 1–3, then report (skip generation and markup). |
| Optimize + markup | Full workflow below. |
| Single asset type (e.g. "compress this video", "fix our fonts", "replace these GIFs") | Steps 1–3 scoped to that type, then the matching reference file and Steps 5–9 for those assets. |
| CDN/CMS already transforms | Step 1 + markup/config only; see [frameworks.md](./frameworks.md) CMS section. |
| Delivery/LCP tuning only (no re-encoding) | Steps 1–3 + Step 6 with [delivery-strategy.md](./delivery-strategy.md). |

## Workflow

Track with this checklist (one item per step below):

```text
- [ ] 1. Detect framework and asset pipeline
- [ ] 2. Inventory referenced assets (images, video, GIFs, fonts, SVG)
- [ ] 3. Build the per-asset strategy matrix
- [ ] 4. Plan per-type transforms and commands
- [ ] 5. Generate optimized assets into final paths
- [ ] 6. Replace references with optimized markup and loading attributes
- [ ] 7. Delete old unoptimized assets and unused variants
- [ ] 8. Re-scan and verify references stay clean
- [ ] 9. Verify visuals/build and report
```

### Scripts

Resolve this skill's directory (the folder that contains this `SKILL.md`), then run helpers relative to that root. Pass `--root` as the target app path.

```bash
python3 <skill-dir>/scripts/scan-assets.py --root <app-root> --format markdown
python3 <skill-dir>/scripts/scan-assets.py --root <app-root> --format json > asset-scan.json
python3 <skill-dir>/scripts/generate-sharp-plan.py asset-scan.json --widths 320,640,1024,1536
python3 <skill-dir>/scripts/generate-ffmpeg-plan.py asset-scan.json
```

Inside this repository only, `<skill-dir>` is `skills/web/web-assets-optimization`.

### Step 1 — Detect framework and pipeline

Check `package.json`, framework configs, image/font component imports (`next/image`, `next/font`, `astro:assets`, `@nuxt/image`, `@nuxt/fonts`, `@sveltejs/enhanced-img`), and CDN/CMS loaders. If a working **pipeline** exists, extend it.

Done when: the framework (or plain HTML) plus any existing optimizers for images AND fonts are named, and the patch strategy is chosen (native component vs plain markup).

See [frameworks.md](./frameworks.md).

### Step 2 — Inventory referenced assets

Run `scan-assets.py`. Review per type: path, bytes, dimensions (video dims are not detected — note as unknown), references, and usage hints (logo, app-icon, favicon, animated, poster, preload, legacy-font-format).

Done when: every referenced local image/video/GIF/font/SVG under `--root` is listed; large unreferenced assets are noted; remote URLs are listed separately.

### Step 3 — Build the strategy matrix

This is the intelligence step — do not skip it. For each asset that matters (raster > 200 KB, any video, any GIF > 100 KB, every shipped font file, SVG > 20 KB, plus every LCP candidate regardless of size), record one **strategy** row: `asset | type | role | placement | action | loading policy`.

- Role: LCP candidate / contentful / decorative / functional (icon, favicon).
- Placement: above fold / below fold / offscreen-conditional (modal, carousel, tab) / global (font, sprite).
- LCP candidates include: `<img>`, `<video>` poster, CSS `background-image` via `url()`, `<image>` in `<svg>`.

Loading policy per role x placement:

| Role x placement | Loading policy |
| --- | --- |
| LCP candidate | eager, `fetchpriority="high"`, never lazy; must be discoverable in initial HTML; preload only if late-discovered (CSS background, font) |
| Above-fold, non-LCP | eager, default priority, dimensions set |
| Below-fold image/iframe | `loading="lazy"`, `decoding="async"`, dimensions mandatory |
| Offscreen-conditional (modal, carousel, tab) | `loading="lazy"` (or defer the fetch until the trigger interaction for modal/tab content); `fetchpriority="low"` on prefetched carousel slides so they do not compete with critical resources |
| Below-fold autoplay video loop | `preload="none"` + poster, or IntersectionObserver src-swap; pause offscreen |
| Click-to-play video | `preload="metadata"` (or `none`) + poster |
| Long offscreen sections | `content-visibility: auto` + `contain-intrinsic-size` |
| Critical text font | WOFF2 subset, preload with `crossorigin`, `font-display: swap`/`fallback` + metric-adjusted fallback |
| Secondary/decorative font | `font-display: optional`, no preload |
| Animated GIF in page | replace per [animated-media.md](./animated-media.md), reduced-motion fallback |

Order of work: **LCP** candidate → oversized above-fold assets → video/GIF byte hogs → fonts → below-fold rasters → SEO/social images. Details and rationale: [delivery-strategy.md](./delivery-strategy.md).

Done when: every qualifying asset has a matrix row and the LCP candidate is identified (or its absence stated).

### Step 4 — Plan per-type transforms

Dispatch per type; read the reference file before planning that type:

- Raster images → [sharp-cli.md](./sharp-cli.md) + `generate-sharp-plan.py`. Default format policy unless the project constrains otherwise: photos AVIF + WebP + JPEG fallback; UI screenshots WebP + PNG when lossless detail matters; transparent rasters WebP/AVIF with PNG fallback; logos/icons stay SVG; Open Graph/social images JPEG/PNG at platform dimensions.
- Video → [video.md](./video.md) + `generate-ffmpeg-plan.py` (MP4 + WebM + poster).
- GIF/animated → [animated-media.md](./animated-media.md) + `generate-ffmpeg-plan.py`.
- Fonts → [fonts.md](./fonts.md) (WOFF2 conversion, subsetting, display strategy).
- SVG → [svg.md](./svg.md) (SVGO plan, delivery method).

Done when: each matrix row has planned commands or a stated no-op reason.

### Step 5 — Generate into final paths

Review the generated command plans, then run them. Target **final** kept paths (avoid `--out-dir` unless you will move winners into final paths and delete the temp dir before finishing). Produce only variants the app will reference; delete ffmpeg pass logs.

Done when: optimized files exist at final paths for every planned row and no temp output or log remains.

### Step 6 — Replace references

Apply the matrix's loading policy while patching markup. Before editing image markup, load [responsive-images.md](./responsive-images.md) and apply every Core rule; for video/GIF markup follow [video.md](./video.md) and [animated-media.md](./animated-media.md); for `@font-face`/preload edits follow [fonts.md](./fonts.md); for priorities/preload/caching follow [delivery-strategy.md](./delivery-strategy.md).

Also update manifests, favicons, Open Graph, CSS `url(...)`, MDX/Markdown, and structured data when they point at old files. Prefer framework-native patterns when the **pipeline** uses them.

Done when: no runtime reference still points at an unoptimized original that has a replacement, and every touched element carries the loading attributes its matrix row prescribes (or exceptions are documented).

### Step 7 — Delete old assets

Remove unreferenced heavy originals (rasters, videos, GIFs, legacy font formats), unused generated variants, and any temp output directory. Keep SVG sources and any source files the user asked to retain.

Done when: the tree is **clean** — only referenced optimized assets, intentional vectors, and documented kept sources remain.

### Step 8 — Re-scan and verify cleanliness

Rerun `scan-assets.py`. Confirm optimized references are in place, no orphaned heavy assets remain, and no legacy font formats are still shipped.

Done when: the rescan matches the **clean** bar above.

### Step 9 — Verify and report

Check desktop/mobile render, sensible `srcset` picks, video plays with correct source order and poster, autoplay loops are muted + `playsinline`, fonts render without layout jumps, no CLS from missing dimensions, LCP not lazy-loaded, and the build passes with the project's existing commands. Compare bytes before/after per type.

Done when: validation notes are recorded and the report below is filled.

## Output format

```markdown
## Web assets optimization summary

- Framework/pipeline detected: <framework and asset tooling>
- Assets scanned: <count> (<images/videos/GIFs/fonts/SVG counts>); bytes before → after: <totals>
- LCP candidate: <asset and treatment>
- Highest-priority fixes: <short list>

## Strategy matrix

| Asset | Type | Role | Placement | Action | Loading policy |
| --- | --- | --- | --- | --- | --- |
| ... | ... | ... | ... | ... | ... |

## Changes made

- <source asset> → <optimized replacements in final paths>
- <reference file> → <old path replaced with optimized markup>
- Deleted: <old assets, temp folders, unused variants, pass logs>

## Validation

- <commands or manual checks>
- Scanner rerun: <clean confirmation or documented exceptions>

## Notes / follow-ups

- <remote assets, CMS/CDN settings, caching headers, visual QA needs>
```

## Reference files

- [delivery-strategy.md](./delivery-strategy.md) — LCP, fetchpriority, lazy loading, preload/preconnect, content-visibility, CLS, caching, measurement.
- [responsive-images.md](./responsive-images.md) — `img`, `picture`, `srcset`, `sizes`, LCP images, accessibility, SEO.
- [video.md](./video.md) — codecs, ffmpeg recipes, posters, `<video>` markup, lazy patterns, streaming decision.
- [animated-media.md](./animated-media.md) — GIF replacement with video or animated WebP/AVIF, reduced motion.
- [fonts.md](./fonts.md) — WOFF2, subsetting, font-display, preload, fallback metrics, variable fonts.
- [svg.md](./svg.md) — SVGO, delivery trade-offs, currentColor.
- [sharp-cli.md](./sharp-cli.md) — Sharp CLI commands, quality table, naming, conversion policy.
- [frameworks.md](./frameworks.md) — Next.js, React/Vite, Astro, SvelteKit, Nuxt asset/font/video handling, CDN constraints.
