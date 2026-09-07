# Dungeon of Ash

Spēlējama HTML5 dungeon piedzīvojumu spēle, kas veidota ar Phaser un lietotāja iesniegto **0x72 DungeonTileset II v1.7** assetu komplektu.

## Spēlēšana

Atver `index.html` pārlūkā. Spēle darbojas arī bez interneta.

- `WASD` vai bultiņas — kustība
- `SPACE` — zobena uzbrukums
- `E` — lāde, durvis un kāpnes
- `P` vai `ESC` — pauze

Telefonā spēle automātiski parāda virtuālo joystick un skārienvadības pogas.

Dungeonā ir savienotas telpas un gaiteņi, lamatas ar ekrāna kratīšanas efektu un HP joslas virs visiem monstriem.

## Mērķis

Atrodi lādi ar atslēgu, atver dēmona zāles durvis, sakauj Pelnu Dēmonu un ieej kāpnēs. Katrs nākamais stāvs kļūst grūtāks.

## Lokāls serveris

```bash
npm install
npm run serve
```

Pēc tam atver `http://127.0.0.1:8080`.

## Pārbaudes

```bash
npm test
node tests/file-smoke.js
node tests/playtest.js
```
