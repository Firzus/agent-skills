# Release procedure

Only alpha releases are supported. Releases are published by `.github/workflows/tauri-agent-kit-publish.yml` at the repository root; never paste tokens into issues, source, logs or chat.

## Prepare a release

Open a pull request that:

1. Sets the same version in `server/package.json`, `instrumentation/package.json`, `plugin/Cargo.toml`, `Cargo.lock` and both version fields of `server.json`, and updates the pinned versions in the README, `server/README.md` and the `tauri` skill.
2. Adds the version to `CHANGELOG.md` and rewrites `docs/release-notes.md`, which becomes the GitHub release text.
3. Passes the public-content gate below and the checks in CONTRIBUTING.md.

Merging a version change to `main` publishes it. Treat the merge as the release decision.

## Public-content gate

Review `git ls-files mcp/tauri-agent-kit` from the repository root and the
exact npm/Cargo package inventories. Only the kit's `docs/media/fixture.png`
and `docs/media/fixture-results.json` are approved public demo evidence. Do
not attach the entire artifacts directory. Private integrations, backups and
original reports belong outside the repository, not just in gitignore. Search
the staged text for private application names, personal paths and credentials
before the first commit. Review dependency licenses and security advisories;
the current findings are recorded in `docs/dependencies.md`.

## What the workflow does

On a push to `main` that changes a manifest above, or on manual dispatch from `main`, the workflow:

1. Checks that all manifests carry the same alpha version and stops when the npm packages, the crate, the MCP Registry entry and the `v<version>` GitHub prerelease all exist.
2. Runs `.github/workflows/tauri-agent-kit-check.yml`, then builds the two npm tarballs and the crate in a job without publishing rights.
3. In the `release` environment, which deploys only from `main`, publishes the missing artifacts through npm and crates.io trusted publishing and the MCP Registry's GitHub OIDC login. This job runs no project or dependency code.
4. Runs the published CLI's `--version`, then creates the GitHub prerelease with the two tarballs and the crate.

Publications across registries are not atomic. When a run fails, fix the cause and use **Re-run all jobs** on that run: each publication step rechecks its registry and skips what already exists. Never overwrite or unpublish a version to hide a failed release; publish a new one.

npm keeps `latest` on the first version it published. The workflow publishes alphas under the `alpha` dist-tag only; moving `latest` is a manual `npm dist-tag add` by the package owner.

## Trusted publishing configuration

Each registry must trust the workflow before the first automated release:

| Registry  | Package                                              | Settings                                                                                                                                  |
| --------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| npm       | `tauri-agent-kit`, `tauri-agent-kit-instrumentation` | Trusted publisher GitHub Actions: user `Firzus`, repository `agent-skills`, workflow `tauri-agent-kit-publish.yml`, environment `release` |
| crates.io | `tauri-plugin-agent-kit`                             | Trusted publishing: owner `Firzus`, repository `agent-skills`, workflow `tauri-agent-kit-publish.yml`, environment `release`              |

The MCP Registry needs no configuration: the GitHub OIDC login grants the `io.github.Firzus` namespace.

Sources: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), [crates.io trusted publishing](https://crates.io/docs/trusted-publishing), [MCP Registry publishing](https://modelcontextprotocol.io/registry/quickstart).
