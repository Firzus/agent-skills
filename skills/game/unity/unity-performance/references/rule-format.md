# Rule format

Read this when adding, changing, or removing a rule. Rules live in
`rules/*.md`, one rule per `###` heading; `scripts/scan.py` reads them directly,
so there is no generated checklist to keep in sync. Run
`python scripts/scan.py --lint` after every change.

```markdown
### CS01 LINQ on a per-frame path
- Level: Critical
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.(Where|Select|OrderBy|ToList|ToArray)\(`
- Reason: Each call allocates an enumerator and delegates; at 60 FPS that is a GC hitch within seconds.
- Fix: Loop over a cached collection. See [architecture.md](../../unity-core/architecture.md#allocations).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)
```

| Field | Values | Meaning |
| --- | --- | --- |
| Heading | `### <ID> <title>` | Two capital letters and two digits. An ID is never reused for a different rule |
| Level | `Critical`, `Warning`, `Info` | Critical degrades performance whenever the condition holds; Warning under conditions the reviewer confirms; Info is an optional improvement |
| Scope | `frame`, `any` | `frame`: the cost matters on a per-frame path, so hits are ranked by the enclosing method (per-frame first, init last) |
| When | `-` or tags | Environment the rule needs: `urp`, `addressables`, `il2cpp` (an Android, iOS, or Web target), `android`, `ios`, `web`, `vat`. A comma means AND, `\|` means OR. A rule is skipped only when the environment clearly rules it out; unknown keeps it |
| Files | comma-separated globs | Files the check reads, matched against the file name or the project-relative path |
| Code | `runtime`, `editor`, `any` | For C# hits: `runtime` ignores Editor and test code (an `Editor` or `Tests` folder, or `#if UNITY_EDITOR`); `editor` reads only that code, such as build scripts |
| Check | `` `regex` ``, `` ABSENT `regex` ``, `MANUAL`, `EDITOR` | A Python regular expression applied line by line; ABSENT flags the project when no file matches; MANUAL needs reading; EDITOR is checked by `scripts/editor_audit.cs` through Editor APIs |
| Reason | text | Why it costs, with a measured number and its conditions when one exists |
| Fix | text | The action in one or two sentences, then a link to the section of `unity-core`, `unity-rendering`, or `unity-ui` that owns the guidance; the details stay there |
| Source | link | The chapter or book the rule comes from |

Write the pattern to find candidates, not verdicts: the reviewer drops false
positives after reading the hit. Prefer a pattern that matches the call site of
the costly API over one that matches common syntax. A check that needs an
importer value or a project setting is an EDITOR rule: add it to
`editor_audit.cs` under the same ID, or the lint fails.
