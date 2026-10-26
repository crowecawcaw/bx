export interface Requirement {
  text: string;
  ref: string;
}

export interface Feature {
  id: string;
  name: string;
  hebrew?: string;
  /** World position (cubits) of the info bubble. */
  bubble: [number, number, number];
  /** Regions from which the bubble is visible. */
  regions: string[];
  /** Show the bubble when the player is within this distance. */
  radius: number;
  summary: string;
  requirements: Requirement[];
  /** Places where Scripture is silent and the model makes a choice. */
  interpretation?: string[];
  /** Further reading. */
  refs: string[];
}

export const FEATURES: Feature[] = [
  {
    id: 'court',
    name: 'The Court & its Hangings',
    hebrew: 'חֲצַר הַמִּשְׁכָּן (ḥatsar ha-mishkan)',
    bubble: [44, 6.2, -14],
    regions: ['court', 'camp'],
    radius: 26,
    summary:
      'A rectangular enclosure of white linen 100 × 50 cubits, five cubits high, hung on sixty pillars. It separated the dwelling of God from the camp.',
    requirements: [
      { text: 'Hangings of fine twined linen', ref: 'Exodus 27:9' },
      { text: 'South side 100 cubits: 20 pillars, 20 bronze sockets', ref: 'Exodus 27:9-10' },
      { text: 'North side 100 cubits: 20 pillars, 20 bronze sockets', ref: 'Exodus 27:11' },
      { text: 'West side 50 cubits: 10 pillars, 10 sockets', ref: 'Exodus 27:12' },
      { text: 'East side 50 cubits', ref: 'Exodus 27:13' },
      { text: 'Hooks and fillets (bands) of the pillars of silver', ref: 'Exodus 27:10-11' },
      { text: 'All pillars filleted with silver; sockets of bronze', ref: 'Exodus 27:17' },
      { text: 'Court 100 long, 50 broad, 5 cubits high', ref: 'Exodus 27:18' },
      { text: 'Capitals (chapiters) overlaid with silver', ref: 'Exodus 38:17' },
      { text: 'All the pins (pegs) of the court of bronze', ref: 'Exodus 27:19' },
      { text: 'Pins and cords for the court', ref: 'Exodus 35:18' },
    ],
    interpretation: [
      'Pillar size and material are not stated. Shown as acacia posts on bronze bases with silver caps.',
      'The 60 pillars are spaced every 5 cubits. Corner pillars are shared between two sides.',
    ],
    refs: ['Exodus 27:9-19', 'Exodus 38:9-20'],
  },
  {
    id: 'gate',
    name: 'The Gate of the Court',
    hebrew: 'שַׁעַר הֶחָצֵר (sha‘ar he-ḥatser)',
    bubble: [52, 6.4, 0],
    regions: ['court', 'camp'],
    radius: 16,
    summary:
      'The only way into the court: a 20-cubit screen on the east side, embroidered in blue, purple and scarlet on fine linen. Tap the screen to draw it aside.',
    requirements: [
      { text: 'Gate on the east side, toward the sunrise', ref: 'Exodus 27:13' },
      { text: 'Hangings of 15 cubits on each side of the gate, 3 pillars and 3 sockets each', ref: 'Exodus 27:14-15' },
      {
        text: 'Screen of 20 cubits: blue, purple, scarlet and fine twined linen, needlework',
        ref: 'Exodus 27:16',
      },
      { text: 'Four pillars and four sockets for the gate', ref: 'Exodus 27:16' },
      { text: 'Height 5 cubits, matching the hangings', ref: 'Exodus 38:18' },
    ],
    interpretation: [
      '"Needlework" (embroidery) is commanded, but no pattern is given. The pattern here is an abstract one in the four commanded colours. It has no cherubim, because cherubim are commanded only for the inner curtains and the veil.',
      'The gate is 20 cubits with 4 pillars, and each 15-cubit side hanging has 3 (Ex 27:14-16). With every pillar 5 cubits apart, corner and gate-post pillars are shared between sections, which is how the totals of 60 work out.',
    ],
    refs: ['Exodus 27:13-16', 'Exodus 38:18-19'],
  },
  {
    id: 'altar',
    name: 'Altar of Burnt Offering',
    hebrew: 'מִזְבַּח הָעֹלָה (mizbaḥ ha-‘olah)',
    bubble: [25, 5.2, 0],
    regions: ['court'],
    radius: 14,
    summary:
      'A hollow box of acacia wood overlaid with bronze, 5 × 5 cubits and 3 high. It stood before the door, where the sacrifices were offered.',
    requirements: [
      { text: 'Acacia wood, 5 cubits long, 5 broad, foursquare, 3 high', ref: 'Exodus 27:1' },
      { text: 'Horns on its four corners, of one piece with it, overlaid with bronze', ref: 'Exodus 27:2' },
      { text: 'Pans, shovels, basins, flesh-hooks and firepans of bronze', ref: 'Exodus 27:3' },
      { text: 'A grate of network of bronze with four bronze rings at its corners', ref: 'Exodus 27:4' },
      { text: 'Grate under the ledge, reaching halfway up the altar', ref: 'Exodus 27:5' },
      { text: 'Poles of acacia overlaid with bronze, in the rings on two sides', ref: 'Exodus 27:6-7' },
      { text: 'Hollow, made with boards', ref: 'Exodus 27:8' },
      { text: 'Set before the door of the tabernacle', ref: 'Exodus 40:6' },
    ],
    interpretation: ['The fire and smoke are illustrative. The pole length is not given.'],
    refs: ['Exodus 27:1-8', 'Exodus 38:1-7', 'Exodus 40:29'],
  },
  {
    id: 'laver',
    name: 'The Bronze Laver',
    hebrew: 'כִּיּוֹר (kiyyor)',
    bubble: [12, 4.4, 0],
    regions: ['court'],
    radius: 10,
    summary:
      'A bronze basin on a bronze stand, filled with water. The priests washed their hands and feet here before they served. It was made from the bronze mirrors of the serving women.',
    requirements: [
      { text: 'Laver of bronze with its foot (stand) of bronze, for washing', ref: 'Exodus 30:18' },
      { text: 'Between the tent of meeting and the altar, with water in it', ref: 'Exodus 30:18' },
      { text: 'Aaron and his sons wash hands and feet', ref: 'Exodus 30:19-21' },
      { text: "Made of the women's looking-glasses (mirrors)", ref: 'Exodus 38:8' },
      { text: 'Set between the tent and the altar', ref: 'Exodus 40:30-32' },
    ],
    interpretation: ['No size or shape is given. Shown as a round basin on a pedestal.'],
    refs: ['Exodus 30:17-21', 'Exodus 38:8', 'Exodus 40:30-32'],
  },
  {
    id: 'coverings',
    name: 'The Four Coverings',
    hebrew: 'יְרִיעֹת (yeri‘ot)',
    bubble: [-6, 12, 7.4],
    regions: ['court'],
    radius: 22,
    summary:
      'Four layers covered the tent: embroidered linen with cherubim, then goats’ hair, then rams’ skins dyed red, then an outer covering of tachash skins. Use the Layers button to peel them back.',
    requirements: [
      { text: '10 curtains of fine twined linen, blue, purple and scarlet, with cherubim', ref: 'Exodus 26:1' },
      { text: 'Each curtain 28 cubits long and 4 broad', ref: 'Exodus 26:2' },
      { text: 'Coupled five and five', ref: 'Exodus 26:3' },
      { text: '50 loops of blue on each set', ref: 'Exodus 26:4-5' },
      { text: '50 gold clasps (taches) join them into one tabernacle', ref: 'Exodus 26:6' },
      { text: "11 curtains of goats' hair as a tent over it", ref: 'Exodus 26:7' },
      { text: 'Each 30 cubits long and 4 broad', ref: 'Exodus 26:8' },
      { text: 'Coupled five and six; the sixth doubled at the front', ref: 'Exodus 26:9' },
      { text: '50 loops and 50 bronze clasps', ref: 'Exodus 26:10-11' },
      { text: 'Half a curtain hangs over the back', ref: 'Exodus 26:12' },
      { text: 'A cubit hangs over on each side', ref: 'Exodus 26:13' },
      { text: "Covering of rams' skins dyed red, and a covering of tachash skins above", ref: 'Exodus 26:14' },
    ],
    interpretation: [
      'No sizes are given for the rams’ skin and tachash coverings. Here they hang to the ground on the sides and back.',
      '"Tachash" is uncertain. It has been translated badger, porpoise, dugong, or fine leather. It is shown as blue-grey leather.',
      'The goats’-hair curtains are shown in the black of traditional Bedouin goat-hair tents.',
    ],
    refs: ['Exodus 26:1-14', 'Exodus 36:8-19'],
  },
  {
    id: 'door',
    name: 'The Door of the Tent',
    hebrew: 'מָסָךְ (masakh)',
    bubble: [1.6, 9, -3.5],
    regions: ['court', 'holy'],
    radius: 12,
    summary:
      'An embroidered screen of blue, purple and scarlet linen on five gold-covered pillars. It closed the east end of the Holy Place. Tap it to draw it aside.',
    requirements: [
      { text: 'Hanging for the door: blue, purple, scarlet, fine twined linen, needlework', ref: 'Exodus 26:36' },
      { text: 'Five pillars of acacia overlaid with gold, hooks of gold', ref: 'Exodus 26:37' },
      { text: 'Five sockets of bronze', ref: 'Exodus 26:37' },
      { text: 'Capitals and fillets overlaid with gold', ref: 'Exodus 36:38' },
      { text: 'Set up the hanging of the door', ref: 'Exodus 40:28' },
    ],
    interpretation: ['No embroidery pattern is given. Like the gate, it uses the four colours without cherubim.'],
    refs: ['Exodus 26:36-37', 'Exodus 36:37-38'],
  },
  {
    id: 'boards',
    name: 'Boards, Bars & Silver Sockets',
    hebrew: 'קְרָשִׁים (qerashim)',
    bubble: [-14, 7.5, 4.2],
    regions: ['holy'],
    radius: 9,
    summary:
      'The walls were upright boards of acacia overlaid with gold. Each stood in two silver sockets, and gold-covered bars held them together. Inside, the walls shone gold on every side.',
    requirements: [
      { text: 'Boards of acacia wood, standing up', ref: 'Exodus 26:15' },
      { text: 'Each board 10 cubits long, 1½ broad', ref: 'Exodus 26:16' },
      { text: 'Two tenons in each board', ref: 'Exodus 26:17' },
      { text: 'South side 20 boards on 40 silver sockets', ref: 'Exodus 26:18-19' },
      { text: 'North side 20 boards on 40 silver sockets', ref: 'Exodus 26:20-21' },
      { text: 'West side 6 boards, plus 2 corner boards', ref: 'Exodus 26:22-23' },
      { text: 'Corner boards coupled at the top in one ring', ref: 'Exodus 26:24' },
      { text: 'West: 8 boards, 16 silver sockets', ref: 'Exodus 26:25' },
      { text: 'Five bars for each side', ref: 'Exodus 26:26-27' },
      { text: 'Middle bar runs from end to end', ref: 'Exodus 26:28' },
      { text: 'Boards and bars overlaid with gold, with gold rings', ref: 'Exodus 26:29' },
      { text: '100 talents of silver cast the 100 sockets, a talent each', ref: 'Exodus 38:27' },
    ],
    interpretation: [
      'Board thickness is not stated. It is shown as 1 cubit, as in the Talmud (Shabbat 98b). Then 6 west boards (9 cubits) plus ½ cubit from each corner board make exactly 10 cubits inside.',
      'The 10-cubit height includes the tenons set into the silver sockets, so the walls stand 10 cubits from the ground.',
      'The bars are shown on the outside of the boards. Peel back the coverings to see them.',
    ],
    refs: ['Exodus 26:15-30', 'Exodus 36:20-34', 'Exodus 38:27'],
  },
  {
    id: 'table',
    name: 'Table of Showbread',
    hebrew: 'שֻׁלְחַן הַפָּנִים (shulḥan ha-panim)',
    bubble: [-10, 3.6, -3],
    regions: ['holy'],
    radius: 7,
    summary:
      'A gold-covered table on the north side of the Holy Place. It held twelve loaves, one for each tribe, set before the LORD every Sabbath.',
    requirements: [
      { text: 'Acacia wood, 2 cubits long, 1 broad, 1½ high', ref: 'Exodus 25:23' },
      { text: 'Overlaid with pure gold, with a crown of gold round about', ref: 'Exodus 25:24' },
      { text: 'A border of a handbreadth, with a gold crown on the border', ref: 'Exodus 25:25' },
      { text: 'Four gold rings at the four feet, by the border', ref: 'Exodus 25:26-27' },
      { text: 'Poles of acacia overlaid with gold', ref: 'Exodus 25:28' },
      { text: 'Dishes, spoons, covers and bowls of pure gold', ref: 'Exodus 25:29' },
      { text: 'Showbread before Me always', ref: 'Exodus 25:30' },
      { text: 'Twelve cakes in two rows, six in a row, with pure frankincense', ref: 'Leviticus 24:5-7' },
      { text: 'Set in order every Sabbath', ref: 'Leviticus 24:8' },
      { text: 'Put on the north side, outside the veil', ref: 'Exodus 40:22' },
    ],
    interpretation: [
      '"Rows" (ma‘arakhot) may also mean stacks. The loaves are shown as two stacks of six.',
    ],
    refs: ['Exodus 25:23-30', 'Exodus 37:10-16', 'Leviticus 24:5-9'],
  },
  {
    id: 'menorah',
    name: 'The Golden Lampstand',
    hebrew: 'מְנוֹרָה (menorah)',
    bubble: [-10, 5.4, 3],
    regions: ['holy'],
    radius: 7,
    summary:
      'Hammered from one talent of pure gold, with a central shaft and six branches decorated with almond blossoms. Its seven lamps were the only light in the Holy Place.',
    requirements: [
      { text: 'Pure gold, beaten work; shaft, branches, bowls, knops and flowers of one piece', ref: 'Exodus 25:31' },
      { text: 'Six branches, three on each side', ref: 'Exodus 25:32' },
      { text: 'Three almond-shaped bowls with knop and flower on each branch', ref: 'Exodus 25:33' },
      { text: 'Four almond-shaped bowls on the shaft', ref: 'Exodus 25:34' },
      { text: 'A knop under each pair of branches', ref: 'Exodus 25:35' },
      { text: 'Seven lamps, giving light in front of it', ref: 'Exodus 25:37' },
      { text: 'Tongs and snuff dishes of pure gold', ref: 'Exodus 25:38' },
      { text: 'Made of a talent of pure gold', ref: 'Exodus 25:39' },
      { text: 'Pure beaten olive oil, burning continually', ref: 'Leviticus 24:2-4' },
      { text: 'On the south side, opposite the table', ref: 'Exodus 40:24-25' },
    ],
    interpretation: [
      'Height and branch shape are not given. Shown about 3 cubits tall, shaped like an almond bough: curved branches that taper, each with three almond cups, knops and flowers (Ex 25:33). Some (e.g. Maimonides) drew straight diagonal branches.',
      'Scripture says the lamps give light "over against it" (Ex 25:37), but not which way the branches face. Here they run north–south so the face turns toward the entrance; others turn it toward the table.',
      'The three curved legs follow Rashi on Ex 25:31.',
    ],
    refs: ['Exodus 25:31-40', 'Exodus 37:17-24', 'Leviticus 24:1-4'],
  },
  {
    id: 'incense',
    name: 'Altar of Incense',
    hebrew: 'מִזְבַּח הַקְּטֹרֶת (mizbaḥ ha-qetoret)',
    bubble: [-18.5, 3.6, 0],
    regions: ['holy'],
    radius: 6,
    summary:
      'A small gold altar right in front of the veil. Sweet incense was burned on it every morning and evening, so its smoke rose toward the mercy seat beyond.',
    requirements: [
      { text: 'Acacia wood', ref: 'Exodus 30:1' },
      { text: '1 cubit long, 1 broad, foursquare, 2 high, horns of one piece', ref: 'Exodus 30:2' },
      { text: 'Top, sides and horns overlaid with pure gold; a crown of gold', ref: 'Exodus 30:3' },
      { text: 'Two gold rings under the crown on two sides', ref: 'Exodus 30:4' },
      { text: 'Poles of acacia overlaid with gold', ref: 'Exodus 30:5' },
      { text: 'Before the veil that is by the ark', ref: 'Exodus 30:6' },
      { text: 'Sweet incense every morning and evening', ref: 'Exodus 30:7-8' },
      { text: 'Put the golden altar before the veil', ref: 'Exodus 40:26-27' },
    ],
    refs: ['Exodus 30:1-10', 'Exodus 37:25-29'],
  },
  {
    id: 'veil',
    name: 'The Veil',
    hebrew: 'פָּרֹכֶת (parokhet)',
    bubble: [-19.2, 9, 3],
    regions: ['holy', 'holiest'],
    radius: 8,
    summary:
      'A woven curtain of blue, purple, scarlet and fine linen with cherubim. It hung on four gold-covered pillars and divided the Holy Place from the Most Holy Place. Only the high priest went beyond it, once a year. Tap it to draw it aside.',
    requirements: [
      { text: 'Blue, purple, scarlet, fine twined linen, of skilful (woven) work, with cherubim', ref: 'Exodus 26:31' },
      { text: 'Hung on four pillars of acacia overlaid with gold, hooks of gold', ref: 'Exodus 26:32' },
      { text: 'Four sockets of silver', ref: 'Exodus 26:32' },
      { text: 'Hung under the clasps; divides the holy place from the most holy', ref: 'Exodus 26:33' },
      { text: 'Table outside the veil on the north, lampstand on the south', ref: 'Exodus 26:35' },
      { text: 'Veil set up to screen the ark', ref: 'Exodus 40:21' },
      { text: 'Into the second, the high priest alone, once every year', ref: 'Hebrews 9:7' },
    ],
    refs: ['Exodus 26:31-35', 'Exodus 36:35-36', 'Hebrews 9:1-8'],
  },
  {
    id: 'ark',
    name: 'Ark of the Covenant & Mercy Seat',
    hebrew: 'אֲרוֹן הָעֵדֻת · כַּפֹּרֶת (aron ha-‘edut · kapporet)',
    bubble: [-25, 4.6, 0],
    regions: ['holiest'],
    radius: 8,
    summary:
      'A gold-covered chest holding the tablets of the covenant. Its lid, the mercy seat, was one piece of pure gold with two cherubim. "There I will meet with thee" (Ex 25:22).',
    requirements: [
      { text: 'Acacia wood, 2½ cubits long, 1½ broad, 1½ high', ref: 'Exodus 25:10' },
      { text: 'Overlaid with pure gold within and without; a crown of gold round about', ref: 'Exodus 25:11' },
      { text: 'Four rings of gold in its four feet, two on each side', ref: 'Exodus 25:12' },
      { text: 'Poles of acacia overlaid with gold, through the rings', ref: 'Exodus 25:13-14' },
      { text: 'The poles are never removed', ref: 'Exodus 25:15' },
      { text: 'The testimony placed inside', ref: 'Exodus 25:16' },
      { text: 'Mercy seat of pure gold, 2½ by 1½ cubits', ref: 'Exodus 25:17' },
      { text: 'Two cherubim of beaten gold at the two ends, of one piece with the mercy seat', ref: 'Exodus 25:18-19' },
      { text: 'Wings spread on high covering the mercy seat; faces toward one another', ref: 'Exodus 25:20' },
      { text: 'Placed in the most holy place', ref: 'Exodus 26:34' },
      { text: 'Contained the golden pot of manna, Aaron’s rod and the tablets', ref: 'Hebrews 9:4' },
    ],
    interpretation: [
      'The cherubim’s form is not described. They are shown kneeling and bowed toward the mercy seat, their wings meeting above it.',
      'Which way the ark sat is not stated. Here it follows the Talmud (Menachot 98a-b) and Rashi on Ex 25:12: the ark’s length runs north–south, and the poles run east–west across its short ends, 2½ cubits apart, so bearers could walk between them. That lets the pole ends press toward the veil and be seen from the Holy Place (1 Kings 8:8). Many Christian illustrations instead put the poles along the long sides.',
      'The soft light above the mercy seat stands for the Presence (Lev 16:2). It is not a lamp.',
    ],
    refs: ['Exodus 25:10-22', 'Exodus 37:1-9', 'Hebrews 9:3-5'],
  },
  {
    id: 'cloud',
    name: 'The Cloud of Glory',
    bubble: [-25, 30, 0],
    regions: ['camp', 'court'],
    radius: 90,
    summary:
      'When the tabernacle was finished, the cloud covered the tent and the glory of the LORD filled it. When the cloud lifted, Israel set out.',
    requirements: [
      { text: 'Reared up on the first day of the first month', ref: 'Exodus 40:17' },
      { text: 'The cloud covered the tent; glory filled the tabernacle', ref: 'Exodus 40:34-35' },
      { text: 'Cloud by day, fire by night, in the sight of all Israel', ref: 'Exodus 40:36-38' },
    ],
    refs: ['Exodus 40:17-38'],
  },
];

/** Materials offered for the work and the metal totals recorded afterwards. */
export const GENERAL: Requirement[] = [
  { text: 'A sanctuary, after the pattern shown on the mount', ref: 'Exodus 25:8-9' },
  { text: "Materials: gold, silver, bronze, blue, purple, scarlet, fine linen, goats' hair, rams' skins dyed red, tachash skins, acacia wood", ref: 'Exodus 25:3-5' },
  { text: 'Offerings given willingly', ref: 'Exodus 35:5' },
  { text: 'Bezalel and Aholiab filled with wisdom to make it', ref: 'Exodus 31:1-6' },
  { text: 'Gold: 29 talents, 730 shekels', ref: 'Exodus 38:24' },
  { text: 'Silver: 100 talents, 1,775 shekels', ref: 'Exodus 38:25' },
  { text: 'Bronze: 70 talents, 2,400 shekels', ref: 'Exodus 38:29' },
  { text: 'Moses saw all the work done as commanded, and blessed them', ref: 'Exodus 39:42-43' },
];
