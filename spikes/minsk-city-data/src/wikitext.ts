// Just enough wikitext parsing for list rows and travel-guide listings: find the calls of given
// templates, with nesting respected, and split their named parameters.

export interface TemplateCall {
  name: string;
  params: Record<string, string>;
  raw: string;
}

/** Every call of the named templates (lower-cased names), in document order. */
export function templates(wikitext: string, names: string[]): TemplateCall[] {
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  const out: TemplateCall[] = [];
  let i = 0;
  while (i < wikitext.length) {
    const start = wikitext.indexOf('{{', i);
    if (start === -1) break;
    // The template name runs to the first "|" or "}}".
    const nameEnd = wikitext.slice(start + 2).search(/\||\}\}/);
    const name = wikitext.slice(start + 2, start + 2 + Math.max(0, nameEnd)).trim().toLowerCase().replace(/_/g, ' ');
    if (!wanted.has(name)) {
      i = start + 2;
      continue;
    }
    let depth = 0;
    let end = -1;
    for (let k = start; k < wikitext.length - 1; k++) {
      const two = wikitext.slice(k, k + 2);
      if (two === '{{') {
        depth++;
        k++;
      } else if (two === '}}') {
        depth--;
        k++;
        if (depth === 0) {
          end = k + 1;
          break;
        }
      }
    }
    if (end === -1) break;
    const raw = wikitext.slice(start, end);
    out.push({ name, params: splitParams(raw.slice(2, -2)), raw });
    i = end;
  }
  return out;
}

/** Splits "name|a=1|b=[[x|y]]|c={{t|z}}" at the top-level bars only. */
function splitParams(body: string): Record<string, string> {
  const parts: string[] = [];
  let depthCurly = 0;
  let depthSquare = 0;
  let cur = '';
  for (let k = 0; k < body.length; k++) {
    const two = body.slice(k, k + 2);
    if (two === '{{') depthCurly++;
    else if (two === '}}') depthCurly--;
    else if (two === '[[') depthSquare++;
    else if (two === ']]') depthSquare--;
    if (body[k] === '|' && depthCurly === 0 && depthSquare === 0) {
      parts.push(cur);
      cur = '';
    } else cur += body[k];
  }
  parts.push(cur);
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    params[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
  }
  return params;
}

/** "[[Target|text]] and ''more''" → "text and more". */
export function plain(wikitext: string): string {
  return wikitext
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>|<ref[^>]*\/>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Targets of the wikilinks in a piece of wikitext. */
export function linkTargets(wikitext: string): string[] {
  return [...wikitext.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]!.trim()).filter((t) => !/^(File|Файл|Category|Катэгорыя|Image|Выява):/i.test(t));
}
