# Prompting Images 2.5

## Write the prompt

Start with one to three clear sentences when sufficient. Preserve a specific user prompt; add only details needed to make a vague request actionable, without inventing brands, characters, or requirements. Use labeled sections only when they make a complex request easier to follow.

Describe the intended use, subject and action, setting, composition, and style. Include lighting, materials, colors, or framing only when they affect success. Prefer visible details such as light from a left-hand window over vague praise such as beautiful lighting.

For photographs, request photorealism explicitly. For people, specify body framing, gaze, scale, and object contact when important. Camera terminology describes a desired appearance, not a guaranteed physical simulation.

## Text and references

- Put exact text in quotation marks, preserving capitalization. Specify placement, typography, repetition count, and whether other text is allowed; spell uncommon names letter by letter when useful.
- Identify reference images by order and role: edit target, style, layout, or inserted content. Explain spatial relationships when compositing.
- State what must change and what must remain fixed, including surrounding objects, color, and camera angle when relevant.
- For transparent cutouts, follow [transparency.md](./transparency.md).

## Revise an image

Attach the previous output to the next CLI call; separate `codex exec` calls do not supply that image automatically. Request one correction and restate preservation constraints. Compare before continuing. If a result regresses, resume from the last acceptable saved version rather than building on the failed edit.

Pixel-identical preservation requires deterministic compositing, not prompting alone. Even API masks are only guidance. If exact preservation is mandatory, explain this skill's `image_gen`-only boundary and ask whether a separate compositing workflow is acceptable; do not silently introduce one or weaken the requirement.

## Acceptance checks

Apply the rows relevant to the request before accepting or revising an output.

| Output | Check |
| --- | --- |
| Every image | Subject, composition, style, requested exclusions. |
| Text | Spelling, legibility, placement, occurrence count, unwanted words. |
| Infographic | Labels, arrows, and factual relationships against the supplied source; report missing evidence. |
| Edit | Changed region and preserved details against the input, including identity, product geometry, and labels. |
| Transparent asset | Complete the alpha and edge checks in [transparency.md](./transparency.md). |

## Examples

Generate: "Create a wide 16:9 product photograph of a ceramic coffee mug for a landing-page hero. Use soft studio light from the left and a minimal background, with no text or logos."

Edit: "Replace only the background of Image 1 with a warm sunset gradient. Keep the product, its edges, position, and crop unchanged."

Sources checked September 20, 2026: [product image prompting](https://learn.chatgpt.com/docs/image-generation#write-effective-image-prompts), [API image prompting](https://developers.openai.com/api/docs/guides/image-prompting#prompting-fundamentals), [mask limitations](https://developers.openai.com/api/docs/guides/image-generation#edit-an-image-using-a-mask). API examples do not change the skill's Codex-only execution rules.
