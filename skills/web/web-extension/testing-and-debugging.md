# Testing and Debugging

## Test layers

1. Unit-test shared domain logic and message validation outside browser contexts.
2. Integration-test adapters, storage migrations, and context messaging.
3. Exercise user-visible workflows in every declared browser.
4. Load and smoke-test the final packaged artifact, not only development output.

Test observable behavior rather than background globals or incidental implementation
details. Chrome documents end-to-end extension testing with Puppeteer and a dedicated
worker-termination scenario. Use existing project tooling when present; do not impose
Puppeteer solely because it is documented. ([Chrome Puppeteer guide](https://developer.chrome.com/docs/extensions/how-to/test/puppeteer), [worker-termination test](https://developer.chrome.com/docs/extensions/how-to/test/test-serviceworker-termination-with-puppeteer))

## Minimum matrix

For each declared target, cover:

- Clean install, reload, browser restart, upgrade, and storage migration.
- Permission grant, denial, revocation, and temporary-access expiry.
- Worker/event-page suspension and restart during or between operations.
- Allowed sites, disallowed sites, restricted browser pages, frames, and navigation.
- Offline mode, request failure, partial work, retries, and duplicate events.
- Popup, options, commands, menus, notifications, sidebars/panels, and other shipped UI.
- Private/incognito behavior where supported and intentionally declared.
- Package contents, production CSP, source-map policy, and absence of secrets.

Use browser-native diagnosis paths. Mozilla `web-ext` can lint, temporarily install,
reload, build, sign, and publish Firefox extensions. Safari supports temporary local
loading and must be tested on intended Apple platforms because delivery occurs inside
platform apps. ([Mozilla web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/), [Apple building and testing](https://developer.apple.com/documentation/safariservices/building-and-testing-a-safari-web-extension))

When one browser fails, classify the fault before changing permissions: unsupported
API/key, wrong context, missing grant, restricted page, lifecycle loss, CSP violation,
message validation, packaging difference, or genuine feature defect.
