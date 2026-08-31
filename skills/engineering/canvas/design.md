# Design canvas — composition rules and scaffold

The layout carries meaning here, so you compose it. Be creative, but flat,
minimal, and purposeful. Visual hierarchy first: primary content gets space,
larger headings, and the one accent color; supporting content stays compact
and neutral. Squint test: can you tell what matters?

## Base scaffold

Start here and diverge deliberately. Mermaid and Chart.js tags are included
only when the canvas uses them.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><!-- Specific title: "Framework comparison — state management" --></title>
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Only if the canvas has graph-shaped diagrams: -->
  <script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
    mermaid.initialize({ startOnLoad: true, theme: "neutral" });
  </script>
  <!-- Only if the canvas has data charts: -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <style>
    :root { --accent: #2563eb; } /* the ONE accent color */
  </style>
</head>
<body class="bg-neutral-50 text-neutral-900 antialiased">
  <main class="mx-auto max-w-5xl px-6 py-10 space-y-10">
    <header class="border-b border-neutral-200 pb-6">
      <h1 class="text-2xl font-semibold">Title</h1>
      <p class="mt-1 text-sm text-neutral-500">
        Source · scope · date <!-- e.g. "repo abc @ a1b2c3d · 2026-08-31" -->
      </p>
    </header>
    <!-- sections -->
  </main>
</body>
</html>
```

## Patterns

**Status badge** — for living artifacts tracking work items:

```html
<span class="rounded-full border border-neutral-300 px-2 py-0.5 text-xs">Proposed</span>
<span class="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">In progress</span>
<span class="rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-xs text-green-700">Verified</span>
<span class="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs text-red-700">Blocked</span>
```

**Card with header row** — one finding, one candidate, one item:

```html
<section class="rounded-lg border border-neutral-200 bg-white p-5 space-y-3">
  <div class="flex items-center justify-between">
    <h2 class="font-medium">Candidate name</h2>
    <span class="rounded-full border border-neutral-300 px-2 py-0.5 text-xs">Badge</span>
  </div>
  <p class="text-sm text-neutral-600">Body…</p>
</section>
```

**Before / after diagrams** — side by side, Mermaid for graph-shaped
structure, hand-built divs/SVG for editorial visuals (mass diagrams,
cross-sections):

```html
<div class="grid grid-cols-2 gap-4">
  <figure>
    <figcaption class="mb-1 text-xs font-medium text-neutral-500">Before</figcaption>
    <pre class="mermaid">graph TD; A[Caller] --> B[helper1]; A --> C[helper2]; A --> D[helper3];</pre>
  </figure>
  <figure>
    <figcaption class="mb-1 text-xs font-medium text-neutral-500">After</figcaption>
    <pre class="mermaid">graph TD; A[Caller] --> M[Deep module];</pre>
  </figure>
</div>
```

**Data table** — right-align numbers, caption carries source and range:

```html
<figure>
  <table class="w-full text-sm">
    <thead class="border-b border-neutral-300 text-left text-neutral-500">
      <tr><th class="py-2">Item</th><th class="py-2 text-right">Value (unit)</th></tr>
    </thead>
    <tbody class="divide-y divide-neutral-100">
      <tr><td class="py-2">…</td><td class="py-2 text-right tabular-nums">…</td></tr>
    </tbody>
  </table>
  <figcaption class="mt-1 text-xs text-neutral-400">Source: … · range …</figcaption>
</figure>
```

**Collapsible detail** — native, no JS needed:

```html
<details class="text-sm">
  <summary class="cursor-pointer text-neutral-500">Full file list</summary>
  <div class="mt-2">…</div>
</details>
```

**Chart** — fixed height wrapper prevents Chart.js runaway growth:

```html
<figure>
  <div class="relative h-64"><canvas id="c1"></canvas></div>
  <figcaption class="mt-1 text-xs text-neutral-400">Source: … · range …</figcaption>
  <script>
    new Chart(document.getElementById("c1"), {
      type: "line",
      data: { labels: [/* inline */], datasets: [{ label: "Series name", data: [/* inline */], borderColor: "#2563eb" }] },
      options: { scales: { x: { title: { display: true, text: "Date" } },
                           y: { title: { display: true, text: "Latency (ms)" } } } }
    });
  </script>
</figure>
```

## Auto-refresh for living artifacts

While the canvas is being updated during ongoing work:

```html
<meta http-equiv="refresh" content="15">
```

Remove the tag in the final update so the finished artifact sits still.

## Slop patterns — forbidden

If two or more are present, redesign:

- Gradients (`linear-gradient`, `radial-gradient`, `background-clip: text`).
- Emojis as icons, bullets, status indicators, or section markers.
- Box shadows: flat surfaces only.
- A wall of identical cards: mix open sections with cards.
- Rainbow coloring: most elements neutral, color spent sparingly with purpose.
- Giant text above 24px, or bold text stuffed into card headers.
- Decorative borders: borders are structural, subtle, and rare.

## Pre-delivery self-check

Before opening the canvas, verify: one thing stands out; the composition has
variety, not a single column of uniform blocks; no slop pattern survives;
every plot is fully labeled.
