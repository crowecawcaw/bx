// Extracts the KJV (public domain) chapters the app quotes into src/data/kjv.json.
// Usage: node scripts/extract-verses.mjs [path-to-en_kjv.json]
// Source: https://github.com/thiagobodruk/bible (json/en_kjv.json)
import fs from 'node:fs';

const SRC = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json';
const WANT = {
  // the tabernacle (and the crossing of the Red Sea, Ex 12–15)
  Exodus: [12, 13, 14, 15, 20, 25, 26, 27, 30, 31, 35, 36, 37, 38, 39, 40],
  Leviticus: [24],
  Numbers: [4],
  // Solomon's Temple
  '1 Kings': [5, 6, 7, 8],
  '2 Kings': [25],
  '1 Chronicles': [28],
  '2 Chronicles': [2, 3, 4, 5, 7],
  Jeremiah: [52],
  Psalms: [77, 106],
  Hebrews: [9, 11],
};

const text = process.argv[2]
  ? fs.readFileSync(process.argv[2], 'utf8')
  : await (await fetch(SRC)).text();
const books = JSON.parse(text.replace(/^﻿/, ''));
const out = {};
for (const [name, chapters] of Object.entries(WANT)) {
  const book = books.find((b) => b.name === name);
  if (!book) throw new Error(`missing ${name}`);
  out[name] = {};
  for (const c of chapters) {
    out[name][c] = book.chapters[c - 1].map((v) => v.replace(/[{}]/g, '').trim());
  }
}
fs.writeFileSync('src/data/kjv.json', JSON.stringify(out));
console.log('wrote src/data/kjv.json');
