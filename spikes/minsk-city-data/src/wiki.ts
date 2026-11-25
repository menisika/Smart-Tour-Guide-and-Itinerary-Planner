// A polite client for the public Wikimedia interfaces: one request at a time, a pause between
// requests, gzip, a generic client name, no cookies, and every answer cached on disk so that a
// second run sends nothing. The cache key is the request itself.
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { USER_AGENT } from './lib.ts';

const CACHE_DIR = 'data/wiki-cache';
const PAUSE_MS = 1100;
let lastRequestAt = 0;
export const stats = { network: 0, cached: 0, bytes: 0 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function cachedJson<T = unknown>(
  url: string,
  init: { method?: 'GET' | 'POST'; body?: string; accept?: string } = {},
): Promise<T> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const key = createHash('sha1').update(`${init.method ?? 'GET'} ${url}\n${init.body ?? ''}`).digest('hex');
  const file = `${CACHE_DIR}/${key}.json`;
  // WIKI_CACHE_TRACE=<file> lists the cache entries a run used, to prune entries left by older runs.
  if (process.env.WIKI_CACHE_TRACE) appendFileSync(process.env.WIKI_CACHE_TRACE, `${key}\n`);
  if (existsSync(file)) {
    stats.cached++;
    return (JSON.parse(readFileSync(file, 'utf8')) as { body: T }).body;
  }
  for (let attempt = 1; ; attempt++) {
    const wait = lastRequestAt + PAUSE_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    const res = await fetch(url, {
      method: init.method ?? 'GET',
      body: init.body,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: init.accept ?? 'application/json',
        'Accept-Encoding': 'gzip',
        ...(init.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
    });
    if (res.status === 429 || res.status >= 500) {
      // A query that timed out on the query service will time out again: do not repeat it more than once.
      const limit = res.status === 504 || res.status === 502 ? 2 : 5;
      if (attempt >= limit) throw new Error(`${res.status} from ${new URL(url).host} after ${attempt} attempts`);
      const retryAfter = Number(res.headers.get('retry-after')) || 5 * attempt;
      console.warn(`${res.status} from ${new URL(url).host}; waiting ${retryAfter} s`);
      await sleep(retryAfter * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url.slice(0, 120)}`);
    const text = await res.text();
    stats.network++;
    stats.bytes += text.length;
    const body = JSON.parse(text) as T;
    writeFileSync(file, JSON.stringify({ url, request_body: init.body ?? null, fetched_at: new Date().toISOString(), body }));
    return body;
  }
}

/** Wikidata Query Service. */
export async function sparql(query: string): Promise<Record<string, { value: string }>[]> {
  const res = await cachedJson<{ results: { bindings: Record<string, { value: string }>[] } }>(
    'https://query.wikidata.org/sparql',
    { method: 'POST', body: `query=${encodeURIComponent(query)}`, accept: 'application/sparql-results+json' },
  );
  return res.results.bindings;
}

/** MediaWiki Action API of any Wikimedia wiki, by host. */
export async function action<T = unknown>(host: string, params: Record<string, string>): Promise<T> {
  const q = new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params });
  return cachedJson<T>(`https://${host}/w/api.php?${q}`);
}

/** The same by POST, for requests whose parameters do not fit into a URL (fifty Cyrillic titles). */
export async function actionPost<T = unknown>(host: string, params: Record<string, string>): Promise<T> {
  const q = new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params });
  return cachedJson<T>(`https://${host}/w/api.php`, { method: 'POST', body: q.toString() });
}

export const WIKI_HOST = {
  be: 'be.wikipedia.org',
  beTarask: 'be-tarask.wikipedia.org',
  ru: 'ru.wikipedia.org',
  en: 'en.wikipedia.org',
} as const;
export type WikiLang = keyof typeof WIKI_HOST;

/** Length in bytes of the wikitext of each article; a missing title is left out. */
export async function articleLengths(lang: WikiLang, titles: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const res = await actionPost<{
      query: { normalized?: { from: string; to: string }[]; pages: { title: string; length?: number; missing?: boolean }[] };
    }>(WIKI_HOST[lang], { action: 'query', prop: 'info', titles: batch.join('|') });
    const back = new Map((res.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of res.query.pages) {
      if (page.missing || page.length === undefined) continue;
      out.set(back.get(page.title) ?? page.title, page.length);
    }
  }
  return out;
}

/** The licence a wiki states for its content, as its own interface reports it. */
export async function rights(host: string): Promise<{ text: string; url: string }> {
  const res = await action<{ query: { rightsinfo: { url: string; text: string } } }>(host, { action: 'query', meta: 'siteinfo', siprop: 'rightsinfo' });
  return { text: res.query.rightsinfo.text, url: res.query.rightsinfo.url };
}
