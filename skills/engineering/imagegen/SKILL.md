---
name: imagegen
description: >-
  Generates or edits raster images with AI (photos, illustrations, textures,
  sprites, mockups, logos, infographics), including transparent-background
  cutouts. Use when the task needs an AI-created or AI-edited bitmap; not for
  SVG/vector or code-native visuals.
---

# imagegen

Generate and edit images for the current project exclusively through the **Codex CLI** (`codex exec`) and its built-in `image_gen` tool, counting toward the user's **Codex usage limits**. This skill targets **ChatGPT Images 2.5**; the backend served to a session depends on availability.

## Requirements

- Codex CLI installed (`codex --version`), on a recent version whose agent exposes the built-in `image_gen` tool.
- Logged in with a ChatGPT account: `codex login`.
- For local alpha inspection: Python 3 with Pillow (`python3 -m pip install pillow`).

## When to use

- Generate a new image: concept art, product shot, hero/banner, game asset, infographic.
- Generate using one or more reference images for style, composition, or mood.
- Edit an existing image: object removal/replacement, lighting or weather changes, background replacement, compositing, text localization, sketch-to-render.
- Produce a transparent-background cutout (see [references/transparency.md](./references/transparency.md)).
- Produce several variants of one asset.

## When not to use

- Extending or matching an existing SVG/vector icon set, logo system, or illustration library in the repo — edit those natively.
- Simple shapes, diagrams, wireframes, or icons better produced in SVG, HTML/CSS, or canvas.
- Any task where the user wants deterministic code-native output rather than a generated bitmap.

## Tool and model boundary

Use the built-in Codex tool schema. Report an exact backend version only when runtime metadata confirms it.

- The [API prompting guide](https://developers.openai.com/api/docs/guides/image-prompting) informs prompt design; its model selectors and request parameters are not a Codex tool contract. Do not add an API execution route to obtain them.
- Express aspect ratio, resolution intent, and polish level in natural language (for example "wide 16:9 landscape hero"). Set additional tool arguments only when the exposed schema supports them; verify the output rather than treating requested dimensions as guaranteed.

## Workflow

1. Decide the intent: **generate** (new image, or references used only for style/mood) vs **edit** (parts of an input image must be preserved). Assume generate unless the user clearly wants to change an existing image.
2. Collect inputs up front: prompt(s), exact text to render (verbatim), constraints/avoid list, input images with an explicit role each (edit target, style reference, compositing insert). Inspect edit targets before drafting changes. Identify acceptance requirements, including any exact dimensions or pixel-identical regions; resolve incompatible requirements before generation.
3. Shape the image prompt using [references/prompting.md](./references/prompting.md): preserve specific requests and add only success-relevant details.
4. If transparency is needed, apply the native-transparency prompt from [references/transparency.md](./references/transparency.md).
5. Run Codex non-interactively (below), instructing it to use its built-in `image_gen` tool and to copy the final image to an explicit workspace path.
6. Verify the output file exists and check its format and dimensions against the request. Inspect it using the applicable [acceptance checks](./references/prompting.md#acceptance-checks); report any requirement you cannot verify.
7. For transparency, complete the alpha and visual checks in [references/transparency.md](./references/transparency.md) before accepting the output.
8. If a check fails, use the [revision procedure](./references/prompting.md#revise-an-image) before running the next edit. Finish when all applicable checks pass, or report the unmet requirement if the tool cannot satisfy it.
9. Save non-destructively: never overwrite an existing project asset unless the user asked for replacement — use a versioned sibling name (`hero-v2.png`). For batches, identify selected finals without deleting other outputs unless the user authorizes cleanup.
10. Report the final saved path(s) and the final image prompt used.

## Driving Codex

Use `codex exec --sandbox workspace-write` to allow saving the result in the workspace. Defaults can depend on configuration, so select the sandbox explicitly. Name an output path inside the workspace and use the actual file path returned by the tool when copying; do not assume a fixed generation directory.

Generate:

```bash
codex exec --sandbox workspace-write 'Using your built-in image_gen tool, generate this image:

Create a wide 16:9 product photograph of a ceramic coffee mug for a landing-page hero. Use soft studio light from the left and a minimal background, with no text or logos.

Then copy the final image to output/imagegen/mug-hero.png in this directory and reply with that path.'
```

Edit — attach the input image with `-i`/`--image` (repeat the flag for multiple inputs and reference them by index). Put `--` before the prompt so the image option cannot consume it as another file:

```bash
codex exec --sandbox workspace-write -i product.png -- 'Using your built-in image_gen tool, edit the attached image (Image 1, the edit target):

Replace only the background with a warm sunset gradient. Keep the product and its edges unchanged; add no text or logos.

Then copy the final image to output/imagegen/product-sunset.png in this directory and reply with that path.'
```

Variants: run one `codex exec` call per variant with a distinct output filename (`logo-v1.png`, `logo-v2.png`, …). Serialize the calls rather than parallelizing.

Skill execution rules (not platform limits):

- One image per `codex exec` call; keep the instruction limited to generation + copy, no other repo changes.
- Use PNG or JPEG inputs, documented for `-i`; verify support in the installed version before relying on other formats.
- If `codex` is missing, unauthenticated, or reports `image_gen` unavailable, stop and tell the user (install: https://developers.openai.com/codex/cli, then `codex login`) — the only generation path is the user's Codex subscription, never an API key or one-off SDK runner.
