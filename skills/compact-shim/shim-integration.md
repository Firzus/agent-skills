# Server-side integration — sentinel interception in a BYOK proxy

This reference is for proxy authors. The bare Markdown command in [`compact-command.md`](./compact-command.md) works through any vanilla OpenAI-compatible BYOK endpoint — the model sees the prose, follows the instructions, and returns a summary. **Server-side interception is optional**, but it lets the proxy:

- Replace Cursor's verbose summarization prose with a tighter, version-controlled system prompt.
- Strip `tools`, `tool_choice`, `parallel_tool_calls` so the model can't try to read files or call functions while summarizing.
- Cap reasoning effort (e.g. force `medium`) — deep reasoning is wasted on a hand-off summary.
- Mint a fresh `prompt_cache_key` / session ID so the summarization call doesn't poison the live conversation's upstream cache lane.
- Tag the request as `source: 'compact'` for analytics separation.

## The sentinel

```
<<<SHIM_COMPACT_V1>>>
```

It's a literal substring, embedded at the start of the user message body by Cursor's slash-command expansion. The `V1` suffix lets the format evolve later without breaking older proxies.

## Detection

Detection lives in the proxy handler (not in the request translator — keep the translator pure). Scan the **last user message** for the sentinel; ignore matches in echoed history or assistant turns to avoid stale triggers.

```ts
// Skim from the end of input[] for the most recent user message.
let targetIndex = -1
for (let i = input.length - 1; i >= 0; i--) {
  const item = input[i]
  if (item?.type === 'message' && item.role === 'user') {
    targetIndex = i
    break
  }
}
if (targetIndex < 0) return { matched: false }

const parts = Array.isArray(input[targetIndex].content) ? input[targetIndex].content : []
const matched = parts.some(
  (p) => typeof p?.text === 'string' && p.text.includes('<<<SHIM_COMPACT_V1>>>'),
)
```

## Stripping the sentinel before forwarding

Strip the sentinel substring from the matched user message before passing the request upstream. If a text part becomes empty, drop it. If `content` becomes empty, inject a fallback `{ type: 'input_text', text: 'Please summarize the conversation so far.' }` so the upstream API doesn't 400 on empty content.

## Compact-mode request shaping

When `matched`, rewrite the upstream request body:

```ts
body.input = strippedInput
body.instructions = COMPACT_INSTRUCTIONS // your dedicated system prompt
delete body.tools
delete body.tool_choice
delete body.parallel_tool_calls
body.reasoning = { ...(body.reasoning ?? {}), effort: 'medium' }

// Fresh routing — compaction calls should not share cache with the live conversation
const compactKey = crypto.randomUUID()
body.prompt_cache_key = compactKey
sessionId = compactKey
conversationId = compactKey
```

## Suggested `COMPACT_INSTRUCTIONS`

```
You are producing a hand-off summary of the preceding conversation so the user can paste it into a fresh chat and continue without losing context.

Output Markdown only. Do not call tools. Do not ask follow-up questions.

Wrap the entire response between these exact markers on their own lines:

=== SHIM COMPACTION ARTIFACT ===

and

=== END COMPACTION — open a new Cursor chat and paste the "Hand-off snippet" section above ===

Inside the markers, produce these sections with `##` headings, in order:

## Goal
One-sentence description of what the user is trying to accomplish.

## Decisions made
Bullet list of concrete decisions, conventions, or constraints established so far.

## Files touched
Bullet list of file paths read or modified, with a one-line note on each.

## Open tasks
Numbered list of remaining work, in priority order if obvious.

## Latest state
Where the conversation stands right now — what was just attempted, what is blocking, what the next step is.

## Hand-off snippet
A copy-pasteable kickoff prompt for a fresh chat: include the goal, the relevant files, the open tasks, and any critical constraints. Self-contained. The user will paste this verbatim as the first message of a new chat.
```

## Edge cases

- **Multipart content** (image + text in the same user message): match if any text part contains the sentinel; preserve image parts verbatim.
- **Sentinel echoed in older user messages**: do NOT match. Cursor sends the full conversation history every turn, and a previous `/compact` call leaves the sentinel in the visible history. Only the last user message counts.
- **Sentinel in an assistant message**: ignore. The model occasionally repeats prose verbatim; matching there would create infinite-loop traps.
- **Empty input array** or no user message: return `matched: false`.
- **Reasoning items** (`{ type: 'reasoning', encrypted_content: '...' }`) for OpenAI Responses-API state: when in compact mode, you can leave them in the input or strip them — the summary call doesn't need cross-turn reasoning state. Stripping shrinks the upstream payload but is not required.

## Reference implementation

The [`shim`](https://github.com/Firzus/shim) Codex BYOK proxy ships this exact pattern. Look at:

- `src/lib/server/translation/compact-detect.ts` — detection + system prompt constant
- `src/lib/server/handlers/chat-completions.ts` — branching after the body translator, before the upstream call
- `convex/schema.ts` + `convex/requests.ts` — analytics discriminator (`'compact'` source)
- `src/lib/server/translation/compact-detect.test.ts` — unit tests covering the edge cases above

## Don'ts

- **Don't intercept inside the request translator.** Keep the translator passthrough-pure (especially for OpenAI Responses-API `reasoning.encrypted_content` items, which must round-trip byte-for-byte). Detect in the handler.
- **Don't reuse the live conversation's `prompt_cache_key`** — compaction calls have a different shape and would degrade upstream cache hit rate for both flows.
- **Don't add a fallback that silently uses Cursor's `/summarize` when the sentinel is missing.** The whole point is that `/summarize` doesn't traverse BYOK; you can't proxy what doesn't reach you.
