# Motion

Motion exists to explain state, relationship, and hierarchy — or to create the one authored moment the page has earned. Decoration without purpose is animation debt.

## Motion thesis (per page, at plan time)

Before building a page, write its motion thesis in four lines:

- **Focal moment** — the single authored entrance or interaction this page earns. One per page; animate 1–2 key elements per view at most.
- **Continuity** — which elements persist across state changes (shared-element / FLIP / view transitions).
- **Feedback** — which interactions confirm themselves (press, hover, submit).
- **Budget** — what stays static.

A generic fade-and-rise, hover lift, parallax layer, or scroll reveal is not a thesis. If the reason for an animation can't be stated in one sentence, drop it.

Durations and easings come from the Motion token family in `DESIGN.md`'s theme source — never invent values per page. Scale the whole thesis to the surface's `MOTION_INTENSITY` dial: low means feedback only; high earns the focal moment its full weight. Stagger list/grid entrances by 30–50 ms per item, total delay capped; a list staggers because it *is* a list, never every scrolled section.

## Micro-interactions

- Press: subtle scale (0.95–1.05) on tappable cards/buttons, restored on release.
- Hover lift: displacement under 2 px, so it reads as feedback, not motion.
- Every animation is interruptible — a tap or gesture cancels it immediately; input is never blocked.
- Spatial grammar: modals/sheets animate from their trigger source; enter-from-below reads as deeper, exit-upward as back.

## Earned moments

Concentrate delight at first use, completion, recovery, and mastery. Routine actions simply feel certain — an ordinary click gets feedback, not a celebration. Keep the response satisfying after the hundredth use, and let real work set the timing: a flourish never fakes or delays completion.

## Performance

- Transform and opacity are the reliable foundation; reveals use masks/clip-paths; depth uses bounded blur/shadow. State changes use the smallest change that makes cause and result unmistakable.
- Animating layout-driving properties (`width`, `height`, `top`, `left`, margins) is reserved for view-transition mechanisms that batch them.
- `will-change` only during a known animation; measure on target devices.
- Content is visible in the default state, so a failed script leaves a readable page.
- Nonessential loops stop when the tab or element is hidden.

## Reduced motion — non-negotiable

Under `prefers-reduced-motion`, infinite loops, parallax, scroll effects, and physics collapse to static or instant. Every page ships with this verified.

## Review test

An animation stays if removing it would lose meaning or authored character. Anything else goes.
