---
name: imagegen
description: Generates or edits images for the current project (website assets, game assets, UI mockups, product mockups, wireframes, logos, photorealistic scenes, infographics) using gpt-image-2 via the local Codex CLI authenticated with the user's ChatGPT subscription. Use when the user asks to generate, edit, restyle, mockup, or remix images, or mentions gpt-image-2 / GPT Image 2 / ChatGPT Images 2.0.
---

# Image Generation Skill (gpt-image-2 via Codex CLI)

Generates or edits images for the current project (for example website assets, game assets, UI mockups, product mockups, wireframes, logo design, photorealistic images, or infographics) using `gpt-image-2`.

## Top-level mode

This skill has exactly one execution mode: the bundled bash wrapper `scripts/gen.sh`, which shells out to the local `codex` CLI.

- The Codex CLI must be installed and logged in (`codex login`) with a ChatGPT plan that includes Image 2.
- The skill never reads `OPENAI_API_KEY`. Authentication and billing piggyback on the user's existing ChatGPT subscription.
- All image generation and editing routes through `gen.sh`. Do not hand-roll one-off SDK runners or call `codex exec` directly from chat.
- Never modify `scripts/gen.sh`, `scripts/extract_image.py`, or `scripts/remove_chroma_key.py`. If something is missing, ask the user before doing anything else.
- For transparent-background requests, use `gen.sh --transparent`. Do not strip backgrounds with ad-hoc post-processing scripts when the chroma-key pipeline would do it more reliably.

If `codex` is not installed or not logged in, stop and tell the user. Do not silently fall back to a different image route, an HTML mockup, or a screenshot workflow.

## When to use

- Generate a new image (concept art, product shot, cover, website hero).
- Generate a new image using one or more reference images for style, composition, mood, or subject guidance.
- Edit an existing image (inpainting, lighting or weather transformations, background replacement, object removal, compositing, transparent background).
- Produce many assets or variants for one task.

## When not to use

- Extending or matching an existing SVG/vector icon set, logo system, or illustration library inside the repo.
- Creating simple shapes, diagrams, wireframes, or icons that are better produced directly in SVG, HTML/CSS, or canvas.
- Making a small project-local asset edit when the source file already exists in an editable native format.
- Any task where the user clearly wants deterministic code-native output instead of a generated bitmap.

## Decision tree

Think about two separate questions:

1. Intent: is this a new image or an edit of an existing image?
2. Execution strategy: is this one asset or many assets/variants?

Intent:

- If the user wants to modify an existing image while preserving parts of it, treat the request as edit and pass the source via `--ref`.
- If the user provides images only as references for style, composition, mood, or subject guidance, treat the request as generate. Pass the references via `--ref`.
- If the user provides no images, treat the request as generate.

Execution strategy:

- One asset: one `gen.sh` call.
- Many assets or variants: loop and issue one `gen.sh` call per asset or variant. Each call gets its own `--out` path so nothing is overwritten.

Assume the user wants a new image unless they clearly ask to change an existing one.

## Use-case taxonomy (exact slugs)

Classify each request into one of these buckets and keep the slug consistent across prompts and references.

Generate:

- `photorealistic-natural` — candid/editorial lifestyle scenes with real texture and natural lighting.
- `product-mockup` — product/packaging shots, catalog imagery, merch concepts.
- `ui-mockup` — app/web interface mockups and wireframes; specify the desired fidelity.
- `infographic-diagram` — diagrams/infographics with structured layout and text.
- `logo-brand` — logo/mark exploration, vector-friendly.
- `illustration-story` — comics, children's book art, narrative scenes.
- `stylized-concept` — style-driven concept art, 3D/stylized renders.
- `historical-scene` — period-accurate/world-knowledge scenes.

Edit:

- `text-localization` — translate/replace in-image text, preserve layout.
- `identity-preserve` — try-on, person-in-scene; lock face/body/pose.
- `precise-object-edit` — remove/replace a specific element (including interior swaps).
- `lighting-weather` — time-of-day/season/atmosphere changes only.
- `background-extraction` — transparent background / clean cutout.
- `style-transfer` — apply reference style while changing subject/scene.
- `compositing` — multi-image insert/merge with matched lighting/perspective.
- `sketch-to-render` — drawing/line art to photoreal render.

## Workflow

For every attached image, label its role explicitly in the prompt:

- reference image
- edit target
- supporting insert / style / compositing input

Then build a structured prompt using the schema below and pass it to `gen.sh` via `--prompt`.

## Shared prompt schema

Use the following labeled spec as scaffolding:

```text
Use case: <taxonomy slug>
Asset type: <where the asset will be used>
Primary request: <user's main prompt>
Input images: <Image 1: role; Image 2: role> (optional)
Scene/backdrop: <environment>
Subject: <main subject>
Style/medium: <photo/illustration/3D/etc>
Composition/framing: <wide/close/top-down; placement>
Lighting/mood: <lighting + mood>
Color palette: <palette notes>
Materials/textures: <surface details>
Text (verbatim): "<exact text>"
Constraints: <must keep/must avoid>
Avoid: <negative constraints>
```

Notes:

- `Asset type` and `Input images` are prompt scaffolding, not script flags.
- Use only the lines that help. Add a short extra labeled line when it materially improves clarity.
- For edits, explicitly list invariants (`change only X; keep Y unchanged`) and repeat them across iterations.

## Specificity policy

- If the user's prompt is already specific and detailed, normalize it into a clear spec without adding creative requirements.
- If the user's prompt is generic, add tasteful augmentation only when it materially improves output quality.

Allowed augmentations:

- composition or framing hints
- polish level or intended-use hints
- practical layout guidance
- reasonable scene concreteness that supports the stated request

Not allowed:

- extra characters or objects that are not implied by the request
- brand names, slogans, palettes, or narrative beats that are not implied
- arbitrary side-specific placement unless the surrounding layout supports it

## How to invoke

Text-to-image:

```bash
bash ~/.cursor/skills/imagegen/scripts/gen.sh \
  --prompt "<final structured prompt>" \
  --out <absolute/path/to/output.png>
```

Image-to-image (the `--ref` flag is repeatable for multi-reference composition):

```bash
bash ~/.cursor/skills/imagegen/scripts/gen.sh \
  --prompt "<final structured prompt, e.g. 'repaint in watercolor'>" \
  --ref /absolute/path/to/reference.png \
  --ref /absolute/path/to/reference2.png \
  --out <absolute/path/to/output.png>
```

Transparent background (chroma-key workflow — see next section):

```bash
bash ~/.cursor/skills/imagegen/scripts/gen.sh \
  --prompt "<final structured prompt — describe ONLY the subject, not the background>" \
  --transparent \
  --out <absolute/path/to/output.png>
```

Optional flags:

- `--timeout-sec 300` (default 300)
- `--transparent` enables the chroma-key workflow
- `--key-color #rrggbb` overrides the default `#00ff00` key color

After the script succeeds, display or attach the output file. Do not stop at "done, see path X".

## Transparent backgrounds (chroma-key workflow)

`gpt-image-2` does **not** support `background=transparent` natively (per
the OpenAI API docs and the `image_generation` tool spec exposed by the
Codex CLI — it ships with `output_format: "png"` only, no `background`
field). When the user asks for transparency, do not silently fall back
to a different model. Use the chroma-key workflow this skill provides:

1. Pass `--transparent` to `gen.sh`. The script automatically appends
   chroma-key constraints to the user's prompt: "the entire background
   must be one perfectly flat solid color, exactly `<KEY>`; no
   shadow/reflection/gradient/floor; do not use that color in the
   subject".
2. The model produces a PNG on a flat solid background.
3. The script post-processes the result via
   `scripts/remove_chroma_key.py` (Pillow): auto-samples the key from
   the image border, builds a soft alpha mask via two thresholds
   (transparent ≤ 12, opaque ≥ 80 by default), runs despill on the
   dominant key channel, and applies a half-pixel feather on the alpha
   edge. The final RGBA PNG is written to `--out`.

Key-color guidance (do not change unless needed):

- Default: `#00ff00` — works for most subjects.
- Use `--key-color "#ff00ff"` (magenta) when the subject contains green
  (foliage, slime, neon UI accents, lime branding).
- Avoid `#0000ff` for subjects that contain blue (sky, water, denim,
  Cursor blues).

Hard constraints when invoking with `--transparent`:

- Describe only the subject in the prompt. **Do not** mention "white
  background", "studio backdrop", "transparent", "alpha", or any other
  background hint — the script will append its own background spec, and
  conflicting language confuses the model.
- For UI/logo glow effects you want to preserve (drop shadows, halos),
  shrink them or add `--key-color` to a complementary color so the
  glow's outer fade is not interpreted as background.

If the script returns exit code 8 ("no transparent area"), the model
ignored the chroma-key instruction. Retry once. If it still fails, the
subject is likely too complex for clean keying (hair, fur, smoke, glass,
liquids, reflective objects); tell the user the limitation rather than
silently retrying with a different model.

This skill does not implement a "true native transparency" fallback via
`gpt-image-1.5 --background transparent`. That path requires
`OPENAI_API_KEY` and a separate API client; this skill never reads
`OPENAI_API_KEY`.

## Save-path policy

Save-path precedence:

1. If the user names a destination, use it.
2. If the image is meant for the current project, write the final selected image into the workspace under a sensible asset path (for example `public/`, `assets/`, `static/images/`, depending on the project's conventions) before finishing.
3. If the image is only for preview or brainstorming, default to `./image-<timestamp>.png` in the current working directory.

Do not overwrite an existing asset unless the user explicitly asked for replacement; otherwise create a sibling versioned filename such as `hero-v2.png` or `item-icon-edited.png`.

Always report the final saved path, the final prompt that was sent, and the use-case slug.

## Hard constraints

- Do not switch routes without permission. If the user said "use gpt-image-2" or "use Image 2", do not substitute another model, an HTML mockup, or a manual screenshot workflow.
- Do not rewrite the user's prompt unless asked. Apply only the specificity policy above.
- Do not imply this skill works without a local `codex` login and a valid ChatGPT subscription with image-generation entitlement.
- Never set `OPENAI_API_KEY` or ask the user for an API key — this skill does not use one.

## Exit codes

| code | meaning |
| --- | --- |
| 0 | success — output path printed on stdout |
| 2 | bad args |
| 3 | `codex` or `python3` CLI missing |
| 4 | `--ref` file does not exist |
| 5 | `codex exec` failed (auth? network? model?) |
| 6 | no new session rollout file detected |
| 7 | imagegen did not produce an image payload (feature not enabled, quota, or capability refused) |
| 8 | chroma-key removal failed (Pillow missing, model ignored chroma-key instruction, or alpha output had no transparent area) |

On failure, name the layer in one sentence (for example `gen.sh: codex exec failed (likely auth or network)`) instead of dumping the full stderr at the user.

## How it works

The `codex` CLI reuses the logged-in ChatGPT session and exposes an `imagegen` tool (gated behind the `image_generation` feature flag). The wrapper script:

1. Snapshots `~/.codex/sessions/` before the run.
2. Runs `codex exec --enable image_generation --sandbox read-only ...` (with one `-i <path>` per `--ref`).
3. Diffs the sessions directory, then invokes `scripts/extract_image.py` to scan every new rollout JSONL for a base64 image payload (PNG / JPEG / WebP magic-header match).
4. Decodes the largest matching blob and writes it to `--out` (or to a temp file when `--transparent` is used).
5. When `--transparent` is set, runs `scripts/remove_chroma_key.py` over the temp file and writes the resulting RGBA PNG to `--out`.

Two non-obvious details other wrappers get wrong on `codex-cli` 0.111.0+:

- `--enable image_generation` is required; the feature is still under development and off by default.
- `--ephemeral` must not be used — ephemeral sessions aren't persisted, so the image payload has nowhere to live.

Why the chroma-key dance instead of `background=transparent`:

- The Codex CLI's `image_generation` tool ships with a minimal spec
  (`{"type":"image_generation","output_format":"png"}`) — no
  `background`, `quality`, or `size` field is exposed today.
- Even if it were, `gpt-image-2` itself does not support
  `background=transparent`. Per the OpenAI API docs, only `gpt-image-1`
  and `gpt-image-1.5` honor that parameter, and reaching them requires
  an `OPENAI_API_KEY`-authenticated API call this skill deliberately
  doesn't make.
- The OpenAI-shipped imagegen system skill resolves this the same way:
  generate on a flat chroma-key background, then key-out locally.

## Data handling

The script is narrowly scoped on purpose:

- Reads only session rollout files created by its own `codex exec` invocation. The sessions directory is snapshotted before the call and diffed after, so any prior `~/.codex/sessions/*` files (which may contain unrelated Codex conversations) are never touched, read, or transmitted.
- Writes only two kinds of file: the output PNG at the caller's `--out` path, and short-lived `mktemp` logs that are auto-deleted on exit via a trap.
- No environment variables are read. No credentials are requested. No other paths under `~/.codex/` are accessed.
- No network calls leave this skill. The only outbound traffic is the one made by the `codex` CLI itself (to OpenAI, using the user's existing ChatGPT login) — this skill does not add endpoints, telemetry, or callbacks.

## Examples

### Transparent example (favicon / logo / UI mark)

```text
Use case: stylized-concept
Asset type: app favicon
Primary request: a single abstract aurora orb mark suitable as a favicon
Subject: one circular orb, centered
Style/medium: smooth gradient mesh, modern flat-meets-glow vector look
Composition/framing: perfectly centered, square 1:1, ~12% padding each side
Color palette: violet, magenta, peach
Constraints: readable as a tiny icon; high contrast; no shadows that touch the canvas edges; no text
```

Invocation:

```bash
bash ~/.cursor/skills/imagegen/scripts/gen.sh \
  --prompt "Use case: stylized-concept
Asset type: app favicon
Primary request: a single abstract aurora orb mark
Subject: one circular orb, centered
Style/medium: smooth gradient mesh, modern flat-meets-glow vector look
Composition/framing: perfectly centered, square 1:1, ~12% padding each side
Color palette: violet, magenta, peach
Constraints: readable as a tiny icon; no text" \
  --transparent \
  --out /abs/path/to/public/icon.png
```

Note: do NOT mention "transparent", "white background", or any
background hint in the prompt body — `--transparent` automatically
appends the chroma-key spec.

### Generation example (hero image)

```text
Use case: product-mockup
Asset type: landing page hero
Primary request: a minimal hero image of a ceramic coffee mug
Style/medium: clean product photography
Composition/framing: wide composition with usable negative space for page copy
Lighting/mood: soft studio lighting
Constraints: no logos, no text, no watermark
```

Invocation:

```bash
bash ~/.cursor/skills/imagegen/scripts/gen.sh \
  --prompt "Use case: product-mockup
Asset type: landing page hero
Primary request: a minimal hero image of a ceramic coffee mug
Style/medium: clean product photography
Composition/framing: wide composition with usable negative space for page copy
Lighting/mood: soft studio lighting
Constraints: no logos, no text, no watermark" \
  --out /abs/path/to/public/hero.png
```

### Edit example (background replacement with invariants)

```text
Use case: precise-object-edit
Asset type: product photo background replacement
Primary request: replace only the background with a warm sunset gradient
Constraints: change only the background; keep the product and its edges unchanged; no text; no watermark
```

Invocation:

```bash
bash ~/.cursor/skills/imagegen/scripts/gen.sh \
  --prompt "Use case: precise-object-edit
Asset type: product photo background replacement
Primary request: replace only the background with a warm sunset gradient
Constraints: change only the background; keep the product and its edges unchanged; no text; no watermark" \
  --ref /abs/path/to/source-product.png \
  --out /abs/path/to/public/hero-v2.png
```

## Prerequisites

1. `codex` CLI installed — `brew install codex` (macOS) or see [openai/codex](https://github.com/openai/codex).
2. Logged in with a ChatGPT plan that includes Image 2 — `codex login`.
3. `python3` on `PATH` (ships with macOS; `apt install python3` on Linux; install Python 3 on Windows).
4. **Only when using `--transparent`:** the `Pillow` Python package
   (`python3 -m pip install --user pillow`). The script verifies this
   at runtime and exits with code 8 if missing.

If installation is not possible in the user's environment, tell them which dependency is missing and how to install it. Do not attempt to install anything on their behalf without permission.

## Reference map

- For prompting principles shared across all use cases, see [references/prompting.md](references/prompting.md).
- For copy/paste prompt recipes by asset type, see [references/sample-prompts.md](references/sample-prompts.md).
- For Codex CLI internals (feature flags, session rollouts, auth model), see [references/codex-cli.md](references/codex-cli.md).
