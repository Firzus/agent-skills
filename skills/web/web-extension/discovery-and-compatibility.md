# Discovery and Compatibility

## Discovery brief

Inspect existing manifests, source layout, build commands, dependencies, tests, and
release configuration. Resolve these questions before changing architecture:

- Which browsers, platforms, and minimum versions are required?
- Is the work new, a port, a migration, or a change to an existing extension?
- Which user-visible features and UI surfaces are required?
- Which sites, tabs, browser data, and user data must the extension access?
- Must access be persistent, optional, or activated by a user gesture?
- Does Safari require a containing app? Is any native companion required elsewhere?
- How will each target be distributed: store, managed environment, or supported
  self-distribution path?

Do not infer broad compatibility from the word “WebExtension.” The W3C group is
working on a common model and API set, but signing and delivery remain vendor-owned.
Use shared core plus explicit browser adapters. ([W3C group](https://www.w3.org/groups/cg/webextensions/), [formation statement](https://www.w3.org/community/webextensions/2021/06/04/forming-the-wecg/))

## Compatibility matrix

Create one row per required capability:

| Capability | Chromium | Firefox | Safari | Decision | Evidence |
|---|---|---|---|---|---|
| User-visible requirement | common / syntax-different / API-different / unavailable | same | same | shared core, adapter, fallback, or excluded target | current vendor page |

Verify the exact API and manifest keys against the declared minimum versions. Firefox
is broadly compatible with Chromium, but API coverage, manifest keys, contexts,
background implementations, packaging, and publishing can differ. Safari uses the
WebExtensions model inside an Apple-platform app. ([MDN cross-browser guide](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension), [Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions))

Keep one conceptual manifest model and explicit target manifests. Static manifests
are sufficient when differences are small; generated manifests are acceptable when
the existing build already supports them. Never invent conditional JSON that a
browser store cannot consume. ([MDN manifest reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json))
