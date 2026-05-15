---
name: compact-shim
description: >-
  Produces a structured hand-off summary of the current Cursor conversation so
  the user can paste it into a fresh chat and continue without losing context.
  Replaces Cursor's native `/summarize`, which is routed server-side to
  Cursor's hosted models and never reaches BYOK endpoints (custom OpenAI /
  Anthropic / proxy). Triggers when the user types `/compact`, `/condense`,
  `/summarize-byok`, or says "compact this conversation", "summarize for
  hand-off", "free up the context window", "/summarize doesn't work with my
  API key", "BYOK summarization", or similar phrasings. Cursor-only — skip in
  other agents (Claude Code, Codex CLI, generic).
disable-model-invocation: true
---

# /compact — Cursor BYOK hand-off summary

When invoked, you (the agent) immediately produce a Markdown summary of the current conversation in the exact format below. The user pastes the **Hand-off snippet** section into a new Cursor chat (`Cmd+N` / `Ctrl+N`) to actually free Cursor's context window.

This skill exists because Cursor's native `/summarize` is routed server-side to Cursor's hosted summarization pool and never traverses BYOK endpoints — confirmed by a Cursor moderator: *"the summarization feature doesn't pass through your custom API credentials."* ([source](https://forum.cursor.com/t/summarizing-conversations-does-not-inherit-model-settings/154745))

## Environment check — skip if not Cursor

```
This skill targets Cursor specifically. If the current runtime is NOT Cursor
(e.g. Claude Code, Codex CLI, generic terminal agent), do nothing and inform
the user that this skill only applies inside Cursor with a BYOK endpoint.
```

You can identify the Cursor runtime by:

- Presence of `~/.cursor/` or `.cursor/` directories in the workspace
- Cursor-specific environment variables (`CURSOR_TRACE_ID`, etc.)
- The user explicitly mentioning Cursor, BYOK, or a custom API endpoint
- A `.cursor/commands/` directory in the workspace

If none of these apply, respond: *"This skill (`compact-shim`) only applies inside Cursor with a BYOK endpoint. Skipping — happy to summarize using my native capabilities instead if you'd like."* — then await user direction.

## When invoked

The user has typed `/compact`, said "compact this conversation", "summarize for hand-off", "free up the context window", or any equivalent. Stop whatever you were doing. Do not call tools. Do not ask follow-up questions. Produce the summary directly in the format below.

## Output format

Wrap the entire summary between these exact markers on their own lines:

```
=== SHIM COMPACTION ARTIFACT ===

[sections below]

=== END COMPACTION — open a new Cursor chat and paste the "Hand-off snippet" section above ===
```

Inside the markers, produce these sections with `##` headings, in this order:

### `## Goal`

One-sentence description of what the user is trying to accomplish in this conversation. Concrete, not abstract.

### `## Decisions made`

Bullet list of concrete decisions, conventions, or constraints established so far. Examples: "chose pnpm over npm", "API contract uses snake_case", "tests live alongside source files". Skip if the conversation hasn't established any.

### `## Files touched`

Bullet list of file paths read or modified, with a one-line note on each. Use repository-relative paths (e.g. `src/lib/server/handlers/chat-completions.ts`, not absolute). If a file was modified, prefix the note with "modified:"; if only read, prefix with "read:".

### `## Open tasks`

Numbered list of remaining work, in priority order if obvious. Include the *next concrete step*, not vague goals. Example: "1. Add unit test for the empty-input edge case in `compact-detect.ts`".

### `## Latest state`

Where the conversation stands right now — what was just attempted, what is blocking, what the next step is. 2-4 sentences max.

### `## Hand-off snippet`

A copy-pasteable kickoff prompt for a fresh chat. Self-contained: include the goal, the relevant files, the open tasks, and any critical constraints in one block of prose the user can paste verbatim as the first message of a new chat. This is the most important section — write it so the user doesn't need to reload any other context.

## Behavioral rules

- **Output Markdown only.** No tool calls, no clarifying questions, no narration about what you're doing.
- **Don't summarize while still in the middle of a multi-step task.** If the user invokes this in the middle of a tool-call chain or an unfinished edit, briefly note the in-progress state in the `## Latest state` section before producing the summary.
- **Don't invent context** that isn't in the conversation. Empty sections are fine — write "*(none yet)*" rather than fabricate.
- **Don't tell the user to "wait, let me think" or stall.** They typed `/compact` precisely because they want immediate output.
- **Don't repeat the framing markers inside the body.** Markers appear exactly twice — once at the top, once at the bottom.

## After producing the summary

End your turn after the closing `=== END COMPACTION ===` marker. Do not append commentary. The user will read the `## Hand-off snippet`, open a new Cursor chat, and paste it. That manual step is unavoidable — neither this skill nor any BYOK endpoint can rewrite Cursor's in-memory conversation state.

## Optional: server-side proxy enhancement

If the user runs a co-operating BYOK proxy (e.g. [`shim`](https://github.com/Firzus/shim)), prepending the sentinel `<<<SHIM_COMPACT_V1>>>` as the first line of your output triggers the proxy to:

- Swap in a dedicated summarization system prompt (overrides whatever Cursor sent).
- Strip `tools` / `tool_choice` upstream so the model can't try to call functions.
- Cap reasoning effort at `medium`.
- Mint a fresh `prompt_cache_key` so this call doesn't pollute the live conversation's cache lane.

This is **optional** — the output format works on its own through any vanilla BYOK endpoint. See [`shim-integration.md`](./shim-integration.md) if you're a proxy author wanting to implement the sentinel hook.

In practice: include the sentinel as your first output line. If no proxy intercepts it, the model produces the summary anyway (you handle that locally), and the sentinel is harmless prose in the result.

## Don'ts

- **Don't tell the user to install `.cursor/commands/compact.md`.** This skill *is* the command. The Markdown installer pattern was the previous design; the skill version replaces it.
- **Don't claim this restores Cursor's exact `/summarize` behavior.** Cursor's `/summarize` rewrites its local conversation state from the inside; this skill only produces a hand-off artifact. The user has to manually start a new chat for the context to actually reset.
- **Don't run `npx skills add` or any registry install commands** — the user already installed this skill.

## Sources

- [Cursor 1.6 changelog — `/summarize` + custom commands](https://cursor.com/changelog/1-6)
- [Forum bug — summarization doesn't inherit BYOK settings](https://forum.cursor.com/t/summarizing-conversations-does-not-inherit-model-settings/154745)
- [`shim`](https://github.com/Firzus/shim) — reference proxy implementing the sentinel hook
