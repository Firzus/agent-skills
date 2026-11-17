#!/usr/bin/env python3
"""Deterministic first pass of unity-performance.

Reads every rule in ../rules/*.md, applies each text pattern to the review
target (the added lines of a diff, or whole files), and prints the hits with
their enclosing C# method and its context (frame, init, other, editor, asset).
It also lists ABSENT and MANUAL rules, emits the Editor audit script for
EDITOR rules, applies the project's overrides to the audit's result, and prints
a coverage section the report copies verbatim.

Usage:
  python scan.py --project <unity-project> [--diff <base> | --paths <path>...]
                 [--editor-audit <out.cs>] [--json] [--fail-on Critical]
  python scan.py --project <unity-project> --audit-result <audit.json>
  python scan.py --lint

Requires Python 3.11+ (tomllib). Standard library only.
"""
from __future__ import annotations

import argparse
import codecs
import fnmatch
import json
import os
import re
import subprocess
import sys
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
RULES_DIR = SKILL_DIR / "rules"
AUDIT_TEMPLATE = Path(__file__).resolve().parent / "editor_audit.cs"
CONFIG_NAME = ".unity-performance.toml"

LEVELS = ("Critical", "Warning", "Info")
LEVEL_RANK = {"Critical": 3, "Warning": 2, "Info": 1, "Skip": 0}
TAGS = ("urp", "addressables", "il2cpp", "android", "ios", "web", "vat")
PLATFORMS = ("android", "ios", "web", "desktop")
CONTEXTS = ("frame", "init", "other", "editor", "asset")
CONTEXT_ORDER = {"frame": 0, "other": 1, "asset": 1, "init": 2, "editor": 3}
CODE_SCOPES = ("runtime", "editor", "any")
# Generated folders exist only at the project root; a folder with the same name
# deeper in Assets/ is ordinary content.
ROOT_SKIP_DIRS = {"Library", "Temp", "obj", "Logs", "UserSettings", "Build", "Builds"}
MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_HITS_SHOWN = 25

# Files the Editor audit inspects through their importer; a change to the asset
# or to its .meta queues the asset for the audit.
IMPORTED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".tga", ".psd", ".exr", ".hdr", ".tif", ".tiff", ".bmp", ".gif",
    ".fbx", ".obj", ".blend", ".dae", ".3ds", ".max", ".ma", ".mb",
    ".wav", ".mp3", ".ogg", ".aif", ".aiff", ".flac",
}

FRAME_METHODS = {
    "Update", "LateUpdate", "FixedUpdate", "OnGUI", "OnRenderObject", "OnWillRenderObject",
    "OnPreRender", "OnPostRender", "OnPreCull", "OnBecameVisible", "OnAnimatorMove", "OnAnimatorIK",
    "OnTriggerStay", "OnTriggerStay2D", "OnCollisionStay", "OnCollisionStay2D", "Tick", "Execute",
}
INIT_METHODS = {"Awake", "Start", "OnEnable", "OnValidate", "Reset", "OnDisable", "OnDestroy"}
INIT_PREFIXES = ("Init", "Initialize", "Setup", "SetUp", "Bootstrap")
NOT_METHOD_NAMES = {
    "if", "for", "foreach", "while", "switch", "catch", "using", "lock", "return", "new",
    "nameof", "typeof", "sizeof", "default", "when", "fixed", "checked", "unchecked",
}
NOT_TYPE_TOKENS = {"return", "new", "await", "throw", "else", "case", "yield", "in", "is", "as", "out", "ref"}
METHOD_HEADER = re.compile(
    r"^\s*(?:\[[^\]]*\]\s*)*"
    r"(?:(?:public|private|protected|internal|static|virtual|override|async|sealed|unsafe|extern|new|abstract|partial|readonly)\s+)*"
    r"([\w.]+(?:<[^()]*>)?(?:\[\])*\??)\s+(\w+)\s*(?:<[^()]*>)?\s*\("
)
STRING_LITERAL = re.compile(r'@"(?:[^"]|"")*"|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])\'')


@dataclass
class Rule:
    id: str
    title: str
    file: str
    level: str = ""
    scope: str = "any"
    when: str = "-"
    files: list[str] = field(default_factory=list)
    code: str = "runtime"
    check: str = ""
    kind: str = ""
    pattern: re.Pattern | None = None
    errors: list[str] = field(default_factory=list)


def parse_rules() -> list[Rule]:
    rules: list[Rule] = []
    for path in sorted(RULES_DIR.glob("*.md")):
        current: Rule | None = None
        for raw in path.read_text(encoding="utf-8").splitlines():
            heading = re.match(r"^###\s+([A-Z]{2}\d{2})\s+(.+?)\s*$", raw)
            if heading:
                current = Rule(id=heading.group(1), title=heading.group(2), file=path.name)
                rules.append(current)
                continue
            if raw.startswith(("## ", "# ")):
                current = None
                continue
            if current is None:
                continue
            item = re.match(r"^- (Level|Scope|When|Files|Code|Check):\s*(.*?)\s*$", raw)
            if not item:
                continue
            key, value = item.group(1), item.group(2)
            if key == "Level":
                current.level = value
            elif key == "Scope":
                current.scope = value
            elif key == "When":
                current.when = value or "-"
            elif key == "Files":
                current.files = [g.strip().strip("`") for g in value.split(",") if g.strip()]
            elif key == "Code":
                current.code = value
            elif key == "Check":
                current.check = value
    for rule in rules:
        validate(rule)
    return rules


def validate(rule: Rule) -> None:
    if rule.level not in LEVELS:
        rule.errors.append(f"Level must be one of {LEVELS}, got {rule.level!r}")
    if rule.scope not in ("frame", "any"):
        rule.errors.append(f"Scope must be frame or any, got {rule.scope!r}")
    if rule.code not in CODE_SCOPES:
        rule.errors.append(f"Code must be one of {CODE_SCOPES}, got {rule.code!r}")
    if rule.when != "-":
        for tag in re.split(r"[|,]", rule.when):
            if tag.strip() not in TAGS:
                rule.errors.append(f"unknown When tag {tag.strip()!r}")
    check = rule.check
    if check == "MANUAL":
        rule.kind = "manual"
    elif check == "EDITOR":
        rule.kind = "editor"
    else:
        absent = check.startswith("ABSENT ")
        body = check[len("ABSENT "):] if absent else check
        if not (body.startswith("`") and body.endswith("`") and len(body) > 2):
            rule.errors.append("Check must be `regex`, ABSENT `regex`, MANUAL, or EDITOR")
            return
        rule.kind = "absent" if absent else "pattern"
        try:
            rule.pattern = re.compile(body[1:-1])
        except re.error as exc:
            rule.errors.append(f"regex does not compile: {exc}")
    if rule.kind in ("pattern", "absent", "manual") and not rule.files:
        rule.errors.append("Files is required for pattern, ABSENT, and MANUAL rules")


def lint(rules: list[Rule]) -> int:
    problems = 0
    seen: dict[str, str] = {}
    for rule in rules:
        if rule.id in seen:
            print(f"{rule.file}: {rule.id} duplicates the ID in {seen[rule.id]}")
            problems += 1
        seen[rule.id] = rule.file
        for error in rule.errors:
            print(f"{rule.file}: {rule.id}: {error}")
            problems += 1
    template = AUDIT_TEMPLATE.read_text(encoding="utf-8") if AUDIT_TEMPLATE.exists() else ""
    editor_ids = {r.id for r in rules if r.kind == "editor"}
    for rule in rules:
        if rule.kind == "editor" and f'"{rule.id}"' not in template:
            print(f"{rule.file}: {rule.id}: EDITOR rule has no check in {AUDIT_TEMPLATE.name}")
            problems += 1
    for rid in sorted(set(re.findall(r'Report\("([A-Z]{2}\d{2})"', template)) - editor_ids):
        print(f"{AUDIT_TEMPLATE.name}: reports {rid}, which is not an EDITOR rule")
        problems += 1
    print(f"{len(rules)} rules, {problems} problem(s)")
    return 1 if problems else 0


def load_config(project: Path) -> dict:
    path = project / CONFIG_NAME
    if not path.exists():
        return {}
    try:
        with path.open("rb") as handle:
            config = tomllib.load(handle)
    except tomllib.TOMLDecodeError as exc:
        sys.exit(f"{path}: {exc}")
    problems = []
    for platform in config.get("platforms", []):
        if str(platform).lower() not in PLATFORMS:
            problems.append(f"platforms: {platform!r} is not one of {PLATFORMS}")
    overrides = config.get("override", [])
    if not isinstance(overrides, list):
        problems.append("write each override as an [[override]] array entry, not an [override] table")
        overrides = []
    for index, entry in enumerate(overrides, start=1):
        if not isinstance(entry, dict):
            problems.append(f"override {index}: write it as an [[override]] table with rule and level")
            continue
        if not entry.get("rule"):
            problems.append(f"override {index}: rule is required")
        if entry.get("level") not in ("Critical", "Warning", "Info", "Skip"):
            problems.append(f"override {index}: level must be Critical, Warning, Info, or Skip")
        if "context" in entry and entry["context"] not in CONTEXTS:
            problems.append(f"override {index}: context must be one of {CONTEXTS}")
        if "paths" in entry and not (isinstance(entry["paths"], list) and all(isinstance(g, str) for g in entry["paths"])):
            problems.append(f"override {index}: paths must be a list of glob strings")
    thresholds = config.get("thresholds", {})
    if not isinstance(thresholds, dict):
        problems.append("thresholds must be a [thresholds] table")
        thresholds = {}
    for key, value in thresholds.items():
        if key not in ("max_texture_size", "max_mesh_vertices", "long_audio_seconds"):
            problems.append(f"thresholds: unknown key {key!r}")
        elif isinstance(value, bool) or not isinstance(value, (int, float)):
            problems.append(f"thresholds: {key} must be a number")
    if problems:
        sys.exit(f"{path}:\n  " + "\n  ".join(problems))
    return config


def detect_env(project: Path, config: dict) -> dict:
    env: dict[str, bool | None] = {tag: None for tag in TAGS}
    manifest = project / "Packages" / "manifest.json"
    if manifest.exists():
        deps = json.loads(manifest.read_text(encoding="utf-8")).get("dependencies", {})
        env["urp"] = "com.unity.render-pipelines.universal" in deps
        env["addressables"] = "com.unity.addressables" in deps
    platforms = config.get("platforms")
    if platforms is not None:
        names = {p.lower() for p in platforms}
        for tag in ("android", "ios", "web"):
            env[tag] = tag in names
        env["il2cpp"] = bool(names & {"android", "ios", "web"})
    for tag in ("urp", "addressables", "vat"):
        if tag in config:
            env[tag] = bool(config[tag])
    return env


def applies(rule: Rule, env: dict) -> bool:
    """False only when the environment clearly rules the rule out; unknown keeps it."""
    if rule.when == "-":
        return True
    return any(all(env.get(tag.strip()) is not False for tag in group.split(","))
               for group in rule.when.split("|"))


def unity_version(project: Path) -> str:
    version_file = project / "ProjectSettings" / "ProjectVersion.txt"
    if version_file.exists():
        match = re.search(r"m_EditorVersion:\s*(\S+)", version_file.read_text(encoding="utf-8"))
        if match:
            return match.group(1)
    return "unknown"


def skipped(rel: str) -> bool:
    parts = rel.split("/")
    return parts[0] in ROOT_SKIP_DIRS or ".git" in parts


def git(project: Path, *args: str) -> str:
    result = subprocess.run(["git", "-c", "core.quotePath=false", "-C", str(project), *args],
                            capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        sys.exit(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout


def diff_targets(project: Path, base: str) -> tuple[dict[str, set[int] | None], str]:
    """Changed files relative to the project, each with its added line numbers.

    Diffs from the merge base, so commits the base branch gained since the
    branch point do not show up as changes of the branch.
    """
    merge_base = git(project, "merge-base", base, "HEAD").strip()
    targets: dict[str, set[int] | None] = {}
    # --name-only lists binary and deletion-only changes, which the patch below
    # gives no added line for; they still reach the Editor audit and MANUAL rules.
    for name in git(project, "diff", "--relative", "--name-only", "-z", "--diff-filter=d", merge_base).split("\0"):
        if name:
            targets[name] = set()
    current = None
    line_no = 0
    for raw in git(project, "diff", "--relative", "--unified=0", "--no-color", "--no-ext-diff",
                   "--diff-filter=d", merge_base).splitlines():
        if raw.startswith("+++ "):
            name = raw[4:].rstrip("\t")
            current = name[2:] if name.startswith("b/") else None
            if current is not None:
                targets.setdefault(current, set())
            continue
        hunk = re.match(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@", raw)
        if hunk:
            line_no = int(hunk.group(1))
            continue
        if current is None or raw.startswith("---"):
            continue
        if raw.startswith("+"):
            targets[current].add(line_no)
            line_no += 1
    for name in git(project, "ls-files", "--others", "--exclude-standard", "-z").split("\0"):
        if name:
            targets[name] = None
    filtered = {name: lines for name, lines in targets.items() if not skipped(name)}
    return filtered, merge_base


def normalize_paths(project: Path, paths: list[str]) -> list[str]:
    normalized = []
    for given in paths:
        resolved = (project / given.replace("\\", "/")).resolve()
        if resolved != project and project not in resolved.parents:
            sys.exit(f"{given} is outside the project")
        if not resolved.exists():
            sys.exit(f"{given} does not exist in the project")
        normalized.append(resolved.relative_to(project).as_posix() if resolved != project else ".")
    return normalized


def walk_files(project: Path, start: Path) -> list[str]:
    """Project-relative files under start, pruning generated folders before descending."""
    found = []
    for directory, dirs, files in os.walk(start):
        rel_dir = Path(directory).relative_to(project).as_posix()
        dirs[:] = [d for d in dirs if not skipped(d if rel_dir == "." else f"{rel_dir}/{d}")]
        for name in files:
            rel = name if rel_dir == "." else f"{rel_dir}/{name}"
            if not skipped(rel):
                found.append(rel)
    return found


def path_targets(project: Path, paths: list[str]) -> dict[str, set[int] | None]:
    targets: dict[str, set[int] | None] = {}
    for rel in paths:
        root = project / rel
        for name in ([rel] if root.is_file() else walk_files(project, root)):
            targets[name] = None
    return targets


def matches_files(rel: str, globs: list[str]) -> bool:
    name = rel.rsplit("/", 1)[-1]
    return any(fnmatch.fnmatch(name, g) or fnmatch.fnmatch(rel, g) for g in globs)


def is_editor_path(rel: str) -> bool:
    return any(p in ("Editor", "Tests", "Test", "EditorTests") for p in rel.split("/")[:-1])


def classify_method(name: str | None) -> str:
    if not name:
        return "other"
    if name in FRAME_METHODS or name.endswith("Update"):
        return "frame"
    if name in INIT_METHODS or name.startswith(INIT_PREFIXES):
        return "init"
    return "other"


def csharp_line_contexts(lines: list[str]) -> list[tuple[str | None, bool]]:
    """For each line: the enclosing method name and whether it sits in #if UNITY_EDITOR."""
    contexts: list[tuple[str | None, bool]] = []
    depth = 0
    frames: list[tuple[int, str]] = []
    pending: str | None = None
    expression: str | None = None
    preprocessor: list[bool] = []
    in_block_comment = False
    for raw in lines:
        directive = re.match(r"#\s*(if|elif|else|endif)\b(.*)", raw.strip())
        if directive:
            kind, cond = directive.groups()
            if kind == "if":
                preprocessor.append("UNITY_EDITOR" in cond and "!UNITY_EDITOR" not in cond.replace(" ", ""))
            elif kind in ("elif", "else") and preprocessor:
                preprocessor[-1] = False
            elif kind == "endif" and preprocessor:
                preprocessor.pop()
        editor = any(preprocessor)
        code = raw
        if in_block_comment:
            end = code.find("*/")
            if end < 0:
                contexts.append((expression or (frames[-1][1] if frames else None), editor))
                continue
            code = code[end + 2:]
            in_block_comment = False
        code = STRING_LITERAL.sub('""', code)
        code = re.sub(r"/\*.*?\*/", "", code)
        if "/*" in code:
            code = code[: code.index("/*")]
            in_block_comment = True
        code = code.split("//", 1)[0]
        header = METHOD_HEADER.match(code)
        if header and header.group(1) not in NOT_TYPE_TOKENS and header.group(2) not in NOT_METHOD_NAMES:
            if "=>" in code:
                expression = header.group(2)
                pending = None
            elif not code.rstrip().endswith(";"):
                pending = header.group(2)
        elif pending and code.lstrip().startswith("=>"):
            expression, pending = pending, None
        elif pending and code.rstrip().endswith(";"):
            pending = None
        contexts.append((expression or (frames[-1][1] if frames else None) or pending, editor))
        if expression and ";" in code:
            expression = None
        for char in code:
            if char == "{":
                depth += 1
                if pending:
                    frames.append((depth, pending))
                    pending = None
            elif char == "}":
                if frames and frames[-1][0] == depth:
                    frames.pop()
                depth = max(0, depth - 1)
    return contexts


def read_lines(path: Path) -> list[str] | None:
    try:
        if path.stat().st_size > MAX_FILE_BYTES:
            return None
        return path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return None


def override_level(config: dict, rule_id: str, level: str, rel: str, context: str) -> tuple[str, str | None]:
    reason = None
    for entry in config.get("override", []):
        if entry.get("rule") != rule_id:
            continue
        if "context" in entry and entry["context"] != context:
            continue
        if "paths" in entry and not any(fnmatch.fnmatch(rel, g) for g in entry["paths"]):
            continue
        wanted = entry.get("level", level)
        if LEVEL_RANK[wanted] < LEVEL_RANK[level]:
            level, reason = wanted, entry.get("reason", "override")
    return level, reason


def scan(project: Path, targets: dict[str, set[int] | None], rules: list[Rule], env: dict, config: dict) -> dict:
    active = [r for r in rules if not r.errors and applies(r, env)]
    skipped_env = [r.id for r in rules if not r.errors and not applies(r, env)]
    broken = [r.id for r in rules if r.errors]
    hits: dict[str, list[dict]] = {}
    overridden: dict[str, int] = {}
    files_scanned = 0

    for rel, added in sorted(targets.items()):
        path = project / rel
        if not path.is_file() or (added is not None and not added):
            continue
        relevant = [r for r in active if r.kind == "pattern" and matches_files(rel, r.files)]
        if not relevant:
            continue
        lines = read_lines(path)
        if lines is None:
            continue
        files_scanned += 1
        is_cs = rel.endswith(".cs")
        contexts = csharp_line_contexts(lines) if is_cs else [(None, False)] * len(lines)
        editor_file = is_editor_path(rel)
        for rule in relevant:
            for index, text in enumerate(lines, start=1):
                if added is not None and index not in added:
                    continue
                if is_cs and text.lstrip().startswith(("//", "*")):
                    continue
                if not rule.pattern.search(text):
                    continue
                method, editor_block = contexts[index - 1]
                editor = is_cs and (editor_file or editor_block)
                if is_cs and rule.code == "runtime" and editor:
                    continue
                if is_cs and rule.code == "editor" and not editor:
                    continue
                context = ("editor" if editor else classify_method(method)) if is_cs else "asset"
                level, reason = override_level(config, rule.id, rule.level, rel, context)
                if rule.scope == "frame" and context == "init" and reason is None and LEVEL_RANK[level] > LEVEL_RANK["Info"]:
                    level, reason = "Info", "runs at initialization, not per frame"
                if level == "Skip":
                    overridden[rule.id] = overridden.get(rule.id, 0) + 1
                    continue
                hits.setdefault(rule.id, []).append({
                    "path": rel, "line": index, "method": method, "context": context,
                    "level": level, "note": reason, "text": text.strip()[:160],
                })

    hit_totals = {rid: len(bucket) for rid, bucket in hits.items()}
    top_levels = {rid: max(bucket, key=lambda h: LEVEL_RANK[h["level"]])["level"] for rid, bucket in hits.items()}
    for rid, bucket in hits.items():
        bucket.sort(key=lambda h: (-LEVEL_RANK[h["level"]], CONTEXT_ORDER[h["context"]], h["path"], h["line"]))
        del bucket[MAX_HITS_SHOWN:]

    absent_rules = [r for r in active if r.kind == "absent"]
    absent = []
    if absent_rules:
        project_files = walk_files(project, project)
        for rule in absent_rules:
            candidates = (project / rel for rel in project_files if matches_files(rel, rule.files))
            if not any(any(rule.pattern.search(line) for line in (read_lines(p) or [])) for p in candidates):
                absent.append(rule.id)

    touched = list(targets)
    manual = [r.id for r in active if r.kind == "manual" and any(matches_files(t, r.files) for t in touched)]
    editor_rules = [r.id for r in active if r.kind == "editor"]
    audit_assets = sorted({
        (t[:-5] if t.endswith(".meta") else t)
        for t in touched
        if Path(t[:-5] if t.endswith(".meta") else t).suffix.lower() in IMPORTED_EXTENSIONS
    })

    return {
        "rules_total": len(rules), "rules_active": len(active), "rules_broken": broken,
        "skipped_env": skipped_env, "files_targeted": len(targets), "files_scanned": files_scanned,
        "hits": hits, "hit_totals": hit_totals, "top_levels": top_levels, "overridden": overridden,
        "absent": absent, "manual": manual, "editor_rules": editor_rules, "audit_assets": audit_assets,
    }


def emit_audit(project: Path, out: Path, result: dict, config: dict, paths: list[str] | None) -> None:
    template = AUDIT_TEMPLATE.read_text(encoding="utf-8")
    thresholds = config.get("thresholds", {})
    configured = config.get("platforms")
    platforms = [p.lower() for p in configured] if configured is not None else list(PLATFORMS)
    if paths is None:
        files, folders = result["audit_assets"], []
    else:
        files = [p for p in paths if (project / p).is_file()]
        folders = [p for p in paths if (project / p).is_dir() and p.split("/")[0] in ("Assets", "Packages")]
        if "." in paths:
            folders.append("Assets")
    replacements = {
        "ASSETS": ", ".join(json.dumps(v) for v in files),
        "FOLDERS": ", ".join(json.dumps(v) for v in folders),
        "PLATFORMS": ", ".join(json.dumps(v) for v in platforms),
        "MAX_TEXTURE_SIZE": str(int(thresholds.get("max_texture_size", 2048))),
        "MAX_MESH_VERTICES": str(int(thresholds.get("max_mesh_vertices", 65535))),
        "LONG_AUDIO_SECONDS": f"{float(thresholds.get('long_audio_seconds', 10.0))}f",
    }
    for name, value in replacements.items():
        # A marker may carry the template's default right after it; the value replaces both.
        template, count = re.subn(r"/\*" + name + r"\*/[^;,}\s]*", lambda _: value, template)
        if count != 1:
            sys.exit(f"{AUDIT_TEMPLATE.name}: expected one /*{name}*/ marker, found {count}")
    out.write_text(template, encoding="utf-8")


def audit_report(audit_file: Path, rules: list[Rule], config: dict) -> str:
    """Applies the project's overrides to the Editor audit's JSON and renders it."""
    data_bytes = audit_file.read_bytes()
    # Windows PowerShell 5.1 redirects output as UTF-16 with a byte order mark.
    encoding = "utf-16" if data_bytes.startswith((codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE)) else "utf-8-sig"
    raw = data_bytes.decode(encoding).strip()
    data = json.loads(raw)
    # `unity command eval_file --result-only` prints the script's string result as a JSON string.
    if isinstance(data, str):
        data = json.loads(data)
    if isinstance(data, dict) and "findings" not in data and isinstance(data.get("result"), str):
        data = json.loads(data["result"])
    by_id = {r.id: r for r in rules}
    rows, skipped_count = [], 0
    for finding in data.get("findings", []):
        rule = by_id.get(finding["rule"])
        level = rule.level if rule else "Warning"
        level, reason = override_level(config, finding["rule"], level, finding["path"], "asset")
        if level == "Skip":
            skipped_count += 1
            continue
        rows.append((finding, level, reason))
    rows.sort(key=lambda r: (-LEVEL_RANK[r[1]], r[0]["rule"], r[0]["path"]))
    out = ["# unity-performance Editor audit", ""]
    out.append(f"- Unity {data.get('unity', 'unknown')}; platforms {', '.join(data.get('platforms', [])) or 'none'}")
    checked = data.get("checked", {})
    out.append("- Checked: " + ", ".join(f"{k.replace('_', ' ')} {v}" for k, v in checked.items()))
    out.append(f"- Findings: {len(rows)} reported, {skipped_count} skipped by override")
    out.append("")
    if rows:
        out.append("| Rule | Level | Path | Platform | Detail |")
        out.append("| --- | --- | --- | --- | --- |")
        for finding, level, reason in rows:
            title = by_id[finding["rule"]].title if finding["rule"] in by_id else ""
            shown = level + (f" ({reason})" if reason else "")
            out.append(f"| {finding['rule']} {title} | {shown} | `{finding['path']}` | {finding['platform']} | {finding['detail']} |")
    for note in data.get("notes", []):
        out.append(f"- Note: {note}")
    return "\n".join(out) + "\n"


def render_markdown(project: Path, mode: str, result: dict, env: dict, rules: list[Rule], audit_out: str | None) -> str:
    by_id = {r.id: r for r in rules}
    out = ["# unity-performance scan", ""]
    out.append(f"- Project: `{project}` (Unity {unity_version(project)})")
    out.append(f"- Target: {mode}; {result['files_targeted']} file(s), {result['files_scanned']} scanned for patterns")
    env_text = ", ".join(f"{k}={'unknown' if v is None else 'yes' if v else 'no'}" for k, v in env.items())
    out.append(f"- Environment: {env_text}")
    out.append("")
    out.append("## Pattern hits")
    out.append("")
    if not result["hits"]:
        out.append("None.")
    order = sorted(result["hits"], key=lambda rid: (-LEVEL_RANK[result["top_levels"][rid]], rid))
    for rid in order:
        rule = by_id[rid]
        total = result["hit_totals"][rid]
        shown = len(result["hits"][rid])
        more = f", first {shown} shown" if total > shown else ""
        out.append(f"### {rid} {rule.title} [{rule.level}] (rules/{rule.file}, {total} hit(s){more})")
        out.append("")
        out.append("| Location | Method | Context | Level | Line |")
        out.append("| --- | --- | --- | --- | --- |")
        for h in result["hits"][rid]:
            level = h["level"] + (f" ({h['note']})" if h["note"] else "")
            text = h["text"].replace("|", "\\|").replace("`", "'")
            out.append(f"| `{h['path']}:{h['line']}` | {h['method'] or '-'} | {h['context']} | {level} | `{text}` |")
        out.append("")
    out.append("## ABSENT rules with no match in the project")
    out.append("")
    out.append(", ".join(f"{rid} {by_id[rid].title}" for rid in result["absent"]) or "None.")
    out.append("")
    out.append("## MANUAL rules for the touched file types")
    out.append("")
    out.append(", ".join(f"{rid} {by_id[rid].title}" for rid in result["manual"]) or "None.")
    out.append("")
    out.append("## Editor audit")
    out.append("")
    queued = f"{len(result['audit_assets'])} changed asset(s)" if mode.startswith("diff") else "the assets under the given paths"
    if audit_out:
        out.append(f"Script written to `{audit_out}` for {len(result['editor_rules'])} EDITOR rule(s), "
                   f"auditing {queued} and the project settings.")
    else:
        out.append(f"{len(result['editor_rules'])} EDITOR rule(s) need the Editor audit (`--editor-audit <out.cs>`), "
                   f"which would audit {queued} and the project settings.")
    out.append("")
    out.append("## Coverage (generated)")
    out.append("")
    total_hits = sum(result["hit_totals"].values())
    out.append(f"- Rules: {result['rules_total']} loaded, {result['rules_active']} in scope")
    out.append(f"- Skipped by environment: {len(result['skipped_env'])} ({', '.join(result['skipped_env']) or 'none'})")
    out.append(f"- Skipped by override: {sum(result['overridden'].values())} hit(s) "
               f"({', '.join(f'{k}x{v}' for k, v in result['overridden'].items()) or 'none'})")
    if result["rules_broken"]:
        out.append(f"- Rules with format errors, not run: {', '.join(result['rules_broken'])} (run --lint)")
    out.append(f"- Pattern hits: {total_hits} in {len(result['hits'])} rule(s)")
    out.append(f"- ABSENT candidates: {len(result['absent'])}; MANUAL rules listed: {len(result['manual'])}; "
               f"EDITOR rules: {len(result['editor_rules'])}")
    return "\n".join(out) + "\n"


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--project", default=".", help="Unity project root (holds Assets/)")
    target = parser.add_mutually_exclusive_group()
    target.add_argument("--diff", metavar="BASE", help="scan lines added since the merge base with BASE (default HEAD)")
    target.add_argument("--paths", nargs="+", metavar="PATH", help="scan whole files or folders, relative to the project")
    target.add_argument("--audit-result", metavar="JSON", help="apply overrides to the Editor audit's output and print it")
    parser.add_argument("--json", action="store_true", help="print JSON instead of Markdown")
    parser.add_argument("--editor-audit", metavar="OUT", help="write the Editor audit script to OUT (outside Assets/)")
    parser.add_argument("--fail-on", choices=LEVELS, help="exit 1 when a pattern hit reaches this level")
    parser.add_argument("--lint", action="store_true", help="validate the rule files and exit")
    args = parser.parse_args()

    rules = parse_rules()
    if args.lint:
        return lint(rules)

    project = Path(args.project).resolve()
    if not (project / "Assets").is_dir():
        sys.exit(f"{project} has no Assets folder; pass --project <unity-project-root>")
    config = load_config(project)
    if args.audit_result:
        print(audit_report(Path(args.audit_result), rules, config), end="")
        return 0
    env = detect_env(project, config)
    paths = normalize_paths(project, args.paths) if args.paths else None
    if paths is not None:
        targets, mode = path_targets(project, paths), f"paths {' '.join(paths)}"
    else:
        base = args.diff or "HEAD"
        targets, merge_base = diff_targets(project, base)
        mode = f"diff from the merge base of {base} ({merge_base[:10]}); added lines, untracked files whole"
    result = scan(project, targets, rules, env, config)
    if args.editor_audit:
        out = Path(args.editor_audit).resolve()
        if (project / "Assets") in out.parents:
            sys.exit("write the Editor audit outside Assets/, or Unity imports and compiles it")
        emit_audit(project, out, result, config, paths)
    if args.json:
        print(json.dumps({"project": str(project), "unity": unity_version(project), "target": mode,
                          "environment": env, **result}, indent=2))
    else:
        print(render_markdown(project, mode, result, env, rules, args.editor_audit), end="")
    if args.fail_on and any(LEVEL_RANK[level] >= LEVEL_RANK[args.fail_on] for level in result["top_levels"].values()):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
