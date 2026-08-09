# Fragment: code standards — TypeScript

Only what tooling does not already catch. If eslint, tsc or Prettier enforces it, it belongs in their config, not in `AGENTS.md`.

## The core section

```markdown
## Code standards

Take unknown data as `unknown` and narrow it before use. `any` disables checking silently; `unknown` forces the narrowing to be written down.

Model variants as discriminated unions and close the switch with a `never` check, so adding a variant breaks compilation at every site that must handle it.

Use `satisfies` to check a value against a type while keeping its literal inference, and reach for `as` only when a comment can say why the compiler is wrong.
```

## Optional rows

- **Strictness beyond `strict`** — `strict` covers eight flags but leaves out `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` and `noPropertyAccessFromIndexSignature`. These change how code must be written, so if the project enables them, say so.
- **Enums and `namespace`** — non-erasable syntax rejected by `erasableSyntaxOnly` and `isolatedModules`. Union types replace enums with no runtime cost. A technical argument, not a taste one.
- **`type` vs `interface`** — the handbook's actual position is to use `interface` until you need something only `type` provides. State it as the preference it is.

## Deliberately absent

Formatting, import ordering, unused variables, `no-explicit-any`, and everything in the typescript-eslint recommended and strict presets. Configure the tool instead.

Result types over exceptions, and a ban on default exports, are common preferences with no official TypeScript position behind them. Include them as project choices if you want them, without dressing them as canon.

## Sources

- <https://www.typescriptlang.org/tsconfig/>
- <https://www.typescriptlang.org/docs/handbook/2/narrowing.html>
- <https://www.typescriptlang.org/docs/handbook/2/everyday-types.html>
