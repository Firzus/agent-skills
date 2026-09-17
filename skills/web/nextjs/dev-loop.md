# Verify changes in development

Read after changing application behavior while `next dev` is running, or when
an adoption workflow needs runtime evidence. Pair the framework's MCP view
with the browser's visible and React-level behavior.

Source: [next-dev-loop](https://github.com/vercel/next.js/blob/3cf1f7418ff9e3ce0f54b4c3212964e421933237/skills/next-dev-loop/SKILL.md).
The full loop requires Next.js 16.3+, Turbopack, and `agent-browser` >= 0.31.1.
Check installed versions first. Missing requirements mean the full loop is
blocked: report the upgrade or tooling needed, respecting installation policy.
A separate browser-only check is useful evidence, not an equivalent result.

## Connect both views

1. Read `agent-browser skills get core` once for the installed CLI's usage.
   Derive a stable session with `agent-browser session id --scope worktree
   --prefix next-dev-loop` and use that value for every browser command.
2. Open the target with `agent-browser --session <session> --restore --headed
   --enable react-devtools open <url>`. Use the same session and restore key
   across shells; when using environment variables, set both
   `AGENT_BROWSER_SESSION` and `AGENT_BROWSER_RESTORE` in each shell.
3. If restored authentication is absent or expired, let the user complete login
   and confirm readiness. Keep browser session state local and out of Git.
4. Read the actual dev-server URL from its startup output. Probe `/_next/mcp`
   with `tools/list` using the available MCP client. If making direct HTTP
   calls, parse the JSON in SSE `data:` lines rather than treating the full
   response as JSON.
5. Require `get_compilation_issues` and call it. A missing tool or a Turbopack
   availability error blocks this full loop; inspect the version and bundler.
   Call `get_routes` for the current route map.

Done when: the scoped browser reaches the target, MCP answers on the correct
server, and the compile probe succeeds. Discover tool names and arguments from
the live tool list rather than assuming a release's complete tool surface.

## Edit, navigate, cross-check

Navigate before consulting session-dependent `get_errors` or
`get_page_metadata`. Use metadata to narrow source inspection to the files
participating in the route, then make the requested change.

| Evidence | Check after the edit |
| --- | --- |
| Compilation | `get_compilation_issues` reports no relevant errors |
| Runtime | `get_errors` and, when needed, `get_logs` explain framework failures |
| Visible behavior | Drive the affected interaction and assert the result in the browser |
| React behavior | Refresh component inspection after navigation; inspect relevant state, props, renders, and Suspense behavior |

For adoption diagnostics, read the overlay's linked error page. The overlay
lives in `nextjs-portal` shadow DOM, so a missing accessibility-tree entry is
not evidence of a clean overlay. Prefetch insights belong to `get_errors`,
the overlay, and dev logs; `get_request_insights` is a different performance
recorder, not the prefetch-validation surface.

Done when: both views agree on the requested behavior, including the changed
interaction and any siblings affected by shared code. A successful click or
clean compile alone is not runtime verification.

## Keep the evidence trustworthy

- Preserve `.next` while the dev server runs. Use a separate `distDir` for an
  isolated production test build, consistently for build and start, or stop
  the dev server before reusing its output directory.
- On blank snapshots, `about:blank`, or lost sessions, inspect the browser
  target before diagnosing the app. Reopen the same scoped session and read
  it again; if still stale, close and reopen that session with the same restore
  context. Report persistent failure rather than substituting a raw HTTP fetch.
- After navigation, wait for the relevant destination state and refresh the
  snapshot and React inspection. A guessed URL or stale component tree is not
  a useful assertion.
- If browser and MCP disagree, verify session, URL, port, and current artifact
  before treating it as an application regression.

## Finish or report reduced coverage

Close with `agent-browser --session <session> --restore close` to save that
session's login state; leave the user's development server running.

Report the route, interaction, observed result, and missing checks. On webpack
or with another browser tool, distinguish browser-only evidence from this full
loop. With no browser, report compile/build evidence and leave visible behavior
unverified. A stopped server or missing environment is a blocker, not a pass.

Automatic prefetching and deterministic `instant()` tests need a production
build. Use [navigation-optimization.md](navigation-optimization.md) or
[partial-prefetching.md](partial-prefetching.md) for those verdicts; this loop
diagnoses development behavior only.
