# TypeScript in a Next.js codebase

Only what an agent writing App Router code needs. The framework generates more
type information than most codebases use, and hand-written equivalents are
strictly worse because they do not follow the filesystem.

## Generated route types

Next.js generates **global helpers, available without imports** —
`PageProps`, `LayoutProps`, `RouteContext` — during `next dev`, `next build`,
or `next typegen`.

```tsx
// app/blog/[slug]/page.tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  return <article>{slug}</article>
}
```

```tsx
// app/dashboard/layout.tsx — named slots come from the directory
export default function Layout(props: LayoutProps<'/dashboard'>) {
  return <section>{props.children}</section>
  // if app/dashboard/@analytics exists, props.analytics is typed
}
```

```ts
// app/users/[id]/route.ts
export async function GET(_req: NextRequest, ctx: RouteContext<'/users/[id]'>) {
  const { id } = await ctx.params
  return Response.json({ id })
}
```

These beat hand-writing `{ params: Promise<{ id: string }> }` because param and
slot names are derived from the filesystem: rename a segment and the type
follows. Run `next typegen` after changing route structure, or in CI, to
regenerate without starting a dev server.

`next-env.d.ts` is managed by Next.js. Its contents are an implementation
detail: add it to `.gitignore`, remove it from Git if tracked, never edit it.

## Typed routes

```ts
// next.config.ts
const nextConfig: NextConfig = { typedRoutes: true }
```

Top-level, no longer experimental. It types `href` on `next/link` and, in the
App Router, the `push`, `replace` and `prefetch` methods of `next/navigation`.
Literal `href` strings are validated; a computed one may need `as Route`. For a
component forwarding an href, the generic form is:

```tsx
function Card<T extends string>({ href }: { href: Route<T> | URL }) { … }
```

## Type checking is a build gate

`next build` **fails the production build on TypeScript errors, by design**.
Treat that as the contract:

- `typescript.ignoreBuildErrors` disables type checking entirely. Do not reach
  for it to get a build through; fix the types.
- Next uses the project-local `tsc` CLI by default. It checks the whole project
  selected by `tsconfig` — including test files and `.next/dev/types` — and
  prints native `tsc` diagnostics without Next's code frames or route-specific
  error rewriting.
- `experimental.useTypeScriptCli: false` switches back to Next's own checker.
  Experimental, and its behaviour may change.

Floors in Next 16: **TypeScript 5.1+**, **Node.js 20.9+**.

## `satisfies`

Validates an expression against a type **without widening it**, so literal
inference survives. This is the single most useful language feature for a Next
codebase and it is missing from most TypeScript skills:

```ts
export const metadata = {
  title: 'Home',
  openGraph: { type: 'website' },
} satisfies Metadata
```

With `: Metadata` the object widens to the annotation and you lose the literal
types; with `satisfies` you get the check and keep them. Same story for config
objects and route maps.

## Discriminated unions

The right shape for anything with an outcome, and the compile-time version of
"explicit variants over boolean modes":

```ts
type Result<T> = { ok: true; data: T } | { ok: false; error: string }

if (result.ok) result.data      // narrowed
else result.error
```

Use them for Server Action results, for fetch outcomes, and for component props
where a `variant` field gates which other props are legal — that makes the
illegal combination unrepresentable instead of merely discouraged.

## Generic constraints

Constrain a type parameter to what the function actually requires, so the error
lands at the call site:

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b
}
```

Reach for conditional types, `infer`, and mapped types when modelling a shared
API surface. In route and component code they usually cost more than they
return — the generated helpers already cover the framework's shapes.

## Types do not check the boundary

A valid TypeScript type can still fail at runtime across a boundary:

- Props to Client Components must be serializable by React.
- Arguments to `use cache` functions use Server Component serialization, which
  is **more restrictive** than the Client Component serialization applied to
  return values.
- Server Action arguments arrive from the network. The signature is not
  validation; validate at the top of the action.
