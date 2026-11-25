// A popularity signal: monthly page views of the Wikipedia articles of a sample of linked Places,
// from the Wikimedia page-view interface. Is the distribution usable to order a verification
// queue, and how many requests does a full pass of the city take?
import { readFileSync } from 'node:fs';
import { mdTable, openDb, pct, rows, writeJson } from './lib.ts';
import { sample } from './names.ts';
import { cachedText, webStats } from './web.ts';

const SAMPLE = 100; // Places; about 195 articles, one request each at ten requests a minute
const FROM = '2025110100';
const TO = '2026103100'; // twelve full months
const PROJECT = { be: 'be.wikipedia.org', beTarask: 'be-tarask.wikipedia.org', ru: 'ru.wikipedia.org', en: 'en.wikipedia.org' } as const;
type Lang = keyof typeof PROJECT;
const LANGS = Object.keys(PROJECT) as Lang[];

interface Item { qid: string; be: string | null; beTarask: string | null; ru: string | null; en: string | null; labelBe: string | null; labelRu: string | null; labelEn: string | null; inCity?: boolean }
const all = JSON.parse(readFileSync('out/04-wikidata-items.json', 'utf8')) as Item[];
const items = new Map(all.map((i) => [i.qid, i]));
const hasArticle = (i: Item) => Boolean(i.be ?? i.beTarask ?? i.ru ?? i.en);

const con = await openDb({ readOnly: true });
const linked = (await rows<{ q: string }>(con, `SELECT DISTINCT wikidata AS q FROM place WHERE wikidata IS NOT NULL ORDER BY 1`))
  .map((r) => items.get(r.q)).filter((i): i is Item => i !== undefined && hasArticle(i));
const picked = sample(linked, SAMPLE, 20261124);

async function monthly(lang: Lang, title: string): Promise<number[]> {
  const article = encodeURIComponent(title.replace(/ /g, '_'));
  const text = await cachedText(
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${PROJECT[lang]}/all-access/user/${article}/monthly/${FROM}/${TO}`,
    { emptyOn404: true, headers: { Accept: 'application/json' } },
  );
  if (text === '') return [];
  return (JSON.parse(text) as { items: { timestamp: string; views: number }[] }).items.map((x) => x.views);
}

interface Result { qid: string; name: string; perLang: Partial<Record<Lang, number>>; monthlyMean: number; firstHalf: number; secondHalf: number }
const results: Result[] = [];
let requests = 0;
for (const i of picked) {
  const perLang: Partial<Record<Lang, number>> = {};
  let total = 0;
  let first = 0;
  let second = 0;
  for (const lang of LANGS) {
    const title = i[lang];
    if (!title) continue;
    requests++;
    const views = await monthly(lang, title);
    const sum = views.reduce((a, v) => a + v, 0);
    perLang[lang] = Math.round(sum / 12);
    total += sum;
    // The series lists only months with views; halves are taken by position from the end.
    const padded = [...Array<number>(Math.max(0, 12 - views.length)).fill(0), ...views];
    first += padded.slice(0, 6).reduce((a, v) => a + v, 0);
    second += padded.slice(6).reduce((a, v) => a + v, 0);
  }
  results.push({ qid: i.qid, name: i.labelRu ?? i.labelBe ?? i.labelEn ?? i.qid, perLang, monthlyMean: Math.round(total / 12), firstHalf: first, secondHalf: second });
}

const sorted = [...results].sort((a, b) => b.monthlyMean - a.monthlyMean);
const values = sorted.map((r) => r.monthlyMean);
const asc = [...values].sort((a, b) => a - b);
const at = (p: number) => asc[Math.min(asc.length - 1, Math.floor(p * asc.length))]!;
const total = values.reduce((a, v) => a + v, 0);
const topShare = (share: number) => values.slice(0, Math.ceil(values.length * share)).reduce((a, v) => a + v, 0) / total;
// Is the order stable? Spearman rank correlation between the two halves of the year.
function ranks(xs: number[]): number[] {
  const order = xs.map((v, k) => ({ v, k })).sort((a, b) => a.v - b.v);
  const r = new Array<number>(xs.length);
  for (let k = 0; k < order.length; ) {
    let j = k;
    while (j + 1 < order.length && order[j + 1]!.v === order[k]!.v) j++;
    for (let m = k; m <= j; m++) r[order[m]!.k] = (k + j) / 2 + 1;
    k = j + 1;
  }
  return r;
}
function pearson(a: number[], b: number[]): number {
  const ma = a.reduce((x, y) => x + y, 0) / a.length;
  const mb = b.reduce((x, y) => x + y, 0) / b.length;
  let num = 0;
  let da = 0;
  let dbb = 0;
  for (let k = 0; k < a.length; k++) {
    num += (a[k]! - ma) * (b[k]! - mb);
    da += (a[k]! - ma) ** 2;
    dbb += (b[k]! - mb) ** 2;
  }
  return num / Math.sqrt(da * dbb);
}
const spearman = pearson(ranks(results.map((r) => r.firstHalf)), ranks(results.map((r) => r.secondHalf)));
// How much of the order of the top quarter survives from one half-year to the next.
const topQuarter = (key: 'firstHalf' | 'secondHalf') => new Set([...results].sort((a, b) => b[key] - a[key]).slice(0, Math.ceil(results.length / 4)).map((r) => r.qid));
const q1 = topQuarter('firstHalf');
const q2 = topQuarter('secondHalf');
const quarterOverlap = [...q1].filter((x) => q2.has(x)).length / q1.size;
const byLang = Object.fromEntries(LANGS.map((l) => [l, results.reduce((a, r) => a + (r.perLang[l] ?? 0), 0)]));
const langTotal = Object.values(byLang).reduce((a, v) => a + v, 0);

const distribution = {
  items: results.length,
  monthly_views_per_item: { min: asc[0], p10: at(0.1), p25: at(0.25), median: at(0.5), p75: at(0.75), p90: at(0.9), max: asc[asc.length - 1] },
  items_under_30_a_month: values.filter((v) => v < 30).length,
  items_under_100_a_month: values.filter((v) => v < 100).length,
  items_with_1000_or_more_a_month: values.filter((v) => v >= 1000).length,
  share_of_views_in_the_top_tenth: pct(topShare(0.1) * 1000, 1000),
  share_of_views_in_the_top_quarter: pct(topShare(0.25) * 1000, 1000),
  ratio_p90_to_p10: Math.round(at(0.9) / Math.max(1, at(0.1))),
  spearman_between_half_years: Math.round(spearman * 1000) / 1000,
  top_quarter_kept_from_one_half_year_to_the_next: pct(Math.round(quarterOverlap * 1000), 1000),
  views_by_language: Object.fromEntries(LANGS.map((l) => [l, `${byLang[l]} (${pct(byLang[l]!, langTotal)})`])),
};
console.log(distribution);
console.log(mdTable(['Rank', 'Place', 'Views a month', 'be', 'be-tarask', 'ru', 'en'], [...sorted.slice(0, 12), ...sorted.slice(-5)].map((r) => [
  sorted.indexOf(r) + 1, `${r.name} (${r.qid})`, r.monthlyMean, r.perLang.be ?? '—', r.perLang.beTarask ?? '—', r.perLang.ru ?? '—', r.perLang.en ?? '—',
])));

const articlesOf = (list: Item[]) => list.reduce((a, i) => a + LANGS.filter((l) => i[l]).length, 0);
const cityItems = all.filter((i) => i.inCity && hasArticle(i));
writeJson('out/17-pageviews.json', {
  read_at: new Date().toISOString().slice(0, 10),
  period: { from: FROM, to: TO, months: 12, agent: 'user', access: 'all-access' },
  sample: SAMPLE,
  population: linked.length,
  requests_for_the_sample: requests,
  distribution,
  top: sorted.slice(0, 20).map((r) => ({ name: r.name, qid: r.qid, monthly: r.monthlyMean, ...r.perLang })),
  bottom: sorted.slice(-10).map((r) => ({ name: r.name, qid: r.qid, monthly: r.monthlyMean, ...r.perLang })),
  requests_full_pass: {
    places_linked_from_openstreetmap: { items: linked.length, requests: articlesOf(linked) },
    every_wikidata_item_in_the_city_with_an_article: { items: cityItems.length, requests: articlesOf(cityItems) },
  },
  requests: webStats,
});
console.log('requests:', webStats);
