// Names per language of the routable candidate Places: OpenStreetMap alone, then with the labels
// of Wikidata (through the links that exist, then through the proposed matches), then with the
// titles of the heritage bank. Also: what each source adds in facts, for the closing table.
import { readFileSync } from 'node:fs';
import { OSM_DATE, mdTable, openDb, pct, rows, writeJson } from './lib.ts';

interface Item { qid: string; be: string | null; beTarask: string | null; ru: string | null; en: string | null; labelBe: string | null; labelRu: string | null; labelEn: string | null }
const items = new Map((JSON.parse(readFileSync('out/04-wikidata-items.json', 'utf8')) as Item[]).map((i) => [i.qid, i]));
const hasArticle = (i: Item | undefined) => Boolean(i && (i.be ?? i.beTarask ?? i.ru ?? i.en));
const matches = (JSON.parse(readFileSync('out/11-matches.json', 'utf8')) as { setting: string; matches: { qid: string; ref: string; is_place: boolean }[] }[]).find((m) => m.setting === 'medium')!.matches;
const bank = JSON.parse(readFileSync('out/12-heritage-minsk.json', 'utf8')) as { code: string; title: string; dating: string | null; style: string | null; qid: string | null; osm: string | null; osm_is_place: boolean }[];

const con = await openDb({ readOnly: true });
interface PlaceRow { ref: string; kind: string; subkind: string; name: string | null; name_be: string | null; name_ru: string | null; name_en: string | null; wikidata: string | null }
const places = await rows<PlaceRow>(
  con,
  `SELECT osm_type || '/' || osm_id AS ref, kind, subkind, name, name_be, name_ru, name_en, wikidata
   FROM place WHERE kind IN ('sight', 'nature', 'market') ORDER BY osm_type, osm_id`,
);
const matchedItems = new Map<string, Item[]>();
for (const m of matches) {
  const it = items.get(m.qid);
  if (m.is_place && it) (matchedItems.get(m.ref) ?? matchedItems.set(m.ref, []).get(m.ref)!).push(it);
}
const generic = (title: string) => /^(будынак|будынкі|жылы дом|дом|комплекс будынкаў|комплекс забудовы|забудова.*)$/i.test(title.trim());
const bankOf = new Map<string, typeof bank>();
for (const b of bank) if (b.osm && b.osm_is_place) (bankOf.get(b.osm) ?? bankOf.set(b.osm, []).get(b.osm)!).push(b);

type Stage = 'OpenStreetMap alone' | 'with Wikidata labels through existing links' | 'with Wikidata labels through proposed matches' | 'with the titles of the heritage bank';
const STAGES: Stage[] = ['OpenStreetMap alone', 'with Wikidata labels through existing links', 'with Wikidata labels through proposed matches', 'with the titles of the heritage bank'];
function namesAt(p: PlaceRow, stage: number): { be: boolean; ru: boolean; en: boolean } {
  let be = p.name_be !== null;
  let ru = p.name_ru !== null;
  let en = p.name_en !== null;
  if (stage >= 1 && p.wikidata) {
    const it = items.get(p.wikidata);
    be ||= Boolean(it?.labelBe);
    ru ||= Boolean(it?.labelRu);
    en ||= Boolean(it?.labelEn);
  }
  if (stage >= 2) {
    for (const it of matchedItems.get(p.ref) ?? []) {
      be ||= Boolean(it.labelBe);
      ru ||= Boolean(it.labelRu);
      en ||= Boolean(it.labelEn);
    }
  }
  if (stage >= 3) be ||= (bankOf.get(p.ref) ?? []).some((b) => !generic(b.title));
  return { be, ru, en };
}
// "Named" as in the first report: the object carries a `name` tag.
const named = places.filter((p) => p.name !== null);
const table: (string | number)[][] = [];
const json: Record<string, unknown>[] = [];
for (const [label, set] of [['all routable candidates', places], ['candidates with a name in OpenStreetMap', named]] as const) {
  STAGES.forEach((stage, k) => {
    const n = set.map((p) => namesAt(p, k));
    const c = (f: (x: { be: boolean; ru: boolean; en: boolean }) => boolean) => n.filter(f).length;
    const row = { set: label, stage, places: set.length, be: c((x) => x.be), ru: c((x) => x.ru), en: c((x) => x.en), any: c((x) => x.be || x.ru || x.en) };
    json.push(row);
    table.push([label, stage, row.places, `${row.be} (${pct(row.be, set.length)})`, `${row.ru} (${pct(row.ru, set.length)})`, `${row.en} (${pct(row.en, set.length)})`]);
  });
}
console.log(mdTable(['Set', 'Stage', 'Places', 'Belarusian', 'Russian', 'English'], table));

// Places with no name at all in OpenStreetMap that a source can name.
const unnamed = places.filter((p) => !named.includes(p));
const unnamedGain = {
  unnamed_in_openstreetmap: unnamed.length,
  named_by_a_wikidata_label_through_an_existing_link: unnamed.filter((p) => { const x = namesAt(p, 1); return x.be || x.ru || x.en; }).length,
  named_after_the_proposed_matches: unnamed.filter((p) => { const x = namesAt(p, 2); return x.be || x.ru || x.en; }).length,
  named_after_the_heritage_bank: unnamed.filter((p) => { const x = namesAt(p, 3); return x.be || x.ru || x.en; }).length,
};
console.log(unnamedGain);

// What Wikidata's own English labels look like, since they carry most of the gain in English.
const linkedItems = places.filter((p) => p.wikidata && items.get(p.wikidata)?.labelEn).map((p) => items.get(p.wikidata!)!.labelEn!);
const english = {
  english_labels_through_existing_links: linkedItems.length,
  of_them_with_belarusian_latin_diacritics: linkedItems.filter((l) => /[ŭĺčšžńśźćŁłŬČŠŽ]/.test(l)).length,
  of_them_an_address_rather_than_a_name: linkedItems.filter((l) => /\b(Street|Avenue|Lane|Square)\b.*\d|, Minsk$/.test(l)).length,
};
console.log(english);

// Facts: Places the heritage bank reaches, and how many of them have no article today.
const reached = places.filter((p) => bankOf.has(p.ref));
const facts = {
  routable_places_the_bank_reaches: reached.length,
  of_them_without_any_wikipedia_article_today: reached.filter((p) => !hasArticle(p.wikidata ? items.get(p.wikidata) : undefined)).length,
  of_them_with_a_dating_from_the_bank: reached.filter((p) => bankOf.get(p.ref)!.some((b) => b.dating && b.dating.trim() !== '')).length,
  of_them_with_a_style_from_the_bank: reached.filter((p) => bankOf.get(p.ref)!.some((b) => b.style && b.style.trim() !== '')).length,
  routable_places_with_an_article_today: places.filter((p) => hasArticle(p.wikidata ? items.get(p.wikidata) : undefined)).length,
  routable_places_with_an_article_or_a_bank_record: places.filter((p) => hasArticle(p.wikidata ? items.get(p.wikidata) : undefined) || bankOf.has(p.ref)).length,
  routable_places_with_a_start_date_tag_in_osm: (await rows<{ n: number }>(con, `SELECT count(*)::DOUBLE AS n FROM place WHERE kind IN ('sight', 'nature', 'market') AND tags['start_date'] IS NOT NULL`))[0]!.n,
};
console.log(facts);

writeJson('out/16-names.json', { osm_date: OSM_DATE, matches_setting: 'medium', names: json, unnamed: unnamedGain, english_labels: english, facts_from_the_heritage_bank: facts });
