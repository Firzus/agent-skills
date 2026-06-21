# Debugging & testing recipes

A disciplined loop: **reproduce → capture evidence → form a hypothesis → verify a
fix in the browser.** Drive the page to the failing state first, then read console
and network output as evidence.

## Reproduce a frontend bug

1. `navigate_page` to the page (or `new_page`).
2. `take_snapshot` and drive the UI (`click`, `fill`, …) to the failing state.
3. `list_console_messages` with `types: ["error", "warning"]` to surface errors.
4. `get_console_message` on a specific id for the full source-mapped stack trace.
5. `take_screenshot` only if a visual is needed for the report.

```
list_console_messages { "types": ["error"] }
get_console_message   { "msgid": "<id from the list>" }
```

## Inspect network failures

```
list_network_requests { "resourceTypes": ["fetch", "xhr"] }
get_network_request   { "reqid": "<id>", "responseFilePath": "./resp.json" }
```

Use this to confirm status codes, headers, payloads, CORS, and redirects. Saving
large bodies to a file with `requestFilePath` / `responseFilePath` keeps responses
out of the chat context.

## Run JS in the page

`evaluate_script` runs a function in page context and returns JSON. Use it to read
app state, computed styles, framework internals, or to assert a condition.

```js
// function arg passed to evaluate_script
() => ({
  url: location.href,
  title: document.title,
  hasRoot: !!document.querySelector('#root')?.children.length,
})
```

Returned values must be JSON-serializable. Pass extra inputs via `args`.

## Handle dialogs

If an action triggers `alert`/`confirm`/`prompt`, the page blocks until handled:

```
handle_dialog { "action": "accept", "promptText": "optional text" }
```

`evaluate_script` also accepts `dialogAction` to auto-handle a dialog its code
raises.

## Test forms

Prefer one `fill_form` over many calls — faster and more reliable:

```
fill_form {
  "elements": [
    { "uid": "<email uid>",    "value": "user@example.com" },
    { "uid": "<password uid>", "value": "hunter2" },
    { "uid": "<remember uid>", "value": "true" }
  ]
}
```

Then `click` the submit button (or `press_key { "key": "Enter" }`) and `wait_for`
the success text. Re-`take_snapshot` after submit to read validation errors.

## Emulate devices & conditions

Reproduce bugs that only appear on slow networks, mobile viewports, or dark mode:

```
emulate {
  "viewport": { "width": 390, "height": 844 },
  "networkConditions": "Slow 4G",
  "cpuThrottlingRate": 4,
  "colorScheme": "dark"
}
```

Use `resize_page` for exact window sizes, and `emulate` `geolocation` /
`extraHttpHeaders` / `userAgent` for locale, auth-header, or UA-specific paths.

## Multi-tab flows

`new_page` opens tabs; `list_pages` shows them; `select_page` sets the active target
for page-scoped tools. Remember the active page is the one all other tools act on.

## Verify a dev server

After starting a local dev/SSR server, `navigate_page` to it, `take_snapshot` to
confirm the expected DOM rendered (and hydrated), and `list_console_messages` to
confirm there are no errors — a stronger check than `curl` of the raw HTML.
