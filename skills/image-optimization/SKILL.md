---
name: image-optimization
description: >-
  Analyzes and optimizes images used in web applications for performance, SEO,
  accessibility, and responsive delivery. Use when auditing app images,
  reducing image weight, generating AVIF/WebP/JPEG/PNG variants with Sharp CLI,
  implementing responsive `img`, `picture`, `srcset`, or `sizes`, fixing LCP
  image delivery, or adapting image markup for Next.js, React, Vite, Astro,
  SvelteKit, Nuxt, and similar frontend frameworks.
---

# Image Optimization

Optimize images that are actually used by a web app. Focus on safe, measurable improvements: smaller files, correct dimensions, modern formats, responsive markup, stable layout, and framework-compatible delivery.

## When to use

Use this skill when the user wants to:

- Audit images used by a website or web app.
- Reduce image weight with `sharp` or `sharp-cli`.
- Generate AVIF/WebP/JPEG/PNG variants and responsive widths.
- Add or fix `srcset`, `sizes`, `<picture>`, `loading`, `decoding`, `fetchpriority`, `width`, or `height`.
- Improve LCP image delivery, hero image loading, mobile image payload, Image SEO, or image accessibility.
- Adapt image usage in Next.js, React, Vite, Astro, SvelteKit, Nuxt, or similar frameworks.

## When not to use

- The user wants to generate new images from prompts; use an image generation skill instead.
- The user wants only a visual redesign with no asset-performance work.
- The images are controlled entirely by an external CMS/CDN that already performs responsive transformation, unless the task is to fix markup or configuration around that CDN.
- The source assets are proprietary or destructive edits are requested without backups.

## Hard rules

- **Keep the project clean.** Do not leave temporary optimization folders, duplicate `optimized-images/` directories, scratch reports, or unused generated variants in the target app.
- **Replace unoptimized image files, not just references.** Generate optimized outputs, patch references, then remove old unoptimized raster files once they are no longer referenced and are not required source assets.
- **Use final asset locations.** Prefer writing optimized files into the same public/assets folder and naming scheme that the app will keep, not a temporary output directory.
- **Optimize only referenced assets first.** Do not spend effort on unused image archives unless the user asks; if unused non-optimized images are safe to remove, delete them during cleanup.
- **Detect the framework before patching markup.** Use framework-native image primitives when the project already uses them.
- **Do not add a package manager or root tooling to this repository just to run the skill.** In target projects, prefer existing package managers and scripts.
- **Do not blindly convert SVG logos/icons to raster formats.** Keep vectors as SVG unless a specific raster fallback is needed.
- **Preserve semantics.** Keep meaningful `alt` text; use empty `alt=""` only for decorative images.

## Workflow

Track work with this checklist:

```text
- [ ] 1. Detect framework and image pipeline
- [ ] 2. Inventory referenced images
- [ ] 3. Prioritize LCP and above-the-fold assets
- [ ] 4. Choose formats, widths, and quality targets
- [ ] 5. Generate a Sharp CLI plan for final asset paths
- [ ] 6. Generate optimized replacement files
- [ ] 7. Replace all safe references to unoptimized images
- [ ] 8. Delete old unoptimized images and unused generated variants
- [ ] 9. Verify no optimized use still points at the original heavy raster
- [ ] 10. Verify output visually and with performance signals
- [ ] 11. Report changed assets, markup, deletions, and trade-offs
```

### Step 1 — Detect framework and pipeline

Check project files before making recommendations:

- Next.js: `next.config.*`, `app/`, `pages/`, `next/image` imports.
- React/Vite: `vite.config.*`, `src/`, direct `<img>` usage, static imports.
- Astro: `astro.config.*`, `.astro` files, `astro:assets`.
- SvelteKit: `svelte.config.*`, `.svelte` files.
- Nuxt/Vue: `nuxt.config.*`, `.vue` files, Nuxt Image modules.
- Existing image services: Cloudinary, Imgix, Contentful, Shopify, Sanity, Vercel image optimization, custom CDN loaders.

If the project already has a working image pipeline, extend it instead of replacing it. See [frameworks.md](./frameworks.md) for framework-specific rules.

### Step 2 — Inventory referenced images

Prefer the bundled scanner when available:

```bash
python skills/image-optimization/scripts/scan-images.py --root . --format markdown
```

Use JSON when another script or agent step will consume the result:

```bash
python skills/image-optimization/scripts/scan-images.py --root . --format json > image-scan.json
```

Review:

- File path, size, approximate dimensions, and format.
- References from HTML, JSX/TSX, Vue, Svelte, Astro, MDX, Markdown, JSON manifests, and CSS.
- Images in `public/`, `src/assets/`, `app/`, `pages/`, `components/`, and content folders.
- Remote image URLs and whether the framework allows them.

### Step 3 — Prioritize

Prioritize in this order:

1. LCP/hero images and any image in the first viewport.
2. Large referenced raster images over 200 KB.
3. Images displayed much smaller than their intrinsic dimensions.
4. Repeated thumbnails, cards, avatars, gallery images, and background images.
5. SEO-critical images: product, article, Open Graph, and structured-data images.

For LCP images, usually avoid `loading="lazy"`, consider `fetchpriority="high"`, and ensure `sizes` matches the rendered width. In Next.js, use the framework's priority/preload mechanism for the project version.

### Step 4 — Choose formats and sizes

Use this default policy unless project constraints say otherwise:

- Photos: AVIF + WebP + JPEG fallback.
- Screenshots/UI raster images: WebP and PNG fallback when lossless detail matters.
- Transparent raster graphics: WebP/AVIF when supported, PNG fallback.
- Logos/icons/illustrations: SVG if already vector; otherwise optimize carefully and avoid quality loss.
- Open Graph/social images: keep a reliable JPEG or PNG fallback with the expected platform dimensions.

Width candidates should reflect layout, not arbitrary multiples. Common web widths are `320`, `480`, `640`, `768`, `1024`, `1280`, `1536`, and `1920`; remove widths larger than the source image and widths impossible for the layout.

### Step 5 — Generate replacement variants with Sharp CLI

Read [sharp-cli.md](./sharp-cli.md) before running conversions. Generate a command plan first, targeting final kept asset paths rather than a temporary directory:

```bash
python skills/image-optimization/scripts/generate-sharp-plan.py image-scan.json --widths 320,640,1024,1536
```

Only run Sharp commands after reviewing output paths. Generate enough optimized variants to replace all runtime uses. Do not leave unused variants in the project.

### Step 6 — Replace markup or framework references

Optimizing files is not enough. Replace every safe reference to the unoptimized raster with the optimized asset or responsive variant set.

Use native framework patterns when possible. For plain HTML/React, prefer:

- Replace `src` with the smallest optimized default candidate that works without `srcset`.
- Add `srcset` with width or density descriptors when multiple candidates exist.
- Add accurate `sizes` for fluid layouts.
- Add `width` and `height` attributes or CSS `aspect-ratio` to prevent CLS.
- Use `<picture>` only when serving multiple formats or art-directed crops.
- Use `loading="lazy"` for below-the-fold images; `loading="eager"` or omitted lazy loading for LCP.
- Use `decoding="async"` for non-critical images.
- Update `manifest.json`, `site.webmanifest`, favicon links, Open Graph tags, CSS `url(...)`, MDX/Markdown, and structured-data image references when they point at generated optimized files.

Do not leave production/runtime references pointing to an original heavy raster after an optimized replacement exists. If a reference cannot be safely replaced, document why.

See [responsive-images.md](./responsive-images.md) for markup patterns.

### Step 7 — Clean old assets

After patching references, remove old unoptimized raster files when they are no longer referenced. Also remove unused generated variants and any temporary output directory created during experimentation. A clean result should contain only:

- Optimized assets that are referenced by the app or required by a manifest/social platform.
- Vector source assets that should remain SVG.
- Explicitly documented source files the user asked to keep.

If an old asset must remain as a design source, move it only when the project already has a source-assets convention; otherwise ask before keeping it.

### Step 8 — Verify references and cleanliness

After cleanup, rerun the scanner and confirm optimized use cases no longer reference the original heavy raster. The final scan should not list old non-optimized raster images as referenced, and should not list large unreferenced raster files unless each one is documented as intentionally kept.

### Step 9 — Verify quality and build

Verify at least:

- The page renders the intended image at desktop and mobile breakpoints.
- Browser chooses an appropriately sized candidate from `srcset`.
- No broken paths in production build output.
- No layout shift from missing dimensions.
- LCP image is not lazy-loaded and is not hidden behind CSS/background indirection unless necessary.
- Optimized variants do not introduce visible artifacts.

If browser automation or Lighthouse is available, compare network image bytes and LCP before/after. If not, report file-size reductions and markup changes.

## Output format

When reporting results, include:

```markdown
## Image optimization summary

- Framework/pipeline detected: <framework and image tooling>
- Images scanned: <count>; referenced raster images: <count>
- Highest-priority fixes: <short list>

## Changes made

- <source asset> → <optimized replacement variants generated in final paths>
- <reference file> → <old image path replaced with optimized path/srcset/picture>
- Deleted: <old unoptimized files, temporary folders, unused generated variants>

## Validation

- <commands run or manual checks>
- Scanner rerun: <confirm original heavy assets are no longer referenced and no large unreferenced raster files remain, or list documented exceptions>

## Notes / follow-ups

- <remaining remote assets, CMS/CDN settings, visual QA needs>
```

## Reference files

- [responsive-images.md](./responsive-images.md) — `img`, `picture`, `srcset`, `sizes`, LCP, accessibility, and SEO patterns.
- [frameworks.md](./frameworks.md) — Next.js, React/Vite, Astro, SvelteKit, Nuxt, and image-CDN constraints.
- [sharp-cli.md](./sharp-cli.md) — Sharp CLI commands, presets, naming, and safe conversion policy.
