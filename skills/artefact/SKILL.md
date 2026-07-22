---
name: artefact
description: >-
  Render a concept as a single self-contained HTML document (Tailwind +
  Mermaid via CDN), written to the OS temp directory and opened in the
  browser. Use when the user wants to visualize a concept, comparison, plan,
  or design (design tokens, an architecture, a data flow), or when another
  skill needs to present a visual document.
---

# Artefact

A visualization tool: one concept → one self-contained HTML file → opened in the user's browser.

## Produce the file

1. Resolve the temp directory: `$TMPDIR`, falling back to `/tmp` (`%TEMP%` on Windows).
2. Write a single HTML file to `<tmpdir>/<concept-slug>-<timestamp>.html` — a fresh file per run, nothing lands in the repo.
3. Open it for the user: `xdg-open <path>` on Linux, `open <path>` on macOS, `start <path>` on Windows. On WSL, use `explorer.exe "$(wslpath -w <path>)"`.
4. Tell the user the absolute path, so they can reopen or share it.

**Done when:** the file is written, opened (or the open command failed and you said so), and the path is in your reply.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{{concept}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header><!-- concept name, date, compact legend if diagrams use one --></header>
      <!-- one <section> per facet of the concept -->
    </main>
  </body>
</html>
```

The only scripts are the Tailwind CDN and the Mermaid ESM import; everything else is inline. The document is static — no app code, no interactivity beyond Mermaid's own rendering and CSS states (hover, transitions).

## Content guidance

- **The visuals carry the weight; prose is sparse.** If a section needs a paragraph to be understood, redraw the visual instead.
- **Mermaid for graph-shaped content** (flows, dependencies, sequences, states); **hand-built divs and inline SVG for editorial visuals** (scales, swatches, comparisons, cross-sections). Mix the two — leaning on Mermaid for everything looks generic.
- **Show the real values.** A design token renders as its own color/size/shadow; a motion token demos itself on hover. The document should *demonstrate* the concept, not describe it.
- **Editorial style:** generous whitespace, one accent color plus semantic red/amber, `text-xs uppercase tracking-wider` for schematic labels.
