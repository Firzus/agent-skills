# Fragment: guardrails

A guardrail is a trap no config file confesses: something an agent cannot deduce by reading the repo, and that costs a session when violated. A rule a linter already enforces is noise, not a guardrail.

Take only the rows matching the detected stack. Four or five rows beat fifteen.

## Phrasing

State the target rather than the ban, and give the reason. Keep an outright prohibition only where the loss is irreversible, and always name the legal path beside it.

Both Codex and Claude Code keep hard floors even in their full-bypass modes — Codex protects `.git` recursively under `workspace-write`, Claude Code still prompts on `rm -rf /` and `rm -rf ~`. Neither treats "the user asked for no prompts" as permission to destroy version control. A project's own guardrails should not be weaker than that.

## Git — applies everywhere

```markdown
## Guardrails

Preserve uncommitted work: run `git stash push -u` before any operation that rewrites the working tree. `git reset --hard` is one of the very few commands that genuinely destroys data — the reflog tracks reference updates only, so it can recover a commit but never an uncommitted edit.

Clean with `git clean -nd` first to see what would go, then `git clean -fdX` to remove ignored files only. The lowercase `-x` also deletes `.env`, local credentials and editor settings — files that are gitignored precisely because they are local and irreplaceable.

Force-push with `--force-with-lease --force-if-includes`. Passed alone, `--force-if-includes` is a silent no-op: it looks careful and protects nothing.
```

## Unity

```markdown
Move, rename, duplicate and delete assets inside the Unity Editor. The Editor maintains the `.meta` sidecar that carries each asset's GUID; a filesystem move leaves it stale, and copying an asset with its `.meta` creates a duplicate GUID that Unity resolves by regenerating one — that asset loses every inbound reference.

Commit an asset and its `.meta` together. The `.meta` alone carries the GUID every referencing scene and prefab stores, so shipping one without the other silently breaks references in every other clone.

Keep Asset Serialization on Force Text and merge scenes and prefabs with UnityYAMLMerge. A line-based merge produces a file that parses but is structurally corrupt, and it fails at runtime rather than at merge time.

Commit `Assets/` and `ProjectSettings/`. `Library/`, `Temp/`, `obj/`, `Build/` and `Logs/` are regenerated.
```

## Unreal

```markdown
Commit `Config/`, `Content/`, `Source/` and `Plugins/`. `Intermediate/`, `Saved/` and `DerivedDataCache/` are generated and can be deleted and rebuilt.

Keep `Build/` in version control. It holds files needed *for* building, including platform-specific build inputs — an ignore rule on it breaks packaging only on a clean clone, which is the worst failure shape.

Rename and move assets inside the Editor, which leaves a redirector so unloaded packages still resolve the asset. Clean them up with right-click > Fixup, which deletes the redirector only once every referencer has been resaved.

Fix reflection errors in the `UCLASS` and `UPROPERTY` macros, not in `*.generated.h`. Unreal Header Tool regenerates that file before the compiler ever sees it.

`.uasset` and `.umap` are binary and cannot be text-merged; the Editor locks a file while it is being worked on for exactly that reason.
```

## Rust

```markdown
Keep `Cargo.lock` in version control, for libraries as well as binaries. The old "libraries don't commit it" rule was retired in August 2023, and a library's lockfile is excluded from published packages anyway, so it affects only your own contributors and CI.
```

This one is worth its line because a model trained on the older guidance will confidently delete a lockfile the team committed on purpose.

## JavaScript / TypeScript

```markdown
Change dependencies through the package manager, then commit the lockfile. `npm ci` installs from the lockfile alone, deletes `node_modules` first, and fails outright when the lockfile is out of sync with `package.json` — so a hand-patched lockfile passes locally and fails CI.

Edit source, not `dist/`, `.next/` or other build output: a fix applied to output disappears at the next build while the agent verifies against a stale artifact.
```

## Registration traps

Worth a row whenever the project has one — a file that must be listed somewhere else to exist at all. The failure is invisible from inside the file itself.

Examples: a Unity assembly must list every assembly it references in its `.asmdef`; a Django app must appear in `INSTALLED_APPS` or its migrations are never seen; a monorepo package must match the root `workspaces` glob or the resolver ignores it. In this library, a skill folder must be listed in `.claude-plugin/marketplace.json` or the installer skips it.

## Sources

- <https://git-scm.com/docs/git-clean>, <https://git-scm.com/docs/git-push>, <https://git-scm.com/book/en/v2/Git-Tools-Reset-Demystified>
- <https://docs.unity3d.com/6000.0/Documentation/Manual/AssetMetadata.html>, <https://docs.unity3d.com/Manual/SmartMerge.html>
- <https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-directory-structure>, <https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-redirectors-in-unreal-engine>
- <https://blog.rust-lang.org/2023/08/29/committing-lockfiles/>
- <https://docs.npmjs.com/cli/commands/npm-ci>
- <https://developers.openai.com/codex/sandbox>, <https://docs.claude.com/en/docs/claude-code/permissions>
