# Prompting principles for gpt-image-2

These principles apply to every call routed through `gen.sh`. They are
distilled from the OpenAI Image Generation guide and adapted for the
Codex CLI flow used by this skill.

## Order of attention

Structure prompts so the most load-bearing information appears first:

1. **Scene / backdrop** — the environment.
2. **Subject** — the main thing in the image.
3. **Details** — composition, lighting, materials, palette, text.
4. **Constraints** — invariants and negative constraints.

When in doubt, start with the broadest decision (photo vs illustration,
wide vs close, daylight vs night) and narrow down from there.

## Intended use sets the polish level

State what the image is for. The model adjusts polish, framing, and
density automatically when it knows whether it is producing:

- a landing-page hero with negative space for copy,
- a tight product shot for a catalog,
- a UI mockup at low or high fidelity,
- an infographic with structured layout,
- a children's illustration vs an editorial photo.

If the user gave an asset type, surface it on its own labeled line in
the prompt scaffolding (see [SKILL.md](../SKILL.md) for the full
schema).

## Camera and composition language helps photoreal

For `photorealistic-natural` and `product-mockup`, lean on real
photography vocabulary: focal length cue ("wide", "tight"),
perspective ("top-down", "three-quarter"), depth of field ("shallow"),
lighting ("soft studio", "golden hour", "rim light").

Avoid mixing photoreal and illustrated cues in the same prompt unless
the user explicitly asked for a hybrid.

## Quote text verbatim

When in-image text matters:

- Put it on its own line: `Text (verbatim): "Sale ends Friday"`.
- Specify typography or placement only when the user asked or when the
  layout demands it ("centered, sans-serif, no kerning tricks").
- For tricky words (proper nouns, technical terms), spell them
  letter-by-letter in the prompt and require verbatim rendering.

Do not invent slogans or marketing copy.

## Multi-reference: label every input

When attaching `--ref` images, label each one's role inside the prompt
text so the model knows what to do with it:

```text
Input images:
  Image 1: edit target — the room photo to relight
  Image 2: style reference — the painting whose palette we are matching
  Image 3: subject reference — the chair to insert
```

This works because `codex exec -i <path>` attaches the file but the
model still benefits from explicit role assignment in the prose.

## Edits: repeat invariants every iteration

Edit prompts drift across rounds unless the invariants are restated.
Always include both the change and what must not change:

```text
Primary request: replace the background with a warm sunset gradient
Constraints: change only the background; keep the product and its
edges unchanged; do not add text; do not add a watermark
```

After the first round, the next iteration should still carry those
constraints, even if the user only described the new tweak.

## Specificity policy

- If the user's prompt is already detailed, normalize it into the
  schema without adding creative requirements.
- If the prompt is generic, add only the augmentation that materially
  improves the result. Allowed: composition hints, polish level,
  practical layout, reasonable scene concreteness. Not allowed: brand
  names, slogans, palettes, or characters that aren't implied.

## Iterate with single-change follow-ups

When refining an image, change one thing at a time. Big multi-axis
edits are harder to evaluate and harder for the model to land
cleanly. Ask the user for a single-change follow-up if their next
request bundles several edits.

## When to break the rules

These are heuristics, not laws. The user's stated intent always wins:

- If they want a maximalist mood-board prompt, give them one.
- If they want a one-line "make it pretty", don't lecture them.
- If they want a hybrid photoreal + illustration look, lean into it
  and document the choice on the `Style/medium` line.
