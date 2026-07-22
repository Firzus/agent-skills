---
name: imagegen
description: >-
  Generates or edits raster images with AI (photos, illustrations, textures,
  sprites, mockups, logos, infographics), including transparent-background
  cutouts. Use when the task needs an AI-created or AI-edited bitmap; not for
  SVG/vector or code-native visuals.
---

# imagegen

Generate and edit images for the current project with **`gpt-image-2` only**, exclusively through the **Codex CLI** (`codex exec`) and its built-in `image_gen` tool, billed on the user's **ChatGPT subscription**.

## Requirements

- Codex CLI installed (`codex --version`), on a recent version whose agent exposes the built-in `image_gen` tool.
- Logged in with a ChatGPT account: `codex login`.
- For transparent cutouts only: Python 3 with Pillow (`python3 -m pip install pillow`).

## When to use

- Generate a new image: concept art, product shot, hero/banner, game asset, infographic.
- Generate using one or more reference images for style, composition, or mood.
- Edit an existing image: object removal/replacement, lighting or weather changes, background replacement, compositing, text localization, sketch-to-render.
- Produce a transparent-background cutout (via the chroma-key pipeline in [references/transparency.md](./references/transparency.md)).
- Produce several variants of one asset.

## When not to use

- Extending or matching an existing SVG/vector icon set, logo system, or illustration library in the repo — edit those natively.
- Simple shapes, diagrams, wireframes, or icons better produced in SVG, HTML/CSS, or canvas.
- Any task where the user wants deterministic code-native output rather than a generated bitmap.

## gpt-image-2 model notes

- Strong instruction following, layout control, and in-image text rendering — quote exact text verbatim in the prompt.
- No native transparency: `image_gen` outputs are opaque. For cutouts, use the chroma-key pipeline ([references/transparency.md](./references/transparency.md)).
- Input images are always processed at high fidelity; there is no fidelity knob to set.
- The built-in tool exposes no `size`/`quality` parameters — express aspect ratio, resolution intent, and polish level in natural language inside the prompt (for example "wide 16:9 landscape hero" or "quick rough draft").

## Workflow

1. Decide the intent: **generate** (new image, or references used only for style/mood) vs **edit** (parts of an input image must be preserved). Assume generate unless the user clearly wants to change an existing image.
2. Collect inputs up front: prompt(s), exact text to render (verbatim), constraints/avoid list, input images with an explicit role each (edit target, style reference, compositing insert).
3. Shape the image prompt with the schema in [references/prompting.md](./references/prompting.md): normalize a detailed prompt, lightly augment a generic one, never invent brands, characters, or details the user did not imply.
4. If transparency is needed, first apply the chroma-background prompt additions from [references/transparency.md](./references/transparency.md).
5. Run Codex non-interactively (below), instructing it to use its built-in `image_gen` tool and to copy the final image to an explicit workspace path.
6. Verify the output file exists, then inspect it with the Read tool: subject, style, composition, text accuracy, constraints respected.
7. For transparency, run `scripts/make_transparent.py` on the result and validate the cutout (no halo, no holes).
8. Iterate with a single targeted change per round; for edits, repeat invariants (`change only X; keep Y unchanged`) every iteration.
9. Save non-destructively: never overwrite an existing project asset unless the user asked for replacement — use a versioned sibling name (`hero-v2.png`). For batches, keep only the selected finals unless told otherwise.
10. Report the final saved path(s) and the final image prompt used.

## Driving Codex

Wrap the shaped image prompt in a `codex exec --sandbox workspace-write` instruction — the default `codex exec` sandbox is read-only, so without this flag Codex generates the image but cannot copy it into the project. Always name an explicit output path inside the current workspace — Codex saves `image_gen` outputs under `$CODEX_HOME/generated_images/` by default, and a project asset must never remain only there.

Generate:

```bash
codex exec --sandbox workspace-write 'Using your built-in image_gen tool, generate this image:

Use case: product-mockup
Asset type: landing page hero, wide 16:9 landscape
Primary request: a minimal hero image of a ceramic coffee mug
Style/medium: clean product photography
Lighting/mood: soft studio lighting
Constraints: no logos, no text, no watermark

Then copy the final image to output/imagegen/mug-hero.png in this directory and reply with that path.'
```

Edit — attach the input image with `-i`/`--image` so it is visible to the Codex agent (repeat the flag for multiple inputs; order matters, reference them by index in the prompt):

```bash
codex exec --sandbox workspace-write -i product.png 'Using your built-in image_gen tool, edit the attached image (Image 1, the edit target):

Primary request: replace only the background with a warm sunset gradient
Constraints: change only the background; keep the product and its edges unchanged; no text; no watermark

Then copy the final image to output/imagegen/product-sunset.png in this directory and reply with that path.'
```

Variants: run one `codex exec` call per variant with a distinct output filename (`logo-v1.png`, `logo-v2.png`, …). Serialize the calls rather than parallelizing.

Rules:

- One image per `codex exec` call; keep the instruction limited to generation + copy, no other repo changes.
- Supported input formats for `-i`: PNG, JPEG, GIF, WebP. Convert anything else first.
- If `codex` is missing, unauthenticated, or reports `image_gen` unavailable, stop and tell the user (install: https://developers.openai.com/codex/cli, then `codex login`) — the only generation path is the user's Codex subscription, never an API key or one-off SDK runner.
