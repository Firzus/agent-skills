# Fragment: architecture — Unity 6

Architecture answers where code goes and what it may depend on. Style stays in `code-standards/csharp.md`.

The `unity` skill in this library already covers folder layout and the case for splitting into assemblies. What follows is what it does not say: how those splits stop being conventions.

## The core section

```markdown
## Architecture

Enforce module boundaries with Assembly Definitions. An `.asmdef` lists its references explicitly, so a forbidden dependency is a compile error rather than a review comment. Adding a reference means editing the `.asmdef` — `.csproj` and `.sln` are regenerated from it and hand edits are wiped.

Give every `Editor/` folder its own Editor-type assembly. Assembly definitions take priority over Unity's special folder names, so once a feature folder has an `.asmdef`, an `Editor/` subfolder inside it is an ordinary folder and its scripts ship into the runtime assembly.

Dependencies point one way: features depend on shared foundations, never on each other, never back upward.
```

The `Editor/` rule is the highest-value line here. The failure is silent — editor-only code compiles and ships into the player build with no warning.

An `.asmdef` reference list is a whitelist, which makes it the enforcement mechanism rather than a convention: the compiler rejects the forbidden edge. Say so when the project has boundaries worth defending.

## Optional rows

Include when the project has the corresponding need.

- **`noEngineReferences: true`** — makes an assembly pure C#, with the compiler forbidding any `UnityEngine` access. The cleanest way to keep domain logic testable outside the Editor.
- **`autoReferenced: false`** — stops leftover code in `Assembly-CSharp` from reaching into a module without declaring it.
- **`Packages/`** — code there is ignored entirely unless it carries an `.asmdef`. Worth stating in a project using embedded packages.

## Deliberately absent

ScriptableObject architecture belongs in the `unity` skill: it is closer to how code is written than to where it goes. Keep this fragment on placement and dependency direction.

## Sources

- <https://docs.unity3d.com/Manual/ScriptCompilationAssemblyDefinitionFiles.html>
- <https://docs.unity3d.com/Manual/SpecialFolders.html>
