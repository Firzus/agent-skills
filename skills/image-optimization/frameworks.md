# Framework Notes

Detect the framework before changing image markup. Prefer the project's existing image pipeline over generic HTML when it is configured and actively used.

## Detection checklist

Look for:

- `package.json` dependencies and scripts.
- `next.config.*`, `vite.config.*`, `astro.config.*`, `svelte.config.*`, `nuxt.config.*`.
- Imports from `next/image`, `astro:assets`, `@nuxt/image`, or local image components.
- Existing components named `Image`, `OptimizedImage`, `ResponsiveImage`, `Picture`, `CloudinaryImage`, or similar.
- CMS/CDN loaders such as Cloudinary, Imgix, Sanity, Contentful, Shopify, or custom URL builders.

## Next.js

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

## React with Vite or similar bundlers

There is no built-in image optimizer unless the project added one.

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

## Astro

Prefer Astro's built-in image support when present.

- Look for `astro:assets` imports and existing `<Image />` usage.
- Use local imported images when possible.
- Keep static `public/` images as plain URLs if they are intentionally not processed.
- For remote images, check `astro.config.*` image settings before changing URLs.

Do not replace `astro:assets` with raw `<img>` unless the existing pipeline cannot support the needed output.

## SvelteKit

SvelteKit does not include a universal image optimizer by default.

- Check whether the project uses an image plugin, CDN loader, or `@sveltejs/enhanced-img` pattern.
- For static assets, use the project's established `$lib/assets` imports or `static/` URLs.
- Plain `<picture>` and `<img>` patterns are acceptable when no pipeline exists.
- Preserve Svelte attribute syntax and reactive expressions when patching markup.

## Nuxt and Vue

Check for Nuxt Image or another Vue image module before using raw `<img>`.

- If `@nuxt/image` is configured, use `<NuxtImg>` or `<NuxtPicture>` according to existing conventions.
- If not, use standard Vue template markup with `srcset` and `sizes`.
- Do not add Nuxt modules just for one image unless the user asks for a pipeline-level change.

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
