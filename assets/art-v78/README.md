# Dungeon of Ash — v78 art and content pack

237 game-ready RGBA PNGs, generated with the built-in image generation tool and normalized with nearest-neighbour sampling. Original 0x72-era proportions, stable Phaser texture keys, and existing saves are retained. The original assets remain available for rollback.

- Six armour appearances: steel, scout, ash, frost, rune, ember. Each has four idle frames, four movement frames and a hurt pose.
- Ten enemy types including the boss and mimic; the new wraith, spider and golem have separate idle/movement frames and distinct health, speed and detection ranges.
- Three procedural floor themes: stone crypt, mossy ruins and ember forge. Themes rotate each floor, change enemy pools, floor textures and loop probabilities.
- Seven forge stages: four swords followed by ember axe, frost spear and runeblade. Upgrades and the new maximum level persist across sessions.
- Redrawn walls, door animation, torches, columns, crates, stairs, banners, chests, NPCs, drops, hearts and nine control sprites.
- HUD, pause equipment display and forge preview use the same palette. The playfield retains three exposed hearts and compact controls.

## Generation and normalization

`prompts.json` records the generation brief per sheet. `normalization-plan.json` records slot order and output dimensions. `manifest.json` and the root `art-pack.js` map stable texture names to versioned files.

The reusable normalization script is `tools/normalize-artpack.py`. It requires Pillow, NumPy and SciPy. Supply `--plan` and `--results`; result entries contain `name`, raw generated PNG `path` and `prompt`. The script finds empty gutters, removes isolated alpha speckles, applies one scale to each animation family, anchors feet consistently, and preserves the exact original wall-atlas alpha topology. It never changes runtime collisions.

All new files use binary alpha; floor tiles are opaque. Open doorways have transparent centres. Menus and hearts use the same manifest as the world renderer.

## Verification

All 13 Node test suites pass, including complete live-texture coverage, distinct movement frames, theme/enemy generation, persistence through all seven weapon stages, 80 connected procedural maps, door transitions, collision clearance and aura bounds. PNG validation checks dimensions, alpha and the unchanged autotile topology. The normalized sprite sheets were visually inspected. Device/browser playtesting was not performed in this pass.
