# Release procedure

Only reviewed alpha releases are supported. Nothing publishes on push or merge. First publication requires the maintainer's explicit approval and registry authentication. Never paste tokens into issues, source, logs or chat.

The source and release workflow are maintained in `Firzus/agent-skills` under
`tools/tauri-agent-kit/`. Run the local commands in this document from that
directory. Migration to this repository does not authorize a release.

The kit check workflow (`.github/workflows/tauri-agent-kit-check.yml` at the
repository root) does not start on push. It runs when a PR opens, reopens,
receives new commits, or becomes ready for review. A standalone manual workflow
run is useful for diagnostics but does not satisfy a required PR status check.
Confirm the destination repository's actual branch rules before describing
this workflow as required.

## Public-content gate

Review `git ls-files tools/tauri-agent-kit` from the repository root and the
exact npm/Cargo package inventories. Only the kit's `docs/media/fixture.png`
and `docs/media/fixture-results.json` are approved public demo evidence. Do
not attach the entire artifacts directory. Private integrations, backups and
original reports belong outside the repository, not just in gitignore. Search
the staged text for private application names, personal paths and credentials
before the first commit.

## Local release gate

1. Align server, instrumentation, crate and `server.json` versions. Update the changelog and release notes.
2. Run all checks from CONTRIBUTING.md, `cargo check -p tauri-plugin-agent-kit --release --locked`, `pwsh -File scripts/package-test.ps1`, `cargo package -p tauri-plugin-agent-kit --locked` and `cargo publish -p tauri-plugin-agent-kit --dry-run --locked` from a clean checkout.
3. Inspect the archives, including licenses and Rust embedded assets. Compile a separate consumer against the unpacked crate.
4. Reserve a Windows desktop and run `node scripts/live-test.mjs --require-native`. Require observed click, text and Backspace effects; a safe rejection does not satisfy this gate.
5. Review dependency licenses and security advisories. The current findings are recorded in `docs/dependencies.md`; acknowledge the informational warnings before publication. Do not silently waive findings.

## First publication

After approval, confirm the `Firzus/agent-skills` repository's private
vulnerability reporting, branch checks, and `release` environment. The
environment must require maintainer approval and restrict deployment to main.
Review the preparation through the repository's normal PR process. Do not
create a separate kit repository. GitHub and registry configuration are
separate authorized operations, not effects of this migration.

Authenticate with npm and crates.io using the maintainer's accounts. Recheck ownership/availability of all names immediately before publication. A 404 is not a reservation. Stop on a collision. The initial version can be published locally from the reviewed, clean checkout:

```powershell
npm publish artifacts/packages/tauri-agent-kit-0.1.0-alpha.1.tgz --tag alpha --access public
npm publish artifacts/packages/tauri-agent-kit-instrumentation-0.1.0-alpha.1.tgz --tag alpha --access public
cargo publish -p tauri-plugin-agent-kit --locked
```

Check each command's exit status before continuing. Local bootstrap publications do not claim GitHub OIDC provenance. Create a draft prerelease from the reviewed commit and attach only those two tarballs and the matching crate. Do not upload screenshots, backups or raw logs as release attachments.

## Subsequent releases

Configure trusted publishing for both npm packages and the crate, scoped to
`Firzus/agent-skills`, workflow `tauri-agent-kit-publish.yml`, environment
`release`. npm requires a sufficiently recent npm CLI and Node; the workflow
uses Node 24. Use GitHub-hosted runners. The publishing job remains disabled
until the repository variable `TAURI_AGENT_KIT_RELEASE_ENABLED` is set to
`true`. Set it only after explicit release approval, environment protection,
and publisher configuration are verified. This migration does not set it.

Manually dispatch Publish Tauri agent kit alpha on main with the exact reviewed version. It reruns checks and packaging before entering the approval-gated publishing job. The output remains a draft prerelease. No automatic version bump or stable dist-tag is applied.

Publications across registries are not atomic. If any step fails, stop, inspect which versions already exist, and publish only missing components after checking ownership and the reviewed artifacts. Do not rerun the entire workflow blindly, overwrite a version, or unpublish to hide a failed launch.

## Public installation and visibility gate

In a fresh Windows folder, install the exact npm versions from the public registry, run the installed CLI's `--version`, and run the live test using `AGENT_KIT_SERVER_ENTRY` pointing to the installed entry. Create a new Tauri consumer using the exact crates.io version and exercise its plugin. Do not use path overrides or workspace links for this final check.

Only after these checks pass, mark the GitHub prerelease visible and update the changelog status. Validate `server.json` against its referenced schema, then authenticate with `mcp-publisher login github` and run `mcp-publisher publish`. The server package's `mcpName` identifies the same GitHub namespace. Verify the resulting registry entry and exact package version. Do not describe an unregistered candidate as listed.

Sources: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), [crates.io trusted publishing](https://crates.io/docs/trusted-publishing), [MCP Registry publishing](https://modelcontextprotocol.io/registry/quickstart).
