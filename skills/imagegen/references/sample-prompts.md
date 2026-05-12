# Sample prompts (copy / paste recipes)

Each recipe follows the labeled schema documented in
[SKILL.md](../SKILL.md). They are starting points — adjust before
sending to `gen.sh --prompt`.

For prompting principles behind these templates, see
[prompting.md](prompting.md).

## Website hero / OG image (`product-mockup` or `photorealistic-natural`)

```text
Use case: product-mockup
Asset type: landing page hero / OG image
Primary request: <one sentence describing the subject>
Style/medium: clean product photography, natural materials
Composition/framing: wide composition, subject offset to the right,
  generous negative space on the left for headline copy
Lighting/mood: soft studio lighting, neutral white backdrop
Color palette: muted, warm neutrals
Constraints: no logos, no text, no watermark, no people unless requested
```

## UI mockup, low fidelity (`ui-mockup`)

```text
Use case: ui-mockup
Asset type: low-fidelity wireframe
Primary request: <screen description, e.g. "settings page with three sections">
Style/medium: greyscale wireframe, simple shapes, light grid
Composition/framing: standard desktop viewport, header + body + sidebar
Materials/textures: flat fills, no gradients, no shadows
Text (verbatim): use placeholder lorem text only
Constraints: no real brand names, no colors beyond grey, no icons
```

## UI mockup, high fidelity (`ui-mockup`)

```text
Use case: ui-mockup
Asset type: high-fidelity product UI screenshot
Primary request: <screen description>
Style/medium: modern web UI, system fonts, generous spacing
Composition/framing: 1440x900 desktop, light theme
Color palette: neutral background, single accent color (specify hex if known)
Text (verbatim): "<exact copy>"
Constraints: no marketing slogans, no faux competitor logos
```

## Product mockup, packaging (`product-mockup`)

```text
Use case: product-mockup
Asset type: packaging concept render
Primary request: <product type and material>
Style/medium: physical product photography, matte finish
Composition/framing: three-quarter view, centered, slight shadow
Lighting/mood: soft studio lighting from upper-left
Color palette: <palette notes>
Text (verbatim): "<exact pack copy>"
Constraints: keep packaging silhouette plausible; no extra SKU variants
```

## Logo exploration (`logo-brand`)

```text
Use case: logo-brand
Asset type: logo mark exploration
Primary request: a wordmark / lockup for "<brand name>" in <industry>
Style/medium: vector-friendly, flat, two-color maximum
Composition/framing: square crop, centered, generous padding
Constraints: legible at 64 px; no gradients; no photographic elements;
  do not include taglines unless requested
```

## In-image text edit (`text-localization`)

Pass the source image with `--ref`. Reuse this body verbatim across
iterations to keep invariants stable.

```text
Use case: text-localization
Asset type: in-image text replacement
Primary request: replace the visible text with "<new text>", verbatim
Constraints: change only the visible text; keep typography, layout,
  colors, and surrounding pixels unchanged; do not change image size
```

## Background replacement with invariants (`precise-object-edit`)

```text
Use case: precise-object-edit
Asset type: product photo background replacement
Primary request: replace only the background with <new backdrop>
Constraints: change only the background; keep the subject, its edges,
  and its cast shadow unchanged; no text; no watermark
```

## Sketch-to-render (`sketch-to-render`)

Pass the sketch with `--ref`.

```text
Use case: sketch-to-render
Asset type: photoreal render from line art
Primary request: render the attached sketch as a <material/scene description>
Style/medium: photoreal, detailed materials, realistic lighting
Constraints: keep composition and proportions identical to the sketch;
  do not introduce extra objects; do not extend the canvas
```

## Multi-reference style transfer (`style-transfer`)

Pass the subject as `--ref` first, then the style reference as the
second `--ref`. Label them inside the prompt so the model knows which
is which.

```text
Use case: style-transfer
Asset type: stylized version of an existing image
Primary request: render the subject from Image 1 in the style of Image 2
Input images:
  Image 1: subject — keep composition and pose
  Image 2: style reference — borrow palette, brushwork, and texture
Constraints: keep the subject's identity and pose; only change rendering
  style; do not add new objects from Image 2 into the scene
```

## Compositing (`compositing`)

```text
Use case: compositing
Asset type: composite of multiple references
Primary request: insert the object from Image 2 into the scene from Image 1
Input images:
  Image 1: scene — preserve perspective and lighting direction
  Image 2: object to insert — match the scene's lighting and shadows
Constraints: do not modify Image 1's background; only the inserted
  object should be new; cast a plausible shadow that matches the scene
```

## Lighting / weather change (`lighting-weather`)

```text
Use case: lighting-weather
Asset type: time-of-day variant of an existing image
Primary request: change the scene from <current> to <new lighting/weather>
Constraints: keep all subjects, objects, and composition unchanged;
  only update sky, lighting direction, color temperature, and shadows
```

## Background extraction / transparent cutout (`background-extraction`)

```text
Use case: background-extraction
Asset type: transparent-background cutout
Primary request: produce a clean cutout of the subject with no background
Constraints: keep the subject's edges crisp; no halo; no leftover
  background pixels; output should be transparent where the background
  used to be
```
