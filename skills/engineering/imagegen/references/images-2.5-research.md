# Images 2.5 release research

Checked September 9, 2026, for the imagegen skill migration.

## Confirmed

- OpenAI announced ChatGPT Images 2.5 on September 8, 2026, with rollout to ChatGPT, ChatGPT Work, and Codex across tiers. The announcement describes better reference preservation, focused edits, multi-turn consistency, and transparent backgrounds. [Official announcement](https://openai.com/index/introducing-chatgpt-images-2-5/)

## Codex boundary

The Codex image-generation documentation still names `gpt-image-2` at the time of this check, while the release announcement says Images 2.5 is rolling out to Codex. An older documentation page does not disprove the release, and a rollout announcement does not establish the backend served to every local session. [Codex image generation](https://learn.chatgpt.com/docs/image-generation), [official announcement](https://openai.com/index/introducing-chatgpt-images-2-5/)

Migration decision: use the subscription-backed `codex exec` and built-in `image_gen` workflow exclusively. Follow the exposed tool schema and report an exact backend version only when runtime metadata establishes it. Transparency acceptance criteria are defined in [transparency.md](./transparency.md). No generation or authenticated runtime test was performed during the initial release research. Subsequent smoke testing is recorded separately in the factual audit.
