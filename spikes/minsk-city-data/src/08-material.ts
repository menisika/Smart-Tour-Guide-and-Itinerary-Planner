// Material for the checks listed in docs/adr/README.md:
//   1. a proposed reference Outing for scenario SC-1, with walking legs from our own graph;
//   2. ten Places for the model comparison of ADR-0004, spread across source situations;
//   3. names and short phrases for the listening comparison of ADR-0014, with the stress marks
//      the lead sentences of Wikipedia give.
// The selections below are a proposal made from the data; the owner and the Curator decide.
import { brotliCompressSync, constants as zc } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { OSM_DATE, STATION, mdTable, openDb, rows, writeJson } from './lib.ts';
import { NodeIndex, Searcher, buildGraph, deserialize, serialize, type Graph, type UndirectedEdge } from './graph.ts';
import { WIKI_HOST, actionPost, articleLengths, stats, type WikiLang } from './wiki.ts';

interface Item {
  qid: string;
  image: boolean;
  be: string | null;
  beTarask: string | null;
  ru: string | null;
  en: string | null;
  heritage: boolean;
  labelBe: string | null;
  labelRu: string | null;
  labelEn: string | null;
  bytes?: Partial<Record<WikiLang, number>>;
}
const items = new Map((JSON.parse(readFileSync('out/04-wikidata-items.json', 'utf8')) as Item[]).map((i) => [i.qid, i]));
const con = await openDb({ readOnly: true });

interface PlaceRow {
  ref: string;
  subkind: string;
  name: string | null;
  name_be: string | null;
  name_ru: string | null;
  name_en: string | null;
  wikidata: string | null;
  opening_hours: string | null;
  start_date: string | null;
  lat: number;
  lon: number;
}
async function place(ref: string): Promise<PlaceRow> {
  const [type, id] = ref.split('/');
  const r = await rows<PlaceRow>(
    con,
    `SELECT osm_type || '/' || osm_id AS ref, subkind, name, name_be, name_ru, name_en, wikidata, opening_hours,
            tags['start_date'] AS start_date, round(lat, 5) AS lat, round(lon, 5) AS lon
     FROM place WHERE osm_type = '${type}' AND osm_id = ${id}`,
  );
  if (!r[0]) throw new Error(`no candidate Place ${ref}`);
  return r[0];
}

// Lengths of articles for items the knowledge step did not measure.
async function ensureLengths(list: Item[]): Promise<void> {
  for (const lang of ['be', 'beTarask', 'ru', 'en'] as WikiLang[]) {
    const need = list.filter((i) => i[lang] !== null && i.bytes?.[lang] === undefined);
    if (need.length === 0) continue;
    const got = await articleLengths(lang, need.map((i) => i[lang]!));
    for (const i of need) {
      const b = got.get(i[lang]!);
      if (b !== undefined) (i.bytes ??= {})[lang] = b;
    }
  }
}
const kb = (b: number | undefined) => (b === undefined ? '—' : `${(b / 1000).toFixed(1)} kB`);
// A name marked with * comes from the Wikidata label, because OpenStreetMap has none.
function names(p: PlaceRow, it: Item | undefined): { be: string; ru: string; en: string } {
  const pick = (osm: string | null, wd: string | null | undefined) => osm ?? (wd ? `${wd}*` : '—');
  return { be: pick(p.name_be ?? p.name, it?.labelBe), ru: pick(p.name_ru, it?.labelRu), en: pick(p.name_en, it?.labelEn) };
}
const sources = (it: Item | undefined) =>
  it
    ? `${it.qid}; be ${kb(it.bytes?.be)}, be-tarask ${kb(it.bytes?.beTarask)}, ru ${kb(it.bytes?.ru)}, en ${kb(it.bytes?.en)}; photo ${it.image ? 'yes' : 'no'}`
    : 'none';

// ================================================================================================
// 1. Reference Outing for SC-1: "three hours before the train", start and finish at the railway
//    station, on foot, the Wish "early 20th-century architecture, no museums".
// ================================================================================================
const WALK_KMH = 4.5; // assumption for "normal" pace: the specification names the paces, not their speeds
const VISIT_MIN = 8; // assumption: an outside stop with a Story of about 90 seconds

const OUTING: { ref: string; built: string; sensitive?: string }[] = [
  { ref: 'relation/9383682', built: 'not dated in OpenStreetMap; tagged as Stalinist neoclassicism' },
  { ref: 'way/25434700', built: '1911' },
  { ref: 'way/100418249', built: '1910', sensitive: 'religion' },
  { ref: 'way/25387578', built: '1912' },
  { ref: 'way/35996170', built: 'early 20th century' },
  { ref: 'way/35996172', built: 'early 20th century', sensitive: 'to check: the articles are about the house of the people\'s militia of 1917' },
  { ref: 'way/25435141', built: '1917' },
  { ref: 'way/38809287', built: 'late 19th – early 20th century' },
  { ref: 'way/25387470', built: 'early 20th century', sensitive: 'religion (a former synagogue)' },
  { ref: 'way/25327619', built: '1890' },
  { ref: 'way/25327580', built: '1913' },
];

const g = deserialize(new Uint8Array(readFileSync('out/minsk-walk-full.bin')));
const index = new NodeIndex(g);
const search = new Searcher(g);
const stops = await Promise.all(OUTING.map((o) => place(o.ref)));
await ensureLengths(stops.map((p) => items.get(p.wikidata ?? '')).filter((x): x is Item => Boolean(x)));

// Distance matrix between the station (index 0) and the stops, in decimetres.
const points = [{ lat: STATION.lat, lon: STATION.lon }, ...stops.map((p) => ({ lat: p.lat, lon: p.lon }))];
const snapped = points.map((p) => index.nearest(p.lat, p.lon, 250));
const n = points.length;
const dm: number[][] = [];
for (let i = 0; i < n; i++) {
  search.run(snapped[i]!.node, 80_000);
  dm.push(points.map((_, j) => search.dist[snapped[j]!.node]! + Math.round((snapped[i]!.metres + snapped[j]!.metres) * 10)));
}
// The shortest closed walk through all stops (Held–Karp; exact for a dozen stops).
const FULL = 1 << (n - 1);
const best = Array.from({ length: FULL }, () => new Float64Array(n - 1).fill(Infinity));
const prev = Array.from({ length: FULL }, () => new Int8Array(n - 1).fill(-1));
for (let j = 0; j < n - 1; j++) best[1 << j]![j] = dm[0]![j + 1]!;
for (let mask = 1; mask < FULL; mask++) {
  for (let j = 0; j < n - 1; j++) {
    if (!(mask & (1 << j)) || best[mask]![j] === Infinity) continue;
    for (let k = 0; k < n - 1; k++) {
      if (mask & (1 << k)) continue;
      const cost = best[mask]![j]! + dm[j + 1]![k + 1]!;
      if (cost < best[mask | (1 << k)]![k]!) {
        best[mask | (1 << k)]![k] = cost;
        prev[mask | (1 << k)]![k] = j;
      }
    }
  }
}
let last = 0;
let total = Infinity;
for (let j = 0; j < n - 1; j++) {
  const cost = best[FULL - 1]![j]! + dm[j + 1]![0]!;
  if (cost < total) {
    total = cost;
    last = j;
  }
}
const order: number[] = [];
for (let mask = FULL - 1, j = last; j !== -1; ) {
  order.push(j);
  const pj = prev[mask]![j]!;
  mask ^= 1 << j;
  j = pj;
}
order.reverse();

const minutes = (decimetres: number) => decimetres / 10 / ((WALK_KMH * 1000) / 60);
let clock = 0;
let at = 0;
const outingRows: (string | number)[][] = [];
const outingJson: Record<string, unknown>[] = [];
order.forEach((j, k) => {
  const p = stops[j]!;
  const o = OUTING[j]!;
  const it = items.get(p.wikidata ?? '');
  const leg = dm[at]![j + 1]!;
  clock += minutes(leg);
  const nm = names(p, it);
  const hours = p.opening_hours ? `known: ${p.opening_hours}` : 'unknown (viewed from outside)';
  outingRows.push([k + 1, nm.be, nm.ru, nm.en, `${p.lat}, ${p.lon}`, o.built, Math.round(leg / 10), Math.round(clock), hours, sources(it), o.sensitive ?? '—', p.ref]);
  outingJson.push({ order: k + 1, names: nm, lat: p.lat, lon: p.lon, built: o.built, leg_m: Math.round(leg / 10), arrive_min: Math.round(clock), opening_hours: p.opening_hours, wikidata: p.wikidata, articles_bytes: it?.bytes ?? {}, titles: it ? { be: it.be, be_tarask: it.beTarask, ru: it.ru, en: it.en } : null, photo: it?.image ?? false, heritage: it?.heritage ?? false, sensitive: o.sensitive ?? null, osm: p.ref });
  clock += VISIT_MIN;
  at = j + 1;
});
const backLeg = dm[at]![0]!;
clock += minutes(backLeg);
const walkM = Math.round(total / 10);
console.log('1. Reference Outing for SC-1 (proposal)\n');
console.log(mdTable(
  ['#', 'Belarusian', 'Russian', 'English', 'Coordinates', 'Built', 'Leg, m', 'Arrive, min', 'Opening hours', 'Sources', 'Sensitive', 'OSM'],
  outingRows,
));
const atSpeed = (kmh: number) => Math.round(walkM / ((kmh * 1000) / 60)) + stops.length * VISIT_MIN;
console.log(`\nBack to the station: ${Math.round(backLeg / 10)} m. Walking ${walkM} m = ${Math.round(minutes(total))} min at ${WALK_KMH} km/h; ` +
  `${stops.length} stops x ${VISIT_MIN} min = ${stops.length * VISIT_MIN} min; total ${Math.round(clock)} min ` +
  `(${atSpeed(4)} min at 4 km/h, ${atSpeed(5)} min at 5 km/h).`);

// What a Route Pack for this Outing would carry besides audio: the area with a 400 m margin.
const MARGIN_M = 400;
const lats = points.map((p) => p.lat);
const lons = points.map((p) => p.lon);
const dLat = MARGIN_M / 111_320;
const dLon = MARGIN_M / (111_320 * Math.cos((STATION.lat * Math.PI) / 180));
const box = { w: Math.min(...lons) - dLon, s: Math.min(...lats) - dLat, e: Math.max(...lons) + dLon, n: Math.max(...lats) + dLat };
writeFileSync('out/08-outing-bbox.txt', [box.w, box.s, box.e, box.n].map((x) => x.toFixed(5)).join(','));
function cutBox(graph: Graph): Graph {
  const id = new Int32Array(graph.nodeCount).fill(-1);
  const la: number[] = [];
  const lo: number[] = [];
  for (let v = 0; v < graph.nodeCount; v++) {
    const y = graph.lat[v]! / 1e7;
    const x = graph.lon[v]! / 1e7;
    if (y >= box.s && y <= box.n && x >= box.w && x <= box.e) {
      id[v] = la.length;
      la.push(graph.lat[v]!);
      lo.push(graph.lon[v]!);
    }
  }
  const es: UndirectedEdge[] = [];
  for (let v = 0; v < graph.nodeCount; v++) {
    if (id[v] === -1) continue;
    for (let e = graph.firstOut[v]!; e < graph.firstOut[v + 1]!; e++) {
      const w = graph.head[e]!;
      if (w > v && id[w] !== -1) es.push({ a: id[v]!, b: id[w]!, lenDm: graph.len[e]!, flags: graph.flags[e]! });
    }
  }
  return buildGraph(Int32Array.from(la), Int32Array.from(lo), es);
}
const cut = cutBox(g);
const cutBytes = serialize(cut);
const inBox = (
  await rows<{ n: number }>(
    con,
    `SELECT count(*)::DOUBLE AS n FROM place WHERE kind IN ('sight', 'nature', 'market')
       AND lon BETWEEN ${box.w} AND ${box.e} AND lat BETWEEN ${box.s} AND ${box.n}`,
  )
)[0]!.n;
const pack = {
  bbox: [box.w, box.s, box.e, box.n].map((x) => Number(x.toFixed(5))),
  width_m: Math.round((box.e - box.w) * 111_320 * Math.cos((STATION.lat * Math.PI) / 180)),
  height_m: Math.round((box.n - box.s) * 111_320),
  graph_nodes: cut.nodeCount,
  graph_street_segments: cut.edgeCount / 2,
  graph_bytes_raw: cutBytes.byteLength,
  graph_bytes_brotli: brotliCompressSync(cutBytes, { params: { [zc.BROTLI_PARAM_QUALITY]: 9 } }).byteLength,
  candidate_places_in_box: inBox,
  dense_matrix_of_those_places_bytes: inBox * inBox * 2,
};
console.log('\nRoute Pack area of this Outing:', pack);

// ================================================================================================
// 2. Ten Places for the model comparison of ADR-0004.
// ================================================================================================
const TEN: { ref: string; sensitive?: string }[] = [
  // Belarusian only
  { ref: 'way/25435144' }, // Janicki House
  { ref: 'node/4711338416' }, // the sculpture of the city policeman
  { ref: 'node/249843013', sensitive: 'war' }, // "Partisan Belarus" monument
  { ref: 'way/25326432', sensitive: 'religion' }, // Orthodox church
  // Belarusian and Russian
  { ref: 'relation/9383682' }, // The Minsk Gate
  { ref: 'way/25387578' }, // Abrampoĺski House
  { ref: 'way/346312697', sensitive: 'war' }, // Victory Monument
  // English available
  { ref: 'way/100418249', sensitive: 'religion' }, // Church of Saints Simon and Helena
  { ref: 'node/255310414', sensitive: 'war (the Minsk ghetto)' }, // Yama memorial
  { ref: 'way/25327619', sensitive: 'to check: recent events with living persons in the articles' }, // Kupala Theatre
];
const RESERVE = { ref: 'way/25387513', sensitive: 'repression; living persons' }; // the KGB remand prison
const tenPlaces = await Promise.all([...TEN, RESERVE].map((x) => place(x.ref)));
await ensureLengths(tenPlaces.map((p) => items.get(p.wikidata ?? '')).filter((x): x is Item => Boolean(x)));
const situation = (it: Item | undefined) =>
  !it ? 'none' : it.en ? 'English available' : (it.be ?? it.beTarask) && it.ru ? 'Belarusian and Russian' : (it.be ?? it.beTarask) ? 'Belarusian only' : it.ru ? 'Russian only' : 'none';
const tenRows: (string | number)[][] = [];
const tenJson: Record<string, unknown>[] = [];
tenPlaces.forEach((p, k) => {
  const it = items.get(p.wikidata ?? '');
  const spec = k < TEN.length ? TEN[k]! : RESERVE;
  const nm = names(p, it);
  tenRows.push([k < TEN.length ? k + 1 : 'reserve', nm.be, nm.ru, nm.en, situation(it), kb(it?.bytes?.be), kb(it?.bytes?.beTarask), kb(it?.bytes?.ru), kb(it?.bytes?.en), spec.sensitive ?? '—', p.subkind, `${p.lat}, ${p.lon}`, p.wikidata ?? '—', p.ref]);
  tenJson.push({ n: k < TEN.length ? k + 1 : 'reserve', names: nm, situation: situation(it), articles_bytes: it?.bytes ?? {}, titles: it ? { be: it.be, be_tarask: it.beTarask, ru: it.ru, en: it.en } : null, sensitive: spec.sensitive ?? null, kind: p.subkind, lat: p.lat, lon: p.lon, wikidata: p.wikidata, osm: p.ref });
});
console.log('\n2. Ten Places for the model comparison (proposal)\n');
console.log(mdTable(['#', 'Belarusian', 'Russian', 'English', 'Source situation', 'be', 'be-tarask', 'ru', 'en', 'Sensitive (KNW-14)', 'Kind', 'Coordinates', 'Wikidata', 'OSM'], tenRows));

// ================================================================================================
// 3. Names and phrases for the listening comparison of ADR-0014.
//    `ruTitle` is the article whose lead sentence is read for a stress mark (U+0301).
// ================================================================================================
interface Phrase {
  lang: 'ru' | 'en';
  text: string;
  why: string;
  ruTitle?: string;
  word?: string; // the word whose stress is in question, lower case, without the mark
}
const PHRASES: Phrase[] = [
  { lang: 'ru', text: 'Улица Немига', word: 'немига', ruTitle: 'Немига', why: 'three-syllable toponym; the Belarusian form is Няміга' },
  { lang: 'ru', text: 'Река Свислочь', word: 'свислочь', ruTitle: 'Свислочь (приток Березины)', why: 'hydronym; nothing in the spelling shows the stress' },
  { lang: 'ru', text: 'Троицкое предместье', word: 'троицкое', ruTitle: 'Троицкое предместье', why: 'common name, baseline' },
  { lang: 'ru', text: 'Раковское предместье', word: 'раковское', ruTitle: 'Раковское предместье', why: 'adjective made from a place name' },
  { lang: 'ru', text: 'Лошицкий парк', word: 'лошица', ruTitle: 'Лошица', why: 'toponym Лошица and its adjective' },
  { lang: 'ru', text: 'Урочище Куропаты', word: 'куропаты', ruTitle: 'Куропаты', why: 'toponym; also a sensitive Place' },
  { lang: 'ru', text: 'Комаровский рынок, или Комаровка', word: 'комаровка', ruTitle: 'Комаровка (Минск)', why: 'colloquial form next to the official one' },
  { lang: 'ru', text: 'Микрорайон Уручье', word: 'уручье', ruTitle: 'Уручье (Минск)', why: 'toponym with a neuter ending' },
  { lang: 'ru', text: 'Курасовщина', word: 'курасовщина', ruTitle: 'Курасовщина', why: 'four syllables, suffix -овщина' },
  { lang: 'ru', text: 'Серебрянка', word: 'серебрянка', ruTitle: 'Серебрянка (Минск)', why: 'coincides with a common noun' },
  { lang: 'ru', text: 'Каменная Горка', word: 'каменная', ruTitle: 'Каменная Горка (Минск)', why: 'an ordinary adjective inside a name' },
  { lang: 'ru', text: 'Зыбицкая улица', word: 'зыбицкая', ruTitle: 'Зыбицкая улица', why: 'rare adjective' },
  { lang: 'ru', text: 'Чижовка', word: 'чижовка', ruTitle: 'Чижовка (Минск)', why: 'short toponym in -овка' },
  { lang: 'ru', text: 'Водохранилище Дрозды', word: 'дрозды', ruTitle: 'Дрозды (водохранилище)', why: 'coincides with the plural of a common noun' },
  { lang: 'ru', text: 'Грушевка', word: 'грушевка', ruTitle: 'Грушевка (Минск)', why: 'е or ё: the spelling does not say' },
  { lang: 'ru', text: 'Шабаны', word: 'шабаны', ruTitle: 'Шабаны (Минск)', why: 'plural toponym' },
  { lang: 'ru', text: 'Пищаловский замок', word: 'пищаловский', ruTitle: 'Пищаловский замок', why: 'adjective from a surname' },
  { lang: 'ru', text: 'Остров Мужества и Скорби, который называют Островом слёз', word: 'скорби', ruTitle: 'Остров Мужества и Скорби', why: 'the letter ё and a genitive form' },
  { lang: 'ru', text: 'Костёл Святого Симеона и Святой Елены, или Красный костёл', word: 'костёл', ruTitle: 'Костёл Святого Симеона и Святой Елены (Минск)', why: 'костёл with ё; two saints\' names' },
  { lang: 'ru', text: 'Красный костёл основал Эдвард Войнилович.', word: 'войнилович', ruTitle: 'Войнилович, Эдвард', why: 'surname in -ович' },
  { lang: 'ru', text: 'Театр имени Янки Купалы', word: 'купала', ruTitle: 'Янка Купала', why: 'a name declined in the genitive' },
  { lang: 'ru', text: 'Площадь Якуба Коласа', word: 'якуб', ruTitle: 'Якуб Колас', why: 'a first name with two possible stresses' },
  { lang: 'ru', text: 'Музей Максима Богдановича', word: 'богданович', ruTitle: 'Богданович, Максим Адамович', why: 'surname in -ович' },
  { lang: 'ru', text: 'Дом Ваньковичей', word: 'ванькович', ruTitle: 'Дом Ваньковичей', why: 'surname in the genitive plural' },
  { lang: 'ru', text: 'Дом Костровицкой построен в 1911 году, дом Абрампольского — в 1912-м.', word: 'костровицкой', ruTitle: 'Дом Костровицкой', why: 'two rare surnames and two years to read out' },
  { lang: 'ru', text: 'Пр-т Независимости, д. 26 — «Юбилейный дом», XX в.', why: 'abbreviations, a house number and a Roman numeral: text normalisation' },
  { lang: 'en', text: 'The Church of Saints Simon and Helena, known as the Red Church', why: 'baseline English name' },
  { lang: 'en', text: 'Niamiha Street and the Trinity Suburb, Trajeckaje pradmiescie', why: 'Belarusian names inside an English sentence' },
  { lang: 'en', text: 'Abrampoĺski House and Unichoŭski House', why: 'English labels of Wikidata as they are, with the diacritics of Belarusian Latin' },
  { lang: 'en', text: 'Lošyca Park, Kurasoŭščyna Park and Janka Kupala Street', why: 'name:en values of OpenStreetMap and a Wikidata label as they are: š, č, ŭ and an initial J' },
];
const STRESS = '́';
async function leads(lang: WikiLang, titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 20) {
    const res = await actionPost<{ query: { normalized?: { from: string; to: string }[]; redirects?: { from: string; to: string }[]; pages: { title: string; extract?: string; missing?: boolean }[] } }>(
      WIKI_HOST[lang],
      { action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', exsentences: '2', exlimit: '20', redirects: '1', titles: titles.slice(i, i + 20).join('|') },
    );
    const back = new Map<string, string>();
    for (const r of [...(res.query.normalized ?? []), ...(res.query.redirects ?? [])]) back.set(r.to, back.get(r.from) ?? r.from);
    for (const page of res.query.pages) if (page.extract) out.set(back.get(page.title) ?? page.title, page.extract);
  }
  return out;
}
const ruLeads = await leads('ru', [...new Set(PHRASES.map((p) => p.ruTitle).filter((x): x is string => Boolean(x)))]);
const stressedWords = (text: string) => text.normalize('NFC').match(new RegExp(`[\\p{L}${STRESS}-]*${STRESS}[\\p{L}${STRESS}-]*`, 'gu')) ?? [];
const plain = (w: string) => w.replaceAll(STRESS, '').toLowerCase().replaceAll('ё', 'е');
const phraseRows: (string | number)[][] = [];
const phraseJson: Record<string, unknown>[] = [];
PHRASES.forEach((p, k) => {
  const lead = p.ruTitle ? ruLeads.get(p.ruTitle) : undefined;
  const marked = lead ? stressedWords(lead) : [];
  // The marked word of the lead that matches the word in question by its first five letters.
  const key = p.word ? plain(p.word).slice(0, 5) : '';
  const match = marked.find((w) => key !== '' && plain(w).startsWith(key));
  const stress = !p.ruTitle
    ? 'not applicable'
    : !lead
      ? 'article not found'
      : match
        ? `${match} (lead of «${p.ruTitle}»)`
        : marked.length > 0
          ? `no mark on the word; the lead marks: ${marked.slice(0, 3).join(', ')}`
          : 'no stress mark in the lead';
  phraseRows.push([k + 1, p.lang, p.text, stress, p.why]);
  phraseJson.push({ n: k + 1, lang: p.lang, text: p.text, word: p.word ?? null, stress_from_ru_wikipedia_lead: match ?? null, lead_title: p.ruTitle ?? null, lead_stressed_words: marked, why: p.why });
});
console.log('\n3. Names and phrases for the listening comparison (proposal)\n');
console.log(mdTable(['#', 'Language', 'Text to synthesise', 'Stress given by ru.wikipedia', 'Why it is in the list'], phraseRows));

writeJson('out/08-material.json', {
  osm_date: OSM_DATE,
  wikipedia_read_at: new Date().toISOString().slice(0, 10),
  outing: {
    assumptions: { walking_kmh: WALK_KMH, visit_minutes: VISIT_MIN },
    start_finish: { name: 'Minsk railway station (Мінск-Пасажырскі)', ...STATION },
    stops: outingJson,
    back_to_station_m: Math.round(backLeg / 10),
    walking_m: walkM,
    walking_min: Math.round(minutes(total)),
    visiting_min: stops.length * VISIT_MIN,
    total_min: Math.round(clock),
    total_min_at_4_kmh: atSpeed(4),
    total_min_at_5_kmh: atSpeed(5),
    route_pack_area: pack,
  },
  ten_places: tenJson,
  phrases: phraseJson,
  requests: stats,
});
console.log('\nrequests:', stats);
