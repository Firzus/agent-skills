#!/usr/bin/env python3
"""Extract a generated image from one or more Codex CLI session rollouts.

This script is part of the `imagegen` Cursor skill. It is invoked by
`gen.sh` after a `codex exec --enable image_generation ...` call has
finished. It scans every new rollout JSONL line for any base64-encoded
blob that matches a PNG / JPEG / WebP magic header, keeps the largest
match across all inputs, and writes it to ``--out``.

Stdlib only. No third-party dependencies.

Exit codes:
  0  success
  2  bad args
  7  no image payload found in the supplied rollouts
"""

from __future__ import annotations

import argparse
import base64
import binascii
import re
import sys
from pathlib import Path
from typing import Iterable, Optional, Tuple

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
JPEG_MAGIC = b"\xff\xd8\xff"
WEBP_RIFF = b"RIFF"
WEBP_TAG = b"WEBP"

# Base64 strings of meaningful length, terminated only by base64-safe chars.
# We require at least 256 chars so we don't match e.g. tiny ids.
_B64_RE = re.compile(rb"[A-Za-z0-9+/]{256,}={0,2}")


def _classify(prefix: bytes) -> Optional[str]:
    if prefix.startswith(PNG_MAGIC):
        return "png"
    if prefix.startswith(JPEG_MAGIC):
        return "jpeg"
    if (
        len(prefix) >= 12
        and prefix[0:4] == WEBP_RIFF
        and prefix[8:12] == WEBP_TAG
    ):
        return "webp"
    return None


def _iter_rollout_bytes(path: Path) -> Iterable[bytes]:
    """Yield raw bytes for each JSONL line in ``path``.

    Reading line-by-line in binary mode keeps memory bounded even when
    individual rollout files contain large base64 payloads.
    """
    with path.open("rb") as f:
        for line in f:
            yield line


def _find_largest_image(lines: Iterable[bytes]) -> Tuple[Optional[bytes], Optional[str]]:
    best_blob: Optional[bytes] = None
    best_kind: Optional[str] = None
    for line in lines:
        for match in _B64_RE.finditer(line):
            candidate = match.group(0)
            try:
                # validate=True rejects junk bytes; we only care about clean base64.
                decoded = base64.b64decode(candidate, validate=True)
            except (binascii.Error, ValueError):
                continue
            if len(decoded) < 1024:
                continue
            kind = _classify(decoded[:16])
            if kind is None:
                continue
            if best_blob is None or len(decoded) > len(best_blob):
                best_blob = decoded
                best_kind = kind
    return best_blob, best_kind


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract a generated image from Codex CLI session rollouts.",
    )
    parser.add_argument(
        "--out",
        required=True,
        help="absolute path to write the extracted image",
    )
    parser.add_argument(
        "--rollouts",
        required=True,
        nargs="+",
        help="rollout JSONL files to scan (newline-delimited JSON)",
    )
    return parser.parse_args(argv)


def main(argv: Optional[list[str]] = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])

    out_path = Path(args.out)
    if not out_path.is_absolute():
        print(
            f"extract_image.py: --out must be absolute: {out_path}",
            file=sys.stderr,
        )
        return 2

    rollout_paths: list[Path] = []
    for raw in args.rollouts:
        p = Path(raw)
        if not p.is_file():
            print(
                f"extract_image.py: rollout not found: {p}",
                file=sys.stderr,
            )
            continue
        rollout_paths.append(p)

    if not rollout_paths:
        print(
            "extract_image.py: no readable rollout files supplied",
            file=sys.stderr,
        )
        return 7

    best_blob: Optional[bytes] = None
    best_kind: Optional[str] = None
    for path in rollout_paths:
        blob, kind = _find_largest_image(_iter_rollout_bytes(path))
        if blob is None:
            continue
        if best_blob is None or len(blob) > len(best_blob):
            best_blob = blob
            best_kind = kind

    if best_blob is None:
        print(
            "extract_image.py: no PNG/JPEG/WebP payload found in rollouts",
            file=sys.stderr,
        )
        return 7

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(best_blob)
    print(str(out_path.resolve()))
    if best_kind is not None:
        print(f"format: {best_kind}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
