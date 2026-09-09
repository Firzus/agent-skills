# Transparent backgrounds with Images 2.5

Request a transparent PNG through Codex's built-in `image_gen` tool:

```text
Scene/backdrop: transparent background
Constraints: isolated subject, preserve fine edges and semi-transparent details,
  output PNG with actual alpha transparency, no painted checkerboard
```

Verify that the saved file contains transparent pixels, not just a checkerboard or a fully opaque alpha channel. With Pillow installed (replace `python3` with the available Python 3 executable):

```bash
python3 -c "from PIL import Image; im = Image.open('output/cutout.png'); assert im.format == 'PNG'; lo, hi = im.convert('RGBA').getchannel('A').getextrema(); assert lo < 255 and hi > 0, 'Expected transparent pixels and a visible subject'"
```

Inspect the image over light and dark backgrounds: the subject must remain visible, with preserved fine edges, no halos, and no unintended holes. If the output is opaque, fails these checks, or the tool cannot produce transparency, stop and report the unmet requirement. Do not remove the background locally or switch generation providers.
