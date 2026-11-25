// Candidate Places by the kinds of specification §3.2, and candidate Territories with their
// nested Places and Entrances. Writes the tables `place` and `territory` into the city database
// and the counts into out/02-places.json.
import { CENTRE, CENTRE_RADIUS_M, OSM_DATE, mdTable, openDb, pct, rows, writeJson } from './lib.ts';
import { KIND, SUBKIND, t } from './kinds.ts';

const con = await openDb();

await con.run(`CREATE OR REPLACE TABLE place AS
  WITH c AS (SELECT *, ${SUBKIND} AS subkind FROM feature WHERE in_city),
       k AS (SELECT *, ${KIND} AS kind FROM c WHERE subkind IS NOT NULL),
       -- An embankment is one street drawn as many ways: keep one row per name, the longest way.
       ranked AS (
         SELECT *, row_number() OVER (
                     PARTITION BY CASE WHEN subkind = 'embankment' THEN ${t('name')} ELSE osm_type || osm_id::VARCHAR END
                     ORDER BY coalesce(area_m2, 0) DESC, osm_id) AS rn
         FROM k)
  SELECT osm_type, osm_id, kind, subkind, tags, area, pt, lon, lat, area_m2,
         ${t('name')} AS name, ${t('name:be')} AS name_be, ${t('name:ru')} AS name_ru, ${t('name:en')} AS name_en,
         ${t('wikidata')} AS wikidata, ${t('wikipedia')} AS wikipedia, ${t('opening_hours')} AS opening_hours,
         ST_Distance_Sphere(pt, ST_Point(${CENTRE.lon}, ${CENTRE.lat})) AS dist_centre_m
  FROM ranked WHERE rn = 1`);

// --- Counts by kind ---------------------------------------------------------------------------
interface KindRow {
  kind: string;
  subkind: string;
  places: number;
  named: number;
  name_be: number;
  name_ru: number;
  name_en: number;
  wikidata: number;
  wikipedia: number;
  either_link: number;
  distinct_wikidata: number;
  in_centre: number;
  in_centre_wikidata: number;
  as_node: number;
  as_area: number;
}
const COUNTS = `
  count(*)::DOUBLE AS places,
  count(name)::DOUBLE AS named,
  count(name_be)::DOUBLE AS name_be,
  count(name_ru)::DOUBLE AS name_ru,
  count(name_en)::DOUBLE AS name_en,
  count(wikidata)::DOUBLE AS wikidata,
  count(wikipedia)::DOUBLE AS wikipedia,
  count(*) FILTER (wikidata IS NOT NULL OR wikipedia IS NOT NULL)::DOUBLE AS either_link,
  count(DISTINCT wikidata)::DOUBLE AS distinct_wikidata,
  count(*) FILTER (dist_centre_m <= ${CENTRE_RADIUS_M})::DOUBLE AS in_centre,
  count(*) FILTER (dist_centre_m <= ${CENTRE_RADIUS_M} AND wikidata IS NOT NULL)::DOUBLE AS in_centre_wikidata,
  count(*) FILTER (osm_type = 'node')::DOUBLE AS as_node,
  count(*) FILTER (area IS NOT NULL)::DOUBLE AS as_area`;
const bySubkind = await rows<KindRow>(con, `SELECT kind, subkind, ${COUNTS} FROM place GROUP BY kind, subkind ORDER BY kind, places DESC`);
const byKind = await rows<KindRow>(con, `SELECT kind, '' AS subkind, ${COUNTS} FROM place GROUP BY kind ORDER BY places DESC`);
const allKinds = (await rows<KindRow>(con, `SELECT 'all' AS kind, '' AS subkind, ${COUNTS} FROM place`))[0]!;
const routable = (await rows<KindRow>(con, `SELECT 'sights, nature, markets' AS kind, '' AS subkind, ${COUNTS} FROM place WHERE kind IN ('sight', 'nature', 'market')`))[0]!;

const HEAD = ['Kind', 'Rule', 'Candidates', 'Named', 'name:be', 'name:ru', 'name:en', 'Wikidata link', 'Share', 'Wikipedia tag', 'In centre 1.5 km', 'of them with Wikidata'];
const line = (r: KindRow) => [
  r.kind, r.subkind || '(all)', r.places, r.named, r.name_be, r.name_ru, r.name_en, r.wikidata, pct(r.wikidata, r.places), r.wikipedia, r.in_centre, r.in_centre_wikidata,
];
console.log(mdTable(HEAD, [...byKind.map(line), line(routable), line(allKinds)]));
console.log();
console.log(mdTable(HEAD, bySubkind.map(line)));

// --- Duplicates: the same thing drawn twice (PLC-11) ------------------------------------------
const dupWikidata = (
  await rows<{ items: number; places: number }>(
    con,
    `SELECT count(*)::DOUBLE AS items, sum(n)::DOUBLE AS places
     FROM (SELECT wikidata, count(*) AS n FROM place WHERE wikidata IS NOT NULL GROUP BY 1 HAVING count(*) > 1)`,
  )
)[0]!;
const dupName = (
  await rows<{ pairs: number }>(
    con,
    `SELECT count(*)::DOUBLE AS pairs
     FROM place a JOIN place b
       ON a.name = b.name AND a.kind = b.kind
      AND (a.osm_type, a.osm_id) < (b.osm_type, b.osm_id)
      AND abs(a.lat - b.lat) < 0.001 AND abs(a.lon - b.lon) < 0.0017
     WHERE ST_Distance_Sphere(a.pt, b.pt) <= 100 AND a.kind IN ('sight', 'nature', 'market')`,
  )
)[0]!;

// --- Signals of sensitivity that tags alone give (KNW-14) -------------------------------------
const sensitive = await rows<{ signal: string; places: number }>(
  con,
  `SELECT signal, count(*)::DOUBLE AS places FROM (
     SELECT unnest([
       CASE WHEN subkind = 'place_of_worship' OR ${t('religion')} IS NOT NULL THEN 'religion (place of worship or religion tag)' END,
       CASE WHEN ${t('memorial')} = 'war_memorial' OR ${t('military')} IS NOT NULL
              OR regexp_matches(lower(coalesce(name, '')), 'войн|воин|партизан|подпольщик|гетто|холокост|концлаг|оккупац|блокад|афган|чернобыл')
            THEN 'war (war memorial, military tag, or a war word in the name)' END,
       CASE WHEN regexp_matches(lower(coalesce(name, '')), 'репресс|расстрел|куропат|нквд|гулаг')
            THEN 'repression (a word in the name)' END
     ]) AS signal
     FROM place WHERE kind IN ('sight', 'nature', 'market'))
   WHERE signal IS NOT NULL GROUP BY 1 ORDER BY 2 DESC`,
);

// --- Territories -------------------------------------------------------------------------------
// A candidate Territory is a named area of at least one hectare that people enter: a park, a
// garden, a zoo, a cemetery, a memorial complex, a manor or castle ground, an open-air museum.
// UTM zone 35N gives metres for "near the boundary".
const UTM = `'EPSG:32635'`;
await con.run(`CREATE OR REPLACE TABLE territory AS
  SELECT osm_type, osm_id, tags, area, pt, lon, lat, area_m2, ${t('name')} AS name,
         CASE
           WHEN ${t('leisure')} = 'garden' AND ${t('garden:type')} IN ('botanical', 'arboretum') THEN 'botanical garden'
           WHEN ${t('leisure')} = 'park' THEN 'park'
           WHEN ${t('leisure')} = 'garden' THEN 'garden'
           WHEN ${t('tourism')} IN ('zoo', 'theme_park') THEN ${t('tourism')}
           WHEN ${t('landuse')} = 'cemetery' OR ${t('amenity')} = 'grave_yard' THEN 'cemetery'
           WHEN ${t('leisure')} = 'nature_reserve' OR ${t('boundary')} = 'protected_area' THEN 'nature reserve'
           WHEN ${t('tourism')} = 'museum' THEN 'museum grounds'
           WHEN ${t('historic')} IS NOT NULL THEN 'historic site'
           WHEN ${t('tourism')} = 'attraction' THEN 'attraction'
         END AS class,
         ST_Transform(area, 'EPSG:4326', ${UTM}) AS area_utm,
         ${t('opening_hours')} AS opening_hours, ${t('fee')} AS fee, ${t('access')} AS access,
         ${t('wikidata')} AS wikidata
  FROM feature
  WHERE in_city AND area IS NOT NULL AND area_m2 >= 10000 AND ${t('name')} IS NOT NULL
    AND coalesce(${t('access')}, '') NOT IN ('private', 'no')
    AND ${t('building')} IS NULL
    AND (${t('leisure')} IN ('park', 'garden', 'nature_reserve') OR ${t('tourism')} IN ('zoo', 'theme_park', 'museum', 'attraction')
         OR ${t('landuse')} = 'cemetery' OR ${t('amenity')} = 'grave_yard' OR ${t('boundary')} = 'protected_area'
         OR ${t('historic')} IN ('castle', 'manor', 'memorial', 'archaeological_site', 'monument', 'fort', 'ruins'))`);

// Parent of a Place or of a Territory: the smallest Territory that contains its point (§3.2).
await con.run(`CREATE OR REPLACE TABLE place_parent AS
  SELECT p.osm_type, p.osm_id, arg_min(tr.osm_type || '/' || tr.osm_id, tr.area_m2) AS parent
  FROM place p JOIN territory tr
    ON ST_Contains(tr.area, p.pt) AND NOT (tr.osm_type = p.osm_type AND tr.osm_id = p.osm_id)
   AND (p.area_m2 IS NULL OR p.area_m2 < tr.area_m2)
  GROUP BY p.osm_type, p.osm_id`);
await con.run(`CREATE OR REPLACE TABLE territory_parent AS
  SELECT c.osm_type, c.osm_id, arg_min(tr.osm_type || '/' || tr.osm_id, tr.area_m2) AS parent
  FROM territory c JOIN territory tr
    ON ST_Contains(tr.area, c.pt) AND c.area_m2 < tr.area_m2
  GROUP BY c.osm_type, c.osm_id`);

// Entrances, two ways:
//   tagged   - a node tagged entrance=* or barrier=gate/entrance/turnstile… within 15 m of the boundary;
//   crossing - a point where a way that can be walked crosses the boundary (what the graph will use).
await con.run(`CREATE OR REPLACE TABLE territory_entrance AS
  WITH gate AS (
         SELECT osm_id, ST_Transform(pt, 'EPSG:4326', ${UTM}) AS pt_utm, lon, lat
         FROM feature
         WHERE osm_type = 'node' AND in_city
           AND (${t('entrance')} IS NOT NULL
                OR ${t('barrier')} IN ('gate', 'entrance', 'turnstile', 'kissing_gate', 'swing_gate', 'lift_gate', 'stile', 'full-height_turnstile'))),
       tagged AS (
         SELECT tr.osm_type, tr.osm_id, count(*) AS n
         FROM territory tr JOIN gate g
           ON g.lon BETWEEN ST_XMin(tr.area) - 0.0005 AND ST_XMax(tr.area) + 0.0005
          AND g.lat BETWEEN ST_YMin(tr.area) - 0.0003 AND ST_YMax(tr.area) + 0.0003
          AND ST_DWithin(ST_Boundary(tr.area_utm), g.pt_utm, 15)
         GROUP BY 1, 2),
       walk AS (
         SELECT w.id, wl.line
         FROM way w JOIN way_line wl ON wl.id = w.id
         WHERE ${t('highway').replaceAll('tags', 'w.tags')} IN ('footway', 'path', 'pedestrian', 'steps', 'living_street', 'residential', 'service',
                                   'track', 'unclassified', 'cycleway', 'tertiary', 'secondary', 'primary')
           AND coalesce(${t('foot').replaceAll('tags', 'w.tags')}, '') NOT IN ('no', 'private')
           AND coalesce(${t('access').replaceAll('tags', 'w.tags')}, '') NOT IN ('no', 'private')),
       crossing AS (
         SELECT tr.osm_type, tr.osm_id,
                count(DISTINCT walk.id) AS ways,
                sum(ST_NGeometries(ST_Intersection(ST_Boundary(tr.area), walk.line))) AS points
         FROM territory tr JOIN walk ON ST_Intersects(ST_Boundary(tr.area), walk.line)
         GROUP BY 1, 2)
  SELECT tr.osm_type, tr.osm_id, coalesce(tagged.n, 0) AS tagged_entrances,
         coalesce(crossing.ways, 0) AS walkable_ways_crossing, coalesce(crossing.points, 0) AS crossing_points
  FROM territory tr
  LEFT JOIN tagged ON tagged.osm_type = tr.osm_type AND tagged.osm_id = tr.osm_id
  LEFT JOIN crossing ON crossing.osm_type = tr.osm_type AND crossing.osm_id = tr.osm_id`);

interface TerritoryRow {
  ref: string;
  name: string;
  class: string;
  hectares: number;
  nested_routable: number;
  nested_plaques: number;
  nested_venues: number;
  nested_territories: number;
  tagged_entrances: number;
  walkable_ways_crossing: number;
  crossing_points: number;
  opening_hours: string | null;
  fee: string | null;
  wikidata: string | null;
  parent: string | null;
}
const territories = await rows<TerritoryRow>(
  con,
  `SELECT tr.osm_type || '/' || tr.osm_id AS ref, tr.name, tr.class, round(tr.area_m2 / 10000, 1) AS hectares,
          (SELECT count(*) FROM place_parent pp JOIN place p USING (osm_type, osm_id)
            WHERE pp.parent = tr.osm_type || '/' || tr.osm_id AND p.kind IN ('sight', 'nature', 'market'))::DOUBLE AS nested_routable,
          (SELECT count(*) FROM place_parent pp JOIN place p USING (osm_type, osm_id)
            WHERE pp.parent = tr.osm_type || '/' || tr.osm_id AND p.kind = 'plaque')::DOUBLE AS nested_plaques,
          (SELECT count(*) FROM place_parent pp JOIN place p USING (osm_type, osm_id)
            WHERE pp.parent = tr.osm_type || '/' || tr.osm_id AND p.kind = 'venue')::DOUBLE AS nested_venues,
          (SELECT count(*) FROM territory_parent tp WHERE tp.parent = tr.osm_type || '/' || tr.osm_id)::DOUBLE AS nested_territories,
          e.tagged_entrances::DOUBLE AS tagged_entrances, e.walkable_ways_crossing::DOUBLE AS walkable_ways_crossing,
          e.crossing_points::DOUBLE AS crossing_points,
          tr.opening_hours, tr.fee, tr.wikidata,
          (SELECT parent FROM territory_parent tp WHERE tp.osm_type = tr.osm_type AND tp.osm_id = tr.osm_id) AS parent
   FROM territory tr JOIN territory_entrance e USING (osm_type, osm_id)
   ORDER BY nested_routable DESC, tr.area_m2 DESC`,
);

const byClass = new Map<string, TerritoryRow[]>();
for (const tr of territories) byClass.set(tr.class, [...(byClass.get(tr.class) ?? []), tr]);
const classSummary = [...byClass.entries()]
  .map(([cls, list]) => ({
    class: cls,
    territories: list.length,
    with_nested_places: list.filter((x) => x.nested_routable > 0).length,
    nested_places: list.reduce((a, x) => a + x.nested_routable, 0),
    with_tagged_entrance: list.filter((x) => x.tagged_entrances > 0).length,
    with_walkable_crossing: list.filter((x) => x.walkable_ways_crossing > 0).length,
    with_no_entrance_of_either_kind: list.filter((x) => x.tagged_entrances === 0 && x.walkable_ways_crossing === 0).length,
    with_opening_hours: list.filter((x) => x.opening_hours !== null).length,
    with_fee_tag: list.filter((x) => x.fee !== null).length,
    with_wikidata: list.filter((x) => x.wikidata !== null).length,
  }))
  .sort((a, b) => b.territories - a.territories);
console.log();
console.log(mdTable(
  ['Class', 'Territories', 'With nested Places', 'Nested Places', 'With tagged entrance', 'With walkable crossing', 'No entrance found', 'With hours', 'With fee tag', 'With Wikidata'],
  classSummary.map((c) => [c.class, c.territories, c.with_nested_places, c.nested_places, c.with_tagged_entrance, c.with_walkable_crossing, c.with_no_entrance_of_either_kind, c.with_opening_hours, c.with_fee_tag, c.with_wikidata]),
));
console.log();
console.log(mdTable(
  ['Territory', 'Class', 'ha', 'Nested Places', 'Nested plaques', 'Nested Venues', 'Nested Territories', 'Tagged entrances', 'Walkable ways crossing', 'Hours', 'Fee', 'OSM'],
  territories.slice(0, 30).map((x) => [x.name, x.class, x.hectares, x.nested_routable, x.nested_plaques, x.nested_venues, x.nested_territories, x.tagged_entrances, x.walkable_ways_crossing, x.opening_hours ?? '—', x.fee ?? '—', x.ref]),
));

const nestedShare = (
  await rows<{ nested: number; total: number }>(
    con,
    `SELECT (SELECT count(*) FROM place_parent pp JOIN place p USING (osm_type, osm_id) WHERE p.kind IN ('sight', 'nature', 'market'))::DOUBLE AS nested,
            (SELECT count(*) FROM place WHERE kind IN ('sight', 'nature', 'market'))::DOUBLE AS total`,
  )
)[0]!;
const depth = await rows<{ depth: number; territories: number }>(
  con,
  `WITH RECURSIVE d AS (
     SELECT tr.osm_type || '/' || tr.osm_id AS ref, 1 AS depth FROM territory tr
     WHERE NOT EXISTS (SELECT 1 FROM territory_parent tp WHERE tp.osm_type = tr.osm_type AND tp.osm_id = tr.osm_id)
     UNION ALL
     SELECT tp.osm_type || '/' || tp.osm_id, d.depth + 1 FROM territory_parent tp JOIN d ON tp.parent = d.ref)
   SELECT depth::DOUBLE AS depth, count(*)::DOUBLE AS territories FROM d GROUP BY 1 ORDER BY 1`,
);

// The label node of the city, to check the centre constant against the data.
const zero = await rows(
  con,
  `SELECT osm_type || '/' || osm_id AS ref, ${t('name')} AS name, round(lat, 5) AS lat, round(lon, 5) AS lon,
          round(ST_Distance_Sphere(pt, ST_Point(${CENTRE.lon}, ${CENTRE.lat}))) AS metres_from_centre_constant
   FROM feature WHERE in_city AND osm_type = 'node' AND ${t('place')} = 'city'`,
);
console.log('\nplace=city node in the data:', zero);

writeJson('out/02-places.json', {
  osm_date: OSM_DATE,
  centre: CENTRE,
  centre_radius_m: CENTRE_RADIUS_M,
  place_city_node: zero,
  by_kind: byKind,
  routable_kinds_together: routable,
  all_kinds_together: allKinds,
  by_rule: bySubkind,
  duplicates: {
    wikidata_items_on_more_than_one_place: dupWikidata.items,
    places_sharing_a_wikidata_item: dupWikidata.places,
    pairs_same_name_same_kind_within_100_m: dupName.pairs,
  },
  sensitivity_signals_from_tags: sensitive,
  territories: {
    candidates: territories.length,
    by_class: classSummary,
    nesting_depth: depth,
    routable_places_inside_a_territory: nestedShare.nested,
    routable_places_total: nestedShare.total,
    list: territories,
  },
});
