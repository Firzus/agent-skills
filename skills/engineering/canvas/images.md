# Images in a canvas

Use images to explain a specific point, not to decorate every report. Keep the
document understandable without them. Apply the document's language to captions,
alternative text, and requested text inside generated images.

## Choose the source

| Need | Approach |
| --- | --- |
| Existing relevant image | Inspect and reuse the supplied or authorized asset |
| Concept illustration, visual proposal, or raster mockup | Use the available `imagegen` skill and its supported generation tool |
| Architecture, dependencies, or exact process | Prefer Mermaid or another deterministic diagram, not image generation |
| Evidence of implemented UI or behavior | Capture the real application with supported tools; never fabricate evidence with `imagegen` |

Image generation is optional: a text-only report or existing-image workflow must
work without `imagegen`. Discover the skill in the current environment before
calling it. If unavailable, report the limitation and continue independent work;
do not install tools, switch to a credential-based API, or claim generation ran.

## Generate and select

1. Establish the image's purpose, subject, essential details, and destination from
   the request and document. Ask only if a missing decision changes the result.
   A request to support images is not a reason to generate an arbitrary asset.
2. Read `imagegen` and follow its generation/editing, privacy, and output rules.
   Do not send private reference material to a generation service without the
   required authorization. Do not edit a genuine evidence capture into an
   apparently verified result.
3. Inspect the returned image before embedding it. Check the subject, legibility,
   invented text, misleading technical details, and consistency with its purpose.
   Revise or reject an unsuitable image rather than presenting it as evidence.
4. Keep the selected original in the document's approved asset location, not only
   an ephemeral tool-output location. Use a descriptive filename; preserve earlier
   versions unless replacement is authorized. Retain the generation prompt and
   provenance alongside the source assets, without secrets.

## Keep one content source

For a Markdown-backed document, put the image reference, alternative text, and
caption in Markdown. The HTML renders those entries; it does not maintain a
separate caption or independent image selection.

```markdown
![Concept illustration of a movement test area](assets/movement-test-area.png)

*AI-generated illustration — proposed appearance, not an application capture.*
```

Label generated illustrations and mockups explicitly. For real captures, identify
what was captured and the relevant application state. Keep an illustration's
interpretation separate from verified findings.

Preserve portability: exporting or copying Markdown preserves its image reference,
not the image bytes. When handing over the document, include its referenced assets
or an explicitly approved durable location. Do not promise that a lone `.md` file
contains its images or publish assets as an implicit part of export.

## Render and verify

- For standalone design HTML, embed inspected raster assets as data URLs
  with their actual MIME type. Do not introduce remote image requests or require
  a running image-generation service to read the report.
- In the technical reader, use inspected assets in `public/assets/` and Markdown
  references under `assets/`, as described in the [reader README](scripts/reader/README.md).
  Keep the static asset directory free of symlinks and untrusted SVG content.
- In a local Markdown preview, resolve relative image paths only within the
  approved document asset directory. Reject traversal, symlink escapes, arbitrary
  filesystem reads, and executable image content. Do not enable arbitrary raw
  HTML merely to display images.
- Preserve aspect ratio, constrain images to the reading column, and provide
  meaningful alternative text. Avoid cropping away relevant information. Use a
  visible caption to distinguish proposals from evidence.
- Verify that the image loads through the document's ordinary entry point, remains
  readable on a narrow display, and does not hide its caption or cause page-wide
  overflow. Check the missing-file case: keep the caption/alternative text and
  report the missing asset rather than implying that an image was rendered.
- Report what was generated, what was actually inspected, retained asset paths,
  and any unverified rendering or portability limitations. Generation success
  alone does not establish successful HTML integration.
