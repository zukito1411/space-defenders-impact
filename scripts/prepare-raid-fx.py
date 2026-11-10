"""Normalize generated 4x4 sheets without changing individual frames' scale.

Usage: python scripts/prepare-raid-fx.py COMBAT_SOURCE EXPLOSION_SOURCE
Check shipped assets: python scripts/prepare-raid-fx.py --check
Requires Pillow. Only writes the versioned v2 files, never the source images.
"""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/raid-fx"
TILE = 256
CONTENT = 192
GUTTER = (TILE - CONTENT) // 2


def normalize(source, destination):
    image = Image.open(source)
    if image.mode != "RGBA" or image.width != image.height:
        raise ValueError("Expected a square RGBA source")
    atlas = Image.new("RGBA", (TILE * 4, TILE * 4))
    for index in range(16):
        col, row = index % 4, index // 4
        # Fractional input cells (e.g. a 1254px sheet) use rounded boundaries.
        # Resize the entire cell: do not auto-trim or resize each frame's art.
        bounds = tuple(round(v * image.width / 4) for v in (col, row, col + 1, row + 1))
        cell = image.crop(bounds).resize((CONTENT, CONTENT), Image.Resampling.LANCZOS)
        atlas.paste(cell, (col * TILE + GUTTER, row * TILE + GUTTER))
    atlas.save(destination, optimize=True)
    return {**validate(destination), "generation": "built-in ImageGen",
            "sourceSha256": hashlib.sha256(Path(source).read_bytes()).hexdigest(),
            "sourceWidth": image.width, "sourceHeight": image.height}


def validate(path):
    image = Image.open(path)
    assert image.mode == "RGBA" and image.size == (1024, 1024)
    alpha = image.getchannel("A")
    coverage = []
    for index in range(16):
        col, row = index % 4, index // 4
        cell = alpha.crop((col * TILE, row * TILE, (col + 1) * TILE, (row + 1) * TILE))
        assert cell.getbbox(), f"Empty frame {index}"
        for bounds in ((0, 0, TILE, GUTTER), (0, TILE - GUTTER, TILE, TILE),
                       (0, 0, GUTTER, TILE), (TILE - GUTTER, 0, TILE, TILE)):
            assert cell.crop(bounds).getextrema() == (0, 0), f"Atlas bleed in frame {index}"
        histogram = cell.histogram()
        coverage.append(round(sum(i * n for i, n in enumerate(histogram)) / (TILE * TILE * 255), 4))
    return {"path": str(path.relative_to(ROOT)), "width": 1024, "height": 1024,
            "mode": "RGBA", "frames": 16, "transparentGutterPx": GUTTER,
            "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "alphaCoverage": coverage}


if __name__ == "__main__":
    if sys.argv[1:] == ["--check"]:
        manifest = json.loads((ROOT / "docs/raid-fx-v2-manifest.json").read_text())
        for expected in manifest:
            actual = validate(ROOT / expected["path"])
            assert all(actual[key] == expected[key] for key in actual), "Manifest mismatch"
        assert manifest[1]["alphaCoverage"][-1] < manifest[1]["alphaCoverage"][5] * 0.05
        print("Both v2 atlases passed dimensions, transparency, frame, fade and SHA-256 checks")
        raise SystemExit(0)
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    results = [normalize(source, OUTPUT / name) for source, name in zip(sys.argv[1:],
               ("combat-atlas-v2.png", "explosion-atlas-v2.png"))]
    # The explosion retains the source's common canvas scale and its near-empty final frame.
    assert results[1]["alphaCoverage"][-1] < results[1]["alphaCoverage"][5] * 0.05
    print(json.dumps(results, indent=2))
