"""Author the immersion pack from bundled CC0 recordings; no provider or download.

Requires numpy, scipy and imageio-ffmpeg. Writes only new files under
public/audio/immersion and its own source/validation manifest.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

try:
    import numpy as np
except ImportError:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tmp/audio-tools'))
    import numpy as np
from scipy import signal, ndimage
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/audio/immersion'
RATE = 32000
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
OUT.mkdir(parents=True, exist_ok=True)
records = []
sources = {}

def decode(path, stereo=False):
    result = subprocess.run([FFMPEG, '-v', 'error', '-i', str(ROOT / 'public/audio' / path),
        '-f', 'f32le', '-ac', '2' if stereo else '1', '-ar', str(RATE), '-'], check=True, stdout=subprocess.PIPE)
    return np.frombuffer(result.stdout, dtype=np.float32).copy().reshape(-1, 2) if stereo else np.frombuffer(result.stdout, dtype=np.float32).copy()

def source(name):
    if name not in sources:
        sources[name] = decode(name)
    return sources[name]

def filt(data, lo=None, hi=None):
    limits = [lo, hi] if lo and hi else lo or hi
    return signal.sosfilt(signal.butter(3, limits, btype='bandpass' if lo and hi else 'highpass' if lo else 'lowpass', fs=RATE, output='sos'), data).astype(np.float32)

def section(data, seconds, offset=0, speed=1):
    n = round(seconds * RATE)
    indices = (np.arange(n) * speed + offset * RATE) % len(data)
    return np.interp(indices, np.arange(len(data)), data).astype(np.float32)

def env(data, attack=.006, release=.12, decay=0):
    result = data.copy()
    a = min(len(result), max(1, round(attack * RATE)))
    r = min(len(result), max(1, round(release * RATE)))
    result[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    result[-r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    if decay:
        result *= np.exp(-np.arange(len(result)) / RATE * decay)
    return result

def mix(seconds, *layers):
    result = np.zeros(round(seconds * RATE), np.float32)
    for data, at, gain in layers:
        start = round(at * RATE)
        n = min(len(data), len(result) - start)
        if n > 0: result[start:start+n] += data[:n] * gain
    return result

def loop(data, crossfade=.25):
    # Constant-sum overlap eliminates endpoint discontinuities without a fade-to-silence gap.
    n = min(round(crossfade * RATE), len(data) // 4)
    head, tail = data[:n], data[-n:]
    ramp = np.linspace(0, 1, n, endpoint=False)
    if data.ndim == 2: ramp = ramp[:, None]
    joined = tail * (1-ramp) + head * ramp
    return np.concatenate([joined, data[n:-n]])

def write(name, data, provenance, looping=False, peak=.64, music=False):
    data = data - np.mean(data, axis=0)
    maximum = max(float(np.max(np.abs(data))), 1e-8)
    data = data * min(peak / maximum, 12)
    # Soft peak control keeps layered mechanical transients away from digital clipping.
    data = np.tanh(data * 1.12) / 1.12
    target = OUT / (name + '.ogg')
    channels = 1 if data.ndim == 1 else 2
    subprocess.run([FFMPEG, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', str(channels), '-i', '-',
        '-c:a', 'libvorbis', '-q:a', '3' if music else '4', str(target)], input=data.astype('<f4').tobytes(), check=True)
    records.append(dict(file=target.relative_to(ROOT / 'public').as_posix(), bytes=target.stat().st_size,
        sha256=hashlib.sha256(target.read_bytes()).hexdigest(), seconds=round(len(data)/RATE, 4),
        sampleRate=RATE, channels=channels, loop=looping, peak=round(float(np.max(np.abs(data))), 5),
        rms=round(float(np.sqrt(np.mean(data**2))), 5), sources=provenance))
    print(name, round(len(data)/RATE, 2), target.stat().st_size, flush=True)

bed = source('mesiah/hangar-bed.ogg')
vent = source('mesiah/hangar-ventilation.ogg')
rocket = source('mesiah/thruster-release.ogg')
start = source('mesiah/thruster-heat.ogg')
charge = source('boss/beam-charge.ogg')
cannon = source('boss/cannon.ogg')
hiss = source('boss/venom.ogg')
radio = source('mesiah/hostile-channel.ogg')
link = source('mesiah/transmission-link.ogg')
CC0 = ['mesiah/hangar-bed.ogg', 'mesiah/thruster-release.ogg', 'mesiah/thruster-heat.ogg', 'mesiah/hangar-ventilation.ogg', 'boss/beam-charge.ogg', 'boss/cannon.ogg', 'boss/venom.ogg', 'mesiah/hostile-channel.ogg', 'mesiah/transmission-link.ogg']

if '--scores-only' not in sys.argv:
    crack = env(filt(section(cannon, .2, .03, 1.4), 1300, 9500), release=.08, decay=6)
    metal = env(filt(section(start, .36, .32, 1.7), 550, 5500), release=.22, decay=4)
    pressure = env(filt(section(rocket, 1.1, .2, .62), 45, 700), attack=.02, release=.4, decay=2)
    glass = env(filt(section(charge, .5, .2, 1.3), 850, 8000), release=.26, decay=3)
    breath = env(filt(section(hiss, .65, 0, .8), 900, 9000), attack=.015, release=.3, decay=2.5)
    recipes = {
        'field-hit': mix(.52, (glass, 0, .8), (crack, 0, .32), (breath, .025, .15)),
        'shield-hit': mix(.5, (metal, 0, 1), (crack, 0, .4), (pressure, 0, .18)),
        'combined-hit': mix(.65, (glass, 0, .65), (metal, .008, .65), (pressure, .02, .3)),
        'field-break': mix(1.0, (breath, 0, .65), (glass[::-1], 0, .4), (pressure, .07, .35), (crack, .16, .35)),
        'shield-break': mix(1.1, (metal, 0, .8), (pressure, .02, .5), (crack, .08, .7), (crack, .24, .35), (breath, .13, .22)),
        'combined-break': mix(1.2, (glass, 0, .6), (metal, 0, .6), (breath, .05, .55), (pressure, .12, .65)),
        'hull-hit': mix(.55, (pressure, 0, .75), (metal, .005, .6), (crack, .02, .3)),
        'repair': mix(1.15, (env(filt(section(charge, .78, .1, .85)[::-1], 450, 6500), attack=.12, release=.2), .08, .65), (env(section(link, .22), release=.1), 0, .35), (breath, .4, .13)),
        'fighter-death': mix(.64, (pressure, 0, .6), (crack, .012, .6), (breath, .02, .35)),
        'armored-death': mix(1.45, (pressure, 0, 1), (metal, 0, .65), (crack, .2, .4), (breath, .38, .35)),
        'capital-death': mix(3.2, (pressure, 0, .8), (metal, .02, .55), (pressure, .31, .5), (crack, .43, .5), (pressure, .7, 1), (breath, .96, .7), (metal, 1.25, .3)),
        'deploy': mix(.9, (env(filt(section(start, .5, .12, .75), 180, 2800), release=.2), 0, .8), (metal, .25, .7), (crack, .4, .3)),
        'synergy': mix(.7, (env(filt(section(charge, .5, 0, 1.2), 600, 5000), attack=.025, release=.25), .05, .7), (metal, 0, .25)),
        'hq-warning': mix(.8, (env(filt(section(radio, .28, .05, 1.5), 800, 3600), release=.08), 0, .7), (env(section(link, .2), release=.1), .43, .55)),
        'crew-tools': mix(1.0, (metal, 0, .55), (crack, .19, .3), (metal, .45, .35)),
        'cargo': mix(2.8, (env(filt(section(vent, 2.4, 1, .6), 90, 1400), attack=.35, release=.55), 0, .7), (metal, .45, .4), (metal, 2.1, .45)),
        'radio-fragment': env(filt(section(radio, 1.5, .1, .85), 600, 3300), attack=.15, release=.5),
        'hull-tick': mix(.5, (metal, 0, .4), (crack, .09, .3)),
    }
    for name, data in recipes.items(): write(name, env(data, attack=.004, release=.05), CC0)
    for name, rate, low, high, grit in [
        ('rocket', .88, 55, 1900, .16), ('fast', 1.25, 120, 3300, .20),
        ('gatling', .72, 45, 2400, .55), ('laser', 1.15, 190, 4100, .08),
        ('dreadnought', .52, 35, 950, .32), ('xwing', 1.05, 70, 2600, .22),
        ('spaceEt', 1.42, 180, 3800, .07), ('mesiah', .66, 35, 1700, .30), ('coreLander', 1.18, 100, 3400, .16),
    ]:
        body = filt(section(bed, 6, .4, rate), low, high)
        turbine = filt(section(rocket, 6, .25, rate), max(150, low), high)
        roughness = 1 + grit * np.sin(np.arange(len(body))/RATE * 2*np.pi*(19 if name == 'gatling' else 11))
        data = loop(body*.65 + turbine * roughness*.22)
        write('engine-'+name, data, CC0, True, peak=.38)
    for name, rate, low, high, static in [
        ('stellar', .9, 55, 1700, .015), ('asteroid', .72, 40, 1200, .025),
        ('wreck', .62, 80, 1900, .10), ('ion', 1.2, 140, 4200, .12),
        ('ocean', .88, 100, 1700, .018), ('volcanic', .58, 35, 1100, .035), ('station', .76, 55, 1500, .025),
    ]:
        data = filt(section(vent, 14, 0, rate)*.58 + section(bed, 14, .3, rate)*.42, low, high)
        data += filt(section(radio, 14, .1, .5), 900, min(5000, high*2)) * static
        left = loop(data)
        right = loop(np.roll(data, round(.019*RATE))*.94)
        write('sector-'+name, np.column_stack([left,right]), CC0, True, peak=.38)
    # PA dialogue is produced by the local Windows voice, then treated as distant deck audio.
    for name in ['pa-clear-lane', 'pa-maintenance']:
        path = ROOT / 'tmp/audio-production' / (name+'.wav')
        if path.exists():
            data = np.frombuffer(subprocess.run([FFMPEG,'-v','error','-i',str(path),'-f','f32le','-ac','1','-ar',str(RATE),'-'],check=True,stdout=subprocess.PIPE).stdout,dtype=np.float32).copy()
            data = filt(data, 380, 3100)
            reverberation = data.copy()
            for delay,gain in [(.065,.18),(.117,.1),(.193,.06)]:
                n=round(delay*RATE)
                reverberation[n:] += data[:-n]*gain
            write(name, env(reverberation, release=.08), ['original scripted Windows Zira voice; dialogue recorded locally'], peak=.52)

# Percussive stems are extracted from the exact score, preserving its key, tempo and phrase boundaries.
score_sources = {
    'cruise': 'bgm_scifi_loop.ogg', 'amber': 'mesiah/amber-ringway.ogg', 'silent': 'mesiah/silent-fleet.ogg',
    'violet': 'mesiah/violet-deepfield.ogg', 'command': 'sfx_boss_battle.mp3', 'squid': 'bgm_boss_squid.mp3',
    'snake': 'bgm_boss_snake.mp3', 'final': 'bgm_boss_final.wav',
}
if '--effects-only' not in sys.argv:
    for name, path in score_sources.items():
        audio = decode(path)
        _, _, spectrum = signal.stft(audio, RATE, nperseg=1024, noverlap=768)
        magnitude = np.abs(spectrum)
        horizontal = ndimage.median_filter(magnitude, size=(1, 25))
        vertical = ndimage.median_filter(magnitude, size=(25, 1))
        mask = vertical**2 / (vertical**2 + horizontal**2 + 1e-10)
        _, percussion = signal.istft(spectrum * mask, RATE, nperseg=1024, noverlap=768)
        percussion = filt(percussion[:len(audio)], 90, 11000)
        write('score-'+name, percussion, [path, 'phase-aligned percussive separation of the bundled score; original attribution and license retained'], True, peak=.55, music=True)

manifest_path = OUT / 'manifest.json'
if manifest_path.exists():
    previous = json.loads(manifest_path.read_text(encoding='utf-8'))
    names = {entry['file'] for entry in records}
    records.extend(entry for entry in previous['files'] if entry['file'] not in names)
manifest_path.write_text(json.dumps(dict(version=1, method='Offline editing of bundled recordings; HPSS stems stay aligned to original scores.', files=sorted(records,key=lambda r:r['file'])),indent=2)+'\n',encoding='utf-8')
