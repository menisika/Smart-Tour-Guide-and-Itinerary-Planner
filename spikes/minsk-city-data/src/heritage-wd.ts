// Every Wikidata item that carries the state code of a Belarusian cultural property (P632) or the
// identifier of the heritage bank (P11184), whole country: one query, shared by several steps.
import { sparql } from './wiki.ts';

export interface HeritageWikidata {
  qidByCode: Map<string, string>;
  qidBySlug: Map<string, string>;
  coord: Map<string, { lat: number; lon: number }>;
  items: Set<string>;
}

export async function heritageWikidata(): Promise<HeritageWikidata> {
  const wd = await sparql(`
SELECT ?item ?code ?bank (SAMPLE(?c) AS ?coord) WHERE {
  { ?item wdt:P632 ?code } UNION { ?item wdt:P11184 ?bank }
  OPTIONAL { ?item wdt:P632 ?code } OPTIONAL { ?item wdt:P11184 ?bank } OPTIONAL { ?item wdt:P625 ?c }
} GROUP BY ?item ?code ?bank`);
  const out: HeritageWikidata = { qidByCode: new Map(), qidBySlug: new Map(), coord: new Map(), items: new Set() };
  for (const b of wd) {
    const qid = b.item!.value.replace('http://www.wikidata.org/entity/', '');
    out.items.add(qid);
    if (b.code) out.qidByCode.set(b.code.value.trim(), qid);
    if (b.bank) out.qidBySlug.set(b.bank.value.trim(), qid);
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.coord?.value ?? '');
    if (m) out.coord.set(qid, { lon: Number(m[1]), lat: Number(m[2]) });
  }
  return out;
}
