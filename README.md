# Tabernacle Explorer

Walk through the Old Testament tabernacle in 3D, built to the measurements in Exodus 25–40, or through Solomon's Temple (`?site=temple`), built to 1 Kings 6–8 and 2 Chronicles 3–5. It runs in a phone or desktop browser. The intro screen switches between the two.

- **Tap** the ground to walk there (pathfinding goes around walls). **Drag** to look around. **WASD** or the arrow keys also work.
- **Tap a curtain** when you are close to draw it aside: the court gate, the door of the tent, or the veil.
- **Info bubbles** appear near key objects. Tap one to see each scriptural requirement, with the verse.
- **Scripture**: look up any verse in the bundled chapters (KJV).
- **Specs**: all 115 requirements from Scripture, grouped by object.
- **Layers**: peel back the four coverings (tachash skins, rams' skins, goats' hair, linen).
- **Map**: tap anywhere on the plan to walk there.

## Accuracy

One world unit is one cubit (about 18 in). Every commanded dimension, count, material and placement is modeled. That covers the 60 court pillars, the 48 boards on 96 silver sockets (plus 4 for the veil pillars: 100 in all, Ex 38:27), the 5 bars per side, the curtain sizes and their 50 clasps, and the furniture dimensions. All of it is listed with references in `src/data/specs.ts`, and `npm run check:refs` verifies that every reference resolves.

Where Scripture gives no detail, the model makes a choice and says so in the app ("Where Scripture is silent"). Examples: board thickness (1 cubit, per the Talmud), the tent's position in the court, the menorah's height, the laver's shape, and the embroidery pattern on the screens.

Fabric uses only the commanded colours: blue, purple, scarlet and fine twined linen. The veil and the inner curtains carry cherubim (Ex 26:1, 31). The gate and the door are needlework in the same colours without figures (Ex 26:36; 27:16). Each cloth hangs in folds that bunch up when drawn aside.

Scripture text is the King James Version (public domain), from [thiagobodruk/bible](https://github.com/thiagobodruk/bible). To regenerate it, run `npm run verses`.

## Solomon's Temple

Open with `?site=temple`. The house is 60 × 20 × 30 cubits with a 20-cubit cube for the oracle. The porch is 120 cubits high, as written in 2 Chr 3:4. The side chambers are 5, 6 and 7 cubits wide on narrowed rests. Jachin and Boaz have 400 pomegranates and seven chain wreaths each. The molten sea stands on twelve oxen with 300 knops to a row. Also modeled: the ten wheeled bases and lavers, the 20 × 20 × 10 bronze altar, the ten lampstands and ten tables, the golden altar, the doors of olive wood and fir, the chains of gold, the veil, and the two 10-cubit cherubim whose wings reach from wall to wall. All of it is listed in `src/data/templeSpecs.ts`.

Where Scripture is silent (wall thickness, the size of the courts, door heights, the altar's ramp) or the accounts differ (2,000 or 3,000 baths, one table or ten), the info panel says what the model chose and why.

## Development

```sh
npm install
npm run dev
npm run build
```

Built with React, TypeScript, Vite, three.js and @react-three/fiber. The toon shading uses `MeshToonMaterial` with a 4-step ramp and inverted-hull outlines. All textures are drawn procedurally on canvas, so there are no image assets.

## Deployment (GitHub Pages)

- A push to `main` builds the site and publishes it to the `gh-pages` branch root (`.github/workflows/deploy.yml`).
- Each pull request builds a preview and publishes it to `gh-pages:/pr-preview/pr-<number>/`. A bot comment on the PR links to both experiences. When the PR is merged or closed, the preview folder is deleted (`.github/workflows/pr-preview.yml`). This uses only git and the `gh` CLI on the runner, with no third-party actions.

One-time setup: in **Settings → Pages**, set the source to **Deploy from a branch**, branch `gh-pages`, folder `/ (root)`.
