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
  // the second temple: rebuilt after the exile (Ezra, Haggai), and Herod's house in the Gospels and Acts
  Ezra: [1, 3, 5, 6],
  Psalms: [46, 77, 106],
  Jeremiah: [52],
  // the temple of Ezekiel's vision, and the passages that take up its river and city
  Ezekiel: [10, 11, 37, 40, 41, 42, 43, 44, 45, 46, 47, 48],
  Joel: [3],
  Haggai: [2],
  Zechariah: [14],
  Matthew: [4, 21, 23, 24, 27],
  Mark: [11, 12, 13, 15],
  Luke: [1, 2, 18, 21, 23],
  John: [2, 7, 8, 10],
  Acts: [3, 5, 21],
  Ephesians: [2],
  Hebrews: [9, 10, 11],
  Revelation: [21, 22],
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
