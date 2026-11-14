# Tabernacle Explorer

Walk through the Old Testament tabernacle in 3D, built to the measurements in Exodus 25–40, or through Solomon's Temple (`?site=temple`), built to 1 Kings 6–8 and 2 Chronicles 3–5, or the second temple as Herod rebuilt it (`?site=second`), or the temple of Ezekiel's vision (`?site=ezekiel`, Ezekiel 40–48), or cross the Red Sea (`?site=sea`, Exodus 14). **Side by side** (`?site=compare`) shows the tabernacle and the three temples together at one scale, and the camera flies around them. It runs in a phone or desktop browser. The intro screen switches between them.

- **Tap** the ground to walk there (pathfinding goes around walls). **Double-tap** to jump there. **Drag** to look around. **WASD** or the arrow keys also work.
- **Tap a curtain** when you are close to draw it aside: the court gate, the door of the tent, or the veil.
- **Info bubbles** appear near key objects. Tap one to see each scriptural requirement, with the verse.
- **Scripture**: look up any verse in the bundled chapters (KJV).
- **Specs**: all 115 requirements from Scripture, grouped by object.
- **Layers**: peel back the four coverings (tachash skins, rams' skins, goats' hair, linen).
- **Map**: tap anywhere on the plan to walk there, or double-tap to jump.

## Accuracy

One world unit is one cubit (about 18 in). Every commanded dimension, count, material and placement is modeled. That covers the 60 court pillars, the 48 boards on 96 silver sockets (plus 4 for the veil pillars: 100 in all, Ex 38:27), the 5 bars per side, the curtain sizes and their 50 clasps, and the furniture dimensions. All of it is listed with references in `src/data/specs.ts`, and `npm run check:refs` verifies that every reference resolves.

Where Scripture gives no detail, the model makes a choice and says so in the app ("Where Scripture is silent"). Examples: board thickness (1 cubit, per the Talmud), the tent's position in the court, the menorah's height, the laver's shape, and the embroidery pattern on the screens.

Fabric uses only the commanded colours: blue, purple, scarlet and fine twined linen. The veil and the inner curtains carry cherubim (Ex 26:1, 31). The gate and the door are needlework in the same colours without figures (Ex 26:36; 27:16). Each cloth hangs in folds that bunch up when drawn aside.

Scripture text is the King James Version (public domain), from [thiagobodruk/bible](https://github.com/thiagobodruk/bible). To regenerate it, run `npm run verses`.

## Solomon's Temple

Open with `?site=temple`. The house is 60 × 20 × 30 cubits with a 20-cubit cube for the oracle. The porch is 120 cubits high, as written in 2 Chr 3:4. The side chambers are 5, 6 and 7 cubits wide on narrowed rests. Jachin and Boaz have 400 pomegranates and seven chain wreaths each. The molten sea stands on twelve oxen with 300 knops to a row. Also modeled: the ten wheeled bases and lavers, the 20 × 20 × 10 bronze altar, the ten lampstands and ten tables, the golden altar, the doors of olive wood and fir, the chains of gold, the veil, and the two 10-cubit cherubim whose wings reach from wall to wall. All of it is listed in `src/data/templeSpecs.ts`.

Where Scripture is silent (wall thickness, the size of the courts, door heights, the altar's ramp) or the accounts differ (2,000 or 3,000 baths, one table or ten), the info panel says what the model chose and why.

## The Second Temple

Open with `?site=second`. This is the house of the Gospels and Acts: Zerubbabel's temple (Ezra 3–6; Haggai 2) as Herod rebuilt it, "forty and six years in building" (John 2:20). Scripture gives only the 60 × 60 cubits of Cyrus's decree (Ezra 6:3), so the plan follows the Mishnah tractate Middot, with Josephus where Middot is silent. Each info panel says which.

- **The mount** is 500 cubits square (Middot 2:1), with double porticoes on three sides (Solomon's Porch on the east, John 10:23; Acts 3:11), the Royal Stoa on the south, and the fortress Antonia at the north-west corner (Acts 21:34-40).
- **The soreg** is the low lattice that Gentiles could not pass (Acts 21:28; Eph 2:14). Inside it, the chel and twelve steps lead up to the Court of the Women (135 × 135, with its four corner chambers and the treasury chests of Mark 12:41). The Beautiful gate of Acts 3:2 is shown as its east gate.
- **The fifteen curved steps** go up to the Nicanor gate and the Court of Israel, 2½ cubits below the Court of the Priests. Then come the altar of unhewn stone (32 square, with its ramp, horns and red line), the laver with twelve spigots, and the place of slaughtering.
- **The house** is 100 × 100 × 100 with a porch 100 broad, a front overlaid with gold, golden spikes on the roof and the golden vine over the door. It is entered by twelve steps. Inside are the Holy Place (40 × 20 × 40) with one lampstand, one table and the golden altar, and **two curtains a cubit apart** (Matt 27:51; Mishnah Yoma 5:1). The empty Most Holy Place holds only the foundation stone.

It stands in the same Jerusalem landscape as Solomon's Temple, on Herod's larger platform. Tap the Nicanor gate, the doors of the Holy Place, or the veil to open them. The code is in `src/second/`, and the verses and notes are in `src/data/secondSpecs.ts`.

## Ezekiel's Temple

Open with `?site=ezekiel`. This is the temple Ezekiel saw in a vision in the 25th year of the exile (Ezek 40:1-4). It was never built. Ezekiel measures it in more detail than any other sanctuary, and the model follows his measurements in his long cubit, "a cubit and an hand breadth" (40:5). The parts along the east–west line add up to the 500 cubits of the wall: outer gate 50, outer court 100, inner gate 50, inner court 100, the house 100, and the separate place and the building behind it 100. The altar stands at the centre of the whole square.

- **The wall** is 500 cubits square, a reed thick and a reed high (40:5; 42:15-20). The King James Version reads "reeds" in 42:16-20, and the info panel explains why the model uses cubits.
- **Six gates** of one measure, 50 × 25, with three guard chambers on each side, two thresholds, a porch and palm trees carved on the posts (40:6-37). The outer gates have seven steps up; the inner gates, turned about, have eight. The outer east gate is shut for good, because the glory of the LORD came in by it (43:1-5; 44:1-3). The inner east gate opens on the sabbath (46:1); tap it.
- **The outer court** has its pavement, thirty chambers and the four kitchens in the corners (40:17-18; 46:21-24). **The inner court** is 100 square, with the priests' chambers, the eight tables at the north gate (40:38-46) and the stepped altar with its stairs on the east (43:13-17).
- **The house** stands on a foundation six cubits high (41:8), with side chambers in three storeys on three sides. Inside are a holy place 40 × 20 panelled in wood carved with two-faced cherubim (a man's face and a young lion's) and palm trees (41:16-20), the wooden altar that is "the table that is before the LORD" (41:22), and an empty most holy place, 20 × 20, filled with the glory (43:5). Both rooms have folding doors (41:23-24), with no veil.
- **The water** trickles from under the threshold, south of the altar, and out under the shut east gate (47:1-2). Outside, it runs down the mountain as a river with trees on both banks, toward a sea (47:3-12). South, below the mountain, lies the city with twelve gates (40:2; 48:30-35).

Most heights are not given, and the info panels say what the model chose. They also set out the main ways the vision has been read (a temple still to come, a plan offered on condition, or a picture fulfilled in Christ and in Revelation 21–22), without choosing between them. The code is in `src/ezekiel/`, and the verses and notes are in `src/data/ezekielSpecs.ts`.

## Side by side

Open with `?site=compare`. The tabernacle, Solomon's Temple, the second temple and Ezekiel's temple stand in a row, facing east, with their Most Holy Places on one north–south line. One world unit is one cubit for all four (Ezekiel's cubit is a handbreadth longer, so his temple is drawn about a sixth smaller than true). The camera circles them on its own. Drag to turn, pinch or scroll to zoom, or tap a name to fly to it. **Houses only** hides the courts and slides the houses together. **Facts** shows a table of their measurements, with the verses. The code is in `src/compare/`.

## The Red Sea

Open with `?site=sea`. You walk east along the dry seabed with the multitude, between two walls of water that lean in with breaking crests (Ex 14:22; 15:8). Fish swim and bubbles rise behind the glassy faces, and the east wind tears spray off the tops (Ex 14:21). The pillar of cloud stands behind you, between Israel and Egypt (Ex 14:19-20), and the far shore glows with the dawn (Ex 14:27).

The crowd includes children, people carrying bundles on their heads and shoulders (Ex 12:34), staffs and packs, and flocks and herds (Ex 12:38). Each person has a head, neck and nose, a headcloth, veil or hair (some with beards), a belted robe, swinging arms and striding legs. A few hundred walkers are recycled around you.

After about 600 cubits the seabed curves up toward the shore. Step onto dry land above the level of the sea and the waters return behind you (Ex 14:26-28). Starting at the shore and racing back toward Egypt, the walls surge up, curl over the path and crash down with spray, then level into open sea. You watch from the shore with the multitude, and **Cross again** takes you back to the start. The path's width (40 cubits), the walls' height (56 cubits) and the slope are the model's choices. The code is in `src/sea/` and the verses are in `src/data/seaSpecs.ts`.

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
