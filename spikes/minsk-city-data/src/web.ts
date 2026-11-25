// A polite client for public sites other than the Wikimedia APIs (those keep src/wiki.ts):
// at most one request a second to any one host, a generic client name, no cookies, and every
// answer cached on disk under data/web-cache/<host>/ so that a second run sends nothing.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { USER_AGENT } from './lib.ts';

const CACHE_DIR = 'data/web-cache';
const PAUSE_MS = 1100;
// The page-view interface answered 429 after about ten requests in a minute to a client with a
// generic name (measured on 24 November 2026), so this host is paced below that.
const PAUSE_BY_HOST: Record<string, number> = { 'wikimedia.org': 6500 };
const lastRequestAt = new Map<string, number>();
export const webStats = { network: 0, cached: 0, bytes: 0, byHost: {} as Record<string, number> };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface FetchInit {
  method?: 'GET' | 'POST' | 'PUT';
  body?: string;
  headers?: Record<string, string>;
  /** Treat "404 Not Found" as an empty answer and cache it (a page-view series with no views). */
  emptyOn404?: boolean;
}

export function cacheFile(url: string, init: FetchInit = {}): string {
  const host = new URL(url).host;
  const key = createHash('sha1').update(`${init.method ?? 'GET'} ${url}\n${init.body ?? ''}`).digest('hex');
  return `${CACHE_DIR}/${host}/${key}.txt`;
}

export async function cachedText(url: string, init: FetchInit = {}): Promise<string> {
  const host = new URL(url).host;
  const file = cacheFile(url, init);
  if (existsSync(file)) {
    webStats.cached++;
    return readFileSync(file, 'utf8');
  }
  mkdirSync(`${CACHE_DIR}/${host}`, { recursive: true });
  for (let attempt = 1; ; attempt++) {
    const wait = (lastRequestAt.get(host) ?? 0) + (PAUSE_BY_HOST[host] ?? PAUSE_MS) - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt.set(host, Date.now());
    const res = await fetch(url, {
      method: init.method ?? 'GET',
      body: init.body,
      headers: { 'User-Agent': USER_AGENT, 'Accept-Encoding': 'gzip', ...(init.headers ?? {}) },
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 5) throw new Error(`${res.status} from ${host} after ${attempt} attempts`);
      const retryAfter = Number(res.headers.get('retry-after')) || 5 * attempt;
      console.warn(`${res.status} from ${host}; waiting ${retryAfter} s`);
      await sleep(retryAfter * 1000);
      continue;
    }
    if (!res.ok && !(res.status === 404 && init.emptyOn404)) throw new Error(`${res.status} ${res.statusText} from ${url.slice(0, 140)}`);
    const text = res.ok ? (await res.text()).replace(/^﻿/, '') : '';
    webStats.network++;
    webStats.bytes += text.length;
    webStats.byHost[host] = (webStats.byHost[host] ?? 0) + 1;
    writeFileSync(file, text);
    writeFileSync(`${file}.meta.json`, JSON.stringify({ url, method: init.method ?? 'GET', request_body: init.body ?? null, fetched_at: new Date().toISOString() }));
    return text;
  }
}

export async function cachedJsonFrom<T = unknown>(url: string, init: FetchInit = {}): Promise<T> {
  return JSON.parse(await cachedText(url, init)) as T;
}
