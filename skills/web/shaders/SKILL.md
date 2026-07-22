---
name: shaders
description: >-
  Guides building GPU-accelerated visual effects in React / Next.js with the
  `shaders` npm package from shaders.com — declarative `<Shader>` component
  trees, composition (stacking, nesting, blend modes, masking), reactive props,
  dynamic prop drivers (`auto-animate`, `mouse-position`, `map`), shape (SDF)
  effects, color space, performance budget (RTT / generator vs filter), and SSR
  safety. Use when the user asks to add a "shader background", "WebGPU effect",
  "aurora / plasma / swirl / glass / cursor-trail" hero, mentions shaders.com,
  the `shaders/react` package, the `<Shader>` component, or wants animated
  GPU-rendered visuals in a React or Next.js app. Not for raw GLSL / WebGL /
  Three.js / react-three-fiber work — those use different APIs.
---

# Shaders (shaders.com) for React / Next.js

Build GPU-accelerated visual effects with the [`shaders` npm package](https://shaders.com/docs/guide) using the same component-tree mental model as JSX. No GLSL, no render loop, no manual GPU plumbing — stack `<Shader>` children, pass props, and treat the canvas like any other CSS-sized block.

This skill teaches the **mental model, composition patterns, gotchas, and aesthetic discipline** for the library. It does **not** mirror the component reference — for the full prop list of each component, defer to [shaders.com/docs/components](https://shaders.com/docs/components).

Out of scope: custom GLSL/WebGPU code, Three.js / react-three-fiber scenes, and DOM post-processing (use CSS `filter` / `backdrop-filter` first). Shaders needs a real GPU and a real `<canvas>` — it cannot run in pure SSR, Node, or Workers.

## Mental model

1. **One `<Shader>` = one `<canvas>` element.** No matter how many children you nest, the output is always a single DOM canvas you size with normal CSS.
2. **Children are visual layers, evaluated top-to-bottom**, blended on the GPU. Same intuition as stacking divs with `z-index`.
3. **Two component families:**
   - **Generators** create pixels from scratch (`SolidColor`, `LinearGradient`, `RadialGradient`, `Plasma`, `Aurora`, `Swirl`, `Circle`, noise patterns…). Very cheap.
   - **Filter / effect** components read pixels from below (`Blur`, `Glow`, `Glass`, `GlassTiles`, `Dither`, `CursorTrail`, etc.). When wrapped around children, they apply **only to those children** (a "nesting boundary").
4. **Sibling order = paint order. Nesting = scope of effect.**

```jsx
<Shader className="w-full h-64">
  <LinearGradient colorA="#0f172a" colorB="#7c3aed" />  {/* bottom layer */}
  <GlassTiles>                                          {/* filter applied only to Circle */}
    <Circle color="#ff0088" radius={0.8} />
  </GlassTiles>
</Shader>
```

5. **Props are reactive and cheap.** Changing a prop writes a GPU uniform — no recompile, no flicker. Bind them to `useState`, scroll position, motion values, anything.
6. **WebGPU first, WebGL2 fallback.** The browser handles it; no setup required from you.

## Install & import (React)

```bash
npm install shaders
```

```jsx
import { Shader, LinearGradient, Aurora, Plasma, Swirl, CursorTrail, Glass } from 'shaders/react'
```

All component names are PascalCase, all props are camelCase, and `<Shader>` is always the root.

## Sizing & positioning

The `<canvas>` has **no intrinsic size**. Apply width/height via `className` or `style` on the `<Shader>` component itself — never target the inner canvas (the internal DOM structure may change).

```jsx
<Shader className="w-full h-64" />            {/* explicit height */}
<Shader className="w-full aspect-video" />    {/* fluid with aspect */}
<Shader className="fixed inset-0 -z-10" />    {/* full-page background */}
<Shader className="w-full h-[100dvh]" />      {/* mobile-safe viewport */}
```

For shader-as-background patterns (full page, section, card), see [react-recipes.md](./react-recipes.md).

## Composition primitives

### 1. Stacking (siblings)

Bottom → top in source order:

```jsx
<Shader>
  <LinearGradient />
  <Circle color="#ff0088" radius={0.6} />
  <CursorTrail />
</Shader>
```

### 2. Nesting (scope a filter)

Wrap a filter around the children you want it to affect; siblings before/after are untouched:

```jsx
<Shader>
  <LinearGradient />               {/* not affected */}
  <Blur radius={20}>
    <Circle color="#ff0088" />     {/* only this is blurred */}
  </Blur>
</Shader>
```

### 3. Blend, opacity, visibility (per-component props)

- `blendMode` (string, default `"normal"`) — 20 modes: the CSS-familiar set (`multiply`, `screen`, `overlay`, `difference`, …) plus `normal-oklab` / `normal-oklch`. Full list in the [components reference](https://shaders.com/docs/components).
- `opacity` (0–1) — multiplies alpha before blending. **Still renders the layer.**
- `visible={false}` — fully excludes from composition. **Zero GPU cost.** Use this (not `opacity={0}`) when a layer exists only as a mask source.

### 4. Masking (`id` + `maskSource`)

Any component can drive the visibility of another. Give the source an `id`, reference it from `maskSource`, and pick a `maskType` (`alpha` default, `alphaInverted`, `luminance`, `luminanceInverted`). Layer order doesn't matter — the mask just needs to exist in the tree, usually with `visible={false}`.

```jsx
<Shader>
  <Circle id="mask" radius={0.8} visible={false} />
  <LinearGradient maskSource="mask" />
</Shader>
```

## Reactive props — bind anything

```jsx
const [angle, setAngle] = useState(0)
return (
  <Shader className="w-full h-64">
    <LinearGradient colorA="#ff6b6b" colorB="#4ecdc4" angle={angle} />
  </Shader>
)
```

Every numeric / color / position prop is reactive. GPU updates are uniform writes — animate freely without performance worries.

## Dynamic prop drivers (declarative animation)

Instead of `useState` + `requestAnimationFrame`, pass a **driver config object** as a prop value. The library runs the loop on the GPU. Four drivers:

| Driver | Drives | Use for |
| --- | --- | --- |
| `auto-animate` | any numeric prop | breathing intensity, rotating gradient angle, pulsing radius |
| `mouse-position` | any `{x, y}` prop (e.g. `center`) | cursor-following circles, parallax |
| `mouse` | any numeric prop | blur from mouse-X, hue from mouse-Y |
| `map` | any numeric prop | drive a prop from the luminance/alpha of another layer (by `id`) |

```jsx
<Shader className="w-full h-64">
  <LinearGradient colorA="#0f172a" colorB="#4f46e5" />
  <LensFlare
    center={{ type: 'mouse-position', smoothing: 0.1 }}
    intensity={{
      type: 'auto-animate',
      mode: 'ping-pong',
      outputMin: 0.4,
      outputMax: 1.0,
      speed: 0.6,
    }}
  />
</Shader>
```

Prefer dynamic prop drivers over manual `requestAnimationFrame` loops — fewer React re-renders, less code, the library handles cleanup.

## Transforms (UV-space, not CSS)

The `transform` prop shifts how a component samples its own coordinate system. It is **not** a CSS transform on the canvas DOM node.

```jsx
<LinearGradient transform={{ rotation: 45, scale: 1.5, offsetX: 0.2 }} />
<Swirl transform={{ offsetX: 0.3, edges: 'wrap' }} />  {/* tiles seamlessly */}
```

Edge modes when content shifts out of bounds: `transparent` (default), `stretch`, `mirror`, `wrap`.

A non-default `transform` triggers a render-to-texture (RTT) pass that **persists for the lifetime of the component** — keep it in mind if you toggle transforms on/off in animations.

## Shape / SDF effects (Glass, Neon, Emboss…)

A handful of components are driven by a **shape**: they wrap a physically-based effect around an SDF outline. Pass a `shape` prop with a `type` and shape-specific params.

Built-in `type` values: `circleSDF`, `ellipseSDF`, `polygonSDF`, `starSDF`, `flowerSDF`, `ringSDF`, `crossSDF`, `roundedRectSDF`, `vesicaSDF`, `crescentSDF`, `trapezoidSDF`.

```jsx
<Glass shape={{ type: 'circleSDF', radius: 0.35 }} />
<Neon  shape={{ type: 'starSDF', radius: 0.35, sides: 6, innerRatio: 0.45 }} />
<Emboss shape={{ type: 'roundedRectSDF', width: 0.4, height: 0.25, rounding: 0.06 }} />
```

**Custom logo / SVG shape:** requires a pre-generated SDF `.bin` file passed via `shapeSdfUrl`. The conversion lives inside the Shaders editor (Pro) or the Shaders MCP. Do not attempt to generate the `.bin` by hand — point the user at the editor or MCP and link [Shape Effects](https://shaders.com/docs/guide/shape-effects).

## Color space (Figma parity)

Default output is **Display P3 linear** (wide gamut). If the user is copying hex values from Figma / Sketch / Adobe XD, those tools work in sRGB and the colors will look off. Set the root:

```jsx
<Shader colorSpace="srgb">
  <SolidColor color="#5b18ca" />
</Shader>
```

Note: this is the **output** color space. Many gradient components also expose their own `colorSpace` prop (`linear`, `oklch`, `oklab`, `hsl`, `hsv`, `lch`) that controls **interpolation between color stops** — orthogonal concept, both can be set.

## SSR / Next.js (mandatory pattern)

Shaders requires a GPU and **cannot run on the server**. In Next.js, always wrap shader components as client-only.

### App Router — option A (`'use client'`)

```jsx
// components/MyShader.jsx
'use client'
import { Shader, Aurora } from 'shaders/react'

export default function MyShader() {
  return (
    <Shader className="w-full h-64">
      <Aurora />
    </Shader>
  )
}
```

### App Router — option B (`next/dynamic`, recommended for backgrounds)

```jsx
import dynamic from 'next/dynamic'
const MyShader = dynamic(() => import('@/components/MyShader'), { ssr: false })
```

Use option B whenever the shader file should stay framework-agnostic, or when you want to guarantee the module never loads on the server (avoids hydration edge cases).

### Plain React SSR (no Next.js)

Guard with a `mounted` state:

```jsx
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return null
```

## Lifecycle — `onReady`

`<Shader onReady={...}>` fires once after the GPU has compiled the shader and the first frame is ready. Use it to fade the canvas in, hide a skeleton, or trigger a dependent animation:

```jsx
const [visible, setVisible] = useState(false)
return (
  <Shader
    onReady={() => setVisible(true)}
    style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s' }}
  >
    <Aurora />
  </Shader>
)
```

## Performance budget

Generators are essentially free; cost comes from **render-to-texture (RTT) passes** — every nesting boundary where a filter wraps children adds one. Relative cost tiers:

| Tier | Examples |
| --- | --- |
| Very light | `SolidColor`, `LinearGradient`, `RadialGradient` |
| Light | `Swirl`, `Circle`, `Plasma`, simplex noise, most generators |
| Medium | `Blur`, `Glow`, `Dither`, `Halftone`, `Pixelate`, `CursorTrail` |
| Heavy | `Glass`, `GlassTiles`, multiple nested RTT effects |

What triggers RTT (one extra pass each):

- Any filter/effect component reading the layer below.
- A non-default `transform`.
- A layer used as `maskSource`.
- A `map` dynamic prop driver (one-time RTT on first use).

Practical rules:

1. **Build the base with generators.** A full-screen `Plasma` or `LinearGradient` is essentially free; stack expensive filters on top sparingly.
2. **Don't nest filters deeply.** Three flat sibling filters is cheaper than three nested ones.
3. **Use `visible={false}` to truly exclude a layer.** `opacity={0}` still renders it. A hidden mask source costs nothing extra beyond being read as a mask.
4. **Animate runtime props, not compile-time props.** A small set of props recompile the shader on change — the component reference flags them. Driving them from `useState` causes flashes.
5. **Off-screen canvases auto-throttle.** The library drops to ~1 fps when scrolled out of view — don't manually pause unless you need to.

## Decorative shaders — disable pointer capture

Canvases capture all pointer events by default. For a decorative background, add `pointer-events-none` so clicks reach the content below. Interactive components like `CursorTrail` and `CursorRipples` listen on `window`, so they still work even with `pointer-events: none`.

```jsx
<Shader className="fixed inset-0 -z-10 pointer-events-none">
  <Aurora />
</Shader>
```

## Aesthetic discipline (avoid generic GPU slop)

The same `<Plasma />` with default props ships on every "AI hero" landing page. Before reaching for a component, commit to a direction:

- **Pick one extreme**, then execute it precisely: brutally minimal, maximalist saturation chaos, retro-futuristic CRT, organic / aurora-like, editorial monochrome with one accent. Don't average.
- **Choose colors deliberately.** Sample from the user's brand palette or a hand-picked combo — never ship default Plasma purple-on-black. Set `colorSpace="srgb"` if matching Figma hex.
- **One signature motion.** A breathing intensity, a slow rotation, a cursor-following accent — pick one and tune it slowly. Layering five auto-animations cancels into mush.
- **Restraint reads as premium.** A 1-component shader (single `Aurora` with a brand-tinted palette) usually beats a 5-layer composition. Add layers only when each one earns its presence.
- **Respect motion preferences.** Wrap shader-heavy hero sections in a `prefers-reduced-motion` check and drop to a static gradient if the user opted out.

```jsx
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
return reduced
  ? <div className="w-full h-64 bg-gradient-to-br from-slate-900 to-violet-700" />
  : <Shader className="w-full h-64"><Aurora speed={3} /></Shader>
```

## Workflow when adding a shader to a React/Next project

1. **Confirm the framework and styling** (Next.js App/Pages Router, Vite, plain React; Tailwind or plain CSS). If Next.js, lock in the SSR pattern before writing the component.
2. **Commit to one aesthetic direction.** Ask for brand colors and the shader's role (background, hero, decorative accent, interactive surface).
3. **Pick one or two components** from the [components reference](https://shaders.com/docs/components). Start with a generator as the base; add filters / masks only if the design requires them.
4. **Wire sizing on `<Shader>`**; add `pointer-events-none` if decorative.
5. **Bind one prop** to state or a dynamic prop driver if interactivity is required.
6. **Test in the browser** and watch the console for compile warnings on the first frame.
7. **Audit performance**: count RTT-causing layers (filters, masks, transforms, `map` drivers). If you have 3+, see if a flat composition gives the same look.
8. **Respect `prefers-reduced-motion`** with a static fallback before shipping.

For copy-pasteable React/Next.js patterns (full-page background, section background, card fill, mask reveal, scroll-linked, cursor-driven, SSR-safe loader), see [react-recipes.md](./react-recipes.md).

## Reference map

- Full guide and component reference: [shaders.com/docs/guide](https://shaders.com/docs/guide) and [shaders.com/docs/components](https://shaders.com/docs/components).
- Composition rules: [Composing Effects](https://shaders.com/docs/guide/composing-effects), [Blending & Masking](https://shaders.com/docs/guide/blending-masking).
- Reactivity: [Props & Reactivity](https://shaders.com/docs/guide/props-reactivity), [Dynamic Props](https://shaders.com/docs/guide/dynamic-props), [Transforms](https://shaders.com/docs/guide/transforms).
- Shapes: [Shape / SDF Effects](https://shaders.com/docs/guide/shape-effects).
- Performance: [Performance](https://shaders.com/docs/guide/performance). Color: [Color Space](https://shaders.com/docs/guide/color-space).
- SSR: [Next.js / SSR](https://shaders.com/docs/guide/react/ssr). Lifecycle: [Hooks & Events](https://shaders.com/docs/guide/hooks-events).
- Pro MCP server (optional, lets the agent browse / install presets and generate SDFs from SVGs): [Shaders MCP](https://shaders.com/docs/guide/mcp).
