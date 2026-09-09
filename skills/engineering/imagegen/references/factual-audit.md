# Imagegen factual audit

Checked September 9, 2026. Scope: SKILL.md, prompting and transparency references, release and prompting research notes, and the README entry. Repository execution rules are distinguished from product facts.

## Documentation verification

| Area | Finding and action |
| --- | --- |
| Release and backend | Images 2.5 is announced for Codex. A rollout does not establish the backend for each session; the skill now states a target rather than an unconditional runtime identity. [Announcement](https://openai.com/index/introducing-chatgpt-images-2-5/) |
| Usage and access | ChatGPT authentication and general Codex usage accounting are supported. Availability remains a prerequisite, not a guarantee for all installations. [Product documentation](https://learn.chatgpt.com/docs/image-generation) |
| CLI syntax | Local 0.153.4 help confirms exec, workspace-write, login, and image attachments. The edit example needed `--` after image arguments; without it the smoke-test prompt was consumed as an image argument. [CLI reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli) |
| Sandbox and output | Explicit workspace-write works. Removed unconditional claims about the default sandbox and a universal output directory; use the returned file path. Local configuration can affect behavior. [CLI reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli) |
| Input formats | PNG and JPEG are documented. The prior GIF/WebP assertion was not established for this CLI surface and was replaced with a version-specific check. PNG was exercised locally. [Image inputs](https://learn.chatgpt.com/docs/image-inputs) |
| Prompt format | Replaced mandatory schema/taxonomy with short natural-language prompts and optional sections for complex requests. [Product prompting](https://learn.chatgpt.com/docs/image-generation#write-effective-image-prompts) |
| Visual control | References, exact text, edit invariants, and targeted revisions are supported techniques, not preservation guarantees. Camera cues are approximate. [Prompting guide](https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2.5) |
| Tool parameters | The current desktop schema has no size/quality selector. Removed the cross-version absolute: follow the actual exposed schema and inspect dimensions. This is a runtime observation, not a universal CLI contract. |
| Transparency | Native transparency is documented for Images 2.5 and observed in the smoke output. The alpha predicate rejects opaque and empty images, but visual checks remain necessary. [Prompting guide](https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2.5) |
| Workflow boundaries | Codex-only generation, native transparency only, serialized variants, one output per call, and non-destructive saving are repository choices, not platform limits. Removed implied automatic deletion of rejected variants. |
| Inspection and Python | Replaced the agent-specific Read tool name with an available image viewer. Pillow validation works with the bundled Python; a bare python executable was unavailable inside the child CLI shell. No packages were installed. |
| Historical notes | Research findings remain historical snapshots; their wording now distinguishes the initial research from subsequent edits and smoke tests. No operational link to these notes was added. |

## Local checks

- `codex --version`: 0.153.4; `codex login status`: ChatGPT authentication.
- Generation through `codex exec --sandbox workspace-write`: completed; original and copied PNG hashes match.
- Output: 1254 x 1254 RGBA; alpha range 0–255; 709247 fully transparent pixels. Visual inspection confirms a red sphere without text; isolated edge specks mean this is not a production-quality edge certification.
- Embedded metadata reports `gpt-image`, version `2.0`. This does not establish that the session served Images 2.5; provenance metadata may not identify the deployed backend precisely.
- Edit with corrected `-i ... -- PROMPT` syntax: completed and changed the sphere to blue, but returned RGB with alpha range 255–255 and a painted checkerboard. Native-transparency acceptance failed. The source PNG hash remained unchanged. No fallback or local background removal was attempted.
- In-memory Pillow boundary checks: opaque rejected, fully transparent rejected, visible cutout accepted.
- Frontmatter, skill line counts, relative links, marketplace coverage, documentary overviews, and `git diff --check`: passed.

Smoke artifacts are outside the repository at `C:/Users/User/AppData/Local/Temp/imagegen-smoke-fb4561b70be24198886a087cf408e8ac/`. The CLI loaded the globally installed older skill, so this validates the explicit tool workflow rather than automatic discovery of the edited worktree skill. No installed skill or account setting was changed. Unrelated local MCP/hook shutdown warnings did not prevent the first command from returning exit code 0.

These checks do not exhaustively measure every artistic use case, complex edge type, text layout, or input format. Source verification establishes documented capabilities; smoke tests establish only the exercised local paths.
