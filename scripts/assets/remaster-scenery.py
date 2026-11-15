"""2x scenery remaster from existing RGBA pixels; no image generation or download.

Requires Pillow. Resamples isolated atlas cells, sharpens RGB only and retains
resampled alpha, so transparent silhouettes and existing compositions survive.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
names = ["cosmos-landmarks", "destination-worlds", "wreck-ships", "wreck-stations"]
records = []
for name in names:
    source = ROOT / f"public/assets/raid-fx/{name}-v1.webp"
    target = ROOT / f"public/assets/raid-fx/{name}-remaster-v2.webp"
    original = Image.open(source).convert("RGBA")
    assert original.size == (1024, 1024)
    atlas = Image.new("RGBA", (2048, 2048))
    for cell in range(4):
        x, y = cell % 2 * 512, cell // 2 * 512
        resized = original.crop((x, y, x + 512, y + 512)).resize((1024, 1024), Image.Resampling.LANCZOS)
        rgb = resized.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.1, percent=70, threshold=3))
        rgb.putalpha(resized.getchannel("A"))
        atlas.paste(rgb, (x * 2, y * 2))
    atlas.save(target, "WEBP", lossless=True, method=6)
    record = {"source": source.relative_to(ROOT).as_posix(), "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "file": target.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "bytes": target.stat().st_size, "dimensions": [2048, 2048], "scale": 2,
        "method": "isolated-cell Lanczos resampling, restrained RGB-only sharpening, resampled alpha retained, lossless WebP",
        "limitation": "Existing upscaled pixels, not additional native HD detail."}
    records.append(record)
    print(name, target.stat().st_size, "bytes", flush=True)
(ROOT / "docs/scenery-remaster-manifest.json").write_text(json.dumps({"assets": records}, indent=2) + "\n", encoding="utf-8")
