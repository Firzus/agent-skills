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

## 2. Route to a presentation type

Two kinds of canvas, one reference file each. Read exactly the one you route
to: it carries the scaffold, the patterns, and the visual rules for that
branch.

| Branch | The canvas is | Read |
| --- | --- | --- |
| **Technical** | documentation of engineering work — audit, architecture review, code health report, benchmark, migration plan, progress dashboard. The content carries everything; the visual only has to stay out of the way. | [technical.md](technical.md) — a fixed Geist dark design system, applied as-is |
| **Design** | an artifact whose layout carries meaning — editorial report, visual comparison, anything the user asked to look a certain way. | [design.md](design.md) — compose freely inside the anti-slop rules |

Route to **technical** whenever the subject is engineering work: a standard
visual costs no design decisions and no design context. Route to **design**
when the user asks for a visual treatment, or when the composition itself
does the explaining.

## 3. Write the canvas

**Location.** Write to `<tmpdir>/canvases/<kebab-name>.html`. Resolve the temp
directory from `$TMPDIR`, falling back to `/tmp` on Unix or `%TEMP%` on
Windows, and create the `canvases/` directory if it does not exist. A
descriptive kebab-case filename; nothing lands in the repository.

**File rules:**

- Exactly one `.html` file per canvas. No helper files, no supporting modules.
- Self-contained: all data inlined at write time. No `fetch()`, no reads of
  local files. External references are limited to the CDN tags listed in your
  branch file: Tailwind for styling, Mermaid for graph-shaped diagrams,
  Chart.js when a real chart beats a hand-built SVG, a webfont stylesheet.
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

## 4. Open and link it

Open the file for the user: `start <path>` on Windows, `open <path>` on
macOS, `xdg-open <path>` on Linux. If the environment offers an in-app
browser or preview tool, use it instead of the OS opener. In the chat
response, always link the canvas by its absolute path with a short
descriptive label. On the first canvas of a session, add one sentence saying
it opened beside the chat and can be refreshed after updates.

## 5. Update in place

A canvas that tracks ongoing work (a progress dashboard, a review being
worked through) is a **living artifact**: keep the same file path for its
whole lifetime and edit the file in place, so a browser refresh shows the
new state. For a canvas expected to change while the user watches, add
`<meta http-equiv="refresh" content="15">` so it reloads itself; remove the
tag in the final update.
