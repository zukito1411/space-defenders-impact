"""Normalize two generated 2x2 RGBA sheets. Usage: python script.py ships.png stations.png.
Crop/alpha/size operations only; no painted content or runtime processing.
"""
import sys, json, hashlib
from pathlib import Path
from PIL import Image
import numpy as np
if len(sys.argv) != 3:
    raise SystemExit('Usage: normalize-wrecks.py ships.png stations.png')
out = Path('public/assets/raid-fx')
rows = []
for family, path in zip(['ships', 'stations'], sys.argv[1:]):
    source = Image.open(path).convert('RGBA')
    atlas = Image.new('RGBA', (1024, 1024))
    boxes = []
    for i in range(4):
        x, y = i % 2, i // 2
        cell = source.crop((x * source.width // 2, y * source.height // 2,
                            (x + 1) * source.width // 2, (y + 1) * source.height // 2))
        pixels = np.array(cell)
        alpha = pixels[:, :, 3]
        # Remove generator's almost-transparent matte; opaque hulls must occlude.
        alpha[alpha < 32] = 0
        alpha[alpha >= 200] = 255
        pixels[:, :, 3] = alpha
        pixels[alpha == 0, :3] = 0
        cell = Image.fromarray(pixels)
        box = cell.getbbox()
        if not box: raise ValueError('Empty sprite')
        cell = cell.crop(box)
        cell.thumbnail((456, 456), Image.Resampling.LANCZOS)
        # Lock exterior gutter to transparent; 24px frame inset plus 4px safety.
        ox, oy = x * 512 + (512 - cell.width) // 2, y * 512 + (512 - cell.height) // 2
        atlas.alpha_composite(cell, (ox, oy))
        boxes.append([ox, oy, cell.width, cell.height])
    target = out / f'wreck-{family}-v1.webp'
    atlas.save(target, 'WEBP', quality=92, method=6, exact=True)
    rows.append({'path':str(target), 'source_sha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),
                 'sha256':hashlib.sha256(target.read_bytes()).hexdigest(), 'bytes':target.stat().st_size,
                 'content_rects':boxes})
manifest = Path('docs/wreck-art-manifest.json')
previous = json.loads(manifest.read_text()) if manifest.exists() else {}
manifest.write_text(json.dumps({**previous, 'size':[1024,1024], 'cells':[2,2], 'frame_inset':24,
 'normalization':'alpha <32 removed; alpha >=200 opaque; fit each silhouette inside 456px with 28px minimum gutter',
 'assets':rows}, indent=2)+'\n')
print(json.dumps(rows,indent=2))
