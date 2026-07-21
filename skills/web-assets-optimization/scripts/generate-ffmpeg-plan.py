#!/usr/bin/env python3
"""Generate reviewable ffmpeg commands from scan-assets.py JSON output.

Prints commands only; it does not encode or modify files.
"""

from __future__ import annotations

import argparse
import json
import shlex
import sys
from pathlib import Path
from typing import Any

VALID_TARGETS = {"mp4", "webm", "poster"}
VIDEO_EXTENSIONS = {"avi", "m4v", "mkv", "mov", "mp4", "ogv", "webm"}
# GIF sources tolerate more compression than camera footage; web.dev's GIF
# replacement guidance and Google's VP9 tables point at these higher CRFs.
GIF_CRF_H264 = 26
GIF_CRF_VP9 = 41


def parse_targets(raw: str) -> list[str]:
    targets = [part.strip().lower() for part in raw.split(",") if part.strip()]
    invalid = [target for target in targets if target not in VALID_TARGETS]
    if invalid:
        raise argparse.ArgumentTypeError(f"Unsupported target(s): {', '.join(invalid)}")
    return list(dict.fromkeys(targets))


def parse_positive_int(raw: str) -> int:
    try:
        value = int(raw)
    except ValueError as error:
        raise argparse.ArgumentTypeError(f"Invalid integer: {raw}") from error
    if value <= 0:
        raise argparse.ArgumentTypeError(f"Value must be positive: {raw}")
    return value


def quote(value: str) -> str:
    return shlex.quote(value)


def output_path(source: str, out_dir: str | None, suffix: str) -> str:
    source_path = Path(source)
    filename = f"{source_path.stem}{suffix}"
    candidate = Path(out_dir) / filename if out_dir else source_path.with_name(filename)
    result = str(candidate).replace("\\", "/")
    if result == source.replace("\\", "/"):
        # Never overwrite the input: name.mp4 -> name-web.mp4
        filename = f"{source_path.stem}-web{suffix}"
        candidate = Path(out_dir) / filename if out_dir else source_path.with_name(filename)
        result = str(candidate).replace("\\", "/")
    return result


def scale_args(max_width: int | None) -> str:
    # H.264 with yuv420p requires even output dimensions. min(W,iw) protects
    # against upscaling and -2 forces an even height.
    if max_width:
        return f"-vf \"scale='min({max_width},iw)':-2\""
    # Sources often have odd dimensions; truncate each down to even.
    return '-vf "scale=trunc(iw/2)*2:trunc(ih/2)*2"'


def join(pieces: list[str]) -> str:
    return " ".join(piece for piece in pieces if piece)


def commands_for_video(source: str, args: argparse.Namespace) -> list[str]:
    commands: list[str] = []
    scale = scale_args(args.max_width)
    if "mp4" in args.targets:
        audio = "-an" if args.mute else "-c:a aac -b:a 128k -ac 2"
        out = output_path(source, args.out_dir, ".mp4")
        commands.append(join([
            "ffmpeg -i", quote(source), scale,
            f"-c:v libx264 -crf {args.crf_h264} -preset slow -pix_fmt yuv420p",
            audio, "-movflags +faststart", quote(out),
        ]))
    if "webm" in args.targets:
        audio = "-an" if args.mute else "-c:a libopus -b:a 96k"
        out = output_path(source, args.out_dir, ".webm")
        stem = out[: -len(".webm")]
        commands.append(join([
            "ffmpeg -y -i", quote(source), scale,
            f"-c:v libvpx-vp9 -b:v 0 -crf {args.crf_vp9} -pass 1 -passlogfile", quote(stem),
            "-speed 4 -row-mt 1 -an -f null /dev/null",
        ]))
        commands.append(join([
            "ffmpeg -i", quote(source), scale,
            f"-c:v libvpx-vp9 -b:v 0 -crf {args.crf_vp9} -pass 2 -passlogfile", quote(stem),
            "-speed 1 -row-mt 1", audio, quote(out),
        ]))
        commands.append(join(["rm -f", quote(f"{stem}-0.log")]))
    if "poster" in args.targets:
        out = output_path(source, args.out_dir, "-poster.jpg")
        commands.append(join([
            "ffmpeg -ss", quote(args.poster_seek), "-i", quote(source),
            "-frames:v 1 -q:v 2", quote(out),
        ]))
    return commands


def commands_for_gif(source: str, args: argparse.Namespace) -> list[str]:
    # GIF outputs are always muted; posters make no sense for GIF inputs.
    commands: list[str] = []
    scale = scale_args(args.max_width)
    if "mp4" in args.targets:
        out = output_path(source, args.out_dir, ".mp4")
        commands.append(join([
            "ffmpeg -i", quote(source), scale,
            f"-c:v libx264 -crf {GIF_CRF_H264} -pix_fmt yuv420p -movflags +faststart -an",
            quote(out),
        ]))
    if "webm" in args.targets:
        out = output_path(source, args.out_dir, ".webm")
        commands.append(join([
            "ffmpeg -i", quote(source), scale,
            f"-c:v libvpx-vp9 -b:v 0 -crf {GIF_CRF_VP9} -an", quote(out),
        ]))
    return commands


def asset_kind(asset: dict[str, Any]) -> str | None:
    asset_type = str(asset.get("type", "")).lower()
    if asset_type in {"video", "gif"}:
        return asset_type
    if asset_type:
        return None
    extension = str(asset.get("extension", "")).lower()
    if extension == "gif":
        return "gif"
    if extension in VIDEO_EXTENSIONS:
        return "video"
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate an ffmpeg command plan from scan-assets.py JSON.")
    parser.add_argument("scan_json", help="Path to scan-assets.py JSON output")
    parser.add_argument(
        "--out-dir",
        help="Temporary output directory for experimentation only; move winners to final asset paths and delete this dir before finishing",
    )
    parser.add_argument(
        "--targets",
        type=parse_targets,
        default=parse_targets("mp4,webm,poster"),
        help="Comma-separated outputs: mp4,webm,poster (poster is skipped for GIF inputs)",
    )
    parser.add_argument("--crf-h264", type=int, default=23, help="libx264 CRF for video inputs (lower = better quality)")
    parser.add_argument("--crf-vp9", type=int, default=32, help="libvpx-vp9 CRF for video inputs (lower = better quality)")
    parser.add_argument("--max-width", type=parse_positive_int, help="Downscale outputs to at most this width (never upscales)")
    parser.add_argument("--mute", action="store_true", help="Strip audio from video outputs (GIF outputs are always muted)")
    parser.add_argument("--poster-seek", default="00:00:01", help="Timestamp to grab the poster frame from")
    parser.add_argument("--include-unreferenced", action="store_true", help="Also include unreferenced local videos and GIFs")
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

    lines: list[str] = []
    for asset in assets:
        if not isinstance(asset, dict):
            continue
        kind = asset_kind(asset)
        if kind is None:
            continue
        if not args.include_unreferenced and not asset.get("references"):
            continue
        source = asset.get("path")
        if not isinstance(source, str):
            continue
        commands = commands_for_video(source, args) if kind == "video" else commands_for_gif(source, args)
        if commands:
            lines.append(f"# {source} ({kind})")
            lines.extend(commands)

    if args.out_dir:
        print(f"mkdir -p {quote(args.out_dir)}")
    for line in lines:
        print(line)
    if not lines:
        print("# No ffmpeg commands generated. Check whether the scan found referenced videos or GIFs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
