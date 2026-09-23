# Validation

Local validation on Windows x64, 2026-09-16. This is a development implementation, not a published release or a cross-platform compatibility claim.

## Automated checks

| Check                                                            | Observed result                                                                                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vp pack`                                                        | Server and instrumentation bundles generated with Vite+ 0.3.2                                                                                          |
| `vp check`                                                       | Formatting, lint and TypeScript checks passed                                                                                                          |
| `vp test`                                                        | 9 tests passed: bridge authentication, manifest validation, real stdio MCP handshake, schemas and instrumentation                                      |
| `cargo fmt --all --check`                                        | Passed                                                                                                                                                 |
| `cargo clippy --workspace --all-targets --locked -- -D warnings` | Passed                                                                                                                                                 |
| `cargo test -p tauri-plugin-agent-kit --lib --locked`            | 4 tests passed: authentication roles, bounded records, Unicode and pagination                                                                          |
| `cargo check -p tauri-plugin-agent-kit --release --locked`       | Passed; release bridge exclusion also inspected in `init`                                                                                              |
| `vp run test:live`                                               | Real fixture, MCP client and WebView2 exercised end to end                                                                                             |
| `vp run test:security`                                           | Multi-instance isolation, advanced gate, cancelled queue, invalid-text no-side-effect check, real advanced IPC and blocked-JavaScript diagnosis passed |

The live fixture has two windows with the same title, including a transparent window. Tests address exact labels, observe click effects, reject stale references, enter Unicode, call Rust through the UI, read IPC metadata, restore zoom, inspect PNG dimensions and verify scrolling. Native Windows click, text insertion and Backspace were observed in the final local run. Three preceding consecutive runs also observed native click effects. The fixture exposes trusted pointer coordinates to make coordinate failures inspectable.

An input dispatch acknowledgement is not an observed effect. An early WebView assertion raced event processing; the test now polls fresh observations without replaying the action. Native trials also included foreground rejection and an acknowledged click without the expected effect. Native input remains desktop-dependent: reserve the desktop and verify every action. The live test accepts an explicit safe native rejection, records it separately, and fails if a successful dispatch has no expected effect. A green CI run alone therefore does not prove native input coverage; inspect the reported outcomes.

## External integration checks

Two private Tauri applications were exercised locally. Discovery, snapshots, viewport captures, zoom restoration and UI interactions were observed, including a Rust-backed response. Temporary changes and sessions were cleaned up. Their names, screenshots, logs and backups are not distributed. Public demonstrations use only the generic fixture.

## Not established

- The GitHub workflow is prepared but has not run remotely.
- Release compilation is checked; a release GUI was not launched to test absence of the registry entry at runtime.
- Other Windows accounts, hostile local ACL scenarios, multiple monitors and mixed-DPI transitions have not been exercised end to end.
- Child-WebView inventory is implemented; the live fixture uses two WebView windows, not several child views inside one native window.
- macOS, Linux, Tauri 2.0.x, frame traversal and shadow-root snapshots are not implemented or validated.
- Console and Rust tracing diagnostics intentionally omit argument/field values; IPC instrumentation covers only wrapped or explicitly reported calls.
- npm, crates.io and GitHub publication have not been performed.

## Alpha packaging checks

The npm archives were allowlist-inspected, installed outside the workspace with lifecycle scripts disabled, and exercised through the installed command shim and a real MCP live fixture. The instrumentation export imported successfully. The Rust crate passed package verification and publish dry-run; a separate consumer compiled against the unpacked crate outside the workspace. CLI help/version and invalid arguments are covered by regression tests.

The current publication candidate has not been pushed or published. Remote CI, registry authentication, trusted-publisher settings, public-registry reinstall checks and MCP Registry listing remain pending approval. See `dependencies.md` for audit warnings, and `releasing.md` for the publication gates.
