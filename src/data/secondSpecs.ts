import { ALTAR, ANTONIA, HOUSE, LAVER, MOUNT, PORTICO, POS, SOREG, STOA, WOMEN, Y } from '../second/dims';
import type { Feature, Requirement } from './specs';

// The second temple: the house rebuilt after the exile (Ezra 1–6; Haggai 2), and the same house as
// Herod enlarged it, where Jesus taught and the apostles preached (the Gospels and Acts).
// Scripture gives only the 60 × 60 of Cyrus's decree; the plan follows the Mishnah tractate Middot
// and Josephus (Antiquities 15.11; War 5.5), and each "Where Scripture is silent" note says so.

const H = Y.house;
const PORTICO_Y = PORTICO.height + 6;
const STOA_TOP = STOA.height + 3;

export const SECOND_FEATURES: Feature[] = [
  {
    id: 'house',
    name: 'The House',
    hebrew: 'הַהֵיכָל (ha-heikhal) · ναός (naos)',
    bubble: [-50, H + 102, -40],
    regions: ['gentiles', 'solomons', 'stoa', 'porticoes', 'chel', 'women', 'israel', 'priests'],
    radius: 260,
    summary:
      'The house Herod rebuilt on the foundations of the second temple: a hundred cubits long, a hundred high, and a hundred broad across its porch, of great white stones with a front overlaid with gold. "Forty and six years" in building by the time of Jesus, it was thrown down in AD 70, as he had said.',
    requirements: [
      { text: '"Forty and six years was this temple in building"', ref: 'John 2:20' },
      { text: 'The disciples came to shew him the buildings of the temple', ref: 'Matthew 24:1' },
      { text: '"See what manner of stones and what buildings are here!"', ref: 'Mark 13:1' },
      { text: 'Adorned with goodly stones and gifts', ref: 'Luke 21:5' },
      { text: 'The gold of the temple, and the temple that sanctifieth the gold', ref: 'Matthew 23:16-17' },
      { text: 'Not one stone left upon another that shall not be thrown down', ref: 'Mark 13:2' },
      { text: '"Destroy this temple, and in three days I will raise it up"; he spake of the temple of his body', ref: 'John 2:19-21' },
    ],
    interpretation: [
      'Scripture gives no measurements for Herod’s house. The model follows the Mishnah (Middot 4:6-7): 100 cubits long and 100 high, 70 broad behind the porch and 100 across it, the porch standing out 15 cubits on each side "like a lion, narrow behind and broad in front".',
      'The house stands on a foundation 6 cubits high, 12 steps above the court (Middot 3:6; 4:6). Above the Holy Place was an upper storey of the same height, and chambers in three storeys ran round the north, south and west (Middot 4:3-5); they are shown from the outside only.',
      'Josephus says the front was covered with plates of gold that flashed like the sun, and the rest of the house was so white that from afar it looked like a mountain of snow, with sharp golden spikes on the roof to keep birds off (War 5.5.6). Middot 4:6 calls that last cubit the "scarecrow".',
      'One world unit is one cubit, as in the tabernacle and Solomon’s Temple, so the three can be compared directly.',
    ],
    refs: ['John 2:13-21', 'Mark 13:1-2', 'Luke 21:5-6', 'Matthew 24:1-2'],
  },
  {
    id: 'rebuilt',
    name: 'The House Rebuilt',
    hebrew: 'הַבַּיִת הָאַחֲרוֹן (ha-bayit ha-aḥaron)',
    bubble: [HOUSE.backX - 6, Y.priests + 14, 44],
    regions: ['priests', 'israel'],
    radius: 60,
    summary:
      'Cyrus of Persia let the exiles go home to build the house again. Zerubbabel and Jeshua set up the altar first and then laid the foundation; the old men who had seen Solomon’s house wept. Haggai promised that the glory of this latter house would be greater than the former.',
    requirements: [
      { text: 'Cyrus charged to build the LORD an house at Jerusalem', ref: 'Ezra 1:2-3' },
      { text: 'The vessels Nebuchadnezzar had taken were brought back: 5,400 of gold and silver', ref: 'Ezra 1:7-11' },
      { text: 'The foundation laid with trumpets and cymbals; the ancient men wept, many shouted for joy', ref: 'Ezra 3:10-12' },
      { text: 'Builded with great stones, and timber laid in the walls', ref: 'Ezra 5:8' },
      { text: 'The height threescore cubits and the breadth threescore cubits', ref: 'Ezra 6:3' },
      { text: 'Three rows of great stones and a row of new timber', ref: 'Ezra 6:4' },
      { text: 'Finished the third day of Adar, in the sixth year of Darius', ref: 'Ezra 6:15' },
      { text: 'Dedicated with joy, with 100 bullocks, 200 rams, 400 lambs and 12 he goats', ref: 'Ezra 6:16-17' },
      { text: '"Is it not in your eyes in comparison of it as nothing?"', ref: 'Haggai 2:3' },
      { text: '"The glory of this latter house shall be greater than of the former"', ref: 'Haggai 2:9' },
    ],
    interpretation: [
      'The model shows the house as it stood in the Gospels, after Herod’s rebuilding (begun about 20 BC). It stood on the same place as Zerubbabel’s house and was always counted the same "second" house.',
      'Cyrus’s decree gives 60 cubits of height and breadth (Ezra 6:3) but no length, and Scripture does not say how far Zerubbabel’s builders reached them. Herod’s house was larger: 100 cubits each way (Middot 4:6). The hekal and the Holy of Holies together are 60 cubits long (40 + 20), as in Solomon’s house.',
    ],
    refs: ['Ezra 1:1-11', 'Ezra 3:8-13', 'Ezra 6:1-18', 'Haggai 2:1-9'],
  },
  {
    id: 'porch',
    name: 'The Porch and the Golden Vine',
    hebrew: 'אוּלָם (ulam) · גֶּפֶן שֶׁל זָהָב (gefen shel zahav)',
    bubble: [6, H + 46, 0],
    regions: ['israel', 'priests', 'porch'],
    radius: 70,
    summary:
      'An open porch a hundred cubits across, its entrance 40 cubits high and 20 broad, with no doors. Over the door of the Holy Place hung a golden vine, with grape clusters as tall as a man.',
    requirements: [
      { text: 'Zacharias was slain "between the temple and the altar"', ref: 'Matthew 23:35' },
      { text: 'Whoso shall swear by the temple sweareth by it, and by him that dwelleth therein', ref: 'Matthew 23:21' },
      { text: 'Judas cast down the pieces of silver in the temple', ref: 'Matthew 27:5' },
    ],
    interpretation: [
      'The porch’s entrance was 40 cubits high and 20 broad, with five carved beams of oak above it (Middot 3:7). Josephus says it had no doors, showing heaven open to all (War 5.5.4).',
      'The golden vine "stood over the entrance to the hekal, trained on posts"; anyone who gave a leaf, a grape or a cluster brought it and hung it there (Middot 3:8). Josephus describes its clusters as the height of a man (Antiquities 15.11.3).',
      'The steps up to the porch, 12 of half a cubit each, are 50 cubits broad here (Middot 3:6 gives their rise and tread, not their breadth).',
    ],
    refs: ['Matthew 23:16-22', 'Matthew 23:35'],
  },
  {
    id: 'holy',
    name: 'The Holy Place',
    hebrew: 'הֵיכָל (heikhal)',
    bubble: [-40, H + 9, 0],
    regions: ['holy', 'porch'],
    radius: 26,
    summary:
      'A room 40 cubits long, 20 broad and 40 high, overlaid with gold, with one lampstand on the south, the table of showbread on the north, and the golden altar of incense between them. Here Zacharias burned incense when the angel Gabriel appeared to him.',
    requirements: [
      { text: 'In the first tabernacle the candlestick, the table and the shewbread', ref: 'Hebrews 9:2' },
      { text: 'Zacharias’s lot was to burn incense when he went into the temple', ref: 'Luke 1:8-9' },
      { text: 'The people prayed without at the time of incense', ref: 'Luke 1:10' },
      { text: 'An angel stood on the right side of the altar of incense', ref: 'Luke 1:11' },
      { text: 'The feast of the dedication, in winter', ref: 'John 10:22' },
    ],
    interpretation: [
      'Its size, 40 by 20 and 40 high, is from Middot 4:6-7. The door was 20 cubits high and 10 broad, with doors of gold folding back against the walls (Middot 4:1-2).',
      'The vessels Antiochus took were remade by Judas Maccabeus, who cleansed the house and lit the lamps again (1 Maccabees 4:49-51); the feast of the dedication (John 10:22) remembers it. Like the tabernacle, it had one lampstand and one table (Josephus, War 5.5.5), placed as Exodus 26:35 places them.',
      'The lampstand, table and altar are drawn with the tabernacle’s measurements.',
    ],
    refs: ['Luke 1:5-23', 'Hebrews 9:1-5', 'John 10:22-23'],
  },
  {
    id: 'veil',
    name: 'The Veil',
    hebrew: 'פָּרֹכֶת (parokhet) · καταπέτασμα (katapetasma)',
    bubble: [HOUSE.veilEast + 1.5, H + 16, -4],
    regions: ['holy', 'holiest'],
    radius: 24,
    summary:
      'Two curtains, a cubit apart, closed off the Most Holy Place. When Jesus died, "the veil of the temple was rent in twain from the top to the bottom."',
    requirements: [
      { text: 'The veil of the temple was rent in twain from the top to the bottom', ref: 'Matthew 27:51' },
      { text: 'Rent in twain from the top to the bottom', ref: 'Mark 15:38' },
      { text: 'The sun was darkened, and the veil was rent in the midst', ref: 'Luke 23:45' },
      { text: 'After the second veil, the Holiest of all', ref: 'Hebrews 9:3' },
      { text: 'A new and living way through the veil, that is to say, his flesh', ref: 'Hebrews 10:19-20' },
    ],
    interpretation: [
      'There was no wall here in the second house. Two curtains hung a cubit apart, the "amah traksin"; the outer was looped up at the south, the inner at the north, and on the Day of Atonement the high priest walked between them (Mishnah Yoma 5:1; Middot 4:7).',
      'They are shown the full height of the room, 40 cubits, in the blue, purple, scarlet and fine linen of the tabernacle’s veil. Their design is not recorded, so they carry plant ornament rather than cherubim. Josephus says the curtain at the door of the hekal was a Babylonian tapestry picturing the heavens (War 5.5.4). Tap them to draw them aside.',
    ],
    refs: ['Matthew 27:50-54', 'Mark 15:37-39', 'Hebrews 10:19-22'],
  },
  {
    id: 'holiest',
    name: 'The Most Holy Place',
    hebrew: 'קֹדֶשׁ הַקֳּדָשִׁים (qodesh ha-qodashim)',
    bubble: [POS.stone[0], H + 7, 4],
    regions: ['holiest'],
    radius: 16,
    summary:
      'A room 20 cubits square and 40 high, and empty. The ark had been lost when Nebuchadnezzar burned the first house; only a rock stood where it had been. The high priest entered once a year.',
    requirements: [
      { text: 'Into the second went the high priest alone once every year, not without blood', ref: 'Hebrews 9:7' },
      { text: 'The ark of the covenant had stood in the Holiest of all', ref: 'Hebrews 9:4' },
      { text: 'Boldness to enter into the holiest by the blood of Jesus', ref: 'Hebrews 10:19' },
    ],
    interpretation: [
      '"Nothing at all was in it" (Josephus, War 5.5.5). After the ark was taken away there was a stone there, from the days of the first prophets, called the foundation stone, standing three fingers above the floor; the high priest set the censer on it (Mishnah Yoma 5:2).',
      'Its walls are drawn overlaid with gold, as Middot 4:1 and the Talmud describe the house within.',
    ],
    refs: ['Hebrews 9:1-12', 'Hebrews 10:19-22'],
  },
  {
    id: 'altar',
    name: 'The Altar',
    hebrew: 'מִזְבֵּחַ (mizbeaḥ)',
    bubble: [(ALTAR.minX + ALTAR.maxX) / 2, Y.priests + ALTAR.height + 6, 0],
    regions: ['israel', 'priests', 'women'],
    radius: 70,
    summary:
      'A great altar of unhewn stones, 32 cubits square at its foot, stepping in to 24 at the top, with a horn at each corner and a ramp on the south. Jeshua and Zerubbabel built the altar before the house, so that the offerings could begin again.',
    requirements: [
      { text: 'Jeshua and Zerubbabel builded the altar of the God of Israel', ref: 'Ezra 3:2' },
      { text: 'They set the altar upon his bases, and offered morning and evening', ref: 'Ezra 3:3' },
      { text: 'Offerings from the first day of the seventh month, before the foundation was laid', ref: 'Ezra 3:6' },
      { text: 'An altar of stone: not of hewn stone, for a tool pollutes it', ref: 'Exodus 20:25' },
      { text: 'The altar that sanctifieth the gift', ref: 'Matthew 23:18-19' },
    ],
    interpretation: [
      'Its measures are from Middot 3:1-4: a base a cubit high and 32 square, then 5 cubits up to 30, then 3 up to 28, the horns a cubit each, and a ledge for the priests round the top, leaving 24 square for the fire.',
      'The stones were whole, untouched by iron, and whitened twice a year; a red line ran round the middle to divide the blood sprinkled above from that below (Middot 3:1, 4).',
      'The ramp on the south was 32 cubits long and 16 broad (Middot 3:3).',
    ],
    refs: ['Ezra 3:1-6', 'Exodus 20:24-26', 'Matthew 23:18-20'],
  },
  {
    id: 'laver',
    name: 'The Laver',
    hebrew: 'כִּיּוֹר (kiyyor)',
    bubble: [LAVER.x, Y.priests + 7, LAVER.z],
    regions: ['priests', 'israel'],
    radius: 30,
    summary:
      'A laver of bronze between the porch and the altar, a little to the south, where the priests washed their hands and feet before they served.',
    requirements: [
      { text: 'A laver of brass between the tabernacle and the altar, with water in it', ref: 'Exodus 30:18' },
      { text: 'Aaron and his sons wash their hands and their feet thereat', ref: 'Exodus 30:19-20' },
    ],
    interpretation: [
      'Middot 3:6 sets the laver between the porch and the altar, drawn toward the south. Ben Katin gave it twelve spigots so twelve priests could wash at once (Mishnah Yoma 3:10).',
    ],
    refs: ['Exodus 30:17-21'],
  },
  {
    id: 'slaughter',
    name: 'The Place of Slaughtering',
    bubble: [41, Y.priests + 8, -40],
    regions: ['priests', 'israel'],
    radius: 30,
    summary:
      'North of the altar, low pillars with beams of cedar and iron hooks to hang the sacrifices, and tables of marble to wash them. Here the priests killed the passover for all the people.',
    requirements: [
      { text: 'The priests and the Levites were purified together, and killed the passover', ref: 'Ezra 6:20' },
      { text: 'At the dedication, 100 bullocks, 200 rams, 400 lambs, 12 he goats', ref: 'Ezra 6:17' },
    ],
    interpretation: [
      'Middot 3:5 places 24 rings in the floor, eight low pillars with square blocks of cedar on them and iron hooks in them, and eight tables of marble, all on the north side of the altar (as Leviticus 1:11 commands). The rings are not drawn.',
    ],
    refs: ['Ezra 6:16-22'],
  },
  {
    id: 'israel',
    name: 'The Court of Israel',
    hebrew: 'עֶזְרַת יִשְׂרָאֵל (‘ezrat Yisrael)',
    bubble: [70, Y.israel + 7, 34],
    regions: ['israel', 'priests', 'women'],
    radius: 40,
    summary:
      'A narrow court 11 cubits deep where the men of Israel stood to pray and bring their offerings, looking across the Court of the Priests to the altar and the house.',
    requirements: [
      { text: 'Two men went up into the temple to pray, a Pharisee and a publican', ref: 'Luke 18:10' },
      { text: 'Simeon came by the Spirit into the temple when the child Jesus was brought', ref: 'Luke 2:27' },
      { text: 'Paul entered into the temple to signify the days of purification', ref: 'Acts 21:26' },
    ],
    interpretation: [
      'The whole court (azarah) was 187 cubits long and 135 broad. From the east: the Court of Israel 11 cubits, the Court of the Priests 11, the altar 32, 22 between the altar and the porch, the house 100, and 11 behind it (Middot 5:1).',
      'The Court of the Priests was 2½ cubits higher, with a platform where the Levites sang (Middot 2:6). Here you may walk on into it; in the house’s day only priests went further.',
      'The court’s walls are not measured in Middot; they are shown 24 cubits high. Of its seven gates (Middot 1:4), only the Nicanor gate opens here.',
    ],
    refs: ['Luke 18:9-14', 'Luke 2:25-35'],
  },
  {
    id: 'nicanor',
    name: 'The Nicanor Gate',
    hebrew: 'שַׁעַר נִקָּנוֹר (sha‘ar Niqanor)',
    bubble: [WOMEN.minX + 3, Y.israel + 24, 0],
    regions: ['women', 'israel'],
    radius: 50,
    summary:
      'The great gate of bronze between the Court of the Women and the Court of Israel, at the top of fifteen curved steps where the Levites sang. Here mothers brought their offering for purification, as Mary did with two turtledoves or pigeons.',
    requirements: [
      { text: 'When the days of her purification were accomplished, they brought him to present him to the Lord', ref: 'Luke 2:22' },
      { text: 'A pair of turtledoves, or two young pigeons', ref: 'Luke 2:24' },
    ],
    interpretation: [
      'Fifteen steps went up from the Court of the Women, "round like the half of a threshing floor", on which the Levites sang the fifteen songs of degrees (Psalms 120–134) (Middot 2:5).',
      'The gate’s doors were of Corinthian bronze, the gift of Nicanor of Alexandria (Middot 1:4; 2:3). Women after childbirth were purified and stood at this gate (Mishnah Sotah 1:5; Tamid 5:6). Tap the doors to open or close them.',
      'Some identify the Nicanor gate, not the east gate of the Court of the Women, with the Beautiful gate of Acts 3:2.',
    ],
    refs: ['Luke 2:22-38'],
  },
  {
    id: 'women',
    name: 'The Court of the Women and the Treasury',
    hebrew: 'עֶזְרַת נָשִׁים (‘ezrat nashim)',
    bubble: [WOMEN.minX + 70, Y.women + 9, 52],
    regions: ['women', 'chel'],
    radius: 60,
    summary:
      'A court 135 cubits square, open to all Israel, men and women. Round its walls stood the chests of the treasury, where Jesus watched the rich cast in their gifts and a poor widow her two mites.',
    requirements: [
      { text: 'Jesus sat over against the treasury, and beheld how the people cast money in', ref: 'Mark 12:41' },
      { text: 'A poor widow threw in two mites, more than all the rest', ref: 'Mark 12:42-43' },
      { text: 'The rich casting their gifts into the treasury', ref: 'Luke 21:1-2' },
      { text: '"These words spake Jesus in the treasury, as he taught in the temple"', ref: 'John 8:20' },
      { text: 'Anna departed not from the temple, but served God night and day', ref: 'Luke 2:37' },
    ],
    interpretation: [
      'The court was 135 by 135 cubits, with an open chamber 40 cubits square in each corner: for the Nazirites, for wood, for lepers, and for oil and wine (Middot 2:5).',
      'Thirteen chests shaped like rams’ horns (shofarot) stood in the temple for offerings (Mishnah Shekalim 6:5). They are shown along the north and south walls.',
    ],
    refs: ['Mark 12:41-44', 'Luke 21:1-4', 'John 8:12-20', 'Luke 2:36-38'],
  },
  {
    id: 'beautiful',
    name: 'The Beautiful Gate',
    bubble: [WOMEN.maxX + 4, Y.women + 25, 0],
    regions: ['women', 'chel', 'gentiles'],
    radius: 60,
    summary:
      'A lame man was laid daily at the gate called Beautiful. Peter said, "Silver and gold have I none," and he rose, walked and went into the temple with them, leaping and praising God.',
    requirements: [
      { text: 'Peter and John went up at the hour of prayer, the ninth hour', ref: 'Acts 3:1' },
      { text: 'A man lame from birth was laid daily at the gate of the temple called Beautiful', ref: 'Acts 3:2' },
      { text: 'He entered with them into the temple, walking and leaping and praising God', ref: 'Acts 3:8' },
      { text: 'They knew he was the one who sat for alms at the Beautiful gate', ref: 'Acts 3:10' },
    ],
    interpretation: [
      'Scripture does not say which gate it was. It is shown as the east gate of the Court of the Women, the way in from the Court of the Gentiles; others identify it with the Nicanor gate above.',
    ],
    refs: ['Acts 3:1-11'],
  },
  {
    id: 'soreg',
    name: 'The Soreg: the Middle Wall of Partition',
    hebrew: 'סוֹרֵג (soreg)',
    bubble: [SOREG.maxX + 2, Y.mount + 6, 24],
    regions: ['gentiles', 'chel', 'solomons'],
    radius: 50,
    summary:
      'A low lattice fence round the courts. Stone notices on it, in Greek and Latin, warned that no foreigner might pass it on pain of death. Paul was seized because men thought he had brought Greeks inside.',
    requirements: [
      { text: '"Brought Greeks also into the temple, and hath polluted this holy place"', ref: 'Acts 21:28' },
      { text: 'They supposed Paul had brought Trophimus an Ephesian into the temple', ref: 'Acts 21:29' },
      { text: 'They drew him out of the temple, and forthwith the doors were shut', ref: 'Acts 21:30' },
      { text: 'He hath broken down the middle wall of partition between us', ref: 'Ephesians 2:14' },
      { text: 'No more strangers and foreigners, but fellowcitizens with the saints', ref: 'Ephesians 2:19' },
    ],
    interpretation: [
      'The soreg was a lattice ten handbreadths high, inside which was the chel, a terrace ten cubits broad, and twelve steps of half a cubit up to the courts (Middot 2:3).',
      'Two of the warning stones have been found. One reads: "No foreigner is to enter within the balustrade and enclosure around the temple. Whoever is caught will have himself to blame for his death which follows." Josephus describes them too (War 5.5.2).',
      'Ephesians 2:14 does not name the soreg, but it is often read as an image of it.',
    ],
    refs: ['Acts 21:26-30', 'Ephesians 2:11-22'],
  },
  {
    id: 'gentiles',
    name: 'The Court of the Gentiles',
    bubble: [250, Y.mount + 9, -70],
    regions: ['gentiles', 'solomons', 'porticoes', 'stoa'],
    radius: 140,
    summary:
      'The great open court of the temple mount, where anyone might come. Jesus drove out the sellers of oxen, sheep and doves and overturned the tables of the moneychangers: "My house shall be called of all nations the house of prayer."',
    requirements: [
      { text: 'He found in the temple those that sold oxen and sheep and doves, and the changers of money', ref: 'John 2:14' },
      { text: 'He drove them all out and overthrew the tables', ref: 'John 2:15-16' },
      { text: '"My house shall be called of all nations the house of prayer"', ref: 'Mark 11:17' },
      { text: 'He would not suffer any man to carry a vessel through the temple', ref: 'Mark 11:16' },
      { text: 'In the day time he was teaching in the temple, and all the people came early to hear him', ref: 'Luke 21:37-38' },
      { text: 'The apostles taught daily in the temple', ref: 'Acts 5:42' },
    ],
    interpretation: [
      'The name "Court of the Gentiles" is a modern one. Middot 2:1 gives the temple mount as 500 cubits square; Herod’s platform was larger and not square, and its south and west were extended over the valleys. The model keeps Middot’s square.',
    ],
    refs: ['John 2:13-17', 'Mark 11:15-18', 'Matthew 21:12-16'],
  },
  {
    id: 'solomons',
    name: 'Solomon’s Porch',
    bubble: [MOUNT.maxX - 21, PORTICO_Y, 46],
    regions: ['solomons', 'gentiles'],
    radius: 70,
    summary:
      'The colonnade along the east side of the mount. Jesus walked here at the feast of the dedication, and the first believers met here with one accord.',
    requirements: [
      { text: 'Jesus walked in the temple in Solomon’s porch, at the feast of the dedication', ref: 'John 10:22-23' },
      { text: 'All the people ran together unto them in the porch that is called Solomon’s', ref: 'Acts 3:11' },
      { text: 'They were all with one accord in Solomon’s porch', ref: 'Acts 5:12' },
    ],
    interpretation: [
      'Josephus says the east portico stood on a wall left from Solomon’s day (Antiquities 20.9.7). The porticoes are shown as double rows of columns 25 cubits high, 30 cubits deep, roofed with cedar (War 5.5.2).',
    ],
    refs: ['John 10:22-30', 'Acts 3:11-26', 'Acts 5:12-16'],
  },
  {
    id: 'stoa',
    name: 'The Royal Stoa',
    bubble: [90, PORTICO_Y + 14, MOUNT.maxZ - 22],
    regions: ['stoa', 'gentiles'],
    radius: 90,
    summary:
      'A great basilica of three aisles along the south side of the mount, its middle aisle the tallest. Most likely the moneychangers and the sellers of doves set up their tables here.',
    requirements: [
      { text: 'The tables of the moneychangers and the seats of them that sold doves', ref: 'Matthew 21:12' },
      { text: 'They found him in the temple, sitting in the midst of the doctors', ref: 'Luke 2:46' },
    ],
    interpretation: [
      'Scripture does not name the Royal Stoa. Josephus describes 162 columns in four rows, one built into the south wall, so that it had three aisles, the middle one higher (Antiquities 15.11.5).',
      'Where in the temple the trading went on is not said; the stoa is the usual guess.',
    ],
    refs: ['Matthew 21:12-16', 'Luke 2:41-50'],
  },
  {
    id: 'pinnacle',
    name: 'The Pinnacle of the Temple',
    hebrew: 'πτερύγιον (pterygion), "little wing"',
    bubble: [MOUNT.maxX - 8, STOA_TOP + 8, MOUNT.maxZ - 8],
    regions: ['stoa', 'solomons', 'gentiles'],
    radius: 100,
    summary:
      'The devil set Jesus "on a pinnacle of the temple" and bade him cast himself down. It is often placed at the south-east corner of the mount, high above the Kidron valley.',
    requirements: [{ text: 'The devil setteth him on a pinnacle of the temple', ref: 'Matthew 4:5' }],
    interpretation: [
      'The word means a "little wing" or edge, and the place is not identified. Josephus says that looking down into the valley from the Royal Stoa made one dizzy (Antiquities 15.11.5), so the south-east corner is the usual choice.',
    ],
    refs: ['Matthew 4:1-11'],
  },
  {
    id: 'antonia',
    name: 'The Castle (the Fortress Antonia)',
    bubble: [(ANTONIA.minX + ANTONIA.maxX) / 2, 70, ANTONIA.maxZ - 10],
    regions: ['porticoes', 'gentiles'],
    radius: 160,
    summary:
      'Herod’s fortress at the north-west corner of the mount, with a Roman garrison. When the crowd seized Paul, the chief captain ran down with soldiers, and Paul spoke to the people from the stairs.',
    requirements: [
      { text: 'Tidings came to the chief captain that all Jerusalem was in an uproar', ref: 'Acts 21:31' },
      { text: 'He took soldiers and centurions and ran down unto them', ref: 'Acts 21:32' },
      { text: 'He commanded him to be carried into the castle; he came upon the stairs', ref: 'Acts 21:34-35' },
      { text: 'Paul stood on the stairs and spoke to the people in the Hebrew tongue', ref: 'Acts 21:40' },
    ],
    interpretation: [
      'Josephus describes the Antonia as a tower with four corner towers, the south-east one the tallest so it overlooked the whole temple, and stairs down to the porticoes (War 5.5.8). Its size is not given; it is shown 110 by 60 cubits.',
    ],
    refs: ['Acts 21:30-40'],
  },
];

export const SECOND_GENERAL: Requirement[] = [
  { text: 'Cyrus charged the exiles to build the house of the LORD at Jerusalem', ref: 'Ezra 1:2-3' },
  { text: 'Let the foundations be strongly laid: height 60 cubits, breadth 60 cubits', ref: 'Ezra 6:3' },
  { text: 'The golden and silver vessels restored, every one to his place', ref: 'Ezra 6:5' },
  { text: 'The house finished in the sixth year of Darius', ref: 'Ezra 6:15' },
  { text: '"I will fill this house with glory"', ref: 'Haggai 2:7' },
  { text: 'Forty and six years in building', ref: 'John 2:20' },
  { text: '"My house shall be called the house of prayer"', ref: 'Matthew 21:13' },
  { text: 'There shall not be left here one stone upon another', ref: 'Matthew 24:2' },
];
