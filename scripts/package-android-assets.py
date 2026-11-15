"""Split the completed Android web build into the APK payload and immutable media packs."""

import hashlib
import json
from argparse import ArgumentParser
import zipfile
from collections import defaultdict
from pathlib import Path

RELEASE = "android-assets-v1"
BASE_URL = f"https://github.com/zukito1411/space-defenders-impact/releases/download/{RELEASE}/"
LOGO = "assets/brand/zuki-logo-v1.png"
MEDIA_METADATA_SUFFIXES = {".txt", ".json"}


def package(public, dist, output):
    output.mkdir(parents=True, exist_ok=True)
    files = {}
    groups = defaultdict(dict)
    for media_root in ("assets", "audio"):
        for source in sorted((public / media_root).rglob("*")):
            name = source.relative_to(public).as_posix()
            # Credits and asset manifests remain ordinary APK files. Only binary
            # media is extracted into download packs; metadata must stay readable
            # before the native media store has been installed.
            if not source.is_file() or name == LOGO or source.suffix.lower() in MEDIA_METADATA_SUFFIXES:
                continue
            if source.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".svg", ".mp3", ".wav", ".ogg"}:
                raise ValueError(f"Unrecognized Android media: {name}")
            data = (dist / name).read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            files[name] = {"hash": digest, "bytes": len(data)}
            groups[digest[:2]][digest] = dist / name
    if not files:
        raise ValueError("No downloadable Android media")

    packs = []
    for bucket, entries in sorted(groups.items()):
        temporary = output / f"{bucket}.tmp"
        with zipfile.ZipFile(temporary, "w") as archive:
            for digest, path in sorted(entries.items()):
                item = zipfile.ZipInfo(digest, date_time=(2020, 1, 1, 0, 0, 0))
                archive.writestr(item, path.read_bytes(), zipfile.ZIP_DEFLATED, compresslevel=6)
        data = temporary.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        temporary.replace(output / f"{digest}.zip")
        packs.append({"hash": digest, "bytes": len(data), "files": sorted(entries)})

    manifest = {"version": 1, "baseUrl": BASE_URL, "files": files, "packs": packs}
    (dist / "native-assets.json").write_text(json.dumps(manifest, separators=(",", ":")), encoding="utf-8")
    for name in files:
        (dist / name).unlink()
    print(f"Android media: {len(files)} files in {len(packs)} packs, {sum(p['bytes'] for p in packs):,} bytes")


if __name__ == "__main__":
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("public", type=Path, nargs="?", default=Path("public"))
    parser.add_argument("dist", type=Path, nargs="?", default=Path("dist"))
    parser.add_argument("output", type=Path, nargs="?", default=Path("release/android-assets"))
    args = parser.parse_args()
    package(args.public, args.dist, args.output)
