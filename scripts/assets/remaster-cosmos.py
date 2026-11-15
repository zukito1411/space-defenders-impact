"""Remaster existing pixels only: no model, download, generation or new painted detail.

Requires Pillow. Keeps each region's composition and color, upscales its content
with Lanczos, applies restrained edge sharpening and extrudes new atlas gutters.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageFilter, ImageStat, ImageChops

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "public/assets/raid-fx/cosmos-regions-v1.webp"
TARGET = ROOT / "public/assets/raid-fx/cosmos-regions-remaster-v2.webp"
original = Image.open(SOURCE).convert("RGB")
assert original.size == (1024, 1024)
atlas = Image.new("RGB", (2048, 2048))
comparisons = []
for index in range(4):
    col, row = index % 2, index // 2
    source = original.crop((col * 512 + 4, row * 512 + 4, (col + 1) * 512 - 4, (row + 1) * 512 - 4))
    resized = source.resize((1008, 1008), Image.Resampling.LANCZOS)
    remaster = resized.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=3))
    # Small-signal sharpening is baked offline; no fullscreen filter runs in game.
    x, y = col * 1024, row * 1024
    atlas.paste(remaster, (x + 8, y + 8))
    atlas.paste(remaster.crop((0, 0, 1, 1008)).resize((8, 1008)), (x, y + 8))
    atlas.paste(remaster.crop((1007, 0, 1008, 1008)).resize((8, 1008)), (x + 1016, y + 8))
    atlas.paste(remaster.crop((0, 0, 1008, 1)).resize((1008, 8)), (x + 8, y))
    atlas.paste(remaster.crop((0, 1007, 1008, 1008)).resize((1008, 8)), (x + 8, y + 1016))
    for sx, sy, dx, dy in [(0, 0, 0, 0), (1007, 0, 1016, 0), (0, 1007, 0, 1016), (1007, 1007, 1016, 1016)]:
        atlas.paste(remaster.getpixel((sx, sy)), (x + dx, y + dy, x + dx + 8, y + dy + 8))
    error = ImageStat.Stat(ImageChops.difference(source, remaster.resize(source.size, Image.Resampling.LANCZOS))).mean
    comparisons.append({"region": index, "meanAbsRgbErrorAtSourceSize": [round(value, 3) for value in error]})
atlas.save(TARGET, "WEBP", lossless=True, method=6)
manifest = {"file": TARGET.relative_to(ROOT).as_posix(), "dimensions": [2048, 2048],
    "bytes": TARGET.stat().st_size, "sha256": hashlib.sha256(TARGET.read_bytes()).hexdigest(),
    "source": SOURCE.relative_to(ROOT).as_posix(), "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    "sourceDimensions": [1024, 1024], "sourceContentPerRegion": 504, "outputContentPerRegion": 1008,
    "gutter": 8, "method": "2x Lanczos resampling, restrained offline unsharp mask, extruded gutters, lossless WebP",
    "limitation": "Upscaled existing art; no additional native detail or newly generated pixels from a model.",
    "comparison": comparisons}
(ROOT / "docs/cosmos-remaster-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"Remastered four existing cosmos plates: 504 -> 1008 texels each; {TARGET.stat().st_size:,} bytes")
