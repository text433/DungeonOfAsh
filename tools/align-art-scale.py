#!/usr/bin/env python3
"""Match new content to the shipped 16px game scale; no artwork generation.
Run from any directory: python tools/align-art-scale.py
Uses one nearest-neighbour scale for each animation family and keeps foot anchors.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/art-v78'
OUT = ROOT / 'assets/art-v79'
OUT.mkdir(exist_ok=True)
previous = json.loads((SOURCE / 'manifest.json').read_text())
manifest = {}
# Restore the approved art. Merely keeping canvas dimensions equal did not keep
# the visible goblin/orc silhouettes, brick density, and UI rims at the old scale.
for key, value in previous.items():
    legacy = ROOT / 'assets/frames' / (key + '.png')
    if legacy.exists():
        manifest[key] = str(legacy.relative_to(ROOT))
    elif key.startswith(('moss_floor_', 'ember_floor_')):
        manifest[key] = 'assets/frames/floor_' + key.rsplit('_', 1)[1] + '.png'
    elif key.startswith('ui_') and (ROOT / 'assets/ui/v77' / (key[3:] + '.png')).exists():
        manifest[key] = 'assets/ui/v77/' + key[3:] + '.png'

profiles = {}
for name in ['frost', 'rune', 'ember']:
    keys = [f'{name}_{action}_f{i}' for action in ['idle', 'run'] for i in range(4)] + [f'{name}_hit_f0']
    profiles[name] = {'keys': keys, 'visible': [15, 21], 'canvas': [16, 28], 'reference': 'knight_m'}
for name, visible, canvas in [('wraith', [14, 16], [16, 24]), ('spider', [12, 9], [16, 16]), ('golem', [15, 16], [16, 23])]:
    profiles[name] = {'keys': [f'{name}_{action}_f{i}' for action in ['idle', 'run'] for i in range(4)], 'visible': visible, 'canvas': canvas}
for name, visible in [('weapon_ember_axe', [12, 24]), ('weapon_frost_spear', [8, 28]), ('weapon_runeblade', [10, 26])]:
    profiles[name] = {'keys': [name], 'visible': visible, 'canvas': [16, 32]}

report = {}
for name, profile in profiles.items():
    frames = [Image.open(SOURCE / (key + '.png')).convert('RGBA') for key in profile['keys']]
    crops = [im.crop(im.getbbox()) for im in frames]
    max_w, max_h = max(im.width for im in crops), max(im.height for im in crops)
    limit_w, limit_h = profile['visible']
    scale = min(limit_w / max_w, limit_h / max_h, 1)
    w, h = profile['canvas']
    for key, crop in zip(profile['keys'], crops):
        resized = crop.resize((max(1, int(crop.width * scale)), max(1, int(crop.height * scale))), Image.Resampling.NEAREST)
        # Nearest sampling can drop a one-pixel toe or handle at the border.
        # Anchor the visible result, not the transparent resize canvas.
        resized = resized.crop(resized.getbbox())
        frame = Image.new('RGBA', (w, h))
        bottom, center = h, w / 2
        if profile.get('reference'):
            action, index = key.split('_')[-2:]
            ref_key = profile['reference'] + '_' + action + '_anim_' + index
            box = Image.open(ROOT / 'assets/frames' / (ref_key + '.png')).getbbox()
            bottom, center = box[3], (box[0] + box[2]) / 2
        frame.alpha_composite(resized, (round(center - resized.width / 2), bottom - resized.height))
        frame.save(OUT / (key + '.png'), optimize=True)
        manifest[key] = 'assets/art-v79/' + key + '.png'
    report[name] = {**profile, 'scale': round(scale, 4), 'source_visible': [max_w, max_h]}

assert set(manifest) == set(previous), 'Every previously shipped texture needs a route'
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
(OUT / 'scale-profiles.json').write_text(json.dumps(report, indent=2) + '\n')
(ROOT / 'art-pack.js').write_text('/* Approved legacy art + additions aligned to its visible pixel scale. */\nwindow.DungeonArtPack = Object.freeze(' + json.dumps(manifest, indent=2) + ');\n')
print('Restored legacy routes and aligned', sum(len(p['keys']) for p in profiles.values()), 'new frames')
