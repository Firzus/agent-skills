# Packaging and Release

Treat each browser/store as an independent release target. Immediately before a
release, open the current official policy, packaging, signing, and submission pages;
do not rely on remembered fees, review times, asset dimensions, or metadata fields.

## Common release gate

- Build from a clean state and record the source revision.
- Inspect the archive: root manifest, only intended assets, local executable code,
  production CSP, no secrets, no debug-only permissions, and no unnecessary files.
- Verify version and target manifest, least privilege, privacy disclosures, support
  information, listing claims, and required assets.
- Install the exact artifact and run the target-browser smoke matrix.
- Preserve signing credentials outside the repository.
- Submit through the vendor-supported channel and retain the reviewed artifact.

## Vendor branches

### Chromium / Chrome Web Store

Chrome expects a ZIP with `manifest.json` at its root. General consumer distribution
uses a store-hosted, signed package; supported self-hosting paths are narrower. Check
the current target store because Chromium-derived browsers may have separate policies.
([Chrome prepare guide](https://developer.chrome.com/docs/webstore/prepare), [distribution guide](https://developer.chrome.com/docs/extensions/how-to/distribute))

### Firefox / AMO

Firefox release and beta builds require Mozilla signing whether listed on AMO or
self-distributed. Run applicable lint/package checks and review current Mozilla add-on
policies before submission. ([Mozilla signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/))

### Safari / Apple distribution

Package the Safari Web Extension inside its Apple-platform app. Test the intended
platforms, then follow the current signing, App Store Connect, TestFlight/review, or
documented Developer ID/notarization path for the chosen distribution. ([Apple distribution](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension), [App Store Connect packaging](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect))

Stop before publishing if the user did not authorize external submission, if required
disclosures are unknown, or if the release artifact has not passed its browser matrix.
