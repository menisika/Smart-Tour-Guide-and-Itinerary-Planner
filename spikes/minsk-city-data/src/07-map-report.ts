// Collects the sizes of the map extracts and of the glyph ranges into out/07-map.json.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { mdTable, writeJson } from './lib.ts';

const build = process.argv[2] ?? 'unknown';
const dir = 'data/map';
const size = (name: string) => (existsSync(`${dir}/${name}`) ? statSync(`${dir}/${name}`).size : null);
const mb = (b: number | null) => (b === null ? '—' : (b / 1e6).toFixed(2));

const extracts = [
  ['Centre, 3 by 3 km, zoom 0–15, cut from the daily build', 'centre-3x3-z15.pmtiles'],
  ['Centre, 3 by 3 km, zoom 0–15, cut from the local city archive', 'centre-3x3-z15-local.pmtiles'],
  ['Centre, 3 by 3 km, zoom 0–14', 'centre-3x3-z14.pmtiles'],
  ['Centre, 3 by 3 km, zoom 0–13', 'centre-3x3-z13.pmtiles'],
  ['Area of the reference Outing, zoom 0–15', 'outing-z15.pmtiles'],
  ['Whole city, administrative boundary, zoom 0–15, cut from the daily build', 'city-boundary-z15.pmtiles'],
  ['Whole city, bounding box of the boundary, zoom 0–15, cut from the daily build', 'city-bbox-z15.pmtiles'],
  ['Whole city, administrative boundary, zoom 0–14', 'city-boundary-z14.pmtiles'],
  ['Whole city, administrative boundary, zoom 0–13', 'city-boundary-z13.pmtiles'],
  ['Whole city, administrative boundary, zoom 0–12', 'city-boundary-z12.pmtiles'],
  ['Whole city, administrative boundary, zoom 0–11', 'city-boundary-z11.pmtiles'],
  ['Whole city, administrative boundary, zoom 0–10', 'city-boundary-z10.pmtiles'],
].map(([label, file]) => ({ label: label!, file: file!, bytes: size(file!) }));

// Header facts as `pmtiles show` prints them (tile counts, compression, zoom range).
// The tool prints the metadata keys in no fixed order: sort them so that two runs give the same file.
const show = (name: string) => (existsSync(`${dir}/${name}`) ? readFileSync(`${dir}/${name}`, 'utf8').trim().split('\n').sort() : []);

const glyphs: { font: string; range: string; bytes: number }[] = [];
for (const font of readdirSync('data/glyphs').sort()) {
  for (const file of readdirSync(`data/glyphs/${font}`).sort((a, b) => parseInt(a) - parseInt(b))) {
    glyphs.push({ font, range: file.replace('.pbf', ''), bytes: statSync(`data/glyphs/${font}/${file}`).size });
  }
}
const LATIN = ['0-255', '256-511'];
const CYRILLIC = ['1024-1279', '1280-1535'];
const sum = (font: string | null, ranges: string[] | null) =>
  glyphs.filter((g) => (font === null || g.font === font) && (ranges === null || ranges.includes(g.range))).reduce((a, g) => a + g.bytes, 0);
const fonts = [...new Set(glyphs.map((g) => g.font))];
const glyphSummary = {
  per_font: fonts.map((font) => ({
    font,
    latin_bytes: sum(font, LATIN),
    cyrillic_bytes: sum(font, CYRILLIC),
    punctuation_bytes: sum(font, ['8192-8447']),
    total_bytes: sum(font, null),
  })),
  one_font_latin_and_cyrillic_bytes: sum('Noto Sans Regular', [...LATIN, ...CYRILLIC]),
  three_fonts_latin_and_cyrillic_bytes: sum(null, [...LATIN, ...CYRILLIC]),
  three_fonts_all_ranges_bytes: sum(null, null),
};

console.log(mdTable(['Extract', 'File', 'MB'], extracts.map((e) => [e.label, e.file, mb(e.bytes)])));
console.log();
console.log(mdTable(['Font', 'Range', 'Bytes'], glyphs.map((g) => [g.font, g.range, g.bytes])));
console.log(glyphSummary);

writeJson('out/07-map.json', {
  protomaps_build: build,
  source: `https://build.protomaps.com/${build}.pmtiles`,
  tool: 'pmtiles extract (go-pmtiles 1.31.2)',
  extracts,
  show_city_boundary_z15: show('city-boundary-z15.show.txt'),
  show_centre_z15: show('centre-3x3-z15.show.txt'),
  glyphs,
  glyph_summary: glyphSummary,
});
