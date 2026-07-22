# Shaders — React / Next.js recipes

Copy-pasteable patterns for the `shaders` npm package in a React (Vite, CRA) or Next.js (App Router) project. Each recipe assumes Tailwind for sizing; swap for inline `style` if Tailwind is absent.

All component files shown should be **client components** in Next.js. For App Router, either put `'use client'` at the top or import them via `dynamic(..., { ssr: false })`. See [SKILL.md → SSR / Next.js](./SKILL.md#ssr--nextjs-mandatory-pattern).

## Contents

1. [Full-page background (Next.js App Router)](#1-full-page-background-nextjs-app-router)
2. [Hero section background (scoped to one section)](#2-hero-section-background-scoped-to-one-section)
3. [Card with shader fill](#3-card-with-shader-fill)
4. [Inline content block (flows with text)](#4-inline-content-block-flows-with-text)
5. [Mask reveal (text shape masks a moving gradient)](#5-mask-reveal-text-shape-masks-a-moving-gradient)
6. [Cursor-following accent with `mouse-position` driver](#6-cursor-following-accent-with-mouse-position-driver)
7. [Scroll-linked prop (Framer Motion)](#7-scroll-linked-prop-framer-motion)
8. [Auto-animated breathing intensity (no state)](#8-auto-animated-breathing-intensity-no-state)
9. [Glass over an image (SDF effect on top of a generator)](#9-glass-over-an-image-sdf-effect-on-top-of-a-generator)
10. [SSR-safe loader with fade-in (`onReady`)](#10-ssr-safe-loader-with-fade-in-onready)
11. [`prefers-reduced-motion` fallback](#11-prefers-reduced-motion-fallback)
12. [Next.js — `dynamic` import with `ssr: false`](#12-nextjs--dynamic-import-with-ssr-false)

## 1. Full-page background (Next.js App Router)

Lives in the root layout, sits behind every page, ignores pointer events, scales to the dynamic viewport.

```tsx
// components/BackgroundShader.tsx
'use client'
import { Shader, Aurora } from 'shaders/react'

export default function BackgroundShader() {
  return (
    <Shader className="fixed inset-0 -z-10 pointer-events-none w-full h-[100dvh]">
      <Aurora speed={3} intensity={60} />
    </Shader>
  )
}
```

```tsx
// app/layout.tsx
import BackgroundShader from '@/components/BackgroundShader'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative">
        <BackgroundShader />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  )
}
```

Notes:

- `h-[100dvh]` (dynamic viewport height) is mobile-safe — accounts for collapsing browser chrome.
- `-z-10` keeps the shader behind the content; `pointer-events-none` lets clicks pass through to `<main>`.
- Wrap the import with `dynamic(() => import('@/components/BackgroundShader'), { ssr: false })` from a Server Component parent if you want to skip the `'use client'` directive entirely.

## 2. Hero section background (scoped to one section)

The parent section must be `position: relative` and `overflow: hidden` to contain the absolute canvas.

```tsx
'use client'
import { Shader, Plasma } from 'shaders/react'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-32 px-8">
      <Shader className="absolute inset-0 -z-10 pointer-events-none">
        <Plasma colorA="#7c3aed" colorB="#0f172a" speed={1.5} contrast={1.2} />
      </Shader>

      <div className="relative z-10 max-w-3xl mx-auto text-center text-white">
        <h1 className="text-5xl font-semibold">Your headline</h1>
        <p className="mt-4 text-white/80">Your supporting copy.</p>
      </div>
    </section>
  )
}
```

## 3. Card with shader fill

A shader as the visual surface of a card. `overflow-hidden` + `rounded-*` clip the canvas to the card shape.

```tsx
'use client'
import { Shader, SolidColor, Glow } from 'shaders/react'

export function GlowCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-2xl overflow-hidden p-8 text-white">
      <Shader className="absolute inset-0 pointer-events-none">
        <SolidColor color="#1e1b4b" />
        <Glow intensity={0.4} color="#6366f1" />
      </Shader>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
```

## 4. Inline content block (flows with text)

A shader sized like an embedded video or hero image inside an article.

```tsx
'use client'
import { Shader, Swirl } from 'shaders/react'

export function InlineSwirl() {
  return (
    <Shader className="block w-full aspect-video my-8 rounded-xl overflow-hidden">
      <Swirl colorA="#1275d8" colorB="#e19136" speed={0.8} />
    </Shader>
  )
}
```

## 5. Mask reveal (text shape masks a moving gradient)

The mask source has `visible={false}` and a stable `id`. Any other component with `maskSource="..."` is clipped to that shape.

```tsx
'use client'
import { Shader, Circle, LinearGradient } from 'shaders/react'

export function MaskedGradient() {
  return (
    <Shader className="w-full h-64">
      <Circle id="mask" radius={0.8} visible={false} />
      <LinearGradient
        colorA="#ff6b6b"
        colorB="#4ecdc4"
        maskSource="mask"
        maskType="alpha"
      />
    </Shader>
  )
}
```

For a text-shaped mask, replace the `<Circle>` with any SDF-driven component (Glass / Neon / Emboss with `shape: { type: 'roundedRectSDF', ... }`) or a custom SDF via `shapeSdfUrl`.

## 6. Cursor-following accent with `mouse-position` driver

No `useEffect`, no event listener — the driver runs on the GPU.

```tsx
'use client'
import { Shader, LinearGradient, Circle } from 'shaders/react'

export function CursorAccent() {
  return (
    <Shader className="w-full h-96">
      <LinearGradient colorA="#0f172a" colorB="#1e1b4b" />
      <Circle
        color="#6366f1"
        radius={0.18}
        softness={0.6}
        blendMode="screen"
        center={{ type: 'mouse-position', smoothing: 0.12, momentum: 0.2 }}
      />
    </Shader>
  )
}
```

`smoothing` adds lag (0 = instant, ~0.15 = pleasant follow). `momentum` adds spring overshoot.

## 7. Scroll-linked prop (Framer Motion)

Bind a shader prop to scroll progress. Works because the prop is reactive on every render.

```tsx
'use client'
import { useScroll, useTransform, useMotionValueEvent } from 'framer-motion'
import { useState, useRef } from 'react'
import { Shader, LinearGradient } from 'shaders/react'

export function ScrollGradient() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const angleMV = useTransform(scrollYProgress, [0, 1], [0, 360])
  const [angle, setAngle] = useState(0)
  useMotionValueEvent(angleMV, 'change', setAngle)

  return (
    <div ref={ref} className="relative h-screen overflow-hidden">
      <Shader className="absolute inset-0 pointer-events-none">
        <LinearGradient colorA="#7c3aed" colorB="#0ea5e9" angle={angle} />
      </Shader>
    </div>
  )
}
```

If you don't need fine-grained React state (e.g. the value isn't read elsewhere), prefer the `auto-animate` driver or a `transform: { rotation }` driven by `requestAnimationFrame` outside React.

## 8. Auto-animated breathing intensity (no state)

Declarative, runs entirely in the renderer.

```tsx
'use client'
import { Shader, Aurora } from 'shaders/react'

export function BreathingAurora() {
  return (
    <Shader className="w-full h-screen pointer-events-none">
      <Aurora
        intensity={{
          type: 'auto-animate',
          mode: 'ping-pong',
          outputMin: 50,
          outputMax: 95,
          speed: 0.4,
          easing: 'sine',
        }}
      />
    </Shader>
  )
}
```

## 9. Glass over an image (SDF effect on top of a generator)

Glass refracts whatever is below it. Stack a generator first, then nest Glass to scope the refraction.

```tsx
'use client'
import { Shader, Plasma, Glass } from 'shaders/react'

export function GlassOnPlasma() {
  return (
    <Shader className="w-full h-96">
      <Plasma colorA="#7c3aed" colorB="#06b6d4" />
      <Glass
        shape={{ type: 'circleSDF', radius: 0.35 }}
        refraction={1}
        aberration={0.5}
        fresnel={0.2}
        blur={0.05}
      />
    </Shader>
  )
}
```

For a custom logo shape, replace `shape` with `shapeSdfUrl="/sdfs/logo.bin"` — the `.bin` must come from the Shaders editor or MCP. Do not try to author it manually.

## 10. SSR-safe loader with fade-in (`onReady`)

Avoids the harsh flash between "no canvas" and "first GPU frame".

```tsx
'use client'
import { useState } from 'react'
import { Shader, Aurora } from 'shaders/react'

export function FadeInShader() {
  const [ready, setReady] = useState(false)
  return (
    <Shader
      className="w-full h-screen pointer-events-none"
      onReady={() => setReady(true)}
      style={{ opacity: ready ? 1 : 0, transition: 'opacity 600ms ease-out' }}
    >
      <Aurora />
    </Shader>
  )
}
```

## 11. `prefers-reduced-motion` fallback

Required for any shader-driven hero. Static gradient when the user opted out of motion.

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Shader, Aurora } from 'shaders/react'

export function AccessibleHero() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (reduced) {
    return <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-violet-900 to-cyan-700" />
  }
  return (
    <Shader className="w-full h-screen pointer-events-none">
      <Aurora speed={3} />
    </Shader>
  )
}
```

## 12. Next.js — `dynamic` import with `ssr: false`

The cleanest pattern when you want to use a shader from a Server Component without sprinkling `'use client'` across every file.

```tsx
// app/page.tsx (Server Component — no 'use client')
import dynamic from 'next/dynamic'

const HeroSection = dynamic(() => import('@/components/HeroSection'), { ssr: false })

export default function Page() {
  return (
    <main>
      <HeroSection />
      {/* rest of the page stays SSR'd */}
    </main>
  )
}
```

The `HeroSection` module (and its `shaders/react` import) never reaches the server bundle.
