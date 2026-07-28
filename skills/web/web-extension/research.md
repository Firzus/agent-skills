# Web Extension Skill Research

## Purpose and source policy

This note records the primary-source evidence behind the model-invoked `web-extension` skill. It supports the skill contract without duplicating its runtime instructions. Sources are limited to browser-vendor documentation and the W3C WebExtensions group.

## Platform baseline

The common platform is real but incomplete: the W3C WebExtensions group is defining a common model, permissions system, and core API set, while explicitly leaving signing and delivery to each browser vendor. Therefore, portability should mean **shared core plus explicit browser adapters**, not an assumption that every manifest key or API behaves identically. ([W3C WebExtensions group](https://www.w3.org/groups/cg/webextensions/), [W3C formation statement](https://www.w3.org/community/webextensions/2021/06/04/forming-the-wecg/))

Every WebExtension has a root `manifest.json` describing metadata and capabilities. Chrome Manifest V3 (MV3) uses `manifest_version: 3`; Chrome identifies MV3 as its current extension platform and replaces persistent background pages with event-driven extension service workers. ([Chrome manifest format](https://developer.chrome.com/docs/extensions/mv3/manifest), [Chrome MV3 overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3))

Firefox implements the WebExtensions model and is broadly compatible with Chromium, but Mozilla warns that API coverage, manifest keys, execution contexts, background implementations, packaging, and publishing can differ. ([MDN WebExtensions overview](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions), [MDN cross-browser guide](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension))

Safari Web Extensions use the familiar manifest, JavaScript, HTML, and CSS model, but are implemented and distributed as an app extension inside a macOS, iOS, iPadOS, or visionOS app. Apple provides conversion and packaging paths for extensions originating in Chrome, Firefox, or Edge. ([Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions), [Apple Safari extensions](https://developer.apple.com/safari/extensions/))

## Stable cross-browser design principles

### 1. Treat the extension as multiple trust and lifetime contexts

Content scripts run in web pages and can read or modify the DOM, but expose only a limited subset of extension APIs; privileged work belongs in the extension's background context and crosses the boundary through messaging. This separation is documented by both Chrome and Mozilla. ([Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [MDN content scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts))

The future skill should require a context map before implementation: page code, isolated content script, background/event context, extension pages (popup/options/sidebar), and any native companion. Data crossing a boundary should have a small, validated message schema; Chrome provides one-shot messages and long-lived ports between service workers, extension pages, and content scripts. ([Chrome messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging))

Webpage-to-extension messaging is a separate, higher-risk surface and must be allowlisted. Safari's `externally_connectable.matches` documentation shows that an omitted or empty allowlist permits no webpages to connect. ([Apple webpage messaging](https://developer.apple.com/documentation/safariservices/messaging-between-a-webpage-and-your-safari-web-extension))

### 2. Design background logic for suspension and restart

Chrome MV3 extension service workers run only when needed, can terminate when idle, and lose global variables on shutdown; Chrome directs developers to persist durable state and make workers resilient to unexpected termination. The Web Storage API is unavailable in that worker context. ([Chrome service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle))

Firefox MV3 background scripts are non-persistent, but the exact implementation differs: Chrome uses `background.service_worker`, while Firefox uses event-page scripts; Safari supports both and chooses according to its manifest rules. Mozilla documents a cross-browser MV3 fallback that declares both `scripts` and `service_worker`. ([MDN background manifest key](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background), [MDN background scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Background_scripts))

The stable rule is consequently behavioral, not syntactic: register event listeners synchronously at startup, make handlers restart-safe and idempotent, persist important state, and never rely on a background global remaining alive. The future skill should branch on the selected browser/version before emitting the manifest syntax. ([Chrome service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle), [MDN background manifest key](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background))

### 3. Minimize permissions and make grants user-driven

API permissions and host permissions grant different powers. In Chrome, host permissions can enable cross-origin requests from extension contexts, access to sensitive tab fields, programmatic injection, cookies, or network observation/modification; broad match patterns can trigger user warnings. ([Chrome permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions))

Mozilla likewise advises requesting only necessary permissions because prompts can affect installation decisions, and it distinguishes manifest permissions from later user-managed grants. ([MDN permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions))

The future skill should prefer the narrowest host patterns, `activeTab` for temporary user-initiated access where sufficient, and optional permissions requested at the moment a feature needs them. Chrome's scripting API requires `scripting` plus host access or `activeTab`. ([Chrome scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting), [Chrome Web Store user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq))

Safari users separately grant and manage website access, so a declared host pattern does not remove the need to handle denied or temporary access as a normal state. ([Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions))

### 4. Package code locally and preserve CSP

Chrome MV3 prohibits remotely hosted executable code: JavaScript executed by the extension must be included in the reviewed package. ([Chrome MV3 overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3))

WebExtensions receive a default Content Security Policy (CSP) that restricts script sources and unsafe operations such as `eval()`. The skill should reject runtime code download, dynamic evaluation, and CSP weakening as default solutions, and should distinguish remote data from remote executable code. ([MDN extension CSP](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy))

### 5. Treat stored and transmitted user data as sensitive

The extension storage API is asynchronous, extension-scoped, supports JSON-compatible values, and requires the `storage` permission in Firefox. Storage areas have browser-specific limits and semantics, so the skill should select an area deliberately and consult the target API reference rather than treating storage as an unlimited database. ([MDN storage API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage), [Chrome service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle))

Chrome Web Store policy requires an accurate privacy policy when user data is handled, disclosure of collection/use/sharing, minimum permissions, and secure transmission; local-only processing can still count as handling user data for disclosure purposes. These are release requirements, not post-build paperwork. ([Chrome Web Store policies](https://developer.chrome.com/docs/webstore/program-policies/policies), [Chrome user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq))

## Cross-browser implementation branches

### API namespace and asynchronous behavior

Firefox and Safari use `browser.*`; Chromium browsers use `chrome.*`. Firefox also supports compatible `chrome.*` calls, while Mozilla recommends `browser.*` and documents its official WebExtension browser API polyfill as a portability strategy for namespace and Promise differences. ([MDN cross-browser guide](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension))

The skill should first inspect the existing project's convention. For a new multi-browser extension, it should choose one internal Promise-based adapter and isolate vendor differences rather than mixing namespaces throughout feature code. API support must still be checked individually because a namespace polyfill cannot add missing browser capabilities. ([MDN cross-browser guide](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension))

### Manifest strategy

Manifest keys and required browser-specific metadata differ. Mozilla recommends static per-browser manifests when differences are small; browser compatibility data is attached to individual manifest-key references. ([MDN cross-browser guide](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension), [MDN manifest reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json))

The skill should keep one conceptual manifest model, generate or maintain explicit target manifests, and avoid clever conditional JSON that stores cannot consume. Background configuration is a named compatibility branch because Chrome, Firefox, and Safari currently select different MV3 background properties. ([MDN background manifest key](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background))

### Content injection

Static content scripts are declared with URL match patterns; dynamic injection requires host access or temporary `activeTab` access and the relevant scripting permission. Content scripts cannot directly call every privileged extension API and should message the background context instead. ([Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [Chrome scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting), [MDN content scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts))

The skill should require explicit decisions for frames, timing, isolated versus main-world execution, restricted browser pages, and navigation in single-page applications. It should never infer that a broad `<all_urls>` grant is necessary merely because injection failed; access and platform restrictions must be diagnosed first. ([MDN content scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts), [Chrome permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions))

### User-interface surfaces

Common surfaces include toolbar actions and their popups, options pages, context menus, commands, notifications, and extension-owned tabs. Browser-specific surfaces such as Chrome's side panel or Firefox's sidebar must remain feature-detected or target-specific. Chrome's API index and MDN's UI/API indexes are the authoritative inventories to consult for each target. ([Chrome extension API reference](https://developer.chrome.com/docs/extensions/reference/), [MDN WebExtensions overview](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions))

Popup code runs in its own extension-page global context, not in the current webpage, even though it can access privileged WebExtension APIs. Agents should therefore message or query tabs explicitly instead of assuming popup DOM code sees the active page. ([MDN action API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action))

## Testing and debugging

The minimum test matrix should include each declared browser, clean installation, upgrade, permission granted/denied/revoked, restricted pages, private/incognito behavior where supported, worker suspension/restart, offline/network failure, and every UI surface. This matrix follows the documented differences in permissions, contexts, and lifecycles rather than assuming a successful Chromium run proves portability. ([MDN cross-browser guide](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension), [Chrome service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle))

Chrome officially documents end-to-end extension testing with Puppeteer and a dedicated test that forcibly terminates the extension service worker. Tests should assert user-visible behavior rather than internal state so implementation changes do not make integration tests brittle. ([Chrome Puppeteer guide](https://developer.chrome.com/docs/extensions/how-to/test/puppeteer), [Chrome worker-termination test](https://developer.chrome.com/docs/extensions/how-to/test/test-serviceworker-termination-with-puppeteer), [Chrome end-to-end guidance](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing))

Mozilla's `web-ext` tool can lint, run with temporary installation and automatic reload, build ZIP packages, sign, and publish; `web-ext lint` validates manifest/source issues and can check declared minimum Firefox versions. ([Mozilla web-ext guide](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/))

Safari documentation provides temporary loading for local testing and a Safari Web Extensions troubleshooting/compatibility workflow; release candidates must also be exercised on the intended Apple platforms because the extension is delivered inside platform apps. ([Apple building and testing](https://developer.apple.com/documentation/safariservices/building-and-testing-a-safari-web-extension), [Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions))

## Packaging, signing, and store submission

Chrome accepts an extension ZIP with `manifest.json` at its root. General consumer distribution is through a Chrome Web Store-hosted and signed package; self-hosting is officially limited to managed environments, with additional Linux-specific installation paths. ([Chrome prepare guide](https://developer.chrome.com/docs/webstore/prepare), [Chrome distribution guide](https://developer.chrome.com/docs/extensions/how-to/distribute))

Firefox release and beta builds require Mozilla signing, whether listed on addons.mozilla.org (AMO) or self-distributed; submissions remain subject to Mozilla's add-on policies and agreement. ([Mozilla signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/))

Safari distribution normally packages the web extension in an Apple-platform app and uses signing plus App Store review; Apple also documents Developer ID signing/notarization for macOS distribution outside the Mac App Store. App Store Connect can package an uploaded extension, distribute beta builds through TestFlight, and submit them for review. ([Apple distribution](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension), [Apple App Store Connect packager](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect))

Because store policies and submission metadata change independently of browser APIs, the future skill should always re-open the official target-store checklist before release and should not encode volatile fees, review times, or image dimensions in its main body. The W3C explicitly excludes signing and delivery from common standardization. ([W3C formation statement](https://www.w3.org/community/webextensions/2021/06/04/forming-the-wecg/), [Chrome Web Store policies](https://developer.chrome.com/docs/webstore/program-policies), [Mozilla signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/), [Apple distribution](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension))

## Frameworks and build tooling

No framework is part of the browser extension platform contract. Official sources support browser-owned tools such as Chrome DevTools/Puppeteer, Mozilla `web-ext`, Xcode, and Apple's web-extension converter/packager, but do not justify making a community framework mandatory. ([Chrome Puppeteer guide](https://developer.chrome.com/docs/extensions/how-to/test/puppeteer), [Mozilla web-ext guide](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/), [Apple Safari extensions](https://developer.apple.com/safari/extensions/))

The skill should therefore inspect and preserve an existing stack. For a new project, it should choose the smallest build pipeline needed to emit store-ready static assets, bundle all executable code locally, produce per-browser manifests, and make source maps/debug builds separate from release artifacts. Any recommendation of a third-party framework should trigger fresh research against that framework's own documentation rather than being hard-coded here. ([Chrome MV3 overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3), [Chrome prepare guide](https://developer.chrome.com/docs/webstore/prepare))

## Recommended shape of the `web-extension` skill

1. **Start with discovery.** Ask or inspect: target browsers and minimum versions, required feature/API surface, requested hosts/data, UI surfaces, distribution channels, native companion needs, and existing build system.
2. **Produce a compatibility plan before code.** Classify each capability as common, syntax-different, API-different, or unavailable; link the exact vendor compatibility pages.
3. **Draw the context and message boundaries.** Assign each responsibility to content, background, extension UI, or native app; define validated request/response messages.
4. **Design permissions and privacy with the feature.** Map every permission and host pattern to one user-visible purpose, prefer temporary/optional grants, and record data collection, retention, transmission, and deletion behavior.
5. **Implement restart-safe background behavior.** Persist durable state, register listeners at startup, make events idempotent, and include a worker/event-page restart test.
6. **Separate core logic from browser adapters.** Keep API namespace, manifest, background configuration, and browser-only UI behind narrow seams.
7. **Test the declared matrix.** Include denial and lifecycle cases, not only happy-path installation; validate the final packaged artifact in each browser.
8. **Run a release gate per store.** Re-open official policy and submission documentation, audit package contents and permissions, verify disclosures/listing assets, then sign and submit through the vendor-specific path.

## Scope boundaries for the skill

The skill should cover WebExtensions, including Safari Web Extensions, but not legacy Chrome Apps, legacy Safari App Extensions, userscripts, bookmarklets, or general browser automation unless the user explicitly asks to migrate from one of those systems. It should avoid freezing rapidly changing compatibility tables into prose; instead, it should teach agents to consult the current vendor API page and manifest-key support data at implementation time. ([W3C WebExtensions group](https://www.w3.org/groups/cg/webextensions/), [MDN cross-browser guide](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension), [Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions))
