---
name: canvas
description: >-
  Renders a standalone analytical artifact — architecture review, audit,
  quantitative analysis, data-heavy report, comparison, timeline, progress
  dashboard — as a single self-contained HTML file opened beside the chat.
  Works in any environment (Codex, Claude Code, Cursor, generic agents). Use
  when the structured output IS the deliverable and benefits from visual
  layout, and whenever updating an existing canvas file.
---

# Canvas

A canvas is one self-contained HTML file the agent writes to disk and opens in
the user's browser. No build step, no framework, no server: any agent that can
write a file and run a shell command can produce and update one.

## 1. Decide whether to use a canvas

The trigger is **user intent**, not response shape. Ask: would the user benefit
from viewing this output as its own standalone artifact, separate from the
chat? Use a canvas for analyses, audits, reviews, reports, dashboards, and
tables past a handful of rows. Skip it when the output is a means to an end —
a drafted message, a code fix, a deliverable in another tool — or when the
user is working inside an existing artifact or doing targeted debugging.

## 2. Write the canvas

**Location.** Write to `<tmpdir>/canvases/<kebab-name>.html`. Resolve the temp
directory from `$TMPDIR`, falling back to `/tmp` on Unix or `%TEMP%` on
Windows, and create the `canvases/` directory if it does not exist. A
descriptive kebab-case filename; nothing lands in the repository.

**File rules:**

- Exactly one `.html` file per canvas. No helper files, no supporting modules.
- Self-contained: all data inlined at write time. No `fetch()`, no reads of
  local files. The only external references allowed are CDN `<script>` tags:
  Tailwind for styling, Mermaid for graph-shaped diagrams, Chart.js when a
  real chart beats a hand-built SVG.
- Interactivity through inline vanilla JS only (tabs, filters, collapsibles).

**Never render empty states.** A canvas exists to show real content. A
section, chart, or table with no data is omitted, not rendered with
placeholders, zeroed rows, or a "No data" message. If the whole canvas would
be empty, produce no canvas: tell the user what is missing instead.

**Label every plot.** A reader looking at the canvas alone must know what they
are seeing: a title naming the specific metric, axis labels with units, a
legend when more than one series is shown, and a small caption carrying the
source and time range. Name any transformation (mean, p95, normalized) in the
label.

Start from the scaffold and patterns in [template.md](template.md).

## 3. Open and link it

Open the file for the user: `start <path>` on Windows, `open <path>` on
macOS, `xdg-open <path>` on Linux. If the environment offers an in-app
browser or preview tool, use it instead of the OS opener. In the chat
response, always link the canvas by its absolute path with a short
descriptive label. On the first canvas of a session, add one sentence saying
it opened beside the chat and can be refreshed after updates.

## 4. Update in place

A canvas that tracks ongoing work (a progress dashboard, a review being
worked through) is a **living artifact**: keep the same file path for its
whole lifetime and edit the file in place, so a browser refresh shows the
new state. For a canvas expected to change while the user watches, add
`<meta http-equiv="refresh" content="15">` so it reloads itself; remove the
tag in the final update.

## Design guidance

Be creative with layout, but flat, minimal, and purposeful. Visual
hierarchy first: primary content gets space, larger headings, and the one
accent color; supporting content stays compact and neutral. Squint test:
can you tell what matters?

**Slop patterns — forbidden.** If two or more are present, redesign:

- Gradients (`linear-gradient`, `radial-gradient`, `background-clip: text`).
- Emojis as icons, bullets, status indicators, or section markers.
- Box shadows: flat surfaces only.
- A wall of identical cards: mix open sections with cards.
- Rainbow coloring: most elements neutral, color spent sparingly with purpose.
- Giant text above 24px, or bold text stuffed into card headers.
- Decorative borders: borders are structural, subtle, and rare.

**Pre-delivery self-check.** Before opening the canvas, verify: one thing
stands out; the composition has variety, not a single column of uniform
blocks; no slop pattern survives; every plot is fully labeled.
