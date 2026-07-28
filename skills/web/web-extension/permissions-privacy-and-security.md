# Permissions, Privacy, and Security

## Permission and data map

Record one row per capability before adding it to a manifest:

| Feature | API permission | Host access | Trigger | Data handled | Retention/transmission | Denied/revoked behavior |
|---|---|---|---|---|---|---|

API permissions and host permissions confer different powers. Broad host patterns
can expose sensitive tab data, enable cross-origin requests or injection, and produce
install warnings. Request only what the feature needs. ([Chrome permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions), [MDN permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions))

Prefer, in order:

1. No privileged access.
2. Temporary user-initiated access such as `activeTab`.
3. Optional permission requested when the feature is invoked.
4. Narrow persistent host access when the feature truly requires it.

The scripting API requires `scripting` plus host access or `activeTab`. Safari users
manage website access separately, so denial and temporary access are normal product
states. ([Chrome scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting), [Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions))

## Security baseline

- Package all executable code locally. Remote data is not remote executable code.
- Preserve the default extension Content Security Policy; avoid `eval()` and related
  dynamic execution.
- Validate message payloads, sender identity, origins, and authorization.
- Allowlist webpage-to-extension connections; do not expose an external message
  endpoint by accident.
- Treat extension storage as sensitive and bounded, not as an unlimited database.
- Minimize collection, retention, transmission, and third-party sharing; protect
  data in transit and provide deletion behavior where applicable.

Chrome MV3 prohibits remotely hosted executable code. Extension CSP restricts script
sources and unsafe evaluation. ([Chrome MV3 overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3), [MDN extension CSP](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy))

Privacy disclosure is a release input, not paperwork deferred until submission.
Chrome policy can treat local-only processing as handling user data and requires
accurate disclosures and minimum permissions. ([Chrome policies](https://developer.chrome.com/docs/webstore/program-policies/policies), [user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq))
