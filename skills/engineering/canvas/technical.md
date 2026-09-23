# Technical canvas — Markdown reader

Use the [React reader](scripts/reader/README.md) for engineering reports, audits,
architecture recommendations, and progress tracking. Its Markdown is the source
of truth; the application presents it without executing recommendations.
The former standalone technical HTML scaffold is superseded by this reader.
The design branch remains a standalone HTML artifact.

## Language

Write technical documents in the language used to converse with the user unless
explicitly requested otherwise. Keep identifiers, code, paths, commands, and URLs
unchanged. The current reader interface and tracker schema are French. For another
language, adapt its interface, table recognition, status labels, and HTML `lang`
together; do not claim automatic localization.

## Prepare a report

1. Use a task-specific copy of `scripts/reader/`, excluding `node_modules`, `dist`,
   and logs. Keep the existing task copy when updating a living artifact. Never
   overwrite another report or use the bundled fictional example as real evidence.
2. Write the report to `src/report.md`. Use normal headings, paragraphs, GFM
   tables, task lists, code fences, and optional `<details>` sections. Raw HTML
   is sanitized; scripts, event handlers, and executable Markdown are unsupported.
   Keep the report focused on findings, proposals, validation, and evidence.
   Put reader/workflow tutorials in help or documentation rather than repeating
   them throughout the report. Label a fictional example once at the start;
   retain material uncertainty and missing validation where relevant.
3. For recommendations, use the tracker contract in the reader README. Record
   only observed progress and actual delivery evidence. Clicking a copy button
   does not start an agent, change a status, or authorize implementation.
4. Put inspected images in `public/assets/` and reference `assets/name.png` in
   Markdown. Read [Images](images.md) when adding generated or captured assets.
5. Run and verify the reader using its README. Open the loopback preview with the
   supported browser tool and retain that review surface. Node and dependency
   installation are prerequisites; report a missing runtime rather than silently
   replacing the application with a different stack.

## Presentation and ownership

The accepted dark layout has a compact, collapsible left recommendation tree with
small progress icons, a central continuous document, and a simple right chapter list. There is
no top navbar. Theme tokens live in `src/theme.css`; layout lives in
`src/styles.css`. Preserve these sources instead of maintaining a second scaffold.

The three statuses are **À lancer**, **En cours**, and **Terminé**. A dependency is
an edge, not a fourth status. Keep status and dependency details in the Markdown
table; the sidebar shows short titles and progress circles only, nesting dependents
under their nearest preceding prerequisite. Place prerequisites before their
dependents; independent rows do not imply a
dependency. Completion requires verification and agreed delivery.

Users can toggle task-list checkboxes for personal reading. These changes are
transient, reset with source changes/reloads, and never affect the Markdown,
tracker, copied text, or exported file. Do not present them as verified evidence.

Mermaid fences render locally into SVG with an expandable source and copy action.
A malformed diagram falls back to its source without breaking the document.
Images remain separate assets; Markdown export does not embed their bytes.

## Delivery and updates

During local work, Vite watches the imported Markdown and updates the view.
For delivery, build and serve the complete `dist/` directory over HTTP. This is
not a single self-contained HTML file and does not promise `file://` execution.
No application backend, chatbot, database, or automatic agent dispatcher is used.

Verify navigation, copy, export, help-dialog keyboard behavior, temporary checkbox
state, Mermaid labels, image loading, and narrow-screen overflow. Check a completed
dependency and an invalid diagram without changing the report's actual status.
Keep illustrative fixtures separate from verified findings and preserve the source
Markdown plus assets alongside a delivered build.
