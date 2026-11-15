import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).with_name("package-android-assets.py")


def pack(public, directory):
    dist, output = directory / "dist", directory / "packs"
    shutil.copytree(public, dist)
    (dist / "assets/index.js").write_text("game code")
    subprocess.run([sys.executable, SCRIPT, public, dist, output], check=True)
    assert (dist / "assets/index.js").read_text() == "game code"
    assert (dist / "assets/brand/zuki-logo-v1.png").read_bytes() == b"logo"
    assert (dist / "audio/immersion/manifest.json").read_bytes() == b'{"version":1,"files":[]}'
    assert (dist / "audio/ATTRIBUTION.txt").read_bytes() == b"source credits"
    assert (dist / "assets/catalog.json").read_bytes() == b'{"assets":[]}'
    manifest = json.loads((dist / "native-assets.json").read_text())
    media_by_hash = {}
    for name, asset in manifest["files"].items():
        assert not (dist / name).exists()
        data = (public / name).read_bytes()
        assert hashlib.sha256(data).hexdigest() == asset["hash"]
        assert len(data) == asset["bytes"]
        media_by_hash[asset["hash"]] = data
    for entry in manifest["packs"]:
        archive_path = output / (entry["hash"] + ".zip")
        assert hashlib.sha256(archive_path.read_bytes()).hexdigest() == entry["hash"]
        with zipfile.ZipFile(archive_path) as archive:
            assert sorted(archive.namelist()) == entry["files"]
            for digest in entry["files"]:
                assert archive.read(digest) == media_by_hash[digest]
    return manifest


with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    public = root / "public"
    for name, data in {
        "assets/brand/zuki-logo-v1.png": b"logo",
        "assets/ship.webp": b"ship",
        "assets/same-ship.webp": b"ship",
        "audio/score.ogg": b"music",
        "audio/immersion/manifest.json": b'{"version":1,"files":[]}',
        "audio/ATTRIBUTION.txt": b"source credits",
        "assets/catalog.json": b'{"assets":[]}',
    }.items():
        path = public / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    first = pack(public, root / "first")
    assert sum(len(item["files"]) for item in first["packs"]) == 2
    assert first == pack(public, root / "code-update")
    (public / "audio/score.ogg").write_bytes(b"new music")
    revised = pack(public, root / "art-update")
    assert first["files"]["assets/ship.webp"] == revised["files"]["assets/ship.webp"]
    assert first["files"]["audio/score.ogg"] != revised["files"]["audio/score.ogg"]
    assert {item["hash"] for item in first["packs"]} & {item["hash"] for item in revised["packs"]}
    print("Verified immutable Android media packs, deduplication, APK contents, and code-only reuse")

if "--built-assets" in sys.argv:
    public = Path("public")
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        dist = root / "dist"
        shutil.copytree("dist", dist)
        subprocess.run([sys.executable, SCRIPT, public, dist, root / "packs"], check=True)
        manifest = json.loads((dist / "native-assets.json").read_text())
        assert "audio/immersion/manifest.json" not in manifest["files"]
        assert (dist / "audio/immersion/manifest.json").read_bytes() == (public / "audio/immersion/manifest.json").read_bytes()
        assert len([name for name in manifest["files"] if name.startswith("audio/immersion/")]) == 44
        assert (dist / "index.html").is_file()
        assert all(not (dist / name).exists() for name in manifest["files"])
        print(f"Verified real production Android payload: {len(manifest['files'])} media files; JSON metadata retained in APK")
