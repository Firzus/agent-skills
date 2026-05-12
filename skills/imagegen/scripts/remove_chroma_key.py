#!/usr/bin/env python3
"""Convert a flat chroma-key background to alpha transparency.

This script is part of the `imagegen` Cursor skill. It is invoked by
`gen.sh --transparent` after `gpt-image-2` produces an image with a flat
solid background, because `gpt-image-2` does not natively support
`background=transparent` (see references/codex-cli.md).

Pipeline (mirrors the official OpenAI imagegen skill workflow):

  1. Auto-detect the key color by sampling the image border (or use
     `--key-color`).
  2. Compute per-pixel chroma distance to the key color in linear-ish RGB.
  3. Map that distance to alpha via two thresholds:
        d <= --transparent-threshold  -> alpha = 0   (pure background)
        d >= --opaque-threshold       -> alpha = 255 (pure subject)
        in-between                    -> linear ramp (soft matte)
  4. Despill: rebalance the dominant key channel toward neutral so the
     subject's edges don't carry a green/magenta tint.
  5. Optional `--edge-contract <px>` to nibble away a halo, optional
     `--edge-feather <px>` to soften the alpha edge.

Requires: Pillow.

Exit codes:
  0  success
  2  bad args
  3  Pillow missing
  7  validation failed (output has no plausible transparent area)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Tuple

try:
    from PIL import Image, ImageFilter
except ImportError:
    print(
        "remove_chroma_key.py: Pillow is required. Install with: "
        "python3 -m pip install --user pillow",
        file=sys.stderr,
    )
    sys.exit(3)


RGB = Tuple[int, int, int]


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------


def _parse_hex(value: str) -> RGB:
    s = value.lstrip("#")
    if len(s) != 6:
        raise argparse.ArgumentTypeError(f"--key-color must be #rrggbb, got {value!r}")
    try:
        return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"--key-color must be hex, got {value!r}") from exc


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--input", required=True, help="path to the source image")
    p.add_argument("--out", required=True, help="path to write the alpha PNG/WebP")
    p.add_argument(
        "--key-color",
        type=_parse_hex,
        default=None,
        help="explicit key color as #rrggbb; if omitted, sampled from the image border",
    )
    p.add_argument(
        "--auto-key",
        choices=("border", "off"),
        default="border",
        help="auto-detect the key color from the image border (default) or skip",
    )
    p.add_argument(
        "--transparent-threshold",
        type=float,
        default=12.0,
        help="distance below which a pixel is fully transparent (default: 12)",
    )
    p.add_argument(
        "--opaque-threshold",
        type=float,
        default=80.0,
        help="distance above which a pixel is fully opaque (default: 80)",
    )
    p.add_argument(
        "--despill",
        action="store_true",
        help="rebalance the dominant key channel on edge pixels to remove color fringe",
    )
    p.add_argument(
        "--edge-contract",
        type=int,
        default=0,
        help="erode the alpha mask by N pixels to nibble away a key-color halo",
    )
    p.add_argument(
        "--edge-feather",
        type=float,
        default=0.0,
        help="gaussian blur radius for the alpha mask (smooths stair-stepping)",
    )
    p.add_argument(
        "--debug",
        action="store_true",
        help="print sampled key color, alpha histogram summary",
    )
    return p.parse_args(argv)


# ---------------------------------------------------------------------------
# Key-color detection
# ---------------------------------------------------------------------------


def _sample_border_key(img: Image.Image, band: int = 4) -> RGB:
    """Average the outer `band` pixels on each edge to estimate the key.

    Robust to AI-generated images where the very first pixel can be slightly
    noisy: we average a few rows/columns instead of trusting a single sample.
    """
    rgb = img.convert("RGB")
    w, h = rgb.size
    band = max(1, min(band, w // 4, h // 4))

    samples: list[RGB] = []
    px = rgb.load()
    if px is None:
        raise RuntimeError("PIL pixel access unavailable")

    for y in range(band):
        for x in range(w):
            samples.append(px[x, y])
            samples.append(px[x, h - 1 - y])
    for x in range(band):
        for y in range(band, h - band):
            samples.append(px[x, y])
            samples.append(px[w - 1 - x, y])

    r = sum(s[0] for s in samples) // len(samples)
    g = sum(s[1] for s in samples) // len(samples)
    b = sum(s[2] for s in samples) // len(samples)
    return (r, g, b)


# ---------------------------------------------------------------------------
# Alpha extraction
# ---------------------------------------------------------------------------


def _build_alpha(
    img: Image.Image,
    key: RGB,
    t_low: float,
    t_high: float,
) -> Image.Image:
    """Return an L-mode mask: 0 for keyed pixels, 255 for subject."""
    if t_low >= t_high:
        raise ValueError(
            f"--transparent-threshold ({t_low}) must be < --opaque-threshold ({t_high})"
        )

    rgb = img.convert("RGB")
    w, h = rgb.size
    pixels = rgb.tobytes()  # row-major, 3 bytes per pixel
    out = bytearray(w * h)

    kr, kg, kb = key
    span = t_high - t_low

    # Hot loop. We use a perceptual-ish distance: max(|dr|,|dg|,|db|) is
    # cheap and behaves well for flat key colors. (Euclidean would be 3x more
    # math without changing behavior much for solid keys.)
    for i in range(w * h):
        j = i * 3
        dr = pixels[j] - kr
        dg = pixels[j + 1] - kg
        db = pixels[j + 2] - kb
        if dr < 0:
            dr = -dr
        if dg < 0:
            dg = -dg
        if db < 0:
            db = -db
        d = dr if dr > dg else dg
        if db > d:
            d = db

        if d <= t_low:
            out[i] = 0
        elif d >= t_high:
            out[i] = 255
        else:
            out[i] = int(((d - t_low) / span) * 255.0)

    return Image.frombytes("L", (w, h), bytes(out))


# ---------------------------------------------------------------------------
# Despill
# ---------------------------------------------------------------------------


def _despill(img: Image.Image, key: RGB) -> Image.Image:
    """Rebalance the dominant key channel toward neutral on each pixel.

    For green keys (G dominant), clamp G to max(R, B). For magenta keys
    (R+B dominant, low G), pull R and B down toward G's max. This is a
    classic chroma-keyer despill — it removes the color cast that bleeds
    onto the subject's edges from the JPEG/AI rendering of the key.
    """
    rgb = img.convert("RGB")
    px = bytearray(rgb.tobytes())
    n = len(px)

    kr, kg, kb = key
    # Pick the dominant channel(s) of the key.
    dom = max(kr, kg, kb)
    if dom == kg and kg > kr and kg > kb:
        # Green key: clamp G to max(R, B)
        for i in range(0, n, 3):
            r, g, b = px[i], px[i + 1], px[i + 2]
            cap = r if r > b else b
            if g > cap:
                px[i + 1] = cap
    elif dom == kb and kb > kg and kb > kr:
        # Blue key (rare): clamp B to max(R, G)
        for i in range(0, n, 3):
            r, g, b = px[i], px[i + 1], px[i + 2]
            cap = r if r > g else g
            if b > cap:
                px[i + 2] = cap
    elif kr > kg and kb > kg:
        # Magenta key: clamp R and B toward G
        for i in range(0, n, 3):
            r, g, b = px[i], px[i + 1], px[i + 2]
            if r > g and b > g:
                # leave the larger of (r-g, b-g) as a neutral cap
                cap = g + max(0, min(r - g, b - g))
                if r > cap:
                    px[i] = cap
                if b > cap:
                    px[i + 2] = cap
    return Image.frombytes("RGB", rgb.size, bytes(px))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])

    src = Path(args.input)
    if not src.is_file():
        print(f"remove_chroma_key.py: input not found: {src}", file=sys.stderr)
        return 2

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    img = Image.open(src)
    img.load()

    key: RGB
    if args.key_color is not None:
        key = args.key_color
    elif args.auto_key == "border":
        key = _sample_border_key(img)
    else:
        print(
            "remove_chroma_key.py: --auto-key off requires --key-color",
            file=sys.stderr,
        )
        return 2

    if args.debug:
        print(f"key color: rgb({key[0]}, {key[1]}, {key[2]})", file=sys.stderr)

    alpha = _build_alpha(img, key, args.transparent_threshold, args.opaque_threshold)

    # Optional erosion (shrink the opaque mask by N px).
    if args.edge_contract > 0:
        for _ in range(args.edge_contract):
            alpha = alpha.filter(ImageFilter.MinFilter(3))

    # Optional gaussian feather.
    if args.edge_feather > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(args.edge_feather))

    # Despill on the RGB layer, then attach alpha.
    rgb = _despill(img, key) if args.despill else img.convert("RGB")
    rgba = rgb.convert("RGBA")
    rgba.putalpha(alpha)

    # Sanity check: the result must have meaningfully transparent pixels.
    histogram = alpha.histogram()
    transparent_count = sum(histogram[0:32])  # alpha < 32
    total = alpha.size[0] * alpha.size[1]
    transparent_ratio = transparent_count / max(1, total)

    if args.debug:
        opaque_count = sum(histogram[224:256])
        print(
            f"alpha: transparent={transparent_ratio:.1%}, "
            f"opaque={opaque_count / total:.1%}, "
            f"total_pixels={total}",
            file=sys.stderr,
        )

    # Write output. Pillow infers format from extension; .png / .webp both
    # accept RGBA.
    suffix = out.suffix.lower()
    if suffix == ".webp":
        rgba.save(out, format="WEBP", lossless=True)
    else:
        rgba.save(out, format="PNG", optimize=True)

    if transparent_ratio < 0.005:
        print(
            f"remove_chroma_key.py: warning — only {transparent_ratio:.2%} of "
            f"pixels were keyed out. Output may not be properly transparent. "
            f"Try a different --key-color or adjust thresholds.",
            file=sys.stderr,
        )
        return 7

    print(str(out.resolve()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
