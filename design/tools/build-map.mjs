#!/usr/bin/env node
/**
 * Builds design/data/map.json: the geometry the mockups draw their map from.
 *
 *     node design/tools/build-map.mjs --spike <path to spikes/minsk-city-data>
 *
 * The mockups show a real Outing, so their map is real too: OpenStreetMap
 * geometry around the Outing of design/data/outing.json, and the walked line
 * between its stops, found on the pedestrian graph the city-data spike built.
 *
 * The spike's downloads and outputs are not committed, which is why this needs
 * the path to a checkout where `npm run all` of the spike has been run. It
 * reads that folder and writes nothing there. Which city it is comes from the
 * data: this script names none.
 *
 * Output coordinates are integers in units of half a metre, x to the east and
 * y to the south, from the north-west corner of the exported box.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const spikeFlag = args.indexOf('--spike');
if (spikeFlag === -1 || !args[spikeFlag + 1]) {
  console.error('usage: node design/tools/build-map.mjs --spike <path to the city-data spike>');
  process.exit(1);
}
const spikeDir = resolve(args[spikeFlag + 1]);
const here = (/** @type {string} */ p) => fileURLToPath(new URL(p, import.meta.url));

const outing = JSON.parse(readFileSync(here('../data/outing.json'), 'utf8'));

// ── The exported box ────────────────────────────────────────────────────────
// Wider than the Route Pack area, so that a landscape map on a desktop has
// something to show on both sides of the Route.
const HALF_WIDTH_M = 2100;
const HALF_HEIGHT_M = 1500;
const UNITS_PER_M = 2;

const points = [outing.start_finish, ...outing.stops];
const lat0 = (Math.min(...points.map((p) => p.lat)) + Math.max(...points.map((p) => p.lat))) / 2;
const lon0 = (Math.min(...points.map((p) => p.lon)) + Math.max(...points.map((p) => p.lon))) / 2;
const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LON = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
const box = {
  west: lon0 - HALF_WIDTH_M / M_PER_DEG_LON,
  east: lon0 + HALF_WIDTH_M / M_PER_DEG_LON,
  south: lat0 - HALF_HEIGHT_M / M_PER_DEG_LAT,
  north: lat0 + HALF_HEIGHT_M / M_PER_DEG_LAT,
};
const WIDTH = HALF_WIDTH_M * 2 * UNITS_PER_M;
const HEIGHT = HALF_HEIGHT_M * 2 * UNITS_PER_M;

/** @param {number} lon @param {number} lat @returns {[number, number]} */
const project = (lon, lat) => [
  Math.round((lon - box.west) * M_PER_DEG_LON * UNITS_PER_M),
  Math.round((box.north - lat) * M_PER_DEG_LAT * UNITS_PER_M),
];

// ── Path building ───────────────────────────────────────────────────────────

/**
 * Douglas–Peucker on projected points.
 * @param {[number, number][]} pts @param {number} tolerance in output units
 */
function simplify(pts, tolerance) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  /** @type {[number, number][]} */
  const stack = [[0, pts.length - 1]];
  while (stack.length > 0) {
    const [a, b] = /** @type {[number, number]} */ (stack.pop());
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy) || 1;
    let worst = -1;
    let worstDistance = tolerance;
    for (let i = a + 1; i < b; i++) {
      const distance = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / length;
      if (distance > worstDistance) {
        worstDistance = distance;
        worst = i;
      }
    }
    if (worst !== -1) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  return pts.filter((_, i) => keep[i] === 1);
}

/**
 * A closed ring starts and ends at one point, which leaves the simplification
 * nothing to measure against: it is cut at the point farthest from its start
 * and the two halves are simplified apart.
 * @param {[number, number][]} pts @param {number} tolerance
 */
function simplifyRing(pts, tolerance) {
  if (pts.length < 5) return pts;
  let far = 0;
  let farDistance = -1;
  for (let i = 1; i < pts.length; i++) {
    const distance = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (distance > farDistance) {
      farDistance = distance;
      far = i;
    }
  }
  return [
    ...simplify(pts.slice(0, far + 1), tolerance),
    ...simplify(pts.slice(far), tolerance).slice(1),
  ];
}

/**
 * The longest piece of a line that never turns sharply. Two carriageways of
 * one street can be joined at their ends into a line that runs there and
 * back; a name set along it would fold over itself.
 * @param {[number, number][]} pts
 */
function straightest(pts) {
  /** @type {[number, number][][]} */
  const pieces = [[pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    const piece = pieces[pieces.length - 1];
    if (piece.length >= 2) {
      const [ax, ay] = piece[piece.length - 2];
      const [bx, by] = piece[piece.length - 1];
      const [cx, cy] = pts[i];
      const turn = Math.abs(Math.atan2(cy - by, cx - bx) - Math.atan2(by - ay, bx - ax));
      if (Math.min(turn, 2 * Math.PI - turn) > Math.PI / 3) pieces.push([piece[piece.length - 1]]);
    }
    pieces[pieces.length - 1].push(pts[i]);
  }
  const span = (/** @type {[number, number][]} */ piece) =>
    piece.reduce(
      (sum, p, i) =>
        i === 0 ? 0 : sum + Math.hypot(p[0] - piece[i - 1][0], p[1] - piece[i - 1][1]),
      0,
    );
  return pieces.reduce((best, piece) => (span(piece) > span(best) ? piece : best));
}

/** @param {[number, number][]} pts @param {boolean} close */
function pathOf(pts, close) {
  /** @type {[number, number][]} */
  const unique = [];
  for (const p of pts) {
    const last = unique[unique.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) unique.push(p);
  }
  if (close && unique.length > 1) {
    const first = unique[0];
    const last = unique[unique.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) unique.pop();
  }
  if (unique.length < (close ? 3 : 2)) return '';
  let d = `M${unique[0][0]} ${unique[0][1]}`;
  for (let i = 1; i < unique.length; i++) {
    d += `l${unique[i][0] - unique[i - 1][0]} ${unique[i][1] - unique[i - 1][1]}`;
  }
  return close ? `${d}z` : d;
}

/**
 * GeoJSON geometry to one path string.
 * @param {any} geometry @param {number} tolerance
 */
function geometryPath(geometry, tolerance) {
  if (!geometry) return '';
  /** @param {number[][]} coordinates @param {boolean} close */
  const ring = (coordinates, close) => {
    const pts = coordinates.map(([lon, lat]) => project(lon, lat));
    return pathOf(close ? simplifyRing(pts, tolerance) : simplify(pts, tolerance), close);
  };
  switch (geometry.type) {
    case 'Polygon':
      return geometry.coordinates.map((/** @type {number[][]} */ r) => ring(r, true)).join('');
    case 'MultiPolygon':
      return geometry.coordinates
        .flatMap((/** @type {number[][][]} */ polygon) => polygon.map((r) => ring(r, true)))
        .join('');
    case 'LineString':
      return ring(geometry.coordinates, false);
    case 'MultiLineString':
      return geometry.coordinates.map((/** @type {number[][]} */ r) => ring(r, false)).join('');
    case 'GeometryCollection':
      return geometry.geometries.map((/** @type {any} */ g) => geometryPath(g, tolerance)).join('');
    default:
      return '';
  }
}

// ── The database of the spike ───────────────────────────────────────────────

const spikeRequire = createRequire(resolve(spikeDir, 'package.json'));
const { DuckDBInstance } = spikeRequire('@duckdb/node-api');
const instance = await DuckDBInstance.create(resolve(spikeDir, 'out/minsk.duckdb'), {
  access_mode: 'READ_ONLY',
  extension_directory: resolve(spikeDir, 'data/duckdb-ext'),
});
const db = await instance.connect();
await db.run('LOAD spatial');
// The spike stores points as (longitude, latitude).
await db.run('SET geometry_always_xy = true');

/** @param {string} sql @returns {Promise<any[]>} */
const rows = async (sql) => (await db.runAndReadAll(sql)).getRowObjectsJson();

const ENVELOPE = `ST_MakeEnvelope(${box.west}, ${box.south}, ${box.east}, ${box.north})`;

/**
 * Polygons are chosen by the point the spike keeps for each object, within a
 * margin of the box, and are left unclipped: the view crops them. A spatial
 * predicate on the stored polygons themselves returned a fraction of them.
 * @param {string} where @param {number} tolerance @param {number} marginM @param {string} [extra]
 */
async function polygons(where, tolerance, marginM, extra = '') {
  const dLon = marginM / M_PER_DEG_LON;
  const dLat = marginM / M_PER_DEG_LAT;
  const result = await rows(
    `SELECT ST_AsGeoJSON(area) AS g
     FROM feature
     WHERE area IS NOT NULL AND (${where}) ${extra}
       AND lon BETWEEN ${box.west - dLon} AND ${box.east + dLon}
       AND lat BETWEEN ${box.south - dLat} AND ${box.north + dLat}`,
  );
  return result
    .map((r) => geometryPath(JSON.parse(r.g), tolerance))
    .sort()
    .join('');
}

/** @param {string} where @param {number} tolerance */
async function lines(where, tolerance) {
  const result = await rows(
    `SELECT ST_AsGeoJSON(ST_Intersection(l.line, ${ENVELOPE})) AS g
     FROM way w JOIN way_line l ON l.id = w.id
     WHERE ST_Intersects(l.line, ${ENVELOPE}) AND (${where})`,
  );
  return result
    .map((r) => geometryPath(JSON.parse(r.g), tolerance))
    .sort()
    .join('');
}

const tag = (/** @type {string} */ k) => `w.tags['${k}']`;
const ftag = (/** @type {string} */ k) => `tags['${k}']`;
const notHidden = `coalesce(${tag('tunnel')}, 'no') = 'no' AND coalesce(${tag('layer')}, '0') NOT LIKE '-%'`;

const layers = {
  water: await polygons(
    `${ftag('natural')} = 'water' OR ${ftag('waterway')} IN ('riverbank', 'dock') OR ${ftag('landuse')} IN ('reservoir', 'basin')`,
    2,
    2500,
  ),
  green: await polygons(
    `${ftag('leisure')} IN ('park', 'garden') OR ${ftag('landuse')} IN ('forest', 'cemetery') OR ${ftag('natural')} = 'wood'`,
    3,
    1200,
    'AND area_m2 >= 600',
  ),
  buildings: await polygons(
    `${ftag('building')} IS NOT NULL AND ${ftag('building')} <> 'no'`,
    1.2,
    150,
    'AND area_m2 >= 40',
  ),
  rail: await lines(
    `${tag('railway')} = 'rail' AND ${notHidden} AND coalesce(${tag('service')}, '') NOT IN ('yard', 'siding', 'spur')`,
    2,
  ),
  rail_side: await lines(
    `${tag('railway')} = 'rail' AND ${notHidden} AND ${tag('service')} IN ('yard', 'siding', 'spur')`,
    2,
  ),
  roads_major: await lines(
    `${tag('highway')} IN ('motorway', 'trunk', 'primary', 'secondary', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link') AND ${notHidden}`,
    2,
  ),
  roads_mid: await lines(
    `${tag('highway')} IN ('tertiary', 'tertiary_link', 'unclassified', 'residential', 'living_street', 'pedestrian') AND ${notHidden}`,
    2,
  ),
  roads_minor: await lines(`${tag('highway')} = 'service' AND ${notHidden}`, 2),
  paths: await lines(
    `${tag('highway')} IN ('footway', 'path', 'steps', 'cycleway') AND ${notHidden}
     AND coalesce(${tag('footway')}, '') NOT IN ('sidewalk', 'crossing')`,
    2,
  ),
};

// ── Street names to set along the streets ───────────────────────────────────
// One line per name: the longest piece that stays inside the box.
const streets = await rows(
  `WITH named AS (
     SELECT ${tag('name')} AS name, any_value(${tag('name:ru')}) AS ru,
            any_value(coalesce(${tag('name:en')}, ${tag('int_name')})) AS en,
            any_value(${tag('name:be')}) AS be,
            min(CASE WHEN ${tag('highway')} IN ('primary', 'trunk') THEN 1
                     WHEN ${tag('highway')} = 'secondary' THEN 2 ELSE 3 END) AS rank,
            ST_LineMerge(ST_Collect(list(ST_Intersection(l.line, ${ENVELOPE})))) AS merged
     FROM way w JOIN way_line l ON l.id = w.id
     WHERE ${tag('name')} IS NOT NULL AND ${notHidden} AND ST_Intersects(l.line, ${ENVELOPE})
       AND ${tag('highway')} IN ('primary', 'trunk', 'secondary', 'tertiary', 'residential', 'pedestrian', 'unclassified', 'living_street')
     GROUP BY ${tag('name')}),
   parts AS (SELECT name, ru, en, be, rank, unnest(ST_Dump(merged)).geom AS part FROM named)
   SELECT name, ru, en, be, rank, ST_AsGeoJSON(part) AS g, ST_Length_Spheroid(part) AS metres
   FROM parts
   QUALIFY row_number() OVER (PARTITION BY name ORDER BY ST_Length_Spheroid(part) DESC) = 1
   ORDER BY rank, metres DESC`,
);
const labels = streets
  .map((s) => {
    /** @type {[number, number][]} */
    let pts = JSON.parse(s.g).coordinates.map((/** @type {number[]} */ c) => project(c[0], c[1]));
    pts = straightest(simplify(pts, 12));
    // Text reads from the west to the east.
    if (pts[0][0] > pts[pts.length - 1][0]) pts.reverse();
    const units = pts.reduce(
      (sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])),
      0,
    );
    return {
      name: { ru: s.ru ?? s.name, en: s.en ?? s.name, local: s.name },
      rank: Number(s.rank),
      metres: Math.round(units / UNITS_PER_M),
      d: pathOf(pts, false),
    };
  })
  .filter((label) => label.d !== '' && label.metres >= 220);

// Named water and green, for the few area labels a plan carries.
const areas = (
  await rows(
    `SELECT ${ftag('name')} AS name, ${ftag('name:ru')} AS ru, ${ftag('name:en')} AS en,
            CASE WHEN ${ftag('natural')} = 'water' OR ${ftag('waterway')} IS NOT NULL THEN 'water' ELSE 'green' END AS kind,
            lon, lat, area_m2
     FROM feature
     WHERE area IS NOT NULL AND ${ftag('name')} IS NOT NULL AND area_m2 >= 12000
       AND lon BETWEEN ${box.west} AND ${box.east} AND lat BETWEEN ${box.south} AND ${box.north}
       AND (${ftag('leisure')} IN ('park', 'garden') OR ${ftag('natural')} = 'water')
     ORDER BY area_m2 DESC LIMIT 12`,
  )
).map((a) => {
  const [x, y] = project(Number(a.lon), Number(a.lat));
  return { name: { ru: a.ru ?? a.name, en: a.en ?? a.name, local: a.name }, kind: a.kind, x, y };
});

// ── The stops: where they are and what they stand on ────────────────────────
const footprints = new Map();
for (const stop of outing.stops) {
  const [type, id] = stop.osm.split('/');
  const found = await rows(
    `SELECT ST_AsGeoJSON(area) AS g FROM feature WHERE osm_type = '${type}' AND osm_id = ${Number(id)} AND area IS NOT NULL`,
  );
  footprints.set(stop.order, found[0] ? geometryPath(JSON.parse(found[0].g), 0.8) : '');
}

// ── The walked line, on the spike's pedestrian graph ────────────────────────
const { deserialize, NodeIndex, Searcher } = await import(
  pathToFileURL(resolve(spikeDir, 'src/graph.ts')).href
);
const graph = deserialize(
  new Uint8Array(readFileSync(resolve(spikeDir, 'out/minsk-walk-full.bin'))),
);
const index = new NodeIndex(graph);
const search = new Searcher(graph);
const snapped = points.map((p) => index.nearest(p.lat, p.lon, 250));
const order = [...points.keys(), 0];
const legs = [];
for (let i = 0; i + 1 < order.length; i++) {
  const from = snapped[order[i]];
  const to = snapped[order[i + 1]];
  search.run(from.node, 80_000);
  const nodes = search.path(to.node);
  /** @type {[number, number][]} */
  const pts = nodes.map((/** @type {number} */ n) =>
    project(graph.lon[n] / 1e7, graph.lat[n] / 1e7),
  );
  legs.push({
    from: order[i],
    to: order[i + 1],
    metres: Math.round((search.dist[to.node] + (from.metres + to.metres) * 10) / 10),
    points: simplify(pts, 1.5),
  });
}

// ── The Route recalculated ──────────────────────────────────────────────────
// What the walk becomes when one Place is skipped (OUT-9): the way from the
// Place before it straight to the Place after it, on the same graph. Which
// Place is skipped is a choice written in the data; the new leg is measured.
/** @param {number} skipped index into `points` */
function detourAround(skipped) {
  const from = snapped[skipped - 1];
  const to = snapped[(skipped + 1) % points.length];
  search.run(from.node, 80_000);
  const nodes = search.path(to.node);
  /** @type {[number, number][]} */
  const pts = nodes.map((/** @type {number} */ n) =>
    project(graph.lon[n] / 1e7, graph.lat[n] / 1e7),
  );
  return {
    skip: skipped,
    from: skipped - 1,
    to: (skipped + 1) % points.length,
    metres: Math.round((search.dist[to.node] + (from.metres + to.metres) * 10) / 10),
    points: simplify(pts, 1.5),
  };
}
const saved = outing.stops.map((/** @type {any} */ s) => {
  const d = detourAround(s.order);
  return `${s.order}: ${legs[s.order - 1].metres + legs[s.order].metres - d.metres}`;
});
const detour = outing.study?.skip_order ? detourAround(outing.study.skip_order) : undefined;

const place = (/** @type {{lat: number, lon: number}} */ p, /** @type {number} */ i) => {
  const [x, y] = project(p.lon, p.lat);
  const [sx, sy] = project(graph.lon[snapped[i].node] / 1e7, graph.lat[snapped[i].node] / 1e7);
  return { x, y, street_x: sx, street_y: sy };
};

const map = {
  about:
    'Generated by design/tools/build-map.mjs. Coordinates are integers in units of half a metre, x east and y south, from the north-west corner of the box.',
  source: {
    data: '© OpenStreetMap contributors, Open Database License 1.0',
    extract: outing.source.openstreetmap_extract,
  },
  units_per_metre: UNITS_PER_M,
  width: WIDTH,
  height: HEIGHT,
  box,
  layers,
  labels,
  areas,
  start: place(outing.start_finish, 0),
  stops: outing.stops.map((/** @type {any} */ s, /** @type {number} */ i) => ({
    order: s.order,
    ...place(s, i + 1),
    footprint: footprints.get(s.order),
  })),
  legs,
  ...(detour ? { detour } : {}),
};

const target = here('../data/map.json');
writeFileSync(target, `${JSON.stringify(map)}\n`);

const kb = (/** @type {string} */ s) => `${(s.length / 1024).toFixed(0)} kB`;
console.log(
  `box ${HALF_WIDTH_M * 2} by ${HALF_HEIGHT_M * 2} m around ${lat0.toFixed(5)}, ${lon0.toFixed(5)}`,
);
for (const [name, d] of Object.entries(layers)) console.log(`  ${name.padEnd(12)} ${kb(d)}`);
console.log(`  labels       ${labels.length}, areas ${areas.length}`);
console.log(
  `  legs, m      ${legs.map((l) => l.metres).join(' ')}  (measured: ${outing.stops.map((/** @type {any} */ s) => s.leg_m).join(' ')} ${outing.totals.back_to_start_m})`,
);
console.log(`  metres saved by skipping each Place: ${saved.join('  ')}`);
if (detour) console.log(`  detour       skipping ${detour.skip}: ${detour.metres} m`);
console.log(`wrote ${target}, ${kb(JSON.stringify(map))}`);
