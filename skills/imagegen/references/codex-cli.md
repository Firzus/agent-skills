# Codex CLI internals (gpt-image-2)

This document covers the runtime details that `gen.sh` depends on. The
shipped script is the source of truth; this file exists so a future
maintainer can understand the moving parts without re-deriving them.

## Why the Codex CLI?

`gpt-image-2` is exposed to logged-in ChatGPT subscribers through the
`codex` CLI's `imagegen` tool. Routing through `codex exec` means:

- The user's existing ChatGPT subscription handles auth and billing.
- No `OPENAI_API_KEY` is needed (and this skill never reads one).
- The image returns embedded as a base64 payload inside a session
  rollout JSONL on disk, which is reliable to pick up after the call
  exits.

## Required flags on `codex exec`

`gen.sh` builds this argv (one `-i` per `--ref`):

```bash
codex exec --enable image_generation --sandbox read-only [-i <ref> ...] "<prompt>"
```

Two non-obvious details on `codex-cli` 0.111.0+:

### `--enable image_generation` is required

The `imagegen` tool is gated behind a feature flag. Without
`--enable image_generation` the model has no tool to call and the run
ends with a regular text response. This is why exit code 7 exists in
`gen.sh`: the `codex` invocation can succeed (rc=0) while still
producing zero image payloads.

### `--ephemeral` is forbidden

Ephemeral sessions are not persisted to `~/.codex/sessions/`. Without
a rollout file there is no place for the base64 image payload to live,
and the extractor has nothing to scan. Always run with persisted
sessions.

### `--sandbox read-only`

The image generation flow does not need to write to the workspace —
`gen.sh` itself owns the only write (the `--out` PNG). Using
`read-only` keeps the surface area of the spawned `codex` process
small.

## Session rollout structure

After a successful `codex exec`, a new file appears in
`~/.codex/sessions/` (path may include date-bucketed subdirectories).
It is a JSONL stream where each line is one event in the conversation.

Image payloads are embedded as base64 strings inside tool-call
arguments or tool-result events. They are large (hundreds of KB to a
few MB), and they decode to bytes whose first few bytes match a
recognizable image magic header.

The extractor takes a deliberately format-agnostic approach instead of
relying on a stable JSON schema:

1. For each line in the new rollout files, regex-scan for any
   sufficiently long base64 substring (≥ 256 chars).
2. Try to base64-decode each match strictly (`validate=True`).
3. Discard anything below 1 KB and anything whose first 16 bytes
   don't match PNG (`89 50 4E 47 0D 0A 1A 0A`), JPEG (`FF D8 FF`), or
   WebP (`RIFF????WEBP`).
4. Keep the largest match across all new rollouts.

This keeps the pipeline robust to small CLI version bumps that might
rename or restructure the JSON wrapper around the image payload.

## Snapshot-and-diff isolation

Before launching `codex exec`, `gen.sh` records the existing
`*.jsonl` files under `~/.codex/sessions/`. After the call, it lists
the directory again and computes the new files via `comm -13`. Only
those new files are passed to `extract_image.py`. Prior Codex
conversations are never read.

If no new file appears (network failure, segfault, sandbox refusal),
`gen.sh` exits 6.

## Auth model

`codex` stores its login under the user's home directory and refreshes
it as needed. This skill does not touch any auth artifact and does not
inspect environment variables. The user is responsible for:

1. Installing the CLI: see [openai/codex](https://github.com/openai/codex).
2. Logging in once: `codex login`.
3. Holding a ChatGPT plan that includes Image 2 / `gpt-image-2`.

If `codex` reports it is not logged in (or the run rc is non-zero
because of auth), `gen.sh` exits 5 and points the caller at the
captured log file. Do not try to reauthenticate or refresh tokens
from inside the skill.

## Network and side effects

- The only outbound traffic is the one `codex` makes to OpenAI on
  behalf of the logged-in user. The skill adds no endpoints,
  telemetry, or callbacks.
- Filesystem writes are limited to the `--out` PNG, the parent
  directories needed to place it, and short-lived `mktemp` log/list
  files that are removed via the `EXIT` trap.
- The skill never edits the existing contents of `~/.codex/`.

## Transparent-background limitation (gpt-image-2)

The `imagegen` tool exposed by Codex CLI ships with a minimal
specification, roughly:

```json
{ "type": "image_generation", "output_format": "png" }
```

There is no `background`, `quality`, or `size` field surfaced to the
caller. Even if there were, `gpt-image-2` itself does not honor
`background: "transparent"` — per the OpenAI API docs:

> `gpt-image-2` and `gpt-image-2-2026-04-21` do not support transparent
> backgrounds. Requests with `background` set to `"transparent"` will
> return an error for these models; you must use `"opaque"` or
> `"auto"` instead. Earlier models like `gpt-image-1.5` and
> `gpt-image-1` do support it.

Sources:

- OpenAI API reference: <https://developers.openai.com/api/reference/resources/images>
- OpenAI image generation guide: <https://developers.openai.com/api/docs/guides/image-generation>
- Tracking issue: <https://github.com/openai/codex/issues/18636>
- Resolved imagegen skill PR: <https://github.com/openai/codex/pull/18852>

### Mitigation: built-in chroma-key workflow

`gen.sh --transparent` mirrors the workflow OpenAI shipped in their own
imagegen system skill (PR #18852, merged April 2026):

1. Append a strict chroma-key spec to the user's prompt: a single flat
   solid background color, no shadows, no gradients, the same color
   forbidden inside the subject.
2. Run `codex exec` as usual; the model produces a PNG on the
   chroma-key background.
3. Pipe the result through `scripts/remove_chroma_key.py` (Pillow):
   border-sample the key color, build a soft alpha matte, despill the
   dominant key channel on edges, optional feather/contract.

This is robust for solid subjects (logos, icons, product mockups,
geometric marks). It is fragile for hair, fur, smoke, glass, liquids,
and reflective objects — there the chroma color bleeds into the
subject's edges in ways the despill cannot fully recover.

### Why we don't fall back to `gpt-image-1.5`

True/native transparency is technically reachable through
`gpt-image-1.5 --background transparent --output-format png`, but only
via a direct OpenAI API call that requires `OPENAI_API_KEY`. This
skill is contractually forbidden from reading that variable (the
top-level `SKILL.md` says so explicitly). Implementing that fallback
would also be a model downgrade per OpenAI's own guidance, so it is
left as a documentation note rather than an automated path.
