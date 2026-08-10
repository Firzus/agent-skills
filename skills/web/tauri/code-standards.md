# Code standards — Rust

Only what tooling does not already catch. Rustfmt and clippy cover formatting,
naming casing, needless clones and their default-on groups; configure clippy
rather than restating them here.

Command shape, serializable errors, state and async live in
[best-practices.md](best-practices.md). This file is the surrounding Rust
discipline that applies to every module under `src-tauri/`, command or not.

## Naming states the cost

- Let the method prefix state its cost: `as_` borrows, `to_` allocates or converts, `into_` consumes.
- Getters take the field name with no `get_` prefix.

Nothing enforces this, and breaking it misleads every reader about what a call
costs.

## Panics and expectations

- Return `Result` for anything a caller could reasonably handle. In a Tauri app that is nearly everything a command touches, since a panic in a command aborts the app rather than reaching the frontend.
- Panic only on a broken contract or a state the code cannot continue from — and in tests and examples, where panicking is the point.
- Write `expect` messages that state why the invariant holds, not what failed. "Config was validated at startup" tells the next reader something; "failed to unwrap" does not.

## Error types

`thiserror` for a library or a crate whose callers match on the error;
`anyhow` for application glue, where a trait object and context are enough.
Same author, complementary purposes.

The IPC boundary is the exception: a command's error must serialize, which is
why [best-practices.md](best-practices.md) pairs `thiserror` with a manual
`Serialize` implementation.

## Visibility

Default to private, and widen to `pub(crate)` before `pub`. A command handler
is `pub` because `generate_handler!` needs it; its helpers usually are not.

## Unsafe

- Where the project declares `#![forbid(unsafe_code)]`, keep it: `forbid` cannot be overridden locally the way `deny` can.
- Where unsafe code exists, a `// SAFETY:` comment must establish why the invariant the compiler cannot check actually holds. Clippy checks that the comment is present, never that it is true.

## The lockfile

Keep `Cargo.lock` in version control, for libraries as well as binaries. The old
"libraries don't commit it" rule was retired in August 2023, and a library's
lockfile is excluded from published packages anyway, so it affects only your own
contributors and CI.

This one earns its line because a model trained on the older guidance will
confidently delete a lockfile the team committed on purpose.

## Sources

- <https://rust-lang.github.io/api-guidelines/naming.html>
- <https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html>
- <https://docs.rs/thiserror/>, <https://docs.rs/anyhow/>
- <https://blog.rust-lang.org/2023/08/29/committing-lockfiles/>
