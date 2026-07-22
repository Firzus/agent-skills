# Prompting gpt-image-2

Shared prompt guidance for both `generate` and `edit`. `gpt-image-2` follows instructions closely — a structured, explicit spec outperforms a vague sentence.

## Prompt schema

Reformat the user's request into a labeled spec. Use only the lines that help; skip empty ones.

```text
Use case: <taxonomy slug>
Asset type: <where the asset will be used>
Primary request: <user's main prompt>
Input images: <Image 1: role; Image 2: role> (edits only)
Scene/backdrop: <environment>
Subject: <main subject>
Style/medium: <photo / illustration / 3D / etc>
Composition/framing: <wide / close / top-down; placement>
Lighting/mood: <lighting + mood>
Color palette: <palette notes>
Text (verbatim): "<exact text>"
Constraints: <must keep / must avoid>
Avoid: <negative constraints>
```

`Scene/backdrop` is the visual setting inside the prompt. For transparent cutouts, set it to a solid chroma color per [transparency.md](./transparency.md).

## Specificity policy

- If the user's prompt is already specific, normalize it into the schema without adding creative requirements.
- If it is generic, add only tasteful augmentation that materially improves the result: composition hints, polish level, intended use, reasonable scene concreteness.
- Never add: extra characters or objects not implied by the request, brand names, slogans, palettes, or narrative beats the user did not ask for.

## Use-case taxonomy

Generate: `photorealistic-natural`, `product-mockup`, `ui-mockup`, `infographic-diagram`, `logo-brand`, `illustration-story`, `stylized-concept`, `historical-scene`.

Edit: `text-localization`, `identity-preserve`, `precise-object-edit`, `lighting-weather`, `style-transfer`, `compositing`, `sketch-to-render`, `background-extraction` (via the chroma-key pipeline in [transparency.md](./transparency.md)).

## Best practices

- Structure the prompt scene/backdrop → subject → details → constraints.
- State the intended use (ad, UI mock, infographic, game asset) to set polish level.
- Use camera and composition language for photorealism (lens, angle, depth of field).
- Quote exact text verbatim and specify typography and placement; `gpt-image-2` renders text well when told precisely what to write. For tricky words, spell them letter by letter.
- For multi-image edits, reference inputs by index ("Image 1 is the edit target; Image 2 provides the style").
- For edits, list invariants explicitly (`change only X; keep Y unchanged`).

Filled-in examples of the schema live in the "Driving Codex" section of [SKILL.md](../SKILL.md).
