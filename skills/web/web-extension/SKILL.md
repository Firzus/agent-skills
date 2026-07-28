---
name: web-extension
description: >-
  Design, build, port, debug, test, or prepare browser extensions for Chromium,
  Firefox, and Safari using the WebExtensions model. Use when work involves
  manifest.json, Manifest V3, extension service workers or background scripts,
  content scripts, extension messaging, browser permissions, toolbar actions,
  options pages, sidebars, cross-browser extension compatibility, store-ready
  packages, Chrome Web Store, Firefox Add-ons, or Safari Web Extensions. Also use
  when migrating an existing extension between browsers.
---

# Web Extension

Build extension behavior around explicit browser targets, execution contexts,
permissions, and lifecycle constraints. Treat WebExtensions as a shared model
with vendor-specific seams, not as one perfectly uniform platform.

This skill covers WebExtensions and migrations to that model. Ordinary websites,
browser automation, userscripts, bookmarklets, legacy Chrome Apps, and legacy
Safari App Extensions remain outside its scope.

## Workflow

1. Discover the target before choosing architecture or syntax. Inspect the repo,
   then establish browsers and minimum versions, features, UI surfaces, host/data
   access, distribution channels, native companion needs, and existing tooling.
   Use [discovery and compatibility](./discovery-and-compatibility.md).
2. Create a compatibility matrix. For every required capability, classify it as
   common, syntax-different, API-different, or unavailable. Verify uncertain or
   version-sensitive support in current vendor documentation before coding.
3. Map execution contexts and message boundaries before implementation. Assign
   work to content scripts, background/event code, extension pages, page code, or
   a native companion. Define small validated request/response messages. Use
   [architecture and implementation](./architecture-and-implementation.md).
4. Map every permission, host pattern, and data flow to a user-visible purpose.
   Prefer narrow, optional, and user-initiated access. Use
   [permissions, privacy, and security](./permissions-privacy-and-security.md).
5. Implement shared domain logic behind narrow browser adapters. Preserve the
   existing stack. Keep browser namespace, manifests, background declarations,
   and browser-only UI out of shared feature logic.
6. Make background work restart-safe: register listeners at startup, persist
   durable state, make event handlers idempotent, and never depend on globals
   surviving suspension.
7. Test source behavior and the packaged artifact in every declared browser.
   Include denial, revocation, restart, upgrade, restricted-page, and failure
   paths. Use [testing and debugging](./testing-and-debugging.md).
8. Run a separate release gate for each target store. Re-open the current official
   policy and submission checklist before packaging, signing, or publishing. Use
   [packaging and release](./packaging-and-release.md).

## Explicit branches

- **Existing project:** follow its namespace, manifest-generation, bundling, and
  test conventions unless they conflict with a target-browser requirement.
- **New single-browser extension:** optimize for that browser, but isolate platform
  calls where doing so costs little. Do not claim cross-browser support.
- **New multi-browser extension:** use one shared core plus explicit adapters and
  target manifests. Do not scatter browser checks through feature logic.
- **Chromium:** use the target's documented Manifest V3 service-worker syntax and
  lifecycle. Test forced worker termination.
- **Firefox:** verify each API and manifest key; choose the documented background
  declaration and account for Mozilla signing.
- **Safari:** plan the containing Apple-platform app, Xcode workflow, website-access
  states, platform testing, signing, and distribution from the start.
- **Unsupported capability:** feature-detect or provide a target-specific fallback.
  If neither preserves the requested behavior, report the limitation instead of
  silently widening permissions or weakening security.

## Guardrails

- Do not solve injection failures by defaulting to `<all_urls>`.
- Do not download executable code at runtime, use dynamic evaluation, or weaken
  the extension Content Security Policy as a default fix.
- Do not assume a popup can access the current page DOM; cross contexts explicitly.
- Do not treat a namespace polyfill as proof that an API exists on every target.
- Do not encode volatile store fees, review times, asset dimensions, or compatibility
  tables. Consult current official documentation when those facts affect the task.
- Do not impose a framework. If recommending one, research its current primary
  documentation and explain why it fits the discovered constraints.

## Done when

- The requested feature works in every declared browser and minimum version.
- Each capability has an explicit compatibility outcome and vendor seam.
- Context ownership and all cross-context messages are documented and validated.
- Every permission and data flow has a necessary, user-visible purpose; denial and
  revocation behave safely.
- Background behavior survives suspension, restart, duplication, and partial work.
- Automated checks pass where present, and the manual matrix covers install,
  upgrade, primary workflows, failures, and every extension UI surface.
- The exact release artifact loads and passes smoke tests on every target.
- Per-store permissions, privacy disclosures, package contents, signing, and current
  submission requirements have been checked before release.
