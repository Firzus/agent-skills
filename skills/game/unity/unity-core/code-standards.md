# Code standards — C# for Unity

Only what tooling does not already catch. If a rule can be written as an
`.editorconfig` line, it belongs in `.editorconfig`.

One thing to know about that filter: an `.editorconfig` naming rule only breaks
the build at severity `warning` or `error`. The default does not, which is why
teams believe a rule is enforced when it is not. Casing, layout, `var` usage and
file organisation all live there rather than here.

## Exceptions

- Throw the most specific exception that fits, and pass the parameter name when the type carries one.
- Catch only what the code can act on. A catch block that logs and continues turns a crash into corrupted state.

## Nullability

- Enable nullable reference types and treat the annotations as the contract. The analysis is compile-time only and does not trace into method bodies, so it narrows mistakes rather than eliminating them.
- Treat nullable annotations on serialized fields as advisory: the Unity runtime initialises them, which the compiler cannot see.
- `UnityEngine.Object` overloads `==` to report a destroyed object as null, which `?.`, `??`, `??=` and `is not null` all bypass. Microsoft.Unity.Analyzers catches all four with automatic fixes — see the analyzer row in [workflow.md](./workflow.md).

## Async

- Reserve `async void` for event handlers. Anywhere else its exceptions escape the caller entirely.
- In library code — an asmdef consumed by other projects — await with `ConfigureAwait(false)` unless the continuation needs the original context. Unity gameplay code wants the default, since it must resume on the main thread.

Engine async rules — `Awaitable`, `CancellationToken`, pooling — live in
[architecture.md](./architecture.md).

## Naming and layout

One public type per file, namespaces mirroring folders, asmdef naming: see
[project-structure.md](./project-structure.md).

## Sources

- <https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions>
- <https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references>
- <https://devblogs.microsoft.com/dotnet/configureawait-faq/>
- <https://github.com/microsoft/Microsoft.Unity.Analyzers>
