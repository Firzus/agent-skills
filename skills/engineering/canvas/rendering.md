# Rendering tools and checks

Choose the smallest suitable implementation for the requested result.

| Requirement | Available approach |
| --- | --- |
| Page, controls, or interface mockup | React, HTML, and task-specific CSS |
| Vector drawing or data plot | SVG; D3 for scales, geometry, and layouts |
| Pixel drawing or 2D animation | Browser canvas |
| 3D scene or game | WebGL, or a library such as Three.js when authorized and installed |
| Relationship diagram | SVG or the optional SDK Mermaid component |

These are options, not a presentation template. Libraries named here are not all
bundled. Check the runtime manifest and install only what the task requires.

## Assets and execution

Keep inspected assets in the task workspace. Resolve their URLs through the normal
preview and static build. Preserve sources and licenses where applicable. Serve
only intended public assets, excluding secrets, symlinks, and untrusted active
content. The React runtime executes authored code; it is not a sandbox.

Cursor's `cursor/canvas` and Visualize's `window.openai` belong to their hosts.
This runtime supplies neither; use actual available APIs rather than assuming
those integrations exist.

## Browser verification

Test the interaction the artifact exists to provide. For a game, check input,
movement, collisions, restart, and focus. For a plot, check quantities, units,
filters, and known values. For a mockup, check navigation and state changes.

Adapt the viewport, aspect ratio, and input support to the request. Keep required
controls readable and reachable. Provide accessible names for controls and
non-text visuals where possible.

For animation or 3D, release graphics resources and cancel animation frames,
timers, observers, and listeners on unmount. Handle renderer initialization
failures explicitly. Verify resizing and repeated mounting do not create duplicate
loops. Respect reduced-motion preferences for nonessential animation.
