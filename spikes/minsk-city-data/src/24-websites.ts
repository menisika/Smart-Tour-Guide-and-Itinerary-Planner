// A Place's own website as a source: a stratified sample of 200 objects of the five groups that
// carry a website tag. Links to social networks and aggregators are counted and not fetched. For
// the rest the home page is fetched once — robots.txt first, a time limit, a size limit, a generic
// client name — and kept in data/web-cache/place-sites/ so that a second run sends nothing.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { USER_AGENT, mdTable, pct, writeJson } from './lib.ts';
import { GROUPS, GROUP_LABEL, type Group } from './focus.ts';
import { sample } from './names.ts';

const SPLIT: Record<Group, number> = { eating: 60, lodging: 50, sights: 45, entertainment: 30, nature: 15 };
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 2_000_000;
const CACHE = 'data/web-cache/place-sites';
const PARALLEL = 4; // different sites; never two requests to one site at a time

// Hosts that are not a Place's own site.
const SOCIAL = /(^|\.)(instagram\.com|vk\.com|vk\.ru|vk\.link|facebook\.com|fb\.com|fb\.me|t\.me|telegram\.me|telegram\.org|ok\.ru|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|linkedin\.com|taplink\.cc|taplink\.ws|linktr\.ee|wa\.me|viber\.com)$/i;
const AGGREGATOR = /(^|\.)(booking\.com|relax\.by|tripadvisor\.[a-z.]+|airbnb\.[a-z.]+|ostrovok\.ru|hotels\.com|101hotels\.[a-z]+|holiday\.by|vetliva\.[a-z]+|belhotel\.by|2gis\.[a-z]+|yandex\.[a-z]+|google\.[a-z.]+|goo\.gl|maps\.app\.goo\.gl|foursquare\.com|zoon\.[a-z]+|carte\.by|restoran\.by|koko\.by|afisha\.[a-z]+|bycard\.by|kvitki\.by|ticketpro\.by|wikipedia\.org|wikimedia\.org|openstreetmap\.org|sites\.google\.com|business\.site)$/i;

interface FocusObject { type: string; id: number; group: Group; website: string | null; name: string | null; area: string }
const all = (JSON.parse(readFileSync('out/21-focus-objects.json', 'utf8')) as FocusObject[]).filter((o) => o.website !== null);

function normalise(raw: string): URL | null {
  const first = raw.split(/[;\s]/)[0]!.trim();
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(first) ? first : `http://${first}`);
  } catch {
    return null;
  }
}
const kindOfHost = (host: string) => (SOCIAL.test(host) ? 'social network' : AGGREGATOR.test(host) ? 'aggregator' : 'own site');

// --- 1. The whole population: what the website tags point at ---------------------------------------
const population: Record<string, Record<string, number>> = {};
for (const g of [...GROUPS, 'all'] as const) population[g] = { 'own site': 0, 'social network': 0, aggregator: 0, 'not a URL': 0 };
const hostCount = new Map<string, number>();
for (const o of all) {
  const u = normalise(o.website!);
  const k = u ? kindOfHost(u.hostname) : 'not a URL';
  population[o.group]![k]!++;
  population.all![k]!++;
  if (u) hostCount.set(u.hostname.replace(/^www\./, ''), (hostCount.get(u.hostname.replace(/^www\./, '')) ?? 0) + 1);
}

// --- 2. The sample: per group, one object per host --------------------------------------------------
const picked: { o: FocusObject; url: URL | null; kind: string }[] = [];
const seenHosts = new Set<string>();
for (const g of GROUPS) {
  const pool = sample(all.filter((o) => o.group === g).sort((a, b) => a.id - b.id), 100_000, 20261124);
  let n = 0;
  for (const o of pool) {
    if (n >= SPLIT[g]) break;
    const url = normalise(o.website!);
    const kind = url ? kindOfHost(url.hostname) : 'not a URL';
    const host = url?.hostname.replace(/^www\./, '') ?? `invalid:${o.id}`;
    // A chain's site would be fetched once anyway; a second Place of the chain adds nothing.
    if (kind === 'own site' && seenHosts.has(host)) continue;
    seenHosts.add(host);
    picked.push({ o, url, kind });
    n++;
  }
}

// --- 3. Fetching, once, politely --------------------------------------------------------------------
interface Fetched { url: string; ok: boolean; status: number | null; finalUrl: string | null; contentType: string | null; error: string | null; body: string; bytes: number; fetchedAt: string }
mkdirSync(CACHE, { recursive: true });
const cachePath = (url: string) => `${CACHE}/${createHash('sha1').update(url).digest('hex')}.json`;
let network = 0;
async function get(url: string, accept: string): Promise<Fetched> {
  const file = cachePath(url);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as Fetched;
  const out: Fetched = { url, ok: false, status: null, finalUrl: null, contentType: null, error: null, body: '', bytes: 0, fetchedAt: new Date().toISOString() };
  network++;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: accept, 'Accept-Language': 'be,ru;q=0.9,en;q=0.8' }, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' });
    out.status = res.status;
    out.finalUrl = res.url;
    out.contentType = res.headers.get('content-type');
    out.ok = res.ok;
    // Read at most MAX_BYTES of the body.
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        out.bytes += value.byteLength;
        if (out.bytes >= MAX_BYTES) {
          await reader.cancel();
          break;
        }
      }
    }
    const buf = Buffer.concat(chunks);
    const charset = /charset=["']?([\w-]+)/i.exec(out.contentType ?? '')?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(buf.subarray(0, 2048).toString('latin1'))?.[1] ?? 'utf-8';
    try {
      out.body = new TextDecoder(charset.toLowerCase()).decode(buf);
    } catch {
      out.body = buf.toString('utf8');
    }
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    out.error = err.cause?.code ?? (err.name === 'TimeoutError' ? 'TIMEOUT' : err.cause?.message ?? err.message);
  }
  writeFileSync(file, JSON.stringify(out));
  return out;
}

/** Does robots.txt let a client with a generic name read this path? */
function allowedByRobots(robots: string, path: string): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (field === 'user-agent') {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === 'allow' || field === 'disallow') && cur) {
      cur.rules.push({ allow: field === 'allow', path: value });
      lastWasAgent = false;
    } else lastWasAgent = false;
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== '*' && USER_AGENT.toLowerCase().includes(a)));
  const use = mine.length > 0 ? mine : groups.filter((g) => g.agents.includes('*'));
  let best: { allow: boolean; len: number } = { allow: true, len: -1 };
  for (const g of use) {
    for (const r of g.rules) {
      if (r.path === '') continue;
      const pattern = new RegExp(`^${r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$')}`);
      if (pattern.test(path) && (r.path.length > best.len || (r.path.length === best.len && r.allow))) best = { allow: r.allow, len: r.path.length };
    }
  }
  return best.allow;
}

const visibleText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<!--[\s\S]*?-->|<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const PARKED = /domain (name )?(is )?for sale|buy this domain|this domain (is|has been) parked|domain parking|домен (продаётся|продается|выставлен на продажу|припаркован|свободен)|продажа домена|купить (этот )?домен|срок (регистрации|действия) (домена|хостинга) (ист[её]к|закончился)|хостинг .{0,40}(не оплачен|приостановлен|заблокирован)|сайт (временно )?(заблокирован|отключ[её]н|приостановлен)|account (has been )?suspended|website is (under construction|coming soon)|сайт (находится )?в разработке|welcome to nginx|apache2? (ubuntu |debian )?default page|it works!|index of \//i;
const LOCAL_BUSINESS = new Set(['LocalBusiness', 'Restaurant', 'CafeOrCoffeeShop', 'BarOrPub', 'FastFoodRestaurant', 'FoodEstablishment', 'Bakery', 'Brewery', 'IceCreamShop', 'Winery', 'Hotel', 'LodgingBusiness', 'Hostel', 'Motel', 'Resort', 'BedAndBreakfast', 'Campground', 'TouristAttraction', 'Museum', 'Zoo', 'Aquarium', 'AmusementPark', 'MovieTheater', 'NightClub', 'PerformingArtsTheater', 'EntertainmentBusiness', 'ArtGallery', 'Casino', 'BowlingAlley', 'Park', 'Church', 'PlaceOfWorship', 'TouristInformationCenter', 'SportsActivityLocation', 'Store', 'HealthAndBeautyBusiness', 'CivicStructure', 'LandmarksOrHistoricalBuildings']);
function jsonLd(html: string): { any: boolean; types: string[]; local: boolean; hours: boolean } {
  const types: string[] = [];
  let hours = false;
  let any = false;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return void node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    const t = obj['@type'];
    for (const x of Array.isArray(t) ? t : t ? [t] : []) if (typeof x === 'string') types.push(x.replace(/^https?:\/\/schema\.org\//, ''));
    if ('openingHours' in obj || 'openingHoursSpecification' in obj) hours = true;
    for (const v of Object.values(obj)) walk(v);
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    any = true;
    try {
      walk(JSON.parse(m[1]!.trim()));
    } catch {
      if (/"openingHours(Specification)?"/.test(m[1]!)) hours = true;
      for (const t of m[1]!.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) types.push(t[1]!);
    }
  }
  return { any, types: [...new Set(types)], local: types.some((t) => LOCAL_BUSINESS.has(t)), hours };
}
// Hours a person can read: a time range within eighty characters of a word about working time,
// or "round the clock".
const CUE = '(режим работы|время работы|часы работы|график работы|работаем|ежедневно|круглосуточно|без выходных|выходной|пн|вт|ср|чт|пт|сб|вс|понедельник|будни|рэжым працы|час працы|штодня|opening hours|working hours|open daily|open:|mon|tue|daily|hours)';
const RANGE = '(?:[01]?\\d|2[0-4])[:.][0-5]\\d\\s*(?:-|–|—|до|to|till)\\s*(?:[01]?\\d|2[0-4])[:.][0-5]\\d';
const HOURS_NEAR_CUE = new RegExp(`${CUE}[^]{0,80}?${RANGE}|${RANGE}[^]{0,80}?${CUE}`, 'i');
const ROUND_THE_CLOCK = /круглосуточно|кругласутачна|24\s*\/\s*7|24 часа|round the clock/i;

type Outcome = 'social network' | 'aggregator' | 'not a URL' | 'disallowed by robots.txt' | 'no such host' | 'connection failed or timed out' | 'certificate error' | 'HTTP 4xx' | 'HTTP 5xx' | 'not an HTML page' | 'parked, expired or a placeholder' | 'redirects to a social network or an aggregator' | 'reachable';
interface Result { o: FocusObject; url: string | null; outcome: Outcome; status?: number | null; finalHost: string | null; jsonLd: boolean; localBusiness: boolean; markupHours: boolean; microdataHours: boolean; visibleHours: boolean; textChars: number; htmlBytes: number; types: string[] }
async function study(p: (typeof picked)[number]): Promise<Result> {
  const base: Result = { o: p.o, url: p.url?.href ?? null, outcome: 'reachable', finalHost: null, jsonLd: false, localBusiness: false, markupHours: false, microdataHours: false, visibleHours: false, textChars: 0, htmlBytes: 0, types: [] };
  if (!p.url) return { ...base, outcome: 'not a URL' };
  if (p.kind !== 'own site') return { ...base, outcome: p.kind as Outcome };
  const robots = await get(`${p.url.origin}/robots.txt`, 'text/plain,*/*;q=0.5');
  if (robots.ok && /text\/plain/i.test(robots.contentType ?? 'text/plain') && !allowedByRobots(robots.body, p.url.pathname || '/')) return { ...base, outcome: 'disallowed by robots.txt' };
  if (robots.error === 'ENOTFOUND' || robots.error === 'EAI_AGAIN') return { ...base, outcome: 'no such host' };
  const page = await get(p.url.href, 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5');
  if (page.error) {
    const e = page.error;
    return { ...base, outcome: e === 'ENOTFOUND' || e === 'EAI_AGAIN' ? 'no such host' : /CERT|SSL|TLS|certificate|self.signed|altnames/i.test(e) ? 'certificate error' : 'connection failed or timed out' };
  }
  const finalHost = page.finalUrl ? new URL(page.finalUrl).hostname : p.url.hostname;
  if (page.status !== null && page.status >= 500) return { ...base, outcome: 'HTTP 5xx', status: page.status, finalHost };
  if (page.status !== null && page.status >= 400) return { ...base, outcome: 'HTTP 4xx', status: page.status, finalHost };
  if (kindOfHost(finalHost) !== 'own site') return { ...base, outcome: 'redirects to a social network or an aggregator', finalHost };
  if (!/html/i.test(page.contentType ?? 'text/html')) return { ...base, outcome: 'not an HTML page', finalHost };
  const text = visibleText(page.body);
  if (PARKED.test(text.slice(0, 3000)) || (text.length < 200 && PARKED.test(page.body))) return { ...base, outcome: 'parked, expired or a placeholder', finalHost, textChars: text.length, htmlBytes: page.bytes };
  const ld = jsonLd(page.body);
  return {
    ...base, finalHost, jsonLd: ld.any, localBusiness: ld.local, markupHours: ld.hours, types: ld.types,
    microdataHours: /itemprop=["']openingHours/i.test(page.body),
    visibleHours: HOURS_NEAR_CUE.test(text) || ROUND_THE_CLOCK.test(text),
    textChars: text.length, htmlBytes: page.bytes,
  };
}
const results: Result[] = new Array(picked.length);
let next = 0;
await Promise.all(Array.from({ length: PARALLEL }, async () => {
  for (;;) {
    const k = next++;
    if (k >= picked.length) return;
    results[k] = await study(picked[k]!);
  }
}));

// --- 4. Tables -------------------------------------------------------------------------------------
const OUTCOMES: Outcome[] = ['reachable', 'social network', 'aggregator', 'redirects to a social network or an aggregator', 'no such host', 'connection failed or timed out', 'certificate error', 'HTTP 4xx', 'HTTP 5xx', 'parked, expired or a placeholder', 'disallowed by robots.txt', 'not an HTML page', 'not a URL'];
const table: (string | number)[][] = [];
const byGroup: Record<string, unknown>[] = [];
const quant = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length === 0 ? 0 : s[Math.min(s.length - 1, Math.floor(p * s.length))]!; };
for (const g of [...GROUPS, 'all'] as const) {
  const set = results.filter((r) => g === 'all' || r.o.group === g);
  const reach = set.filter((r) => r.outcome === 'reachable');
  const row = {
    group: g,
    sampled: set.length,
    outcomes: Object.fromEntries(OUTCOMES.map((o) => [o, set.filter((r) => r.outcome === o).length])),
    fetched: set.filter((r) => !['social network', 'aggregator', 'not a URL'].includes(r.outcome)).length,
    reachable: reach.length,
    with_json_ld: reach.filter((r) => r.jsonLd).length,
    with_json_ld_of_a_local_business_type: reach.filter((r) => r.localBusiness).length,
    of_those_with_opening_hours_in_the_markup: reach.filter((r) => r.localBusiness && r.markupHours).length,
    opening_hours_in_any_markup: reach.filter((r) => r.markupHours || r.microdataHours).length,
    opening_hours_visible_in_the_text: reach.filter((r) => r.visibleHours).length,
    text_characters: { median: quant(reach.map((r) => r.textChars), 0.5), p25: quant(reach.map((r) => r.textChars), 0.25), p75: quant(reach.map((r) => r.textChars), 0.75), max: Math.max(0, ...reach.map((r) => r.textChars)) },
    html_bytes_median: quant(reach.map((r) => r.htmlBytes), 0.5),
  };
  byGroup.push(row);
  table.push([g === 'all' ? 'All' : GROUP_LABEL[g], row.sampled, row.outcomes['social network']! + row.outcomes.aggregator!, row.fetched, row.reachable, row.with_json_ld_of_a_local_business_type, row.of_those_with_opening_hours_in_the_markup, row.opening_hours_visible_in_the_text, row.text_characters.median]);
}
console.log(mdTable(['Group', 'Sampled', 'Social network or aggregator', 'Fetched', 'Reachable', 'JSON-LD of a local-business type', 'of those with hours in the markup', 'Hours visible in the text', 'Text, characters (median)'], table));
const allRow = byGroup[byGroup.length - 1] as { outcomes: Record<string, number> };
console.log(mdTable(['Outcome', 'Objects', 'Share of the sample'], OUTCOMES.map((o) => [o, allRow.outcomes[o]!, pct(allRow.outcomes[o]!, results.length)])));
const popRow = (g: string) => { const p = population[g]!; const n = Object.values(p).reduce((a, b) => a + b, 0); return [g === 'all' ? 'All' : GROUP_LABEL[g as Group], n, `${p['own site']} (${pct(p['own site']!, n)})`, `${p['social network']} (${pct(p['social network']!, n)})`, `${p.aggregator} (${pct(p.aggregator!, n)})`, p['not a URL']!]; };
console.log('\nEvery website tag of the five groups, by what it points at:');
console.log(mdTable(['Group', 'With a website tag', 'Own site', 'Social network', 'Aggregator', 'Not a URL'], [...GROUPS, 'all'].map(popRow)));
// Estimates for all website tags of the country: each group's sample weighted by its share of the tags.
const totalTags = Object.values(population.all!).reduce((a, b) => a + b, 0);
function weighted(f: (r: Result) => boolean, among: (r: Result) => boolean = () => true): string {
  let share = 0;
  let weight = 0;
  for (const g of GROUPS) {
    const set = results.filter((r) => r.o.group === g && among(r));
    if (set.length === 0) continue;
    const w = Object.values(population[g]!).reduce((a, b) => a + b, 0) / totalTags;
    share += w * (set.filter(f).length / set.length);
    weight += w;
  }
  return `${((100 * share) / weight).toFixed(1)} %`;
}
const reachable = (r: Result) => r.outcome === 'reachable';
const estimates = {
  reachable_of_all_website_tags: weighted(reachable),
  dead_of_all_website_tags: weighted((r) => ['no such host', 'connection failed or timed out', 'certificate error', 'HTTP 4xx', 'HTTP 5xx', 'parked, expired or a placeholder'].includes(r.outcome)),
  social_network_or_aggregator_of_all_website_tags: weighted((r) => ['social network', 'aggregator', 'redirects to a social network or an aggregator'].includes(r.outcome)),
  of_reachable_json_ld_of_a_local_business_type: weighted((r) => r.localBusiness, reachable),
  of_reachable_opening_hours_in_markup: weighted((r) => r.markupHours || r.microdataHours, reachable),
  of_reachable_opening_hours_visible_in_the_text: weighted((r) => r.visibleHours, reachable),
};
const statusCodes: Record<string, number> = {};
for (const r of results) if (r.status) statusCodes[r.status] = (statusCodes[r.status] ?? 0) + 1;
const thin = results.filter((r) => reachable(r) && r.textChars < 300).length;
const ownTags = [...hostCount.entries()].filter(([h]) => kindOfHost(h) === 'own site');
const shared = { hosts_used_by_5_or_more_objects: ownTags.filter(([, n]) => n >= 5).length, tags_on_those_hosts: ownTags.filter(([, n]) => n >= 5).reduce((a, [, n]) => a + n, 0), tags_on_own_sites: ownTags.reduce((a, [, n]) => a + n, 0), hosts_used_by_one_object: ownTags.filter(([, n]) => n === 1).length };
console.log('weighted estimates:', estimates, 'HTTP error codes:', statusCodes, 'reachable with under 300 characters of text:', thin, 'shared hosts:', shared);

const types = new Map<string, number>();
for (const r of results) for (const t of r.types) types.set(t, (types.get(t) ?? 0) + 1);
console.log('JSON-LD types seen:', [...types.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t, n]) => `${t}:${n}`).join(' '));
console.log('most frequent hosts in website tags:', [...hostCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([h, n]) => `${h}:${n}`).join(' '));
console.log(`network requests this run: ${network}`);

writeJson('out/24-websites.json', {
  read_at: new Date().toISOString().slice(0, 10),
  split: SPLIT,
  rule: { timeout_ms: TIMEOUT_MS, max_bytes: MAX_BYTES, one_request_per_site: true, robots_txt_obeyed: true, client: USER_AGENT },
  hours_pattern: { cue: CUE, range: RANGE, round_the_clock: ROUND_THE_CLOCK.source, parked: PARKED.source },
  population: Object.fromEntries(Object.entries(population).map(([g, p]) => [g, { with_a_website_tag: Object.values(p).reduce((a, b) => a + b, 0), ...p }])),
  distinct_hosts_in_website_tags: hostCount.size,
  most_frequent_hosts: [...hostCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([host, objects]) => ({ host, objects })),
  sample: byGroup,
  weighted_estimates_for_all_website_tags: estimates,
  http_error_codes: statusCodes,
  reachable_with_under_300_characters_of_text: thin,
  shared_hosts: shared,
  json_ld_types_seen: [...types.entries()].sort((a, b) => b[1] - a[1]).map(([type, sites]) => ({ type, sites })),
  per_object: results.map((r) => ({ osm: `${r.o.type}/${r.o.id}`, group: r.o.group, area: r.o.area, host: r.url ? new URL(r.url).hostname : null, outcome: r.outcome, status: r.status ?? null, json_ld: r.jsonLd, local_business: r.localBusiness, hours_in_markup: r.markupHours || r.microdataHours, hours_visible: r.visibleHours, text_characters: r.textChars })),
  network_requests_this_run: network,
});
