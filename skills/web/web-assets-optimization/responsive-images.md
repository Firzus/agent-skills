# Responsive Images Reference

Use responsive image markup to deliver the smallest asset that still looks good at the rendered size. After generating optimized variants, replace the app's runtime references so production pages request those variants instead of the original heavy image, then remove the old unoptimized raster when it is no longer referenced. Loading attributes (`loading`, `fetchpriority`, `decoding`, preload) must follow the per-asset strategy matrix from SKILL.md Step 3, detailed in [delivery-strategy.md](./delivery-strategy.md).

## Core rules

- Use `srcset` width descriptors (`320w`, `640w`, `1024w`) for fluid layouts.
- Always pair width descriptors with a truthful `sizes` attribute.
- Keep `src` as a broadly compatible fallback, but point it at an optimized fallback file, not the original heavy source.
- Add `width` and `height` attributes that match the intrinsic aspect ratio.
- Use `<picture>` for format negotiation or art direction; do not use it just for decoration.
- Avoid lazy-loading the LCP image.
- Use meaningful `alt` text for content images and `alt=""` for decorative images.

## Plain `img` with `srcset`

Use this when the same crop works at every breakpoint:

```html
<img
  src="/images/product-640.jpg"
  srcset="
    /images/product-320.webp 320w,
    /images/product-640.webp 640w,
    /images/product-1024.webp 1024w,
    /images/product-1536.webp 1536w
  "
  sizes="(min-width: 1024px) 50vw, 100vw"
  width="1536"
  height="1024"
  alt="Walnut desk with cable tray and monitor arm"
  loading="lazy"
  decoding="async"
/>
```

`sizes` describes the CSS slot, not the source image. If the image is a card thumbnail that renders around one third of the viewport on desktop, use a desktop value like `33vw`; if it spans the viewport on mobile, include `100vw` for the fallback branch.

## `<picture>` for modern formats

Use `<picture>` when serving AVIF/WebP plus a fallback:

```html
<picture>
  <source
    type="image/avif"
    srcset="/images/hero-640.avif 640w, /images/hero-1280.avif 1280w, /images/hero-1920.avif 1920w"
    sizes="100vw"
  />
  <source
    type="image/webp"
    srcset="/images/hero-640.webp 640w, /images/hero-1280.webp 1280w, /images/hero-1920.webp 1920w"
    sizes="100vw"
  />
  <img
    src="/images/hero-1280.jpg"
    srcset="/images/hero-640.jpg 640w, /images/hero-1280.jpg 1280w, /images/hero-1920.jpg 1920w"
    sizes="100vw"
    width="1920"
    height="1080"
    alt="Team dashboard showing revenue and retention metrics"
    fetchpriority="high"
  />
</picture>
```

Only the nested `img` carries `alt`, `width`, `height`, `loading`, `decoding`, and `fetchpriority`.

## Art direction

Use media-specific sources when the crop changes by breakpoint:

```html
<picture>
  <source
    media="(min-width: 900px)"
    srcset="/images/hero-wide-1280.avif 1280w, /images/hero-wide-1920.avif 1920w"
    sizes="100vw"
    type="image/avif"
  />
  <source
    media="(max-width: 899px)"
    srcset="/images/hero-mobile-640.avif 640w, /images/hero-mobile-960.avif 960w"
    sizes="100vw"
    type="image/avif"
  />
  <img
    src="/images/hero-wide-1280.jpg"
    width="1920"
    height="1080"
    alt="Founder presenting the analytics dashboard on stage"
  />
</picture>
```

Keep art-directed crops semantically equivalent. Do not hide important content or change meaning across breakpoints.

## LCP image checklist

For the likely LCP image:

- Do not set `loading="lazy"`.
- Prefer markup images over CSS background images when the image is contentful.
- Add `fetchpriority="high"` for plain HTML/React when appropriate.
- In frameworks with image components, use their priority/preload API instead of raw `fetchpriority` if that is the established pattern.
- Ensure `sizes` does not force the browser to download an oversized candidate.
- Preload only the single critical image; excessive preloads compete with CSS and fonts.
- When preloading a responsive image, use `imagesrcset` + `imagesizes` on `<link rel="preload" as="image">` so the preload matches the `srcset` pick.
- Priority, preload, and caching policy: see [delivery-strategy.md](./delivery-strategy.md).

## Lazy images

For below-the-fold images:

```html
<img
  src="/images/card-640.webp"
  srcset="/images/card-320.webp 320w, /images/card-640.webp 640w, /images/card-960.webp 960w"
  sizes="(min-width: 768px) 33vw, 100vw"
  width="960"
  height="640"
  alt="Customer support inbox with resolved conversations"
  loading="lazy"
  decoding="async"
/>
```

Do not lazy-load images that are initially visible in common mobile or desktop viewports.

## CSS background images

Background images cannot use `alt`, `srcset`, or native loading behavior. Use them only for decorative imagery or when CSS art direction is required.

If a background image is contentful or likely to be LCP, convert it to markup where possible. If it must remain CSS, use media queries and image-set carefully:

```css
.hero {
  background-image: image-set(
    url("/images/hero-1280.avif") type("image/avif"),
    url("/images/hero-1280.webp") type("image/webp"),
    url("/images/hero-1280.jpg") type("image/jpeg")
  );
}
```

## Accessibility and SEO

- `alt` should describe the image's purpose in context, not keyword-stuff.
- Product images should mention the product and differentiating visible details.
- Article images should support the article topic and align with captions or surrounding text.
- Decorative gradients, texture overlays, separators, and repeated icons should use `alt=""` or CSS backgrounds.
- File names should be descriptive when assets are public and SEO-relevant, for example `walnut-standing-desk-cable-tray.webp`.
