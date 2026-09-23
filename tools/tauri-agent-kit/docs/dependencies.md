# Dependency review

Review date: 2026-09-16. This records tool output, not a guarantee that the dependency graph is vulnerability-free.

The npm production dependency inventory reports MIT and Apache-2.0 OR MIT licenses. Runtime dependencies are external to the generated bundles and retain their own registry packages and license files. Each project package includes the project's MIT license.

The Cargo metadata inventory includes permissive licenses and MPL-2.0 dependencies (`cssparser`, `cssparser-macros`, `dtoa-short`, `option-ext`, `selectors`). Dependencies are fetched from their original registries, not vendored or relicensed in the published crate. The only package without license metadata in the workspace inventory is the unpublished test fixture.

`pnpm audit --prod` reported zero advisories. `cargo audit` reported zero vulnerabilities in its vulnerability category, with the following informational warnings that are not suppressed:

| Package                  | Advisory          | Status                                                                           |
| ------------------------ | ----------------- | -------------------------------------------------------------------------------- |
| proc-macro-error 1.0.4   | RUSTSEC-2024-0370 | Unmaintained transitive dependency                                               |
| unic-char-property 0.9.0 | RUSTSEC-2025-0081 | Unmaintained transitive dependency                                               |
| unic-char-range 0.9.0    | RUSTSEC-2025-0075 | Unmaintained transitive dependency                                               |
| unic-common 0.9.0        | RUSTSEC-2025-0080 | Unmaintained transitive dependency                                               |
| unic-ucd-ident 0.9.0     | RUSTSEC-2025-0100 | Unmaintained transitive dependency                                               |
| unic-ucd-version 0.9.0   | RUSTSEC-2025-0098 | Unmaintained transitive dependency                                               |
| glib 0.18.5              | RUSTSEC-2024-0429 | Unsound iterator implementations; absent from the Windows target dependency tree |

The `glib` target check used `cargo tree -p tauri-plugin-agent-kit --target x86_64-pc-windows-msvc -i glib` and found no dependency path. This does not validate other platforms. The alpha deliberately retains the tested Tauri 2.11.5 stack; review these warnings when approving publication and when updating Tauri. Re-run audits before the actual registry write because advisory databases change.
