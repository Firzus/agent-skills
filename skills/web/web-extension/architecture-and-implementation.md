# Architecture and Implementation

## Context map

Assign every responsibility before coding:

| Context | Owns | Must not assume |
|---|---|---|
| Page code | Site-owned behavior | Privileged extension APIs are available |
| Content script | DOM integration and page observation | Every extension API is available |
| Background/event context | Privileged coordination and durable workflows | Its globals stay alive |
| Popup/options/extension page | Extension-owned UI | It can directly see the active page DOM |
| Native companion | Explicit native-only work | Browser messaging is trusted without validation |

Content scripts can access the page DOM but only a subset of extension APIs; route
privileged work through validated messaging. ([Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [MDN content scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts))

Define messages as a small protocol: discriminated operation name, validated input,
explicit response/error shape, and allowlisted sender/origin where relevant. Choose
one-shot messages for discrete commands and ports only when a maintained connection
is meaningful. ([Chrome messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging))

## Restart-safe background work

Register event listeners synchronously during startup. Persist durable state in an
appropriate extension storage area. Make handlers idempotent, recover partial work,
and tolerate duplicate delivery. Chrome MV3 service workers can terminate while
idle and lose globals; Web Storage is unavailable in that context. ([Chrome service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle))

Branch manifest syntax by target. Chrome uses `background.service_worker`; Firefox
documents non-persistent background scripts and a cross-browser fallback involving
both `scripts` and `service_worker`; Safari applies its own selection rules. Verify
the current target documentation before emitting either form. ([MDN background key](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background))

## Portability seams

- Choose one internal Promise-based browser API adapter for new multi-browser work.
- Keep namespace differences, manifest production, background declarations, and
  target-only UI behind narrow interfaces.
- Feature-detect browser-only APIs and design an explicit fallback or omission.
- For injection, decide URL matches, frames, timing, execution world, restricted
  pages, and single-page navigation behavior deliberately.

Firefox and Safari use `browser.*`; Chromium uses `chrome.*`. A namespace adapter
can normalize calling conventions but cannot add a missing API. ([MDN cross-browser guide](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension))
