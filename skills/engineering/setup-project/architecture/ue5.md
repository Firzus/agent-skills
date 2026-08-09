# Fragment: architecture — Unreal Engine 5

Architecture answers where code goes and what it may depend on. Style stays out of this file.

The `ue5-aaa-best-practices` skill in this library already covers the C++/Blueprint split, Gameplay Framework responsibilities and Subsystems. It says nothing about the module system — which is exactly the placement material worth writing here.

## The core section

```markdown
## Architecture

Modules are the unit of decomposition, and `.Build.cs` is where dependencies are declared. Circular module dependencies do not compile, so layering is a build constraint rather than a convention.

Put a dependency in `PrivateDependencyModuleNames` unless a public header exposes it; only then does it belong in `PublicDependencyModuleNames`. A `Public/` header cannot include one from `Private/`, so encapsulation is compiler-checked.

Put editor-only code in an Editor-type module rather than scattering `#if WITH_EDITOR` blocks through runtime code.

Make it a Plugin when it should be redistributable or carry its own assets; a Module otherwise. Only plugins can contain content.
```

## Optional rows

- **`LoadingPhase`** — modules sharing a phase load in non-deterministic order, so no code may assume module A initialises before module B. State it in a project with startup-order bugs.
- **Module `Type`** — note that `Developer` is deprecated in favour of `DeveloperTool`; older templates still use the old name.

Modules are why the layering holds: a forbidden edge is a build failure, not a review comment. That is the reason to reach for a module boundary rather than a folder convention.

## Sources

- <https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-modules>
- <https://dev.epicgames.com/documentation/en-us/unreal-engine/module-properties-in-unreal-engine>
