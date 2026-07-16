---
name: image-optimization
description: >-
  Audits and optimizes web-app images for performance, SEO, accessibility, and
  responsive delivery. Use when auditing image weight, generating Sharp
  AVIF/WebP/JPEG/PNG variants, implementing responsive `img`/`picture`/`srcset`/
  `sizes`, fixing LCP image delivery, or adapting image markup for Next.js,
  React, Vite, Astro, SvelteKit, or Nuxt.
---

# Image Optimization

Optimize images the app actually uses. Prefer safe, measurable wins: smaller files, correct dimensions, modern formats, responsive markup, stable layout, and framework-compatible delivery.

Leading words for this skill:

- **pipeline** — extend the project's existing image tooling; do not replace a working optimizer.
- **clean** — write final asset paths only; leave no temp folders, unused variants, or orphaned heavy rasters.
- **LCP** — treat the first-viewport hero as the highest priority; never lazy-load it.

## When not to use

- The user wants generated artwork from prompts → use an image-generation skill.
- The ask is a visual redesign with no asset-performance work.
- Images are already transformed by a CMS/CDN pipeline, unless the task is markup or config around that CDN.
- Sources are proprietary, or destructive edits are requested without backups.

## Hard rules

- Stay **clean**: optimized files land in the app's kept public/assets paths; remove old unoptimized rasters once unreferenced; delete unused generated variants and any experimental output dir before finishing.
- Optimize referenced assets first; unused archives only if the user asks (or delete them when clearly safe).
- Detect the framework before patching markup; prefer framework-native image primitives when already in use.
- Do not add a package manager or root tooling to documentation-only repositories just to run this skill. In target apps, prefer existing package managers and scripts.
- Keep SVG logos/icons as vectors unless a specific raster fallback is required.
- Preserve semantics: meaningful `alt` for content images; `alt=""` only when decorative.

## Branches

| Ask | Path |
| --- | --- |
| Audit only | Steps 1–3, then report (skip Sharp and markup). |
| Optimize + markup | Full workflow below. |
| CDN/CMS already transforms | Step 1 + markup/config only; see [frameworks.md](./frameworks.md) CMS section. |

## Workflow

Track with this checklist (one item per step below):

```text
- [ ] 1. Detect framework and image pipeline
- [ ] 2. Inventory referenced images
- [ ] 3. Prioritize LCP and above-the-fold assets
- [ ] 4. Choose formats, widths, and quality targets
- [ ] 5. Plan and generate Sharp variants into final paths
- [ ] 6. Replace references with optimized markup
- [ ] 7. Delete old unoptimized rasters and unused variants
- [ ] 8. Re-scan and verify references stay clean
- [ ] 9. Verify visuals/build and report
```

### Scripts

Resolve this skill's directory (the folder that contains this `SKILL.md`), then run helpers relative to that root. Pass `--root` as the target app path.

```bash
python <skill-dir>/scripts/scan-images.py --root <app-root> --format markdown
python <skill-dir>/scripts/scan-images.py --root <app-root> --format json > image-scan.json
python <skill-dir>/scripts/generate-sharp-plan.py image-scan.json --widths 320,640,1024,1536
```

Inside this repository only, `<skill-dir>` is `skills/image-optimization`.

### Step 1 — Detect framework and pipeline

Check `package.json`, framework configs, image-component imports, and CDN/CMS loaders. If a working **pipeline** exists, extend it.

Done when: the framework (or plain HTML) and any existing image optimizer/CDN are named, and the patch strategy is chosen (native component vs plain markup).

See [frameworks.md](./frameworks.md).

### Step 2 — Inventory referenced images

Run the scanner. Review path, size, dimensions (JPEG/PNG/WebP/SVG when detectable; AVIF/GIF often report unknown dims), references, and usage hints.

Done when: every referenced local raster under `--root` is listed; large unreferenced rasters are noted; remote URLs are listed separately.

### Step 3 — Prioritize

Order: **LCP**/first viewport → rasters over 200 KB → displayed much smaller than intrinsic size → repeated cards/thumbs/backgrounds → SEO/social images.

For LCP: skip `loading="lazy"`; prefer `fetchpriority="high"` or the framework priority/preload API; keep `sizes` truthful.

Done when: the LCP candidate and the next high-impact assets are ordered for work.

### Step 4 — Choose formats and sizes

Default policy unless the project constrains otherwise:

- Photos: AVIF + WebP + JPEG fallback.
- UI screenshots: WebP + PNG when lossless detail matters.
- Transparent rasters: WebP/AVIF when fine, PNG fallback.
- Logos/icons: keep SVG; otherwise small WebP/PNG sizes — not full responsive photo sets.
- Open Graph/social: reliable JPEG or PNG at platform dimensions.

Widths follow layout (`320`–`1920` common set); drop widths above the source or impossible for the layout. Quality defaults live in [sharp-cli.md](./sharp-cli.md).

Done when: each prioritized asset has formats, widths, and quality chosen.

### Step 5 — Plan and generate Sharp variants

Read [sharp-cli.md](./sharp-cli.md). Generate a command plan targeting **final** kept paths (avoid `--out-dir` unless you will move winners into final paths and delete the temp dir before finishing). Review commands, then run them. Produce only variants the app will reference.

Done when: optimized files exist at final asset paths for every prioritized raster that needs conversion, and no experimental output dir remains.

### Step 6 — Replace references

Point every safe runtime reference at the optimized asset or responsive set. Prefer framework-native patterns when the **pipeline** uses them.

Before editing markup, load [responsive-images.md](./responsive-images.md) and apply every Core rule to each replaced reference. Also update manifests, favicons, Open Graph, CSS `url(...)`, MDX/Markdown, and structured data when they point at the old file.

Done when: no production/runtime reference still points at an original heavy raster that has an optimized replacement (or each exception is documented).

### Step 7 — Delete old assets

Remove unreferenced heavy rasters, unused generated variants, and any temp output directory. Keep SVG sources and any source files the user asked to retain.

Done when: the tree is **clean** — only referenced optimized assets, intentional vectors, and documented kept sources remain.

### Step 8 — Re-scan and verify cleanliness

Rerun the scanner. Confirm optimized use cases no longer reference the original heavy raster, and large unreferenced rasters are gone or explicitly documented.

Done when: the rescan matches the **clean** bar above.

### Step 9 — Verify and report

Check desktop/mobile render, sensible `srcset` picks, build paths, no CLS from missing dimensions, LCP not lazy-loaded, and no obvious compression artifacts. Compare image bytes / LCP when tooling allows.

Done when: validation notes are recorded and the report below is filled.

## Output format

```markdown
## Image optimization summary

- Framework/pipeline detected: <framework and image tooling>
- Images scanned: <count>; referenced raster images: <count>
- Highest-priority fixes: <short list>

## Changes made

- <source asset> → <optimized replacement variants in final paths>
- <reference file> → <old path replaced with optimized path/srcset/picture>
- Deleted: <old rasters, temp folders, unused variants>

## Validation

- <commands or manual checks>
- Scanner rerun: <clean confirmation or documented exceptions>

## Notes / follow-ups

- <remote assets, CMS/CDN settings, visual QA needs>
```

## Reference files

- [responsive-images.md](./responsive-images.md) — `img`, `picture`, `srcset`, `sizes`, LCP, accessibility, SEO.
- [frameworks.md](./frameworks.md) — Next.js, React/Vite, Astro, SvelteKit, Nuxt, CDN constraints.
- [sharp-cli.md](./sharp-cli.md) — Sharp CLI commands, quality table, naming, conversion policy.
