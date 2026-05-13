---
name: extract-theme
description: >-
  Extracts the visual theme (colors, typography, radius, spacing, shadows) of a
  public website provided by the user and produces a shadcn/ui + Tailwind CSS
  v4 compatible token block, ready to paste into the project's `globals.css`
  (or `app.css`) inside `@theme` and `.dark`. Uses the chrome-devtools MCP
  server to drive a real Chromium instance (no Playwright). Use when the user
  asks to "extract the theme of <url>", "reverse-engineer the design tokens of
  <site>", "copy the look of <site> into shadcn", "build a tailwind v4 theme
  from <url>", or mentions extract-theme / theme extraction / design tokens
  from a URL.
---

# Extract Theme (URL → shadcn/ui + Tailwind v4 `@theme`)

Reverse-engineer the **visual theme** of a public website into a token block that drops straight into a project using **shadcn/ui** and **Tailwind CSS v4**. Output is scoped to design tokens — colors, typography, radius, spacing, shadows. No components are generated.

## When to use

- The user provides a URL and wants to "extract the theme", "match the look", "copy the design tokens", or "scaffold a shadcn theme from this site".
- The current project already uses (or is about to use) shadcn/ui with Tailwind v4 (`@import "tailwindcss"` + `@theme`).
- The user wants a starter theme, not a pixel-perfect clone.

## When not to use

- The user wants a full component port (use `shadcn` + `tailwind-design-system` skills directly).
- The site is private, requires auth, or is behind a heavy SPA shell that does not paint a meaningful first frame (extraction quality will be low — say so).
- The project is on Tailwind v3 — the output uses v4-only syntax (`@theme`, `@custom-variant`, OKLCH variables). Refuse and point at the v3→v4 migration.

## Hard prerequisites

1. **chrome-devtools MCP server connected.** Verify with the `<available_skills>` block or by calling any `chrome-devtools` tool. If it is missing, stop and tell the user to add it:

   ```bash
   claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
   ```

   Do **not** fall back to `WebFetch` of raw HTML for color extraction — computed styles require a real browser. `WebFetch` is acceptable only as a last-resort sanity check on declared CSS variables.

2. **Project uses Tailwind v4.** Look for `@import "tailwindcss";` in any `.css` file. If you find `@tailwind base;` / `tailwind.config.{js,ts}`, stop and tell the user the output is v4-only.

3. **Project uses shadcn/ui (or is being initialized with it).** Look for `components.json` at the repo root, or `cn()` in `lib/utils.ts`. If absent, output the tokens but tell the user to run `npx shadcn@latest init -d --base radix` first so the token names line up with shadcn's expectations.

## Before you start

Ask the user (one short message, not a survey):

- **Target URL** (must be public).
- **Target file** for the patch — usually `app/globals.css` (Next.js App Router), `src/app.css` (Vite), or `app/styles/app.css`. If you can detect it unambiguously, just confirm it.
- **Mode**: light-only, dark-only, or both. Default to **both** when the site has a dark variant detectable via `prefers-color-scheme: dark` or a `.dark` class.

Set expectations explicitly:

- This is a **starter theme**, not a pixel-perfect reproduction.
- It captures **tokens**, not components, animations, layout, or copy.
- The output **will overwrite** the `@theme { ... }` and `.dark { ... }` blocks in the target file. Sibling CSS is preserved.
- Dynamic / heavily script-driven sites may yield partial output.

## Workflow

Track progress with this checklist:

```
- [ ] 1. Confirm prerequisites (MCP, Tailwind v4, shadcn)
- [ ] 2. Open the URL in chrome-devtools and wait for first paint
- [ ] 3. Extract raw computed styles (light + dark)
- [ ] 4. Normalize into shadcn token names
- [ ] 5. Convert colors to OKLCH
- [ ] 6. Render the @theme + .dark blocks
- [ ] 7. Patch the target CSS file (with confirmation)
- [ ] 8. Summarize findings and known gaps
- [ ] 9. Clean up the chrome-devtools session
```

### Step 1 — Confirm prerequisites

Run the three checks above. If any fails, stop and surface the gap. Do not fabricate tokens from intuition.

### Step 2 — Open the URL

```text
new_page → navigate_page → wait_for { text: ["<landmark from hero or nav>"] }
```

Prefer `wait_for` with a literal string from the hero / nav. Avoid arbitrary sleeps.

`wait_for` expects `text` as an **array of strings** (`{ text: ["Cursor"] }`), not a bare string — passing a string returns a Zod validation error. Pass one or more candidate landmarks; matching any one of them succeeds.

### Step 3 — Extract raw computed styles

Use `evaluate_script` to run the extraction snippets in [`extraction-recipes.md`](./extraction-recipes.md). Run them **in this order**:

1. `extractCssVariables()` — declared CSS custom properties on `:root` and `.dark` / `[data-theme]`.
2. `extractComputedTokens()` — actual `getComputedStyle` of `body`, primary buttons, cards, inputs, headings, muted text.
3. `extractFontStack()` — resolved `font-family`, `font-weight`, `font-size`, `line-height` for body and headings.
4. `extractRadiusAndShadow()` — `border-radius` of buttons / cards, `box-shadow` of cards / popovers.

If the site exposes a dark variant, try these strategies **in order** and stop at the first one that flips `getComputedStyle(document.body).color`:

1. **Visible theme toggle.** Take a snapshot, look for a button labeled `Dark`, `Light`, `Theme`, `Sombre`, `Clair`, `Thème`, or an icon button under a navbar/footer toggle group. Click it via `uid`. This is the most reliable strategy — sites that ship a toggle have already wired all their token cascades to it (this is what worked on `cursor.com` in the reference test).
2. **Class / data-attribute toggle.** Use the snippet in [`extraction-recipes.md` §6b](./extraction-recipes.md#6b-class--data-attribute-toggle-fallback) to try `classList.add('dark')`, `data-theme="dark"`, `data-mode="dark"` on `<html>` and `<body>`.
3. **OS-level emulation.** Some chrome-devtools MCP builds expose `emulate` with a color-scheme parameter — use it when available, then reload and re-extract.
4. **Give up gracefully.** If nothing works, document the gap and ship light-only.

**As soon as the dark extractors finish running, revert immediately** (don't wait for Step 9):

- If you used strategy 1, click the "Light" button now.
- If you used strategy 2, run the cleanup snippet from [`extraction-recipes.md` §7](./extraction-recipes.md#7-cleanup) now.
- If you used strategy 3, the page reload at the next emulation call (or at Step 9) handles it.

This guarantees that any subsequent `take_screenshot` (Step 8 visual comparison, or anything the user does after) reflects the site's default state, not your mutated one.

Save the raw output (don't paste it into the conversation if it's huge — keep it in scratch state for normalization).

### Step 4 — Normalize into shadcn token names

Before applying the heuristics below, **try the opportunistic shortcut**: if `extractCssVariables` returned semantic tokens like `--color-theme-bg`, `--color-bg-elevated`, `--color-text-secondary`, etc., read them directly with the snippet in [`extraction-recipes.md` §8](./extraction-recipes.md#8-reading-site-defined-design-tokens-directly-opportunistic). That is the site's own source of truth — preferable to re-deriving from computed styles. Fall back to the heuristics below only for slots the site does not expose.

Map the extracted values to the shadcn token vocabulary. The minimal target set is in [`output-format.md`](./output-format.md). Required tokens:

```
--color-background        --color-foreground
--color-card              --color-card-foreground
--color-popover           --color-popover-foreground
--color-primary           --color-primary-foreground
--color-secondary         --color-secondary-foreground
--color-muted             --color-muted-foreground
--color-accent            --color-accent-foreground
--color-destructive       --color-destructive-foreground
--color-border            --color-input            --color-ring
--radius                  (drives --radius-sm/md/lg/xl via calc())
--font-sans               --font-mono
```

Mapping heuristics (apply in order):

1. `background` ← `body` background.
2. `foreground` ← `body` color.
3. `primary` ← the most-used non-neutral CTA background (sample multiple buttons; pick the most frequent).
4. `primary-foreground` ← computed text color **on** that CTA.
5. `card` ← background of the most common elevated container; if none, fall back to `background`.
6. `border` / `input` ← computed `border-color` of inputs / cards.
7. `muted` ← background of subdued sections; `muted-foreground` ← color of secondary text.
8. `destructive` ← red-family CTA / error text if found; otherwise omit and let shadcn's default stay.
9. `accent` ← hover background of nav items / dropdown items if distinct from `muted`; otherwise mirror `muted`.
10. `ring` ← focus outline color if explicit; otherwise mirror `primary`.

If a slot has no good candidate, **leave it as the shadcn default** (do not invent). Note the omission in the summary.

### Step 5 — Convert colors to OKLCH

shadcn's `new-york` style and `tailwind-design-system` both use OKLCH. Convert every extracted color to OKLCH with 3-decimal precision. Use `evaluate_script` with the conversion helper in [`extraction-recipes.md`](./extraction-recipes.md) (CSS Color 4 native support in Chrome — no library needed).

For radius: pick the modal radius (or the most frequent non-zero `border-radius` on buttons/cards), round to the nearest `0.125rem`, and emit it as `--radius`. Let `--radius-sm/md/lg/xl` derive via `calc()` per the shadcn convention.

**Discard pill radii.** Values ≥ 999px (or anything that shows up as scientific notation like `2.68435e+07px` — that is the browser rounding `border-radius: 9999px` to its 32-bit ceiling) are pill-shape signals, not the design system's base radius. Skip them and pick the next most frequent value. The base `--radius` should be a real geometry (`4px` / `0.25rem`, `0.5rem`, `0.75rem`, etc.).

For fonts: emit literal font family names in `--font-sans` and `--font-mono` (e.g. `"Inter", ui-sans-serif, system-ui, sans-serif`). **Never** emit `var(--font-sans)` inside `@theme inline` — it self-references and breaks Tailwind v4 parsing (see `shadcn` skill, "shadcn init breaks Geist Font" gotcha).

### Step 6 — Render the blocks

Use the template in [`output-format.md`](./output-format.md). It produces:

- A `@theme inline { ... }` block with all colors, radius tokens, and fonts.
- A `.dark { ... }` block (only if dark mode was extracted) overriding the color tokens.
- A `@custom-variant dark (&:where(.dark, .dark *));` line if missing from the file.

### Step 7 — Patch the target CSS file

1. Read the target file.
2. If it already contains a `@theme { ... }` block, **replace** the contents inside the braces. Do not duplicate.
3. If it already contains a `.dark { ... }` block, replace the color custom properties only — preserve any other rules inside it.
4. If `@custom-variant dark ...` is missing and dark mode was extracted, insert it once near the top, after `@import "tailwindcss";`.
5. **Show a diff to the user before writing** when the file already had non-trivial token customization. For a fresh `globals.css` (post-`shadcn init`), patch directly and surface the change.

### Step 8 — Summarize

Report, in this order:

1. The URL extracted from.
2. The source CSS file patched (absolute path).
3. Light/dark coverage (e.g. "light + dark" or "light only — site has no dark variant").
4. Token slots filled vs. left as shadcn defaults (call out omissions explicitly).
5. Known gaps: dynamic colors, gradients, brand-specific tokens that didn't fit shadcn slots.
6. Next-step suggestion: run the dev server and `take_screenshot` of the project beside the source URL for a visual comparison.

### Step 9 — Clean up the chrome-devtools session (always, even on failure)

This step is a **`finally` block**, not a happy-path step. Run it whether the extraction succeeded, partially failed, or crashed at any earlier step. Skipping it leaks browser state into the next task.

What to clean up, in order:

1. **Restore in-page DOM mutations.** If you toggled dark mode via `classList.add('dark')` / `setAttribute('data-theme', 'dark')` (recipe §6b), revert it now via the cleanup snippet in [`extraction-recipes.md` §7](./extraction-recipes.md#7-cleanup) — even if the extraction never reached the dark phase. The snippet is a no-op when nothing was set, so it is always safe.
2. **Restore visible-toggle state.** If you used recipe §6a (clicked a "Dark" button on the page), click the corresponding "Light" button so the user's next visit to the site (the toggle persists in `localStorage`) starts in their original mode.
3. **Close the tabs you opened.** `list_pages` → `close_page { pageId }` for each non-blank tab opened during this run.

```text
list_pages → close_page { pageId: <id of the extracted URL> } for each non-blank tab
```

Important MCP behavior: `close_page` refuses to close the **last** open tab (returns `"The last open page cannot be closed. It is fine to keep it open."`). The intended pattern is:

1. `list_pages` to get the list of open tabs and their IDs.
2. If there is more than one tab, `close_page` each tab that you opened during this run.
3. If your extraction tab is the last one, leave it. Do **not** call `new_page about:blank` first to "free" the close — that just spawns another tab to keep alive.

Skip Step 9 only if the user explicitly asks to keep the page open for follow-up inspection (e.g. "leave it open, I want to look at the hero" or running `extract-theme` back-to-back on multiple URLs in the same session). In that case, **still** run sub-step 1 (DOM revert) — keeping the tab open is not a license to leave it in a mutated state.

## Cleanup discipline

Cleanup is **not optional** and **not deferred to Step 9 alone**. The skill drives a real Chromium instance and mutates the live DOM. Leaks compound across tasks: a left-over `data-theme="dark"` poisons the next agent's snapshot; an open autoplaying-video tab burns CPU and bandwidth indefinitely; a localStorage-persisted dark toggle changes the user's next manual visit.

Three layers, all required:

1. **Per-mutation reversal (immediate).** Anything you set inside the page during a step, you revert at the end of that same step — not at Step 9. Specifically:
   - Recipe §6a clicked a visible toggle → click it back before moving on.
   - Recipe §6b set a class / data-attribute → call recipe §7's snippet before moving on.
   - This holds even if the extraction succeeds. State must be restored as soon as you no longer need it.
2. **`finally`-block at the end (Step 9).** Always runs, even on failure. Re-applies the §7 snippet (no-op if nothing was set) and closes the tabs. If an earlier step threw, run Step 9 anyway before surfacing the error to the user.
3. **No persistent side effects.** Do not write to the page's `localStorage`, `sessionStorage`, `cookie`, or `indexedDB`. The only persistent artifacts this skill produces are the CSS file patch on disk and (optionally) screenshots. If you discover the site itself wrote to `localStorage` because of your toggle (recipe §6a), revert it as part of layer 1.

If a cleanup operation itself fails (e.g. `close_page` errors), surface the failure in the summary — do not swallow it silently.

## Safety boundaries

- **Public sites only.** Do not attempt auth, cookies, or paywall bypass.
- **No automatic component changes.** This skill writes tokens, nothing else. Do not edit `components/ui/*`, `components.json`, `tailwind.config.*` (there should be none on v4), or app code.
- **No silent overwrite of an existing custom theme.** If the target file has obvious hand-tuned tokens (named comments, brand colors with custom names), show a diff and confirm before patching.
- **No invented tokens.** If extraction yields nothing for a slot, leave the shadcn default. Do not synthesize a "plausible" color.
- **Do not claim parity.** A single page is never proof of a whole product's design system. State the limitation in the summary every time.
- **Do not commit.** This skill never runs `git add` / `git commit` / `git push`.
- **Do not leak browser state.** See "Cleanup discipline" above — applies whether the extraction succeeded or failed.

## Output contract

When you finish, the project AND the browser session must be in this state:

**Project (filesystem):**

- Target CSS file contains a complete `@theme inline { ... }` block with all 17 shadcn color tokens (filled or default), `--radius`, `--font-sans`, `--font-mono`.
- If dark was extracted, a `.dark { ... }` block overrides the same color tokens.
- `@custom-variant dark (&:where(.dark, .dark *));` is present.
- No other file was modified.

**Browser session (chrome-devtools MCP):**

- Every tab opened during this run is closed (except the last one, which the MCP refuses to close — that one is left as-is).
- The page DOM is back to its initial state — no leftover `.dark` class, no `data-theme="dark"` attribute, no clicked-but-not-restored toggle.
- No `localStorage` / `sessionStorage` / `cookie` / `indexedDB` writes from this skill survive.

**Conversation:**

- Summary with the URL, the patched path, the omissions list, the dark-mode coverage, and any cleanup operation that failed (do not hide failed cleanup).

## Reference map

- For the `evaluate_script` snippets that run inside the page (CSS variable extraction, computed-style sampling, OKLCH conversion), see [extraction-recipes.md](./extraction-recipes.md).
- For the exact `@theme` / `.dark` template and the full shadcn token vocabulary, see [output-format.md](./output-format.md).
- For broader shadcn / Tailwind v4 conventions, defer to the `shadcn` and `tailwind-design-system` skills if installed.
