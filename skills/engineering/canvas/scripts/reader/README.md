# Canvas reader

React + TypeScript + Tailwind CSS + Vite. This is the technical Canvas renderer;
there is no application backend, chatbot, database, or agent execution endpoint.
The bundled French report is fictional, not a review of this repository.

## Run

Use Node 22.12+ (verified here with Node 24). In this directory:

```sh
npm ci
npm run dev -- --port 60063
npm test
npm run build
npm run preview -- --port 60064
```

Development and preview bind to loopback. Do not expose the Vite development
server publicly. Production delivery is the entire `dist/` directory on a static
HTTP server, not a double-clickable standalone HTML file. No runtime CDN is used.
Mermaid loads on demand and contributes large chunks to the production build.

## Content contract

`src/report.md` is the single content source, imported as text by Vite. Edits
refresh the development view. Static builds require rebuilding after edits.
For another report, copy this reader without dependencies, generated output, or
logs into the task's artifact directory and replace its Markdown. Keep each task's
copy stable; do not overwrite the skill's sample with private report data.

GFM headings, tables, lists, code, tasks, and sanitized raw HTML are supported.
Chapter anchors remove accents/apostrophes, deduplicate repeated headings, and
reserve reader element IDs (`root`, `document`, `canvas-sidebar`, `status-title`).
Malformed URL fragments are ignored without preventing document rendering.
The right table of contents includes level-two headings only.

On desktop, drag the sidebar's right edge to resize it. The focusable separator
also accepts Left/Right (10 px), Home/End (bounds), and double-click (300 px reset).
Width is limited to 240–520 px and leaves at least 360 px for the document.
It lasts for the current page session, not across reloads. Below 761 px, the
sidebar uses the existing full-width stacked layout and hides the resize handle.

A table with these French header names owns task state:

```markdown
| ID | Proposition | Statut | Priorité | Dépendances | Prochaine étape ou preuve de livraison |
| --- | --- | --- | --- | --- | --- |
| ARCH-01 | Separate movement rules | À lancer | Haute | — | Await approval |
| ARCH-02 | One ground-state owner | À lancer | Moyenne | ARCH-01 | Requires ARCH-01 |
```

IDs match uppercase letters followed by a hyphen and digits. Headings beginning
with that ID, including a heading containing only the ID, provide navigation targets. Write `Proposition` as a short, meaningful
title of three or four words at most; keep the fuller explanation in the section.
The sidebar shows short titles and 14 px progress icons in a collapsible list.
Keep prerequisite rows before dependents: a dependent is nested below its nearest
preceding prerequisite, with a thin branch. Independent recommendations stay at
root level. Multiple prerequisites remain explicit in the document table; a tree
shows only one parent. Missing or forward references stay at root level rather
than creating a false parent or a cycle. Status and blocker text stay in the table.
Selection brightens the title; running tasks have an arc and completed tasks a
check. No halo, card background, or row separator is used. Hover and keyboard focus
slightly shift the title and scale the icon; pressing gives a subtle compression.
Color transitions soften selection changes without altering layout or task state.
The heading button supports click, Enter, and Space to collapse/expand. Its short
transition respects reduced-motion preferences; collapsed links are not focusable.
IDs remain unchanged in the source, anchors, action instructions, and tracker table.
Status values are `À lancer`, `En cours`,
and `Terminé`; do not invent completion. Dependencies are ID references. Missing
references remain unresolved dependencies. Dependencies remain in the source table
after completion. The tracker never writes Markdown.

An `agent-action` fence following a recommendation heading supplies its copy
button text. The fence is hidden from the rendered body, but retained in export.
Copying does not run a task. A `<details>` block whose summary is `Comprendre les
statuts` supplies the help dialog instead of an inline section. Only actual HTML
blocks are extracted; fenced code examples remain part of the document.

## Rendering and security

- `document.ts` derives the tracker and anchors from a Markdown syntax tree.
- `Markdown.tsx` uses `react-markdown`, GFM, raw HTML parsing, and sanitization.
  Custom components handle native task checkboxes, images, code, and headings.
- `Diagram.tsx` loads Mermaid asynchronously, serializes its shared renderer,
  uses strict mode, caps source size and edge count, rejects configuration and
  active-content directives, and sanitizes generated SVG. Invalid diagrams show
  their source. This is not an execution sandbox for arbitrarily large reports.
- Local images must be inspected files under `public/assets/`, referenced as
  `assets/name.png` (also JPEG, WebP, GIF, AVIF, SVG). External image URLs,
  traversal, and data URLs are rejected. Do not place symlinks or untrusted SVG
  files in the public directory: Vite serves that directory as static assets.
- Personal checkbox changes live only in React state. Source changes and page
  reloads reset them; copy/export always use the original Markdown string.
- Copy uses the Clipboard API (localhost or HTTPS); failure is shown on the
  button. Export downloads Markdown only, not its images or application code.
- Native modal dialog provides focus management and Escape dismissal.

The UI and schema currently target French. Other document languages need an
explicit coordinated UI/schema adaptation, not only a translated Markdown file.
Images generated with ImageGen are ordinary inspected assets, not a runtime API.
Syntax highlighting, remote images, video, persistent editing, and a one-file
HTML build are outside this migration.

## Verification

`npm test` covers source-derived tracking, dependency transitions, anchors,
copy/export contracts, sanitization, temporary checkboxes, and diagram failures.
`npm run build` checks TypeScript and produces the static build. Browser checks
cover actual diagrams, navigation, clipboard, help, and responsive layout.
The previous Python/PowerShell prototype is retained outside this repository as
a rollback reference; it is not part of this runtime.
