# Prompting Images 2.5

## Write the prompt

Start with one to three clear sentences when sufficient. Preserve a specific user prompt; add only details needed to make a vague request actionable, without inventing brands, characters, or requirements. Use labeled sections only when they make a complex request easier to follow.

Describe the intended use, subject and action, setting, composition, and style. Include lighting, materials, colors, or framing only when they affect success. Prefer visible details such as light from a left-hand window over vague praise such as beautiful lighting.

For people, specify the pose or action when important. Camera terminology describes a desired appearance, not a guaranteed physical simulation.

## Text and references

- Put exact text in quotation marks, preserving capitalization. Specify placement and typography; spell uncommon names letter by letter when useful. Review every word in the output, especially in dense layouts.
- Identify reference images by order and role: edit target, style, layout, or inserted content. Explain spatial relationships when compositing.
- State what must change and what must remain fixed. Reuse the previous output for a targeted edit, repeat invariants, and inspect each result; prompting does not guarantee pixel-identical preservation.
- For transparent cutouts, follow [transparency.md](./transparency.md).

## Examples

Generate: "Create a wide 16:9 product photograph of a ceramic coffee mug for a landing-page hero. Use soft studio light from the left and a minimal background, with no text or logos."

Edit: "Replace only the background of Image 1 with a warm sunset gradient. Keep the product, its edges, position, and crop unchanged."

Sources: [Codex image prompting](https://learn.chatgpt.com/docs/image-generation#write-effective-image-prompts), [Images 2.5 prompting](https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2.5#prompting-fundamentals).
