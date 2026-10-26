import { CLOUD_X, HALF, RISE_X, SEA } from '../sea/dims';
import type { Feature, Requirement } from './specs';

// Bubbles sit a little above head height along the path (+x is the way Israel walks).

export const SEA_FEATURES: Feature[] = [
  {
    id: 'cloud',
    name: 'The Pillar of Cloud',
    hebrew: 'עַמּוּד הֶעָנָן (‘ammud he-‘anan)',
    bubble: [-40, 16, 0],
    regions: ['seabed'],
    radius: 70,
    summary:
      'The pillar that had led Israel moved behind them and stood between the two camps. To Egypt it was cloud and darkness; to Israel it gave light all night, so that neither camp came near the other.',
    requirements: [
      { text: 'The LORD went before them by day in a pillar of cloud, by night in a pillar of fire', ref: 'Exodus 13:21' },
      { text: 'The pillar never left them, by day or by night', ref: 'Exodus 13:22' },
      { text: 'The angel of God and the pillar went from before them and stood behind them', ref: 'Exodus 14:19' },
      { text: 'It came between the camp of Egypt and the camp of Israel', ref: 'Exodus 14:20' },
      { text: 'A cloud and darkness to Egypt, but it gave light by night to Israel', ref: 'Exodus 14:20' },
      { text: 'In the morning watch the LORD looked on Egypt through the pillar of fire and of the cloud', ref: 'Exodus 14:24' },
    ],
    interpretation: [
      `Its size and shape are not given. It is shown as a towering column of billows ${-CLOUD_X} cubits behind the start, with a warm glow of fire within, filling the way back toward Egypt.`,
    ],
    refs: ['Exodus 13:21-22', 'Exodus 14:19-20', 'Exodus 14:24'],
  },
  {
    id: 'walls',
    name: 'The Waters a Wall',
    hebrew: 'וְהַמַּיִם לָהֶם חוֹמָה (ve-ha-mayim lahem ḥomah)',
    bubble: [70, 30, -(HALF - 3)],
    regions: ['seabed', 'rise'],
    radius: 60,
    summary:
      'The sea was divided and stood up on both sides of the path, "a wall unto them on their right hand, and on their left." The Song of Moses says the floods stood upright as a heap and the depths were congealed.',
    requirements: [
      { text: 'Moses stretched out his hand over the sea, and the waters were divided', ref: 'Exodus 14:21' },
      { text: 'The waters were a wall to them on their right hand and on their left', ref: 'Exodus 14:22' },
      { text: 'The same is said again as they walked in the midst of the sea', ref: 'Exodus 14:29' },
      { text: 'The floods stood upright as an heap; the depths were congealed in the heart of the sea', ref: 'Exodus 15:8' },
    ],
    interpretation: [
      `The height of the walls is not given. They stand ${SEA} cubits (about 26 m) from the seabed to the surface of the sea, and lean in with a breaking lip.`,
      'Bubbles rise and fish swim behind the glassy face, to show the walls are water and not ice. "Congealed" is shown as water standing still in its place.',
    ],
    refs: ['Exodus 14:21-22', 'Exodus 14:29', 'Exodus 15:8'],
  },
  {
    id: 'wind',
    name: 'The Strong East Wind',
    hebrew: 'רוּחַ קָדִים עַזָּה (ruaḥ qadim ‘azzah)',
    bubble: [190, 30, HALF - 4],
    regions: ['seabed', 'rise'],
    radius: 60,
    summary:
      'The LORD drove the sea back by a strong east wind all that night. The Song of Moses calls it the blast of his nostrils.',
    requirements: [
      { text: 'The LORD caused the sea to go back by a strong east wind all that night', ref: 'Exodus 14:21' },
      { text: 'With the blast of thy nostrils the waters were gathered together', ref: 'Exodus 15:8' },
      { text: 'Thou didst blow with thy wind, the sea covered them', ref: 'Exodus 15:10' },
    ],
    interpretation: [
      'The wind is shown by spray torn off the crests and blown along the walls. The path runs west to east, into the wind.',
    ],
    refs: ['Exodus 14:21', 'Exodus 15:8-10'],
  },
  {
    id: 'dry',
    name: 'Dry Ground',
    hebrew: 'בַּיַּבָּשָׁה (ba-yabbashah)',
    bubble: [290, 7, -7],
    regions: ['seabed'],
    radius: 45,
    summary:
      'Israel crossed on dry ground. The sea floor here is drying mud cracked into plates, with ripples, shells, starfish, coral and weed left behind by the water.',
    requirements: [
      { text: 'The children of Israel shall go on dry ground through the midst of the sea', ref: 'Exodus 14:16' },
      { text: 'The LORD made the sea dry land', ref: 'Exodus 14:21' },
      { text: 'They went into the midst of the sea upon the dry ground', ref: 'Exodus 14:22' },
      { text: 'They walked upon dry land in the midst of the sea', ref: 'Exodus 14:29' },
      { text: 'He led them through the depths, as through the wilderness', ref: 'Psalms 106:9' },
      { text: 'By faith they passed through the Red sea as by dry land', ref: 'Hebrews 11:29' },
    ],
    interpretation: [
      `The width of the path is not given. Here it is ${HALF * 2} cubits between the walls, wide enough for a column many abreast with their flocks.`,
      'There is no standing water on the path, since Scripture says the ground was dry.',
    ],
    refs: ['Exodus 14:16', 'Exodus 14:21-22', 'Psalms 106:9', 'Hebrews 11:29'],
  },
  {
    id: 'multitude',
    name: 'The Multitude',
    bubble: [400, 9, 6],
    regions: ['seabed'],
    radius: 50,
    summary:
      'About six hundred thousand men on foot, besides children, with a mixed multitude, flocks and herds. They carried their dough in kneading troughs bound up in their clothes on their shoulders, and Moses carried the bones of Joseph.',
    requirements: [
      { text: 'About six hundred thousand on foot that were men, beside children', ref: 'Exodus 12:37' },
      { text: 'A mixed multitude went up also with them; and flocks, and herds, even very much cattle', ref: 'Exodus 12:38' },
      { text: 'Kneading troughs bound up in their clothes upon their shoulders', ref: 'Exodus 12:34' },
      { text: 'Moses took the bones of Joseph with him', ref: 'Exodus 13:19' },
      { text: 'Israel went out with an high hand', ref: 'Exodus 14:8' },
    ],
    interpretation: [
      'Only a few hundred people and animals are drawn around you at once. They are recycled as you walk, so the column seems to go on without end.',
      'Their dress (robes, sashes, headcloths and veils), the bundles on heads and shoulders, and the staffs are a general picture of the time, not described in the text.',
    ],
    refs: ['Exodus 12:34-38', 'Exodus 13:18-19', 'Exodus 14:8'],
  },
  {
    id: 'depths',
    name: 'The Paths of the Sea',
    bubble: [520, 18, -(HALF - 3)],
    regions: ['seabed'],
    radius: 55,
    summary:
      'The psalmist looks back on the night: the waters saw God and were afraid, and his path went through the great waters, though his footsteps were not seen.',
    requirements: [
      { text: 'The waters saw thee, O God; they were afraid: the depths also were troubled', ref: 'Psalms 77:16' },
      { text: 'Thy way is in the sea, and thy path in the great waters', ref: 'Psalms 77:19' },
      { text: 'Thou leddest thy people like a flock by the hand of Moses and Aaron', ref: 'Psalms 77:20' },
    ],
    refs: ['Psalms 77:16-20'],
  },
  {
    id: 'shore',
    name: 'The Waters Returned',
    bubble: [RISE_X + 150, 40, 0],
    regions: ['rise', 'shore'],
    radius: 90,
    summary:
      'When the morning appeared, Moses stretched out his hand again and the sea returned to its strength. It covered the chariots and horsemen of Pharaoh who had followed Israel into the sea. Not one of them was left.',
    requirements: [
      { text: 'Stretch out thine hand over the sea, that the waters may come again upon the Egyptians', ref: 'Exodus 14:26' },
      { text: 'The sea returned to his strength when the morning appeared', ref: 'Exodus 14:27' },
      { text: 'The waters returned and covered the chariots and the horsemen: not one remained', ref: 'Exodus 14:28' },
      { text: 'Israel saw the Egyptians dead upon the sea shore', ref: 'Exodus 14:30' },
      { text: 'Then sang Moses and the children of Israel this song', ref: 'Exodus 15:1' },
    ],
    interpretation: [
      'The model lets the waters return on you when you climb above the level of the sea, to show how they came back. In Scripture the waters returned on Pharaoh\'s army; Israel had already crossed and stood on the shore (Ex 14:29-31).',
      'Scripture does not say how the far bank rose. Here the seabed curves gently up to the shore, and the walls get lower as you climb.',
    ],
    refs: ['Exodus 14:26-31', 'Exodus 15:1-10', 'Psalms 106:11'],
  },
];

export const SEA_GENERAL: Requirement[] = [
  { text: 'Israel encamped by the sea before Pi-hahiroth, between Migdol and the sea', ref: 'Exodus 14:2' },
  { text: 'Pharaoh\'s horses and chariots overtook them by the sea', ref: 'Exodus 14:9' },
  { text: 'Speak unto the children of Israel, that they go forward', ref: 'Exodus 14:15' },
  { text: 'They crossed through the night, until the morning watch', ref: 'Exodus 14:20-24' },
  { text: 'The LORD saved Israel that day out of the hand of the Egyptians', ref: 'Exodus 14:30' },
];
