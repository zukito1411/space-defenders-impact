"""Crop and normalize three cleaned 2x2 boss sprite sheets. No painted edits.
Usage: python scripts/assets/normalize-campaign-bosses.py early.png middle.png late.png
"""
import hashlib, json, sys
from pathlib import Path
from PIL import Image
import numpy as np
if len(sys.argv) != 4:
    raise SystemExit(__doc__)
manifest = Path('docs/campaign-boss-art-manifest.json')
meta = json.loads(manifest.read_text()) if manifest.exists() else {}
designs = [
 (1,'crimson-bastion'),(2,'amethyst-orrery'),(3,'verdant-reaper'),(4,'tidal-razor'),
 (6,'cinder-gate'),(7,'ashen-ark'),(8,'prism-sovereign'),(9,'scythe-regent'),
 (11,'triarch-hydra'),(12,'null-cathedral'),(13,'eclipse-dreadnought'),(14,'eventide-nexus')]
assets = []
for group, path in enumerate(sys.argv[1:]):
    source = Image.open(path).convert('RGBA')
    source_hash = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    for cell in range(4):
        x, y = cell % 2, cell // 2
        crop = source.crop((x * source.width // 2, y * source.height // 2,
                            (x+1) * source.width // 2, (y+1) * source.height // 2))
        pixels = np.array(crop)
        alpha = pixels[:,:,3]
        alpha[alpha < 32] = 0
        alpha[alpha >= 200] = 255
        pixels[:,:,3] = alpha
        pixels[alpha == 0,:3] = 0
        crop = Image.fromarray(pixels)
        box = crop.getbbox()
        if not box: raise ValueError('Empty boss sprite')
        crop = crop.crop(box)
        crop.thumbnail((488,488), Image.Resampling.LANCZOS)
        image = Image.new('RGBA',(512,512))
        offset = ((512-crop.width)//2,(512-crop.height)//2)
        image.alpha_composite(crop,offset)
        stage, name = designs[group*4+cell]
        target = Path(f'public/assets/bosses/stage-{stage:02d}-{name}-v1.webp')
        image.save(target,'WEBP',quality=93,method=6,exact=True)
        assets.append({'stage':stage,'name':name,'path':str(target),'size':[512,512],
            'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
            'source_size':[source.width,source.height],'source_sha256':source_hash,
            'source_cell':cell,'source_crop':list(box),'content_rect':[*offset,crop.width,crop.height]})
meta.update({'generation':'Built-in ImageGen; three 2x2 design sheets followed by alpha/framing cleanup edits',
 'normalization':'Each cell alpha <32 removed and alpha >=200 made opaque; trim, fit within 488px, center on transparent 512px square; WebP quality 93',
 'assets':assets})
manifest.write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps({'designs':len(assets),'bytes':sum(a['bytes'] for a in assets),'decoded_rgba_mib':len(assets)},indent=2))
