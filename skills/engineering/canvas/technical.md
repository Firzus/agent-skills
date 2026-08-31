# Technical canvas — Geist dark design system

Documentation of engineering work. The design is decided: apply these tokens
and patterns as written, spend zero decisions on visuals, and put the effort
into the content. Dark only, no light variant, no theme toggle.

## Tokens

Vercel Geist, dark scale. Every color the canvas uses is in this block; nothing
outside it.

| Role | Token | Hex |
| --- | --- | --- |
| Page background | `--bg` | `#0A0A0A` |
| Raised surface (card, table head) | `--surface` | `#141414` |
| Border | `--border` | `#292929` |
| Border, emphasized | `--border-strong` | `#454545` |
| Muted text (labels, captions) | `--muted` | `#A1A1A1` |
| Body text | `--fg` | `#EDEDED` |
| Accent | `--accent` | `#0072F5` |
| Accent on dark (links, chart lines) | `--accent-fg` | `#52A8FF` |
| Success | `--success` | `#62C073` |
| Warning | `--warning` | `#F5A623` |
| Danger | `--danger` | `#FF6166` |

Type: Geist for text, Geist Mono for code, identifiers, and numbers in tables.
Sizes stay in a four-step scale — `text-xs` captions, `text-sm` body,
`text-base` section titles, `text-2xl` the page title. Spacing is a 4px
grid: Tailwind's default steps only.

Status colors carry meaning, never decoration: green for verified/passing,
amber for at-risk/pending, red for failing/blocked. Everything else is
neutral gray, with the accent reserved for links, the active chart series, and
at most one emphasized element per screen.

## Base scaffold

Copy this shell verbatim. Mermaid and Chart.js tags stay only when the canvas
uses them.

```html
<!doctype html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><!-- "Architecture review — payment module" --></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Only if the canvas has graph-shaped diagrams: -->
  <script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
    mermaid.initialize({
      startOnLoad: true,
      theme: "base",
      themeVariables: {
        darkMode: true, background: "#0A0A0A",
        primaryColor: "#141414", primaryTextColor: "#EDEDED", primaryBorderColor: "#454545",
        lineColor: "#8F8F8F", secondaryColor: "#141414", tertiaryColor: "#0A0A0A",
        fontFamily: "Geist, ui-sans-serif, system-ui", fontSize: "13px"
      }
    });
  </script>
  <!-- Only if the canvas has data charts: -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <style>
    :root {
      --bg: #0A0A0A; --surface: #141414; --border: #292929; --border-strong: #454545;
      --muted: #A1A1A1; --fg: #EDEDED; --accent: #0072F5; --accent-fg: #52A8FF;
      --success: #62C073; --warning: #F5A623; --danger: #FF6166;
    }
    body { font-family: Geist, ui-sans-serif, system-ui, sans-serif; }
    code, pre, .mono, .tabular-nums { font-family: "Geist Mono", ui-monospace, monospace; }
    a { color: var(--accent-fg); text-decoration: none; }
    a:hover { text-decoration: underline; }
    ::selection { background: #0072F5; color: #fff; }
  </style>
</head>
<body style="background: var(--bg); color: var(--fg);" class="antialiased">
  <main class="mx-auto max-w-5xl px-6 py-12 space-y-10">
    <header class="border-b pb-6" style="border-color: var(--border);">
      <h1 class="text-2xl font-semibold tracking-tight">Title</h1>
      <p class="mt-1 text-sm" style="color: var(--muted);">
        Source · scope · date <!-- "repo abc @ a1b2c3d · 2026-08-31" -->
      </p>
    </header>
    <!-- sections -->
  </main>
</body>
</html>
```

If Chart.js is loaded, set the dark defaults once, right after the CDN tag:

```html
<script>
  Chart.defaults.color = "#A1A1A1";
  Chart.defaults.borderColor = "#292929";
  Chart.defaults.font.family = "Geist, ui-sans-serif, system-ui";
</script>
```

## Patterns

**Section** — the default container; open sections, not a wall of cards:

```html
<section class="space-y-4">
  <h2 class="text-base font-medium">Section title</h2>
  <p class="text-sm leading-relaxed" style="color: var(--muted);">Body…</p>
</section>
```

**Card** — one finding, one candidate, one item:

```html
<article class="rounded-lg border p-5 space-y-3" style="border-color: var(--border); background: var(--surface);">
  <div class="flex items-center justify-between gap-4">
    <h3 class="font-medium">Item name</h3>
    <span class="rounded-full border px-2 py-0.5 text-xs" style="border-color: var(--border-strong); color: var(--muted);">Badge</span>
  </div>
  <p class="text-sm" style="color: var(--muted);">Body…</p>
</article>
```

**Status badge** — one class per state, colors as defined above:

```html
<span class="rounded-full border px-2 py-0.5 text-xs" style="border-color: var(--border-strong); color: var(--muted);">Proposed</span>
<span class="rounded-full border px-2 py-0.5 text-xs" style="border-color: #0072F5; color: var(--accent-fg);">In progress</span>
<span class="rounded-full border px-2 py-0.5 text-xs" style="border-color: #2f5f38; color: var(--success);">Verified</span>
<span class="rounded-full border px-2 py-0.5 text-xs" style="border-color: #6b2b2e; color: var(--danger);">Blocked</span>
```

**Metric row** — headline numbers, one line, no card grid:

```html
<div class="grid grid-cols-3 gap-px overflow-hidden rounded-lg border" style="border-color: var(--border); background: var(--border);">
  <div class="p-4" style="background: var(--surface);">
    <div class="text-xs uppercase tracking-wide" style="color: var(--muted);">Files changed</div>
    <div class="mt-1 text-xl tabular-nums">128</div>
  </div>
  <!-- … -->
</div>
```

**Data table** — right-align numbers, monospace figures, caption carries source:

```html
<figure>
  <table class="w-full border-collapse text-sm">
    <thead class="text-left text-xs uppercase tracking-wide" style="color: var(--muted);">
      <tr class="border-b" style="border-color: var(--border-strong);">
        <th class="py-2 font-medium">Item</th>
        <th class="py-2 text-right font-medium">Value (unit)</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b" style="border-color: var(--border);">
        <td class="py-2">…</td>
        <td class="py-2 text-right tabular-nums">…</td>
      </tr>
    </tbody>
  </table>
  <figcaption class="mt-2 text-xs" style="color: var(--muted);">Source: … · range …</figcaption>
</figure>
```

**Before / after diagrams** — Mermaid, side by side:

```html
<div class="grid grid-cols-2 gap-4">
  <figure>
    <figcaption class="mb-1 text-xs font-medium" style="color: var(--muted);">Before</figcaption>
    <pre class="mermaid rounded-lg border p-3" style="border-color: var(--border); background: var(--surface);">graph TD; A[Caller] --> B[helper1]; A --> C[helper2];</pre>
  </figure>
  <figure>
    <figcaption class="mb-1 text-xs font-medium" style="color: var(--muted);">After</figcaption>
    <pre class="mermaid rounded-lg border p-3" style="border-color: var(--border); background: var(--surface);">graph TD; A[Caller] --> M[Deep module];</pre>
  </figure>
</div>
```

**Chart** — fixed-height wrapper prevents Chart.js runaway growth:

```html
<figure>
  <div class="relative h-64 rounded-lg border p-3" style="border-color: var(--border); background: var(--surface);">
    <canvas id="c1"></canvas>
  </div>
  <figcaption class="mt-2 text-xs" style="color: var(--muted);">Source: … · range …</figcaption>
  <script>
    new Chart(document.getElementById("c1"), {
      type: "line",
      data: { labels: [/* inline */], datasets: [{ label: "Series name", data: [/* inline */], borderColor: "#52A8FF", backgroundColor: "#52A8FF33", tension: 0.25 }] },
      options: { scales: { x: { title: { display: true, text: "Date" }, grid: { color: "#292929" } },
                           y: { title: { display: true, text: "Latency (ms)" }, grid: { color: "#292929" } } } }
    });
  </script>
</figure>
```

**Code and paths** — inline identifiers and file paths:

```html
<code class="rounded border px-1 py-0.5 text-xs" style="border-color: var(--border); background: var(--surface);">src/app/route.ts</code>
```

**Collapsible detail** — native, no JS:

```html
<details class="text-sm">
  <summary class="cursor-pointer" style="color: var(--muted);">Full file list</summary>
  <div class="mt-2">…</div>
</details>
```

## Auto-refresh for living artifacts

While the canvas is updated during ongoing work:

```html
<meta http-equiv="refresh" content="15">
```

Remove the tag in the final update so the finished artifact sits still.

## Pre-delivery self-check

Before opening the canvas, verify: every color used appears in the token
table; type stays inside the four-step scale; status colors carry state and
nothing else; numbers are monospace and right-aligned; every plot is fully
labeled.
