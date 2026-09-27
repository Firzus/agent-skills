# Images in a canvas

Choose assets by purpose:

- Reuse inspected supplied images when relevant.
- For a concept illustration, use the available image-generation skill when
  generation is authorized.
- For evidence of implemented behavior, capture the real application.
- For exact relationships, prefer SVG or Mermaid.

Store approved assets under the task copy's `public/assets/` and reference them
as `./assets/<name>`. Include them in the built deliverable. Keep provenance and
generation prompts alongside source assets, excluding secrets. Label generated
concepts and proposals; distinguish them from verified captures.

Preserve aspect ratio, useful detail, alternative text, and visible captions.
Inspect assets before serving them; exclude symlinks and untrusted active SVG.
A React runtime executes authored code and is not a sandbox for arbitrary content.

Verify image loading through the normal preview and production build. Check narrow
layouts and missing assets. Report unavailable generation or capture tools rather
than inventing visual evidence or installing a substitute without authorization.
