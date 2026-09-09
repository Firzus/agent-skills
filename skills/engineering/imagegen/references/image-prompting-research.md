# OpenAI image prompting recommendations

Checked September 9, 2026. Scope: official guidance relevant to the Codex-only imagegen skill; no generation performed.

## Sources and findings

OpenAI publishes a [GPT Image 2.5 prompting guide](https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2.5). The fetched page covers 2.5 despite search results still advertising GPT Image 2. Its runnable example remains pinned to GPT Image 2; illustrated examples use 2.5.

The guide recommends:

- Describe the result, subject, use, composition, and constraints.
- Use labeled sections for complex requests; choose readable, maintainable formatting rather than special syntax.
- Specify visible materials, light, framing, and people’s poses or actions. Camera settings are appearance cues, not physical guarantees.
- Quote exact text, define typography, and verify the output.
- Separate requested edits from preserved details; assign numbered references explicit roles.
- Refine one change at a time using the previous output, then inspect it.

Repeated edits can drift. Prompting alone does not guarantee pixel-identical preservation. The guide also separates API settings from prompt content. [Source](https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2.5#prompting-fundamentals)

The [ChatGPT/Codex image-generation documentation](https://learn.chatgpt.com/docs/image-generation#write-effective-image-prompts) says one to three clear sentences often suffice. Include only success-relevant details, use concrete visual language, and state what must remain fixed. It recommends concise in-image wording, ordered reference roles, targeted revisions, and verification of dense text. This is product-level guidance, not a 2.5-specific benchmark.

## Comparison before the prompting update

Repository assessment of [prompting.md](./prompting.md):

| Area | Finding |
| --- | --- |
| Already covered | Intended use, scene/subject/details/constraints, camera cues, exact text, numbered references, edit invariants. |
| Overprescribed | Mandatory conversion to a labeled schema is stronger than the official format-neutral advice. Labels suit complex requests; short prompts remain valid. |
| Worth clarifying | Camera cues are approximate; people need explicit pose/action details; multi-turn edits should request one change and reuse the prior output. |

## Codex boundary

Apply the natural-language guidance through the exposed Codex image tool. The API guide is a source for prompting techniques, not authorization to add an API route or unsupported tool parameters. Model selection and API request settings are outside this skill’s requested scope. Preserve the native-transparency-only workflow. These are repository constraints, not claims that OpenAI mandates Codex-only use.

This note records the initial research. The subsequent prompting update addressed the comparison above; the operational skill does not link to this note.
