# Framework Notes

Detect the framework before changing asset markup. Prefer the project's existing asset pipeline over generic HTML when it is configured and actively used.

## Detection checklist

Look for:

- `package.json` dependencies and scripts.
- `next.config.*`, `vite.config.*`, `astro.config.*`, `svelte.config.*`, `nuxt.config.*`.
- Imports from `next/image`, `next/font`, `astro:assets`, `@nuxt/image`, `@nuxt/fonts`, `@sveltejs/enhanced-img`, `vite-imagetools`, or local image components.
- Existing components named `Image`, `OptimizedImage`, `ResponsiveImage`, `Picture`, `CloudinaryImage`, or similar.
- Font files referenced from CSS `@font-face` declarations.
- `<video>` usage and any video provider components.
- CMS/CDN loaders such as Cloudinary, Imgix, Sanity, Contentful, Shopify, or custom URL builders.

## Next.js

### Images

Prefer `next/image` when the project uses it.

Key rules:

- Use static imports for local images when possible; they provide dimensions automatically.
- Always provide a truthful `sizes` value for responsive images, especially with `fill`.
- Use the project's LCP-priority API (`priority` or preload-related prop depending on version and conventions) for the hero image.
- Do not set `loading="lazy"` on the LCP image.
- Configure `remotePatterns` or the existing loader before using remote images.
- Avoid wrapping `Image` in containers that hide dimensions without `sizes` and stable aspect ratio.

Common pattern:

```tsx
import Image from "next/image";
import heroImage from "@/public/images/hero.jpg";

export function Hero() {
  return (
    <Image
      src={heroImage}
      alt="Analytics dashboard showing revenue, retention, and activation metrics"
      sizes="100vw"
      priority
      className="h-auto w-full object-cover"
    />
  );
}
```

For `fill`, the parent must establish dimensions:

```tsx
<div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
  <Image
    src="/images/dashboard-1280.webp"
    alt="Dashboard overview with conversion funnel cards"
    fill
    sizes="(min-width: 1024px) 50vw, 100vw"
    className="object-cover"
  />
</div>
```

Do not generate manual `srcset` for `next/image` unless the project intentionally bypasses Next's optimizer.

### Fonts

`next/font` is built in — prefer it over manual `@font-face` in a Next project. It self-hosts fonts at build time, so the browser makes zero requests to Google.

- `next/font/google`: named exports per font, e.g. `import { Inter } from 'next/font/google'`.
- `next/font/local`: default export `localFont` for font files checked into the repo.
- Key options: `weight`, `style`, `subsets`, `display` (default `'swap'`), `preload` (default `true`), `fallback`, `adjustFontFallback`, `variable`.

### Video

No built-in component — official Next.js guidance is a plain `<video>` element; apply [video.md](./video.md). `next-video` is a community package maintained by Mux, not a Vercel/Next.js official package; only use it if the project already does.

### Static assets

`public/` is served as-is at the site root (`/file.png`) — files are not hashed and not optimized. `next/image` can consume both public paths and static imports.

## React with Vite or similar bundlers

### Images

There is no built-in image optimizer unless the project added one. `vite-imagetools` is a community plugin (not Vite core) that transforms images via import query params.

Rules:

- For imported assets, confirm how the bundler emits URLs before changing paths.
- For `public/` assets, reference root-relative URLs such as `/images/photo-640.webp`.
- Generate static variants with Sharp CLI when no CDN or build plugin handles resizing.
- Use plain `img` or a small local component if repeated patterns justify it.

Example component:

```tsx
type ResponsiveImageProps = {
  basePath: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  loading?: "eager" | "lazy";
};

export function ResponsiveImage({ basePath, alt, width, height, sizes, loading = "lazy" }: ResponsiveImageProps) {
  return (
    <picture>
      <source type="image/avif" srcSet={`${basePath}-640.avif 640w, ${basePath}-1280.avif 1280w`} sizes={sizes} />
      <source type="image/webp" srcSet={`${basePath}-640.webp 640w, ${basePath}-1280.webp 1280w`} sizes={sizes} />
      <img src={`${basePath}-1280.jpg`} alt={alt} width={width} height={height} sizes={sizes} loading={loading} decoding="async" />
    </picture>
  );
}
```

Keep components simple; do not introduce a new image abstraction for one or two images.

### Fonts

No built-in font handling — self-host WOFF2 via CSS following [fonts.md](./fonts.md).

### Video

No built-in video handling — plain `<video>` per [video.md](./video.md).

### Static assets

- Importing a static asset returns its resolved public URL; production builds emit hashed filenames.
- Import suffixes: `?url` (force URL), `?raw` (string content), `?inline` / `?no-inline` (control base64 inlining).
- `new URL('./x.png', import.meta.url)` is rewritten at build time when the path is static.
- `public/` files are never hashed or importable — prefer imports unless stable names are required (`robots.txt`, favicons, OG images).

## Astro

### Images

Prefer Astro's built-in image support when present: `import { Image, Picture } from 'astro:assets'` (`<Picture formats={[...]}>` for multi-format output). Sharp is the default image service.

- Look for `astro:assets` imports and existing `<Image />` usage.
- `src/` images must be imported and are transformed, optimized, and hashed; `public/` files are copied as-is and referenced by root-relative URL.
- Keep static `public/` images as plain URLs if they are intentionally not processed.
- For remote images, check `astro.config.*` image settings before changing URLs.

Do not replace `astro:assets` with raw `<img>` unless the existing pipeline cannot support the needed output.

### Fonts

Astro's Fonts API: a `fonts` config array (each entry: provider, family `name`, `cssVariable`) plus a `<Font />` component imported from `astro:assets` and placed in `<head>`, which emits the style tags and optional preload links. Providers: Google, Fontsource, Bunny, local. This API was experimental in earlier majors — confirm the project's Astro version exposes it before relying on it; otherwise fall back to [fonts.md](./fonts.md).

### Video

No built-in component in the official docs — use plain `<video>` with `public/` assets per [video.md](./video.md).

### Static assets

`src/` imports → processed and hashed; `public/` → copied unchanged, stable root URLs.

## SvelteKit

### Images

- Check whether the project uses an image plugin, CDN loader, or `@sveltejs/enhanced-img`.
- `@sveltejs/enhanced-img` provides the `<enhanced:img>` element (built on `vite-imagetools`): build-time only — it cannot handle dynamic or CMS images — and generates avif/webp, responsive sizes, and intrinsic dimensions (no CLS). Per-image transforms use imagetools query directives such as `?blur=15`. It is still pre-1.0: verify the project pins a version before adopting it.
- Plain Vite imports work too: `import logo from '$lib/assets/logo.png'` yields a hashed URL.
- For static assets, use the project's established `$lib/assets` imports or `static/` URLs (`static/` is served as-is at the root).
- Plain `<picture>` and `<img>` patterns are acceptable when no pipeline exists.
- Preserve Svelte attribute syntax and reactive expressions when patching markup.

### Fonts

No first-party font module — self-host via CSS with [fonts.md](./fonts.md) (Fontsource packages are a common source).

### Video

No first-party video handling — plain `<video>` per [video.md](./video.md).

### Static assets

`$lib/assets` imports → hashed by Vite; `static/` → served unchanged at root paths.

## Nuxt and Vue

### Images

Check for Nuxt Image or another Vue image module before using raw `<img>`.

- `@nuxt/image` is a module, not core Nuxt. When configured it auto-imports `<NuxtImg>` (drop-in `<img>` replacement) and `<NuxtPicture>`, with a provider system (ipx by default; Cloudinary and others available).
- If not configured, use standard Vue template markup with `srcset` and `sizes`.
- Do not add Nuxt modules just for one image unless the user asks for a pipeline-level change.

### Fonts

`@nuxt/fonts` is zero-config: it scans CSS `font-family` declarations and self-hosts matching web fonts automatically. By default it loads weights 400 and 700 in normal and italic styles; declare any other weights you use via the `defaults` or per-family config. Providers include google, bunny, fontsource, and local. Without the module, apply [fonts.md](./fonts.md).

### Video

No official Nuxt video module — use plain `<video>` per [video.md](./video.md), or the project's provider components (Cloudinary, Mux) if already installed.

### Static assets

`public/` is served as-is at the server root (`/img/x.png`). `app/assets/` (referenced as `~/assets/...`) is processed and hashed by the bundler and is never served at a static URL — static `src="~/assets/..."` strings in templates are rewritten to imports resolving to the hashed output.

## CMS and image CDN pipelines

If images come from a transform-capable service, prefer URL transformations over checked-in variants.

Common checks:

- Does the app already request `w`, `width`, `q`, `quality`, `format`, `fm`, `auto`, `fit`, or `dpr` params?
- Are remote domains allowlisted in the framework config?
- Are generated URLs cacheable and stable?
- Does the CMS provide focal points or crops that must be preserved?

Do not download and commit remote images unless the user explicitly wants local copies.

## Background images in component frameworks

For Tailwind classes like `bg-[url(...)]`, CSS modules, or inline styles:

- If decorative, optimize the source and preserve CSS usage.
- If contentful or LCP, prefer converting to a real image element.
- If keeping CSS, consider responsive CSS, `image-set()`, or framework-specific asset imports.

## Build verification

After changes, use the project's existing validation commands. Typical checks are:

- Next.js: build or type-check command already present in `package.json`.
- Vite/React: build and type-check scripts if present.
- Astro/SvelteKit/Nuxt: framework build command if present.

Do not invent new root scripts just for image optimization.

## Two-tier asset model

Every framework here splits assets into two tiers: processed and hashed imports (Next static imports, Astro `src/`, Nuxt `~/assets`, SvelteKit `$lib`, Vite imports) versus an untouched `public/`-or-`static/` root served with stable names and no optimization. Decide per asset which tier it belongs to before generating variants — hashed imports get cache-friendly fingerprints, while the public tier is for assets that need stable URLs.
