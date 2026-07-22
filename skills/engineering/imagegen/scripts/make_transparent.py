#!/usr/bin/env python3
"""Turn a solid chroma-key background into transparency, producing a PNG with alpha.

Companion to the imagegen skill: gpt-image-2 cannot output transparent
backgrounds, so generate the asset on a flat solid color (magenta #FF00FF
recommended), then run this script to key it out.

Requires Pillow: pip install pillow
"""

import argparse
import sys
from pathlib import Path


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def parse_color(value):
    value = value.lstrip("#")
    if len(value) != 6:
        fail(f"invalid --color '{value}': expected RRGGBB hex")
    try:
        return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        fail(f"invalid --color '{value}': expected RRGGBB hex")


def corner_color(image):
    width, height = image.size
    corners = [
        image.getpixel((0, 0)),
        image.getpixel((width - 1, 0)),
        image.getpixel((0, height - 1)),
        image.getpixel((width - 1, height - 1)),
    ]
    return tuple(sum(c[i] for c in corners) // 4 for i in range(3))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="source image (any Pillow-readable format)")
    parser.add_argument("output", help="output PNG path")
    parser.add_argument(
        "--color",
        help="background color as RRGGBB hex; default: sampled from the 4 corners",
    )
    parser.add_argument(
        "--threshold",
        type=int,
        default=60,
        help="color distance below which a pixel becomes fully transparent (default 60)",
    )
    parser.add_argument(
        "--soft",
        type=int,
        default=40,
        help="extra distance over which alpha ramps from 0 to 255 for soft edges (default 40)",
    )
    parser.add_argument("--force", action="store_true", help="overwrite the output file")
    args = parser.parse_args()

    try:
        from PIL import Image
    except ImportError:
        fail("Pillow is required: pip install pillow")

    source = Path(args.input)
    target = Path(args.output)
    if not source.is_file():
        fail(f"input not found: {source}")
    if target.suffix.lower() != ".png":
        fail("output must be a .png file (alpha channel required)")
    if target.exists() and not args.force:
        fail(f"output exists: {target} (use --force to overwrite)")

    image = Image.open(source).convert("RGB")
    key = parse_color(args.color) if args.color else corner_color(image)
    print(f"keying out rgb{key} (threshold {args.threshold}, soft {args.soft})")

    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    hard, soft = args.threshold, max(args.soft, 1)

    for y in range(height):
        for x in range(width):
            r, g, b, _ = pixels[x, y]
            distance = ((r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2) ** 0.5
            if distance <= hard:
                pixels[x, y] = (r, g, b, 0)
            elif distance <= hard + soft:
                alpha = int(255 * (distance - hard) / soft)
                pixels[x, y] = (r, g, b, alpha)

    target.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(target, "PNG")
    print(f"wrote {target}")


if __name__ == "__main__":
    main()
