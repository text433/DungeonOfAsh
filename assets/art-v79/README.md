# v79 — restore the established scale and visual baseline

The v78 replacement pack changed visible sprite bounds and floor pattern density even when PNG canvas sizes matched. This revision restores the v77 environment, original actors, items, doors and UI. Existing saves, new enemy types, six armour sets and seven weapon stages remain available.

The 54 frames for new armour, enemies and weapons use one nearest-neighbour scale per animation family. Knight frames follow the original knight's foot anchors. Wraiths and golems use existing enemy heights; the spider remains small. Weapon lengths fit the established carried-weapon scale. Forge previews use natural image ratios at 2× size.

`manifest.json` is the active texture routing table. Themes reuse the quieter original floor tiles while retaining their procedural routes and enemy pools. `scale-profiles.json` records visible pixel limits, canvas sizes and scale factors. Reproduce the normalization with `python tools/align-art-scale.py`; inputs are the retained v78 PNGs, without requiring regeneration.

The 13 existing suites pass. All new visible bounds and foot anchors were checked, legacy texture routes verified, and an aligned comparison sheet visually inspected. Device/browser playtesting has not been performed.
