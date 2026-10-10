#!/usr/bin/env python3
"""
Makes the pictures of the application lighter to load: each is saved again in
at most 256 colours, which a screen of flat colour and text loses nothing by.
Run it after _src/shots.cjs has taken them.

  python3 _src/lighten.py
"""
import pathlib

from PIL import Image

for path in sorted((pathlib.Path(__file__).parent.parent / "docs" / "assets" / "img").glob("*.png")):
    if path.name == "og-card.png":
        continue
    before = path.stat().st_size
    image = Image.open(path)
    if image.mode == "P":
        continue  # already done
    image.convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)
    print(f"{path.name:16s} {before // 1024:5d} KB -> {path.stat().st_size // 1024:5d} KB")
