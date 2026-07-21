#!/usr/bin/env python3
"""Scan a web project for image, video, animated, font, and SVG assets and references.

This script is intentionally stdlib-only so agents can run it in most projects
without installing dependencies. It does not modify files.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import struct
import sys
from pathlib import Path
from typing import Any

IMAGE_EXTENSIONS = {".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v", ".ogv", ".avi"}
FONT_EXTENSIONS = {".woff2", ".woff", ".ttf", ".otf", ".eot"}
SCANNED_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS | FONT_EXTENSIONS
LEGACY_FONT_EXTENSIONS = {".woff", ".ttf", ".otf", ".eot"}
REFERENCE_EXTENSIONS = {
    ".astro",
    ".css",
    ".htm",
    ".html",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".mdx",
    ".scss",
    ".svelte",
    ".ts",
    ".tsx",
    ".vue",
}
MANIFEST_FILENAMES = {"manifest.json", "site.webmanifest"}
IGNORE_DIRS = {
    ".git",
    ".hg",
    ".next",
    ".nuxt",
    ".output",
    ".svelte-kit",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "out",
}
ASSET_TOKEN_RE = re.compile(
    r"(?P<path>(?:https?:)?//[^\s'\"()<>]+?\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm|mov|m4v|ogv|avi|woff2?|ttf|otf|eot)(?:\?[^\s'\"()<>]+)?|[./@A-Za-z0-9_-][^\s'\"()<>]*?\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm|mov|m4v|ogv|avi|woff2?|ttf|otf|eot)(?:\?[^\s'\"()<>]+)?)",
    re.IGNORECASE,
)


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def should_skip_dir(path: Path) -> bool:
    return path.name in IGNORE_DIRS or path.name.startswith(".cache")


def iter_files(root: Path):
    for current_root, dirs, files in os.walk(root):
        current_path = Path(current_root)
        dirs[:] = [dirname for dirname in dirs if not should_skip_dir(current_path / dirname)]
        for filename in files:
            yield current_path / filename


def read_size(path: Path) -> int:
    try:
        return path.stat().st_size
    except OSError:
        return 0


def png_dimensions(data: bytes) -> tuple[int, int] | None:
    if len(data) >= 24 and data.startswith(b"\x89PNG\r\n\x1a\n"):
        return struct.unpack(">II", data[16:24])
    return None


def jpeg_dimensions(path: Path) -> tuple[int, int] | None:
    try:
        with path.open("rb") as file:
            if file.read(2) != b"\xff\xd8":
                return None
            while True:
                marker_start = file.read(1)
                if not marker_start:
                    return None
                if marker_start != b"\xff":
                    continue
                marker = file.read(1)
                while marker == b"\xff":
                    marker = file.read(1)
                if marker in {b"\xd8", b"\xd9"}:
                    continue
                length_bytes = file.read(2)
                if len(length_bytes) != 2:
                    return None
                segment_length = struct.unpack(">H", length_bytes)[0]
                if segment_length < 2:
                    return None
                if marker and marker[0] in list(range(0xC0, 0xC4)) + list(range(0xC5, 0xC8)) + list(range(0xC9, 0xCC)) + list(range(0xCD, 0xD0)):
                    data = file.read(5)
                    if len(data) != 5:
                        return None
                    height, width = struct.unpack(">HH", data[1:5])
                    return width, height
                file.seek(segment_length - 2, os.SEEK_CUR)
    except OSError:
        return None


def webp_dimensions(data: bytes) -> tuple[int, int] | None:
    if len(data) < 30 or data[0:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    chunk = data[12:16]
    if chunk == b"VP8X" and len(data) >= 30:
        width = 1 + int.from_bytes(data[24:27], "little")
        height = 1 + int.from_bytes(data[27:30], "little")
        return width, height
    if chunk == b"VP8 " and len(data) >= 30:
        start = data.find(b"\x9d\x01\x2a", 20)
        if start != -1 and len(data) >= start + 7:
            width = struct.unpack("<H", data[start + 3 : start + 5])[0] & 0x3FFF
            height = struct.unpack("<H", data[start + 5 : start + 7])[0] & 0x3FFF
            return width, height
    if chunk == b"VP8L" and len(data) >= 25:
        bits = int.from_bytes(data[21:25], "little")
        width = (bits & 0x3FFF) + 1
        height = ((bits >> 14) & 0x3FFF) + 1
        return width, height
    return None


def gif_dimensions(data: bytes) -> tuple[int, int] | None:
    if len(data) >= 10 and data[:6] in (b"GIF87a", b"GIF89a"):
        return struct.unpack("<HH", data[6:10])
    return None


def _gif_skip_sub_blocks(data: bytes, pos: int) -> int:
    while True:
        size = data[pos]
        pos += 1
        if size == 0:
            return pos
        pos += size


def gif_is_animated(path: Path) -> bool:
    """Walk the GIF block structure and report whether it holds more than one image."""
    try:
        data = path.read_bytes()
        if data[:6] not in (b"GIF87a", b"GIF89a"):
            return False
        packed = data[10]
        pos = 13
        if packed & 0x80:
            pos += 3 * (2 << (packed & 0x07))
        image_count = 0
        while pos < len(data):
            block = data[pos]
            pos += 1
            if block == 0x3B:
                break
            if block == 0x21:
                pos += 1
                pos = _gif_skip_sub_blocks(data, pos)
            elif block == 0x2C:
                image_count += 1
                local_packed = data[pos + 8]
                pos += 9
                if local_packed & 0x80:
                    pos += 3 * (2 << (local_packed & 0x07))
                pos += 1
                pos = _gif_skip_sub_blocks(data, pos)
            else:
                return False
        return image_count > 1
    except (OSError, IndexError):
        return False


def svg_dimensions(text: str) -> tuple[int, int] | None:
    width_match = re.search(r'\bwidth=["\']([0-9.]+)', text)
    height_match = re.search(r'\bheight=["\']([0-9.]+)', text)
    if width_match and height_match:
        return int(float(width_match.group(1))), int(float(height_match.group(1)))
    viewbox_match = re.search(r'\bviewBox=["\']\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)', text)
    if viewbox_match:
        return int(float(viewbox_match.group(1))), int(float(viewbox_match.group(2)))
    return None


def dimensions(path: Path) -> dict[str, int] | None:
    suffix = path.suffix.lower()
    if suffix in VIDEO_EXTENSIONS or suffix in FONT_EXTENSIONS:
        return None
    try:
        if suffix in {".jpg", ".jpeg"}:
            dims = jpeg_dimensions(path)
        elif suffix == ".svg":
            dims = svg_dimensions(path.read_text(encoding="utf-8", errors="ignore"))
        else:
            data = path.read_bytes()[:512]
            if suffix == ".png":
                dims = png_dimensions(data)
            elif suffix == ".webp":
                dims = webp_dimensions(data)
            elif suffix == ".gif":
                dims = gif_dimensions(data)
            else:
                dims = None
    except OSError:
        dims = None
    if not dims:
        return None
    return {"width": dims[0], "height": dims[1]}


def _append_hint(asset: dict[str, Any], hint: str) -> None:
    if hint not in asset["usageHints"]:
        asset["usageHints"].append(hint)


def _looks_like_logo(path: str) -> bool:
    name = Path(path).stem.lower()
    return any(token in name for token in ("logo", "brand", "wordmark"))


def asset_type(suffix: str) -> str:
    if suffix == ".svg":
        return "svg"
    if suffix == ".gif":
        return "gif"
    if suffix in VIDEO_EXTENSIONS:
        return "video"
    if suffix in FONT_EXTENSIONS:
        return "font"
    return "image"


def collect_assets(root: Path) -> dict[str, dict[str, Any]]:
    assets: dict[str, dict[str, Any]] = {}
    for path in iter_files(root):
        suffix = path.suffix.lower()
        if suffix not in SCANNED_EXTENSIONS:
            continue
        relative_path = rel(path, root)
        asset: dict[str, Any] = {
            "path": relative_path,
            "extension": suffix.lstrip("."),
            "type": asset_type(suffix),
            "bytes": read_size(path),
            "dimensions": dimensions(path),
            "references": [],
            "usageHints": [],
        }
        if _looks_like_logo(relative_path):
            _append_hint(asset, "logo")
        if suffix == ".gif" and gif_is_animated(path):
            _append_hint(asset, "animated")
        if suffix in LEGACY_FONT_EXTENSIONS:
            _append_hint(asset, "legacy-font-format")
        assets[relative_path] = asset
    return assets


def normalize_candidate(candidate: str) -> str:
    return candidate.split("?", 1)[0].split("#", 1)[0]


def possible_local_keys(candidate: str, source_path: str) -> set[str]:
    clean = normalize_candidate(candidate)
    if clean.startswith("http://") or clean.startswith("https://") or clean.startswith("//"):
        return set()

    keys = {clean.lstrip("/")}
    if clean.startswith("./"):
        keys.add(clean[2:])

    source_parent = Path(source_path).parent
    try:
        relative_to_source = (source_parent / clean).as_posix()
    except ValueError:
        relative_to_source = clean
    keys.add(relative_to_source.lstrip("./"))

    public_key = f"public/{clean.lstrip('/')}"
    keys.add(public_key)

    marker_parts = ["/public/", "/src/", "/app/", "/pages/", "/components/"]
    for marker in marker_parts:
        if marker in clean:
            keys.add(clean.split(marker, 1)[1] if marker == "/public/" else marker.strip("/") + "/" + clean.split(marker, 1)[1])
    return {key for key in keys if key and not key.startswith("../")}


def collect_references(root: Path, assets: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    remote_references: list[dict[str, Any]] = []
    for path in iter_files(root):
        if path.suffix.lower() not in REFERENCE_EXTENSIONS:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        relative_source = rel(path, root)
        text_lines = text.splitlines()
        for line_number, line in enumerate(text_lines, start=1):
            for match in ASSET_TOKEN_RE.finditer(line):
                candidate = match.group("path")
                if candidate.startswith("http://") or candidate.startswith("https://") or candidate.startswith("//"):
                    remote_references.append({"source": relative_source, "line": line_number, "url": candidate})
                    continue
                for key in possible_local_keys(candidate, relative_source):
                    if key in assets:
                        reference = {"source": relative_source, "line": line_number, "raw": candidate}
                        if path.name in MANIFEST_FILENAMES:
                            size_match = re.search(r'"sizes"\s*:\s*"([^"]+)"', line)
                            if not size_match:
                                window = "\n".join(text_lines[max(0, line_number - 3) : line_number + 4])
                                size_match = re.search(r'"sizes"\s*:\s*"([^"]+)"', window)
                            if size_match:
                                reference["sizes"] = size_match.group(1)
                        assets[key]["references"].append(reference)
                        if path.name in MANIFEST_FILENAMES:
                            _append_hint(assets[key], "app-icon")
                        if "rel" in line and "icon" in line:
                            _append_hint(assets[key], "favicon")
                        if "poster=" in line and assets[key]["type"] == "image":
                            _append_hint(assets[key], "poster")
                        if 'rel="preload"' in line or "rel='preload'" in line:
                            _append_hint(assets[key], "preload")
                        break
    return remote_references


def summarize_by_type(assets: dict[str, dict[str, Any]]) -> dict[str, dict[str, int]]:
    by_type: dict[str, dict[str, int]] = {}
    for asset in assets.values():
        entry = by_type.setdefault(asset["type"], {"count": 0, "bytes": 0})
        entry["count"] += 1
        entry["bytes"] += asset["bytes"]
    return {key: by_type[key] for key in sorted(by_type)}


def build_report(root: Path) -> dict[str, Any]:
    assets = collect_assets(root)
    remote_references = collect_references(root, assets)
    return {
        "root": root.as_posix(),
        "assets": sorted(assets.values(), key=lambda item: (-len(item["references"]), -item["bytes"], item["path"])),
        "remoteReferences": remote_references,
        "summary": {
            "totalAssets": len(assets),
            "referencedAssets": sum(1 for asset in assets.values() if asset["references"]),
            "remoteReferences": len(remote_references),
            "totalBytes": sum(asset["bytes"] for asset in assets.values()),
            "byType": summarize_by_type(assets),
        },
    }


def human_bytes(size: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024
    return f"{size} B"


def _dim_text(asset: dict[str, Any]) -> str:
    dims = asset.get("dimensions") or {}
    return f"{dims.get('width')}x{dims.get('height')}" if dims else "unknown dimensions"


def _referenced_section(lines: list[str], title: str, assets: list[dict[str, Any]], asset_type_name: str) -> None:
    lines.extend(["", f"## {title}", ""])
    referenced = [asset for asset in assets if asset["references"] and asset["type"] == asset_type_name]
    if not referenced:
        lines.append(f"No referenced local {asset_type_name} assets found.")
    for asset in referenced:
        hints = asset.get("usageHints") or []
        hint_text = f", hints: {', '.join(hints)}" if hints else ""
        lines.append(f"- `{asset['path']}` - {human_bytes(asset['bytes'])}, {_dim_text(asset)}, {len(asset['references'])} reference(s){hint_text}")
        for reference in asset["references"][:5]:
            lines.append(f"  - `{reference['source']}:{reference['line']}`")
        if len(asset["references"]) > 5:
            lines.append(f"  - ... {len(asset['references']) - 5} more")


def markdown(report: dict[str, Any]) -> str:
    lines = ["# Asset scan report", ""]
    summary = report["summary"]
    lines.extend(
        [
            f"- Total assets: {summary['totalAssets']}",
            f"- Referenced local assets: {summary['referencedAssets']}",
            f"- Remote asset references: {summary['remoteReferences']}",
            f"- Total local asset bytes: {human_bytes(summary['totalBytes'])}",
        ]
    )
    for type_name, entry in summary["byType"].items():
        lines.append(f"- {type_name}: {entry['count']} asset(s), {human_bytes(entry['bytes'])}")
    _referenced_section(lines, "Referenced images", report["assets"], "image")
    _referenced_section(lines, "Videos", report["assets"], "video")
    _referenced_section(lines, "Animated media (GIF)", report["assets"], "gif")
    _referenced_section(lines, "Fonts", report["assets"], "font")
    _referenced_section(lines, "SVG assets", report["assets"], "svg")
    lines.extend(["", "## Large unreferenced local assets", ""])
    unreferenced = [asset for asset in report["assets"] if not asset["references"] and asset["bytes"] >= 200_000]
    if not unreferenced:
        lines.append("No large unreferenced local assets found.")
    for asset in sorted(unreferenced, key=lambda item: -item["bytes"])[:30]:
        lines.append(f"- `{asset['path']}` - {human_bytes(asset['bytes'])}, {_dim_text(asset)}")
    lines.extend(["", "## Remote asset references", ""])
    if not report["remoteReferences"]:
        lines.append("No remote asset references found.")
    for reference in report["remoteReferences"][:50]:
        lines.append(f"- `{reference['source']}:{reference['line']}` — {reference['url']}")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan a web project for image, video, animated, font, and SVG assets and references.")
    parser.add_argument("--root", default=".", help="Project root to scan")
    parser.add_argument("--format", choices={"json", "markdown"}, default="markdown", help="Output format")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        print(f"Root directory does not exist: {root}", file=sys.stderr)
        return 2

    report = build_report(root)
    if args.format == "json":
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(markdown(report), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
