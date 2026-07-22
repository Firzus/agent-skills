# Transparent backgrounds with gpt-image-2

`gpt-image-2` cannot output transparency: the Image API `background: transparent` option fails on this model, and Codex's built-in `image_gen` produces opaque images with it. The workaround is a two-step chroma-key pipeline.

## Step 1 — generate on a flat chroma background

Prompt for a solid, uniform key color behind the subject. Add these lines to the prompt spec:

```text
Scene/backdrop: solid uniform magenta background, exact color #FF00FF, completely flat
Lighting/mood: even studio lighting on the subject only
Constraints: no shadows cast on the background, no gradients, no vignetting,
  no reflections of the background color on the subject, crisp subject edges
```

Key color choice:

| Key color | Use when |
| --------- | -------- |
| Magenta `#FF00FF` (default) | Almost always — rare in real subjects |
| Green `#00FF00` | Subject contains magenta/pink tones |
| Blue `#0000FF` | Subject contains both magenta and green |

Pick a key color absent from the subject. Never use white, black, or gray — they appear in most subjects and in anti-aliased edges.

## Step 2 — key it out locally

Run the bundled script (requires Pillow):

```bash
python3 skills/engineering/imagegen/scripts/make_transparent.py input.png output/cutout.png
```

- The key color is auto-sampled from the 4 corners; override with `--color FF00FF`. Prefer auto-sampling: `gpt-image-2` renders the requested key color only approximately (e.g. `rgb(239, 20, 233)` for a requested `#FF00FF`), so a hardcoded `--color` can miss the actual background.
- `--threshold` (default 60): raise it if background remnants survive, lower it if subject pixels disappear.
- `--soft` (default 40): width of the alpha ramp for smoother edges.
- Output must be `.png` (alpha channel).

## Validation

Read the output PNG and check:

- No leftover key-color halo around the subject edges — raise `--threshold` slightly or regenerate with "crisp subject edges" reinforced.
- No holes inside the subject where its colors resembled the key — switch key color and regenerate.
- Edge quality on hair/fur/glass — chroma keying struggles there; see the alternative below.

## Alternative: AI background removal

For complex edges (hair, fur, semi-transparency) or when the image was not generated on a chroma background, suggest `rembg` (U2-Net based, local):

```bash
python3 -m pip install "rembg[cli]"
rembg i input.png output/cutout.png
```

Prefer the chroma-key pipeline when you control the generation prompt — it is deterministic and dependency-light. Reach for `rembg` when keying fails or the source image already exists.
