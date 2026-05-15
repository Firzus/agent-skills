#!/usr/bin/env python3
"""Generate reviewable Sharp CLI commands from scan-images.py JSON output.

The script prints commands only. It does not optimize images or modify files.
"""

from __future__ import annotations

import argparse
import json
import shlex
import sys
from pathlib import Path
from typing import Any

RASTER_EXTENSIONS = {"avif", "jpeg", "jpg", "png", "webp"}
DEFAULT_FORMATS = ["avif", "webp", "jpg"]
ICON_HINTS = {"app-icon", "favicon"}
LOGO_HINTS = {"inline-img"}
SMALL_RASTER_FORMATS = ["webp", "png"]
SMALL_IMAGE_WIDTH = 128
QUALITY = {
    "avif": "50",
    "webp": "75",
    "jpg": "78",
    "jpeg": "78",
    "png": None,
}


def parse_widths(raw: str) -> list[int]:
    widths: list[int] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            width = int(part)
        except ValueError as error:
            raise argparse.ArgumentTypeError(f"Invalid width: {part}") from error
        if width <= 0:
            raise argparse.ArgumentTypeError(f"Width must be positive: {part}")
        widths.append(width)
    return sorted(set(widths))


def parse_formats(raw: str) -> list[str]:
    formats = [part.strip().lower().lstrip(".") for part in raw.split(",") if part.strip()]
    invalid = [fmt for fmt in formats if fmt not in RASTER_EXTENSIONS]
    if invalid:
        raise argparse.ArgumentTypeError(f"Unsupported output format(s): {', '.join(invalid)}")
    return formats


def quote(value: str) -> str:
    return shlex.quote(value)


def output_path(source: str, out_dir: str | None, width: int, fmt: str) -> str:
    source_path = Path(source)
    extension = "jpg" if fmt == "jpeg" else fmt
    filename = f"{source_path.stem}-{width}.{extension}"
    if out_dir:
        return str(Path(out_dir) / filename).replace("\\", "/")
    return str(source_path.with_name(filename)).replace("\\", "/")


def usage_hints(asset: dict[str, Any]) -> set[str]:
    raw_hints = asset.get("usageHints") or []
    return {str(hint) for hint in raw_hints}


def icon_widths_for(asset: dict[str, Any]) -> list[int]:
    manifest_widths: list[int] = []
    for reference in asset.get("references") or []:
        raw = str(reference.get("sizes") or reference.get("raw", ""))
        source = str(reference.get("source", ""))
        if source.endswith(("manifest.json", "site.webmanifest")):
            for part in raw.replace(",", " ").split():
                if "x" in part:
                    width_part = part.split("x", 1)[0]
                    if width_part.isdigit():
                        manifest_widths.append(int(width_part))
    return sorted(set([192, 512] + manifest_widths))


def logo_widths_for() -> list[int]:
    return [24, 48, 96, 192]


def formats_for(width: int, requested_formats: list[str], asset: dict[str, Any]) -> list[str]:
    hints = usage_hints(asset)
    formats: list[str] = []

    if hints & ICON_HINTS and width in icon_widths_for(asset):
        formats.append("png")
    if hints & LOGO_HINTS and width in logo_widths_for():
        formats.extend(fmt for fmt in requested_formats if fmt in {"webp", "png"})
    if formats:
        return list(dict.fromkeys(formats))

    if width <= SMALL_IMAGE_WIDTH:
        return [fmt for fmt in requested_formats if fmt in SMALL_RASTER_FORMATS]
    return requested_formats


def command_for(source: str, output: str, width: int, fmt: str) -> str:
    normalized_format = "jpeg" if fmt == "jpg" else fmt
    parts = [
        "npx",
        "sharp-cli",
        "--input",
        quote(source),
        "--output",
        quote(output),
        "--format",
        normalized_format,
    ]
    quality = QUALITY.get(fmt)
    if quality:
        parts.extend(["--quality", quality])
    if fmt in {"jpg", "jpeg"}:
        parts.append("--mozjpeg")
    if fmt == "png":
        parts.extend(["--compressionLevel", "9"])
    parts.extend(["resize", str(width)])
    return " ".join(parts)


def should_include(asset: dict[str, Any], include_unreferenced: bool) -> bool:
    extension = str(asset.get("extension", "")).lower()
    if extension == "svg" or extension == "gif":
        return False
    if extension not in RASTER_EXTENSIONS:
        return False
    if include_unreferenced:
        return True
    return bool(asset.get("references"))


def widths_for(asset: dict[str, Any], requested_widths: list[int]) -> list[int]:
    dimensions = asset.get("dimensions") or {}
    source_width = dimensions.get("width")
    hints = usage_hints(asset)

    if hints & ICON_HINTS:
        widths = sorted(set(icon_widths_for(asset) + logo_widths_for()))
        if isinstance(source_width, int) and source_width > 0:
            return [width for width in widths if width <= source_width] or [source_width]
        return widths

    if hints & LOGO_HINTS:
        widths = logo_widths_for()
        if isinstance(source_width, int) and source_width > 0:
            return [width for width in widths if width <= source_width] or [source_width]
        return widths

    if isinstance(source_width, int) and source_width > 0:
        filtered = [width for width in requested_widths if width <= source_width]
        return filtered or [source_width]
    return requested_widths


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate Sharp CLI command plan from scan-images.py JSON.")
    parser.add_argument("scan_json", help="Path to scan-images.py JSON output")
    parser.add_argument("--out-dir", help="Optional output directory for generated variants")
    parser.add_argument("--widths", type=parse_widths, default=parse_widths("320,640,1024,1536"), help="Comma-separated output widths")
    parser.add_argument("--formats", type=parse_formats, default=DEFAULT_FORMATS, help="Comma-separated output formats: avif,webp,jpg,png")
    parser.add_argument("--include-unreferenced", action="store_true", help="Also include unreferenced local raster images")
    args = parser.parse_args()

    try:
        report = json.loads(Path(args.scan_json).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"Could not read scan JSON: {error}", file=sys.stderr)
        return 2

    assets = report.get("assets", [])
    if not isinstance(assets, list):
        print("Invalid scan JSON: expected an assets list", file=sys.stderr)
        return 2

    commands: list[str] = []
    for asset in assets:
        if not isinstance(asset, dict) or not should_include(asset, args.include_unreferenced):
            continue
        source = asset.get("path")
        if not isinstance(source, str):
            continue
        for width in widths_for(asset, args.widths):
            for fmt in formats_for(width, args.formats, asset):
                output = output_path(source, args.out_dir, width, fmt)
                if output == source:
                    continue
                commands.append(command_for(source, output, width, fmt))

    if args.out_dir:
        print(f"mkdir -p {quote(args.out_dir)}")
    for command in commands:
        print(command)
    if not commands:
        print("# No Sharp commands generated. Check whether the scan found referenced raster images.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
