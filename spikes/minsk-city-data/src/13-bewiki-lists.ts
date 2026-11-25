// The lists of historical and cultural values of Minsk in Belarusian Wikipedia: how many rows,
// how many carry a state code, how many objects have no article of their own, and how many match
// nothing in Wikidata or OpenStreetMap.
import { existsSync, readFileSync } from 'node:fs';
import { OSM_DATE, haversine, mdTable, openDb, pct, rows, writeJson } from './lib.ts';
import { heritageWikidata } from './heritage-wd.ts';
import { action, actionPost, rights, stats } from './wiki.ts';
import { linkTargets, plain, templates } from './wikitext.ts';

const HOST = 'be.wikipedia.org';
const PREFIX = 'Спіс гісторыка-культурных каштоўнасцей Мінска/';

// --- 1. The parts of the list and their text ------------------------------------------------------
const index = await action<{ query: { allpages: { title: string }[] } }>(HOST, { action: 'query', list: 'allpages', apprefix: PREFIX, aplimit: '50' });
const titles = index.query.allpages.map((p) => p.title);
const countryIndex = await action<{ query: { allpages: { title: string }[] } }>(HOST, {
  action: 'query', list: 'allpages', apprefix: 'Спіс гісторыка-культурных каштоўнасцей', aplimit: '500',
});
const pages = await actionPost<{ query: { pages: { title: string; revisions: { revid: number; timestamp: string; slots: { main: { content: string } } }[] }[] } }>(HOST, {
  action: 'query', prop: 'revisions', rvprop: 'content|ids|timestamp', rvslots: 'main', titles: titles.join('|'),
});

interface Row {
  part: string;
  code: string;
  nameWikitext: string;
  name: string;
  dating: string;
  address: string;
  category: string;
  lat: number | null;
  lon: number | null;
  image: boolean;
}
const list: Row[] = [];
const parts: { title: string; revision: number; edited: string; bytes: number; rows: number }[] = [];
for (const page of [...pages.query.pages].sort((a, b) => (a.title < b.title ? -1 : 1))) {
  const rev = page.revisions[0]!;
  const text = rev.slots.main.content;
  const calls = templates(text, ['вікі любіць славутасці/элемент']);
  for (const c of calls) {
    const p = c.params;
    const num = (s: string | undefined) => (s && /^-?\d+(\.\d+)?$/.test(s.trim()) ? Number(s.trim()) : null);
    list.push({
      part: page.title.replace(PREFIX, ''),
      code: (p['шыфр'] ?? '').trim(),
      nameWikitext: p['назва'] ?? '',
      name: plain(p['назва'] ?? ''),
      dating: plain(p['датаванне'] ?? ''),
      address: plain(p['адрасы'] ?? ''),
      category: (p['катэгорыя'] ?? '').trim(),
      lat: num(p['шырата']),
      lon: num(p['даўгата']),
      image: (p['выява'] ?? '').trim() !== '',
    });
  }
  parts.push({ title: page.title, revision: rev.revid, edited: rev.timestamp.slice(0, 10), bytes: text.length, rows: calls.length });
}

// --- 2. Does the object have an article of its own? ------------------------------------------------
// In the list: the name is, or mostly is, a link to an existing article. Checked against the wiki.
const ownLink = (r: Row): string | null => {
  const links = [...r.nameWikitext.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g)];
  if (links.length !== 1) return null;
  const shown = (links[0]![2] ?? links[0]![1]!).trim();
  // "[[Мінск]]а" inside a long name is a mention, not the object's article.
  return shown.length >= 0.6 * r.name.length ? links[0]![1]!.trim() : null;
};
const targets = [...new Set(list.map(ownLink).filter((x): x is string => x !== null))];
const exists = new Set<string>();
for (let k = 0; k < targets.length; k += 50) {
  const res = await actionPost<{ query: { normalized?: { from: string; to: string }[]; redirects?: { from: string; to: string }[]; pages: { title: string; missing?: boolean }[] } }>(HOST, {
    action: 'query', titles: targets.slice(k, k + 50).join('|'), redirects: '1',
  });
  const forward = new Map<string, string>();
  for (const x of [...(res.query.normalized ?? []), ...(res.query.redirects ?? [])]) forward.set(x.from, x.to);
  const present = new Set(res.query.pages.filter((p) => !p.missing).map((p) => p.title));
  for (const t of targets.slice(k, k + 50)) {
    let cur = t;
    for (let hop = 0; hop < 3 && forward.has(cur); hop++) cur = forward.get(cur)!;
    if (present.has(cur)) exists.add(t);
  }
}
const mentions = new Set(list.flatMap((r) => linkTargets(r.nameWikitext)));

// --- 3. Against Wikidata and OpenStreetMap ----------------------------------------------------------
const wd = await heritageWikidata();
interface Item { qid: string; be: string | null; beTarask: string | null; ru: string | null; en: string | null }
const items = new Map((JSON.parse(readFileSync('out/04-wikidata-items.json', 'utf8')) as Item[]).map((i) => [i.qid, i]));
const con = await openDb({ readOnly: true });
const osmCodes = new Set<string>();
for (const r of await rows<{ code: string }>(con, `SELECT trim(tags['ref:mcrb']) AS code FROM feature WHERE in_city AND tags['ref:mcrb'] IS NOT NULL`)) {
  for (const c of r.code.split(/[;,]\s*/)) osmCodes.add(c);
}
const osmWikidata = new Set((await rows<{ q: string }>(con, `SELECT DISTINCT tags['wikidata'] AS q FROM feature WHERE in_city AND tags['wikidata'] IS NOT NULL`)).map((r) => r.q));
const placePts = await rows<{ lat: number; lon: number }>(con, `SELECT lat, lon FROM place WHERE kind IN ('sight', 'nature', 'market')`);
const placeNear = (lat: number, lon: number, m: number) => placePts.some((p) => Math.abs(p.lat - lat) < 0.001 && Math.abs(p.lon - lon) < 0.0017 && haversine(lat, lon, p.lat, p.lon) <= m);

const n = list.length;
const withCode = list.filter((r) => /^\d{3}[А-ЯA-Z]\d{6}/.test(r.code));
const qidOf = (r: Row) => wd.qidByCode.get(r.code) ?? null;
const articleInWikidata = (r: Row) => {
  const i = qidOf(r) ? items.get(qidOf(r)!) : undefined;
  return Boolean(i && (i.be ?? i.beTarask ?? i.ru ?? i.en));
};
const ownArticleInList = (r: Row) => { const t = ownLink(r); return t !== null && exists.has(t); };
const inWikidata = (r: Row) => qidOf(r) !== null;
const inOsm = (r: Row) => osmCodes.has(r.code) || (qidOf(r) !== null && osmWikidata.has(qidOf(r)!)) || (r.lat !== null && r.lon !== null && placeNear(r.lat, r.lon, 25));
const k = (f: (r: Row) => boolean) => list.filter(f).length;
const summary = {
  parts: parts.length,
  rows: n,
  rows_with_a_state_code: withCode.length,
  distinct_codes: new Set(withCode.map((r) => r.code)).size,
  rows_with_coordinates: k((r) => r.lat !== null && r.lon !== null),
  rows_with_a_dating: k((r) => r.dating !== ''),
  rows_with_an_address: k((r) => r.address !== ''),
  rows_with_a_picture: k((r) => r.image),
  rows_whose_name_links_to_its_own_existing_article: k(ownArticleInList),
  rows_whose_name_links_to_a_missing_article: k((r) => ownLink(r) !== null && !exists.has(ownLink(r)!)),
  rows_whose_wikidata_item_has_an_article: k(articleInWikidata),
  rows_with_an_article_either_way: k((r) => ownArticleInList(r) || articleInWikidata(r)),
  rows_with_no_article_of_their_own: k((r) => !ownArticleInList(r) && !articleInWikidata(r)),
  rows_whose_code_is_in_wikidata: k(inWikidata),
  rows_whose_code_is_in_osm_ref_mcrb: k((r) => osmCodes.has(r.code)),
  rows_whose_wikidata_item_is_linked_from_osm: k((r) => qidOf(r) !== null && osmWikidata.has(qidOf(r)!)),
  rows_with_a_routable_place_within_25_m: k((r) => r.lat !== null && r.lon !== null && placeNear(r.lat, r.lon, 25)),
  rows_in_wikidata_or_osm: k((r) => inWikidata(r) || inOsm(r)),
  rows_that_match_nothing: k((r) => !inWikidata(r) && !inOsm(r)),
  distinct_articles_mentioned_in_names: mentions.size,
};

// Against the bank as it is today (the lists cite the printed register of 2009).
let bank: Record<string, number> | null = null;
if (existsSync('out/12-heritage-minsk.json')) {
  const bankCodes = (JSON.parse(readFileSync('out/12-heritage-minsk.json', 'utf8')) as { code: string }[]).map((o) => o.code.trim());
  const top = (c: string) => c.split('_')[0]!;
  const bankTop = new Set(bankCodes.map(top));
  const listTop = new Set(withCode.map((r) => top(r.code)));
  bank = {
    bank_objects_in_minsk: bankCodes.length,
    bank_top_level_codes: bankTop.size,
    list_codes: listTop.size,
    in_both: [...listTop].filter((c) => bankTop.has(c)).length,
    in_the_lists_only: [...listTop].filter((c) => !bankTop.has(c)).length,
    in_the_bank_only: [...bankTop].filter((c) => !listTop.has(c)).length,
  };
}

console.log(mdTable(['Part', 'Rows', 'Last edited', 'Revision'], parts.map((p) => [p.title, p.rows, p.edited, p.revision])));
console.log(mdTable(['Measure', 'Rows', 'Share'], Object.entries(summary).map(([key, v]) => [key, v, pct(v, n)])));
console.log('Against the bank:', bank);
console.log('Rows that match nothing, first fifteen:', list.filter((r) => !inWikidata(r) && !inOsm(r)).slice(0, 15).map((r) => `${r.code} ${r.name} — ${r.address.slice(0, 60)}`));

writeJson('out/13-bewiki-lists.json', {
  osm_date: OSM_DATE,
  read_at: new Date().toISOString().slice(0, 10),
  lists_of_this_kind_in_the_wiki: countryIndex.query.allpages.length,
  parts,
  summary,
  by_category: Object.entries(list.reduce<Record<string, number>>((a, r) => { a[r.category || '—'] = (a[r.category || '—'] ?? 0) + 1; return a; }, {})).sort(),
  against_the_bank: bank,
  rows_that_match_nothing: list.filter((r) => !inWikidata(r) && !inOsm(r)).map((r) => ({ code: r.code, name: r.name, address: r.address, dating: r.dating })),
  licence_stated_by_the_wiki: await rights(HOST),
  requests_full_pass: { minsk: 2 + Math.ceil(targets.length / 50), note: 'one index request, one request for the text of all parts, and one per fifty link targets checked' },
  requests: stats,
});
console.log('requests:', stats);
