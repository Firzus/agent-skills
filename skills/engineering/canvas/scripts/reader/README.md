# Canvas React runtime

React, TypeScript, Vite, D3, and a small local component library. The historical
directory name is retained; there is no Markdown parser, document tracker, or
standalone HTML authoring route.

## Task workspace

Copy this directory into an authorized task artifact directory, excluding
`node_modules/`, `dist/`, and logs. Keep private user data in that task copy,
not in the bundled example. Use Node 22.12 or later.

```sh
npm ci
npm test
npm run build
npm run dev -- --port 60063
npm run preview -- --port 60064
```

Both servers bind to loopback. Preview serves the most recent build. Keep the
source directory stable between edits; Vite updates development views. Deliver
the complete `dist/` directory for static HTTP hosting, not just its index file.

## Authoring

Create `src/<name>.canvas.tsx`, default-export a React component, and select it
in `src/main.tsx`. The entry point imports no theme or layout. Set the page title
and language
in `index.html`. Replace the illustrative example and its test in a task copy
with the actual visual and relevant interaction tests.

Author styles and components for the request. Optional shared components can be
imported from `canvas-sdk`; their default styles require an explicit import of
`./sdk/theme.css`. Alternatively provide the CSS and variables they reference
yourself. The alias works in Vite and TypeScript.
Inspect these files for exact props:

- `src/sdk/layout.tsx`: Page, Stack, Row, Grid.
- `src/sdk/text.tsx`: headings, Text, Code, CodeBlock.
- `src/sdk/surfaces.tsx`: Card, Divider, Pill, Callout, Stat.
- `src/sdk/Table.tsx`: table columns, custom cells, and captions.
- `src/sdk/Diagram.tsx`: Mermaid diagrams with sanitized output.
- `src/sdk/tokens.ts`: theme colors and series colors.

Use native controls, React hooks, SVG, browser canvas, or `d3` for custom
visualizations. The SDK is not a fixed menu of visual types. It is also not
Cursor's proprietary SDK: imports from `cursor/canvas` are unavailable.

## Safety and verification

Author only trusted React code. This runtime is not an execution sandbox. Bundle
approved data and assets; avoid runtime network requests. Public assets are
served directly, so exclude secrets, symlinks, and untrusted executable content.

Mermaid rejects active directives and oversized input, uses strict mode, and
sanitizes its SVG. Rendering is serialized because Mermaid has shared global
state. Failure shows the source without blocking other diagrams.

Tests cover the example interaction and Mermaid sanitization/failure cases.
The build checks TypeScript. These checks do not prove an arbitrary new canvas:
test its own logic and inspect its principal interactions in a real browser,
using the viewport, input devices, and appearance required by the request.
