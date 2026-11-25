// Comparing names of the same thing written by different sources, in Belarusian, Russian or
// English. Spike code: a few plain rules, tuned by looking at Minsk, not a general matcher.

// Words that say what kind of thing it is and carry no identity.
const GENERIC_WORDS = [
  // Belarusian
  'вуліца', 'вул', 'праспект', 'пр', 'завулак', 'зав', 'плошча', 'пл', 'будынак', 'будынка', 'дом', 'помнік', 'бюст',
  'мемарыяльная', 'дошка', 'мінск', 'мінска', 'мінску', 'мінскі', 'мінская', 'мінскае', 'горад', 'імя', 'імені', 'былы', 'былога', 'былой',
  'па', 'на', 'у', 'ў', 'і', 'г', 'святога', 'святой', 'святых',
  // Russian
  'улица', 'ул', 'проспект', 'переулок', 'пер', 'площадь', 'здание', 'памятник', 'мемориальная', 'доска', 'минск',
  'минска', 'минске', 'минский', 'минская', 'минское', 'город', 'имени', 'им', 'бывший', 'бывшего', 'бывшей', 'по', 'в', 'и',
  'святого', 'святых',
  // English
  'street', 'st', 'avenue', 'ave', 'lane', 'square', 'building', 'house', 'monument', 'memorial', 'plaque', 'minsk',
  'the', 'of', 'in', 'on', 'at', 'and', 'to', 'saint', 'saints', 'former',
];
const GENERIC = new Set(GENERIC_WORDS.map((w) => normalise(w)));

/** Lower case, ё→е, ў→у, і→и, quotes and punctuation out, parenthesised disambiguation out. */
export function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .normalize('NFC')
    .replace(/ё/g, 'е')
    .replace(/ў/g, 'у')
    .replace(/і/g, 'и')
    .replace(/[«»"“”„'’`.,;:!?№#*/\\\-–—_()[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(name: string): string[] {
  return normalise(name).split(' ').filter((t) => t.length > 0 && !GENERIC.has(t));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur.push(Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** Two tokens are the same word when they differ only by an ending (declension) or one typo. */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (/^\d/.test(a) || /^\d/.test(b)) return false; // numbers must be equal
  const n = Math.min(a.length, b.length);
  if (n < 4) return false;
  const stem = Math.max(4, Math.ceil(n * 0.7));
  if (a.slice(0, stem) === b.slice(0, stem)) return true;
  return n >= 6 && levenshtein(a, b) <= 1;
}

/**
 * Similarity of two names, 0..1: the share of the shorter name's words found in the longer one,
 * damped when the shorter name is a single word of a much longer name.
 */
export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const used = new Set<number>();
  let hit = 0;
  for (const s of short) {
    const k = long.findIndex((l, i) => !used.has(i) && sameWord(s, l));
    if (k !== -1) {
      used.add(k);
      hit++;
    }
  }
  const containment = hit / short.length;
  const coverage = hit / long.length;
  // Equal names give 1; "Купала" inside "Тэатр імя Янкі Купалы" gives 0.5 + 0.5 * 1/3.
  return containment * (0.5 + 0.5 * coverage);
}

/** Best similarity between any name of one thing and any name of the other. */
export function bestSimilarity(a: (string | null | undefined)[], b: (string | null | undefined)[]): { score: number; a: string; b: string } {
  let best = { score: 0, a: '', b: '' };
  for (const x of a) {
    if (!x) continue;
    for (const y of b) {
      if (!y) continue;
      const score = similarity(x, y);
      if (score > best.score) best = { score, a: x, b: y };
    }
  }
  return best;
}

/** A house number at the end of a name or in an address: "12", "12а", "9/17", "42/2". */
export function houseNumber(text: string): string | null {
  const m = /(?:^|[\s,])(\d+\s?[а-яa-z]?(?:\s?\/\s?\d+[а-яa-z]?)?)\s*(?:\(|,|$)/i.exec(normaliseKeepSlash(text));
  return m ? m[1]!.replace(/\s/g, '') : null;
}

function normaliseKeepSlash(name: string): string {
  return name.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[«»"“”„'’`.;:!?№#*\\\-–—_[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Deterministic pseudo-random numbers, so that samples are the same on every run. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function sample<T>(list: T[], n: number, seed: number): T[] {
  const rnd = mulberry32(seed);
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, n);
}
