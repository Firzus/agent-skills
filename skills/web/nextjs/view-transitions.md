# View transitions

Animating between UI states or routes with React's `<ViewTransition>`.

## Status: canary-only

`<ViewTransition>` and `addTransitionType` are **not in a stable React
release** — React's own reference marks them as available in the latest Canary
version. React distinguishes Canary from Experimental, so these sit in the more
mature of the two pre-stable channels, but the API can still move.

The App Router in Next.js 16 uses the latest React Canary release, so
`<ViewTransition>` works there **without installing `react@canary`**. Do not
install it: `npm ls react` showing a stable-looking version is expected, and
forcing a canary install breaks the version Next expects.

Outside the App Router, treat this as canary-only and decide accordingly.

## Decide whether to animate at all

Every `<ViewTransition>` should communicate a spatial relationship or a
continuity. If you cannot articulate what it communicates, don't add it.

Reserve directional slides for hierarchical navigation and ordered sequences.
Lateral movement — tab to tab, sibling to sibling — should not slide, because
direction falsely implies depth.

Handle reduced motion explicitly. Assume nothing is built in: gate the
animation on `prefers-reduced-motion` in CSS.

## The three-part model

Declare *what* with `<ViewTransition>`, trigger *when* with a transition API,
control *how* with CSS.

```tsx
import { unstable_ViewTransition as ViewTransition } from 'react'

<ViewTransition>
  <Card id={id} />
</ViewTransition>
```

React assigns `view-transition-name` and calls `document.startViewTransition`
itself. **Never call `startViewTransition` yourself** — you get a fight between
your call and React's.

## The four rules that break it

1. **Only `startTransition`, `useDeferredValue`, or `Suspense` activate a
   transition.** A plain `setState` will not animate. This is the most common
   silent failure: the code looks right and nothing moves.
2. **Placement**: the `<ViewTransition>` must appear before any DOM node in its
   subtree, or enter and exit are suppressed. Wrapping it inside a `<div>`
   kills them.
3. Triggers are `enter`, `exit`, `update`, and `share`. Props take `"auto"`,
   `"none"`, a class name, or a `{ [type]: value }` map.
4. `default="none"` disables every trigger unless individually listed.

## Patterns, by value

| Pattern | When |
| --- | --- |
| Shared element | the same entity appears in both states — thumbnail to hero |
| Suspense reveal | content replacing a skeleton |
| List identity | reorder, filter, add, remove within a list |
| State change | expand/collapse, toggle between panels |
| Route change | navigation between pages |

Shared-element transitions earn the most and cost the least attention; route
transitions are the easiest to overdo.

## CSS surface

Style through the generated pseudo-elements: `::view-transition-old(name)`,
`::view-transition-new(name)`, `::view-transition-group(name)`, and
`::view-transition-image-pair(name)`. `view-transition-name` makes an element
animate as its own unit, and `view-transition-class` styles a set of them.

## Platform notes

`document.startViewTransition()` drives same-document (SPA) transitions.
Cross-document (MPA) transitions are a separate mechanism: the
`@view-transition` CSS at-rule opts both documents in, with `pagereveal` and
`pageswap` events to adjust the transition from either side.

Browsers without support skip the transition rather than erroring, so the UI
still works — verify the un-animated path looks intentional. Check current
browser version floors against MDN or caniuse at the time you write the code;
support has been moving.
