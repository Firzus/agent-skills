---
name: unity-performance
description: >-
  Use when asked for a performance review of a Unity diff, branch, or folder,
  when hunting frame spikes, GC allocations, memory growth, shader hitches, or
  build size by reading code, assets, and settings, or when the user names
  unity-performance. Not for writing or configuring the feature itself (use
  unity-core or unity-rendering) or for a general code review.
---

# Unity performance review

Load the [`unity-core`](../unity-core/SKILL.md) skill with this one: its
default stack decides what a finding recommends. When it is not installed, say
so and recommend from each rule's Fix alone.

The review has two passes. A script runs every rule mechanically, so no rule
is skipped and the coverage numbers are real; then you read only the hits,
drop false positives, and report what holds. Rule bodies stay in `rules/` and
are read only for the rules that hit.

| Part | Checks | Needs |
| --- | --- | --- |
| `scripts/scan.py` | C#, shaders, USS/UXML, and Unity YAML: regex patterns on the added lines of a diff, ABSENT and MANUAL rules | Python 3.11+, Git for a diff |
| `scripts/editor_audit.cs` | Importer values (texture size, compression, Read/Write, mipmaps, mesh size, audio load type, rigs) and project settings (stripping, C++ configuration, physics, Quality Levels, URP assets), through Editor APIs | An Editor reachable through the Unity CLI and its Pipeline package |

## Run the review

1. **Pick the target.** Review a diff or one folder, not a whole long-lived project: dozens of rules hit at once and the second pass loses precision. A branch review diffs against its base branch (`--diff origin/main`; the script diffs from the merge base, so the base's newer commits are left out); uncommitted work diffs against `HEAD`; a folder uses `--paths Assets/Scripts/Battle`.
2. **Read the project settings file.** `.unity-performance.toml` at the project root names the shipped platforms and the project's exceptions; the next section shows it. Without it, Android, iOS, and Web rules stay in scope, and the report says so.
3. **Run the scan** from the project root, writing the Editor audit outside `Assets/`:

   ```bash
   python <skill>/scripts/scan.py --project . --diff origin/main --editor-audit <temp>/audit.cs
   ```

   Its Markdown output lists pattern hits with the enclosing C# method and its context (`frame`, `init`, `other`, `editor`, `asset`), ABSENT rules with no match in the project, MANUAL rules for the touched file types, and a generated coverage section. Without Python 3.11, say so, read the `rules/*.md` files for the touched file types instead, and report the coverage as manual.
4. **Run the Editor audit** when the scan lists EDITOR rules. Connect as the [`unity-cli`](../unity-cli/SKILL.md) skill describes, including its readiness check, then:

   ```bash
   unity command eval_file --file <temp>/audit.cs --result-only --timeout 300 > <temp>/audit.json
   python <skill>/scripts/scan.py --project . --audit-result <temp>/audit.json
   ```

   The audit reads importer and project settings and changes nothing in the project; the second command applies the project's overrides to its findings and prints them by level. Without a reachable Editor, list the EDITOR rules as not checked in the coverage.
5. **Confirm each hit.** Read the rule in `rules/<file>` and the code around the hit, then keep or drop it. A `frame` rule hit in an `other` context binds only when a per-frame path calls that method: follow the callers. Hits in `init` arrive already lowered to Info.
6. **Settle ABSENT and MANUAL rules.** Read each listed rule and decide from the project whether it applies; most MANUAL rules apply only when the change does what they describe.
7. **Flag what needs a measurement.** A suspicion that static reading cannot settle goes in the report as "profile recommended", with the symptom to look for from [references/diagnosis.md](./references/diagnosis.md).

Before a release, also run Project Auditor and, for AssetBundle groups,
Addressables Analyze, as [workflow.md](../unity-core/workflow.md#testing) and
[assets.md](../unity-core/assets.md#addressables) describe; this review does
not replace them.

## Project settings file

```toml
# .unity-performance.toml, at the Unity project root
platforms = ["android", "ios", "desktop"]   # android, ios, web, desktop
# urp = true            # overrides detection from Packages/manifest.json
# addressables = true
# vat = false

[thresholds]            # used by the Editor audit
max_texture_size = 2048
max_mesh_vertices = 65535
long_audio_seconds = 10.0

[[override]]
rule = "AS02"
paths = ["Assets/UI/Gradients/**"]   # optional globs
# context = "frame"     # optional: frame, init, other, editor, asset
level = "Skip"          # Warning, Info, or Skip; an override only lowers a level
reason = "Gradients band when compressed; kept uncompressed on purpose"
```

When the user accepts an intentional finding, such as a texture kept
uncompressed on purpose, record it as an override with its path and reason
rather than repeating it in every review.

## Report

```markdown
## Unity performance review

### Critical
- `path:line` Finding [RULE-ID]
  - Evidence: why it costs, with the rule's measured value
  - Fix: what to do, linking the guidance

### Warning
### Info
### Profile recommended

### Coverage
- (the scan's generated coverage, copied verbatim)
- Editor audit: run, N finding(s) / not run (why)
- Hits confirmed: N; dropped as false positives: N (IDs)
```

Every finding carries its rule ID, so a false positive points at the pattern to
fix. Report only performance: style and design belong to other reviews.

## Maintain the rules

Add or change a rule as [references/rule-format.md](./references/rule-format.md)
describes, then run `python scripts/scan.py --lint`. A rule that disagrees with
the team's practice is a rule to fix, not a finding to argue: adjust its
pattern, level, or reason. The rules derive from CyberAgent's MIT-licensed
skill; see [NOTICE.md](./NOTICE.md).
