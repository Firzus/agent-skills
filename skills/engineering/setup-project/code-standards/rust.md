# Fragment: code standards — Rust

Only what tooling does not already catch. Rustfmt and clippy cover a great deal; what survives is naming semantics and error-handling judgement.

## The core section

```markdown
## Code standards

Let the method prefix state its cost: `as_` borrows, `to_` allocates or converts, `into_` consumes. Getters take the field name with no `get_` prefix. Nothing enforces this, and breaking it misleads every reader about what a call costs.

Return `Result` for anything a caller could reasonably handle. Panic only on a broken contract or a state the code cannot continue from — and in tests and examples, where panicking is the point.

Write `expect` messages that state why the invariant holds, not what failed. "Config was validated at startup" tells the next reader something; "failed to unwrap" does not.
```

## Optional rows

- **Error types** — `thiserror` for a library, which owns a structured error type callers can match on; `anyhow` for an application, where a trait object and context are enough. Same author, complementary purposes.
- **`#![forbid(unsafe_code)]`** — worth stating when the project claims it, since `forbid` cannot be overridden locally the way `deny` can.
- **`// SAFETY:` comments** — clippy checks that one is present, never that it is true. If unsafe code exists, say what the comment must actually establish.
- **Visibility** — default to private, widen to `pub(crate)` before `pub`.

## Deliberately absent

Formatting, naming casing, `unwrap` in general, needless clones, iterator idioms, and everything in clippy's default-on groups. Configure clippy instead.

## Sources

- <https://rust-lang.github.io/api-guidelines/naming.html>
- <https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html>
- <https://docs.rs/thiserror/>, <https://docs.rs/anyhow/>
