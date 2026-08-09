# Fragment: code standards — C#

Only what tooling does not already catch. The filter is sharp here: if a rule can be written as an `.editorconfig` line, it belongs in `.editorconfig`.

Note that an `.editorconfig` naming rule only breaks the build at severity `warning` or `error`. The default does not, which is why teams believe a rule is enforced when it is not.

## The core section

```markdown
## Code standards

Throw the most specific exception that fits, and pass the parameter name when the type carries one. Catch only what the code can act on.

Enable nullable reference types and treat the annotations as the contract. The analysis is compile-time only and does not trace into method bodies, so it narrows mistakes rather than eliminating them.

In library code, await with `ConfigureAwait(false)` unless the continuation needs the original context. Application code wants the default.

Reserve `async void` for event handlers. Anywhere else its exceptions escape the caller entirely.
```

## Unity

```markdown
Install Microsoft.Unity.Analyzers. `UnityEngine.Object` overloads `==` to report a destroyed object as null, which `?.`, `??`, `??=` and `is not null` bypass — the analyzer catches all four with automatic fixes.

Treat nullable annotations on serialized fields as advisory: the Unity runtime initialises them, which the compiler cannot see.
```

The `==` trap is real and documented, but the mechanical rule is excluded by the filter — the analyzer catches it. What remains is one line telling the project to install the package.

## Deliberately absent

Casing, layout, `var` usage, expression-bodied members, file organisation. All `.editorconfig` territory.

Coroutines, `Awaitable`, `[SerializeField]`, allocation in `Update()` and pooling are covered by the `unity` skill in this library. Do not restate them.

"Avoid `foreach` in hot paths" is unsettled — the advice traces to old Mono enumerator boxing that modern runtimes largely fixed, and no source confirms it still applies. Leave it out; the allocation rule already covers the real concern.

## Sources

- <https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions>
- <https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references>
- <https://devblogs.microsoft.com/dotnet/configureawait-faq/>
- <https://github.com/microsoft/Microsoft.Unity.Analyzers>
