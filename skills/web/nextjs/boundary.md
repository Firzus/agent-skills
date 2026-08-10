# The server/client boundary

The boundary is the one decision that shapes everything else in an App Router
codebase: it decides what ships to the browser, what can hold a secret, and
what can hold state. Read this before adding a directive, a provider, or a
piece of shared state.

## What the directive actually does

`"use client"` goes at the top of the file, before any imports. It declares a
boundary — an entry point into the client graph — not a per-component
annotation. Once a file carries it, every module it imports and every component
it directly renders enters the client bundle, so repeating the directive down
the tree is noise.

The rule is about the **module graph**. That is the escape hatch:

```tsx
// app/page.tsx — stays a Server Component
import { Modal } from './modal'          // "use client"
import { Cart } from './cart'            // Server Component, reads the DB

export default function Page() {
  return <Modal><Cart /></Modal>
}
```

`Cart` is passed as `children`, so it is never imported by `modal.tsx`. It
renders on the server and arrives as rendered output. This **pass-through**
pattern is how a stateful client shell wraps server-rendered content without
dragging it client-side.

`"use server"` is the mirror: it marks a function or a whole file as
server-executed. To call one from a Client Component, it must live in a file
with `'use server'` at the top; that file can then be imported by both graphs.

## Choosing a component type

| Need | Type |
| --- | --- |
| State, event handlers, `useEffect`, custom hooks | Client |
| `window`, `localStorage`, any browser API | Client |
| Fetching close to the data source, secrets, large dependencies | Server |
| Streaming progressive UI | Server |

Default to Server. Reach for Client at the leaf that genuinely needs
interactivity — a `<Search/>` inside a nav, not the nav.

## Props must be serializable

Props crossing the boundary are serialized by React. Functions are explicitly
invalid: `onClick={handler}` from a Server Component to a Client Component does
not work. Class instances, `Date` subclasses, and anything holding a closure
fail the same way. Pass plain data across, and define handlers inside the
client file.

A type can be perfectly valid TypeScript and still fail at the boundary — the
compiler does not check serializability.

## Context and providers

React context is not supported in Server Components. A provider must be a
Client Component taking `children`:

```tsx
// app/theme-provider.tsx
'use client'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('dark')
  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}
```

Render providers **as deep in the tree as possible** — wrap the subtree that
consumes them, not `<html>`. The docs' stated reason is optimization of the
static Server Component parts, and the mechanism is the module graph: a
provider at the root turns the whole app into a client entry point.

This is where generic React advice misleads. "Lift state into a provider so
siblings can read it" is sound in a client-only React app and expensive here:
every component under that provider stops being a Server Component. The
reconciliation:

> Lift state to the closest common parent. In the App Router, that parent
> should be the smallest possible Client Component, with Server Components
> passed through it as `children` so they stay on the server.

Reach for a store only for state that genuinely spans unrelated routes.

## Preventing environment poisoning

A module can be imported by either graph, so server code reaches the client by
accident. The failure is silent rather than loud: only `NEXT_PUBLIC_`-prefixed
env vars reach the client bundle, and the rest are replaced with an empty
string. A leaked `getData()` reading `process.env.API_KEY` does not crash — it
sends an empty key.

`import 'server-only'` at the top of a server-only module turns that leak into
a **build-time error**. `client-only` is the mirror for `window`-touching
modules.

```ts
// lib/data.ts
import 'server-only'

export async function getData() {
  const res = await fetch('https://api.example.com/data', {
    headers: { authorization: process.env.API_KEY! },
  })
  return res.json()
}
```

Installing the npm packages is **optional**. Next.js handles these imports
internally to produce clearer errors and ships its own type declarations —
needed under `noUncheckedSideEffectImports`. The package contents are not used.
Install them only if a lint rule flags an extraneous dependency.

## Third-party components

A library component using client-only features but shipping no directive breaks
when imported into a Server Component. Re-export it from your own `"use client"`
file. Some bundlers strip the directive, so a library that looks correct can
still arrive without it.

## Composition rules that survive the boundary

These carry over from general React practice and are worth applying:

- Prefer explicit variant components over boolean-prop proliferation. Three
  booleans encode eight states, most of them meaningless.
- Use compound components with a shared context when parts must coordinate; the
  provider is the only thing that knows how the state is managed.
- Prefer `children` over `renderX` props.
- Derive values during render rather than syncing them in an effect.
- Don't define components inside components — every render remounts the subtree.
- React 19: `forwardRef` is unnecessary, `ref` is a regular prop. `use()` reads
  context and can be called conditionally, unlike `useContext()`.
