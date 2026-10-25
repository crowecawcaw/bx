import kjv from './kjv.json';

type Bible = Record<string, Record<string, string[]>>;
const BIBLE = kjv as Bible;

const ALIASES: Record<string, string> = {
  ex: 'Exodus', exo: 'Exodus', exod: 'Exodus', exodus: 'Exodus',
  lv: 'Leviticus', lev: 'Leviticus', leviticus: 'Leviticus',
  nm: 'Numbers', num: 'Numbers', numbers: 'Numbers',
  heb: 'Hebrews', hebrews: 'Hebrews',
};

export interface Verse {
  ref: string;
  text: string;
}

export interface Passage {
  ref: string;
  verses: Verse[];
}

export const AVAILABLE = Object.entries(BIBLE).map(([book, chs]) => ({
  book,
  chapters: Object.keys(chs).map(Number),
}));

/** Parses "Exodus 26:31-33", "Ex 26:31", "Lev 24" or "Exodus 26:31-27:2". */
export function lookup(input: string): Passage | { error: string } {
  const m = input
    .trim()
    .match(/^([1-3]?\s?[a-z]+)\.?\s*(\d+)(?::(\d+))?(?:\s*[-–]\s*(?:(\d+):)?(\d+))?$/i);
  if (!m) return { error: 'Try a reference like "Exodus 26:31-33".' };
  const book = ALIASES[m[1].toLowerCase().replace(/\s/g, '')];
  if (!book) return { error: `“${m[1]}” isn’t included. Try Exodus, Leviticus, Numbers or Hebrews.` };
  const c1 = Number(m[2]);
  const v1 = m[3] ? Number(m[3]) : 1;
  const c2 = m[4] ? Number(m[4]) : c1;
  const chapters = BIBLE[book];
  if (!chapters[c1] || !chapters[c2]) {
    return { error: `${book} ${c1} isn’t bundled. Available: ${Object.keys(chapters).join(', ')}.` };
  }
  let v2: number;
  if (m[5]) v2 = Number(m[5]);
  else if (m[3]) v2 = v1;
  else v2 = chapters[c1].length;

  const verses: Verse[] = [];
  for (let c = c1; c <= c2; c++) {
    const ch = chapters[c];
    if (!ch) continue;
    const from = c === c1 ? v1 : 1;
    const to = c === c2 ? Math.min(v2, ch.length) : ch.length;
    for (let v = from; v <= to; v++) verses.push({ ref: `${c}:${v}`, text: ch[v - 1] });
  }
  if (!verses.length) return { error: 'No verses in that range.' };
  return { ref: `${book} ${input.trim().replace(/^\S+\s*/, '')}`, verses };
}
