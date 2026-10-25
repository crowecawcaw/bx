# Tabernacle Explorer

Walk through the Old Testament tabernacle in 3D, built to the measurements in Exodus 25–40. It runs in a phone or desktop browser.

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

## Development

```sh
npm install
npm run dev
npm run build
```

Built with React, TypeScript, Vite, three.js and @react-three/fiber. The toon shading uses `MeshToonMaterial` with a 4-step ramp and inverted-hull outlines. All textures are drawn procedurally on canvas, so there are no image assets.

## Deployment (GitHub Pages)

- A push to `main` builds the site and publishes it to the `gh-pages` branch root (`.github/workflows/deploy.yml`).
- Each pull request builds a preview and publishes it to `gh-pages:/pr-preview/pr-<number>/`. A bot comment on the PR links to it. When the PR is merged or closed, the preview folder is deleted (`.github/workflows/pr-preview.yml`).

One-time setup: in **Settings → Pages**, set the source to **Deploy from a branch**, branch `gh-pages`, folder `/ (root)`.
