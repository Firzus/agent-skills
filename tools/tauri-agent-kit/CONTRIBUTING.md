# Contributing

Use Windows x64 with WebView2, Rust and the Windows C++ tools, Node 22+, pnpm 10.33.2 and Vite+ 0.3.2. Change to `tools/tauri-agent-kit/` and run `vp install` after cloning. Run all commands below from that directory.

Use Conventional Commits and focused pull requests. Do not add explanatory source comments; put durable explanations in documentation. Never commit application screenshots, logs, credentials or machine-specific paths. Only the generic fixture may appear in public evidence.

Before requesting review:

```powershell
vp pack
vp check
vp test
cargo fmt --all --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test -p tauri-plugin-agent-kit --lib --locked
cargo build -p agent-kit-fixture --locked
vp run test:live
vp run test:security
```

Reserve the desktop before native input tests. Scripts stop only their own fixtures. A safe native rejection is not proof of native input success. Do not replay a timed-out write without inspecting the state.

Report bugs with versions, reproduction steps and redacted diagnostic metadata. Use the private security reporting process for vulnerabilities.
