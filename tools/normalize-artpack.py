#!/usr/bin/env python3
"""Normalize generated sprite sheets. No drawing: crop, shared nearest scale, anchors.
Usage: python tools/normalize-artpack.py --plan PLAN.json --results RESULTS.json
Raw generation provenance and prompts are recorded in assets/art-v78/prompts.json.
"""
import argparse, json
from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import label

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/art-v78'
parser = argparse.ArgumentParser()
parser.add_argument('--plan', required=True)
parser.add_argument('--results', required=True)
args = parser.parse_args()
plan = json.load(open(args.plan))
results = json.load(open(args.results))
manifest = {}

def clean(im):
    im = im.convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 160 else 0))
    return im

def save(key, im):
    dest = OUT / (key + '.png')
    im.save(dest, optimize=True)
    manifest[key] = str(dest.relative_to(ROOT))

for result in results:
    name = result['name']
    if name not in plan:
        continue
    spec = plan[name]
    sheet = clean(Image.open(result['path']))
    if spec.get('atlas'):
        # Retain the exact shipped autotile topology, including every corner.
        original = Image.open(ROOT / 'assets/frames' / (name + '.png')).convert('RGBA')
        atlas = sheet.resize(original.size, Image.Resampling.NEAREST)
        # Transparent generator padding cannot introduce holes in a wall.
        atlas = Image.composite(atlas, original, atlas.getchannel('A'))
        atlas.putalpha(original.getchannel('A'))
        save(name, atlas)
        continue
    cols, rows = spec['cols'], spec['rows']
    # Place cuts in empty gutters when a generated row drifts across the
    # nominal grid line. Never split feet between the idle and run rows.
    alpha = np.array(sheet)[:, :, 3] > 0
    def cuts(length, count, profile):
        smooth = np.convolve(profile, np.ones(7) / 7, mode='same')
        boundaries = [0]
        for index in range(1, count):
            nominal = round(index * length / count)
            radius = round(length / count * 0.25)
            choices = np.flatnonzero(smooth[max(0, nominal-radius):min(length, nominal+radius)] <= max(1, smooth.max() * 0.02)) + max(0, nominal-radius)
            boundaries.append(int(min(choices, key=lambda n: abs(n-nominal))) if len(choices) else nominal)
        return boundaries + [length]
    xs = cuts(sheet.width, cols, alpha.sum(axis=0))
    ys = cuts(sheet.height, rows, alpha.sum(axis=1))
    cells = []
    for i, key in enumerate(spec['keys']):
        cell = sheet.crop((xs[i % cols], ys[i // cols], xs[i % cols + 1], ys[i // cols + 1]))
        # Ignore isolated alpha speckles outside the sprite. Generated PNGs can
        # contain invisible-looking fringe pixels across the entire slot.
        rgba = np.array(cell)
        components, count = label(rgba[:, :, 3] > 0)
        if count:
            areas = np.bincount(components.ravel())
            areas[0] = 0
            keep = areas >= max(4, int(areas.max() * 0.003))
            keep[0] = False
            rgba[:, :, 3] = np.where(keep[components], 255, 0)
            cell = Image.fromarray(rgba)
        bbox = cell.getbbox()
        if not bbox:
            raise ValueError(f'Empty generated slot: {name} {i} {key}')
        cells.append(cell.crop(bbox))
    animated = name not in ['props', 'items', 'weapons-new', 'ui', 'floors', 'theme-moss', 'theme-ember', 'door-trims']
    if animated:
        w, h = spec['sizes'][0]
        if name == 'door':
            target_w, target_h = 51, 62
        elif name == 'torch':
            target_w, target_h = 14, 30
        elif name == 'chest':
            target_w, target_h = w - 1, h - 1
        else:
            target_w, target_h = w - 1, h - (4 if h >= 24 else 1)
        scale = min(target_w / max(c.width for c in cells), target_h / max(c.height for c in cells))
    for i, (key, cell, size) in enumerate(zip(spec['keys'], cells, spec['sizes'])):
        w, h = size
        if animated:
            resized = cell.resize((max(1, round(cell.width * scale)), max(1, round(cell.height * scale))), Image.Resampling.NEAREST)
            frame = Image.new('RGBA', (w, h))
            frame.alpha_composite(resized, ((w - resized.width) // 2, h - resized.height))
        elif name in ['floors', 'theme-moss', 'theme-ember']:
            frame = cell.resize((w, h), Image.Resampling.NEAREST)
            frame.putalpha(255)
        else:
            if name == 'ui':
                target = (46, 46)
            elif (ROOT / 'assets/frames' / (key + '.png')).exists():
                old = Image.open(ROOT / 'assets/frames' / (key + '.png')).convert('RGBA')
                box = old.getbbox()
                target = (box[2] - box[0], box[3] - box[1])
            else:
                target = (w - 2, h - 1)
            s = min(target[0] / cell.width, target[1] / cell.height)
            resized = cell.resize((max(1, round(cell.width * s)), max(1, round(cell.height * s))), Image.Resampling.NEAREST)
            frame = Image.new('RGBA', (w, h))
            bottom = h
            if name == 'props' and (ROOT / 'assets/frames' / (key + '.png')).exists():
                bottom = Image.open(ROOT / 'assets/frames' / (key + '.png')).convert('RGBA').getbbox()[3]
            y = (h - resized.height) // 2 if name == 'ui' else bottom - resized.height
            frame.alpha_composite(resized, ((w - resized.width) // 2, y))
        save(key, frame)

(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
(ROOT / 'art-pack.js').write_text('/* Generated sprite paths; stable Phaser keys retain saved games. */\nwindow.DungeonArtPack = Object.freeze(' + json.dumps(manifest, indent=2) + ');\n')
(OUT / 'prompts.json').write_text(json.dumps([{k: v for k, v in r.items() if k != 'path'} for r in results], indent=2) + '\n')
print(f'Normalized {len(manifest)} RGBA assets')
