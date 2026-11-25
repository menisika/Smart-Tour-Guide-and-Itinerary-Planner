// The owner's five kinds of Places for Belarus, as rules over OpenStreetMap tags.
// One implementation, in TypeScript, used on the extract and on the daily diffs alike; the SQL
// below only narrows the scan to objects that could match.

export type Group = 'sights' | 'eating' | 'lodging' | 'nature' | 'entertainment';
export const GROUPS: Group[] = ['sights', 'eating', 'lodging', 'nature', 'entertainment'];
export const GROUP_LABEL: Record<Group, string> = {
  sights: 'Sights',
  eating: 'Eating and drinking',
  lodging: 'Lodging',
  nature: 'Parks and nature',
  entertainment: 'Entertainment',
};
/** Groups whose Places can be stops of a Route; Venues and lodging serve a Route, they are not stops. */
export const ROUTABLE: Group[] = ['sights', 'nature', 'entertainment'];

export const LODGING_TOURISM = ['hotel', 'hostel', 'guest_house', 'motel', 'apartment', 'chalet', 'camp_site', 'caravan_site', 'wilderness_hut', 'alpine_hut', 'cabin', 'glamping', 'resort', 'holiday_village'];
export const LODGING_LEISURE = ['resort'];
export const EATING_AMENITY = ['cafe', 'restaurant', 'bar', 'pub', 'fast_food', 'food_court', 'ice_cream', 'biergarten'];
export const ENTERTAINMENT_AMENITY = ['cinema', 'theatre', 'nightclub', 'arts_centre', 'planetarium', 'casino', 'karaoke_box', 'concert_hall'];
export const ENTERTAINMENT_LEISURE = ['bowling_alley', 'amusement_arcade', 'water_park', 'escape_game', 'trampoline_park', 'miniature_golf', 'indoor_play'];
export const ENTERTAINMENT_TOURISM = ['zoo', 'theme_park', 'aquarium'];
export const SIGHTS_TOURISM = ['attraction', 'museum', 'gallery', 'artwork'];
export const SIGHTS_AMENITY = ['place_of_worship', 'fountain'];
export const HISTORIC_NOT_A_SIGHT = ['no', 'district', 'road', 'railway'];
export const PLAQUE_MEMORIAL = ['plaque', 'blue_plaque', 'stolperstein', 'plate'];
export const NATURE_LEISURE = ['park', 'nature_reserve', 'beach_resort'];
export const NATURE_BOUNDARY = ['protected_area', 'national_park'];
export const NATURE_TOURISM = ['viewpoint'];

export type Tags = Record<string, string>;
export interface Classified {
  group: Group;
  /** The rule that matched: the tag that makes the object what it is. */
  rule: string;
  /** The key of that tag, to see when the kind itself is edited. */
  key: string;
}

/**
 * The group of an object, or null. First match wins. A memorial plaque is in no group: it is a
 * kind of its own, kept out of Routes by default (PLC-5), and is counted separately.
 */
export function classify(t: Tags): Classified | null {
  if (isPlaque(t)) return null;
  const { tourism, amenity, leisure, historic, boundary } = t;
  if (tourism && LODGING_TOURISM.includes(tourism)) return { group: 'lodging', rule: `tourism=${tourism}`, key: 'tourism' };
  if (leisure && LODGING_LEISURE.includes(leisure)) return { group: 'lodging', rule: `leisure=${leisure}`, key: 'leisure' };
  if (amenity && EATING_AMENITY.includes(amenity)) return { group: 'eating', rule: `amenity=${amenity}`, key: 'amenity' };
  if (amenity && ENTERTAINMENT_AMENITY.includes(amenity)) return { group: 'entertainment', rule: `amenity=${amenity}`, key: 'amenity' };
  if (leisure && ENTERTAINMENT_LEISURE.includes(leisure)) return { group: 'entertainment', rule: `leisure=${leisure}`, key: 'leisure' };
  if (tourism && ENTERTAINMENT_TOURISM.includes(tourism)) return { group: 'entertainment', rule: `tourism=${tourism}`, key: 'tourism' };
  if (tourism && SIGHTS_TOURISM.includes(tourism)) return { group: 'sights', rule: `tourism=${tourism}`, key: 'tourism' };
  if (amenity && SIGHTS_AMENITY.includes(amenity)) return { group: 'sights', rule: `amenity=${amenity}`, key: 'amenity' };
  if (tourism && NATURE_TOURISM.includes(tourism)) return { group: 'nature', rule: `tourism=${tourism}`, key: 'tourism' };
  if (leisure && NATURE_LEISURE.includes(leisure)) return { group: 'nature', rule: `leisure=${leisure}`, key: 'leisure' };
  if (leisure === 'garden' && (t.name || ['botanical', 'arboretum'].includes(t['garden:type'] ?? ''))) return { group: 'nature', rule: 'leisure=garden (named or botanical)', key: 'leisure' };
  if (boundary && NATURE_BOUNDARY.includes(boundary)) return { group: 'nature', rule: `boundary=${boundary}`, key: 'boundary' };
  if (t.natural === 'beach') return { group: 'nature', rule: 'natural=beach', key: 'natural' };
  if (historic && !HISTORIC_NOT_A_SIGHT.includes(historic)) return { group: 'sights', rule: `historic=${historic === 'memorial' ? 'memorial' : historic === 'monument' ? 'monument' : '*'}`, key: 'historic' };
  if (t.building && t.building !== 'no' && (t.wikidata || t.heritage)) return { group: 'sights', rule: 'building with wikidata or heritage', key: 'building' };
  return null;
}

export function isPlaque(t: Tags): boolean {
  return t.historic === 'memorial' && (PLAQUE_MEMORIAL.includes(t.memorial ?? '') || ['plaque', 'plate'].includes(t['memorial:type'] ?? ''));
}

export const LIFECYCLE_PREFIXES = ['disused', 'abandoned', 'was', 'demolished', 'razed', 'removed', 'destroyed', 'closed'];
const KIND_KEYS = ['amenity', 'tourism', 'leisure', 'historic', 'boundary'];

/**
 * The group an object would be in if its lifecycle prefix were dropped: `disused:amenity=cafe`
 * is a café that closed. Returns the prefix as well.
 */
export function lifecycle(t: Tags): { prefix: string; was: Classified } | null {
  for (const prefix of LIFECYCLE_PREFIXES) {
    const revived: Tags = {};
    let any = false;
    for (const [k, v] of Object.entries(t)) {
      if (k.startsWith(`${prefix}:`) && KIND_KEYS.includes(k.slice(prefix.length + 1))) {
        revived[k.slice(prefix.length + 1)] = v;
        any = true;
      }
    }
    if (!any) continue;
    const was = classify({ name: t.name ?? '', ...revived });
    if (was) return { prefix, was };
  }
  return null;
}

export const hasWebsite = (t: Tags) => Boolean(t.website ?? t['contact:website'] ?? t.url);
export const websiteOf = (t: Tags) => t.website ?? t['contact:website'] ?? t.url ?? null;
export const hasPhone = (t: Tags) => Boolean(t.phone ?? t['contact:phone'] ?? t['contact:mobile']);
export const checkDateKeys = (t: Tags) => Object.keys(t).filter((k) => k.startsWith('check_date') || k === 'survey:date');
export const CONTACT_KEYS = (k: string) => k === 'website' || k === 'url' || k === 'phone' || k === 'email' || k.startsWith('contact:');

const q = (xs: string[]) => xs.map((x) => `'${x}'`).join(', ');
/** A WHERE clause that keeps every object `classify` or `lifecycle` could accept, and plaques. */
export const SQL_PREFILTER = `(
     tags['tourism'] IN (${q([...LODGING_TOURISM, ...ENTERTAINMENT_TOURISM, ...SIGHTS_TOURISM, ...NATURE_TOURISM])})
  OR tags['amenity'] IN (${q([...EATING_AMENITY, ...ENTERTAINMENT_AMENITY, ...SIGHTS_AMENITY])})
  OR tags['leisure'] IN (${q([...LODGING_LEISURE, ...ENTERTAINMENT_LEISURE, ...NATURE_LEISURE, 'garden'])})
  OR tags['boundary'] IN (${q(NATURE_BOUNDARY)})
  OR tags['natural'] = 'beach'
  OR tags['historic'] IS NOT NULL
  OR (tags['building'] IS NOT NULL AND (tags['wikidata'] IS NOT NULL OR tags['heritage'] IS NOT NULL))
  OR len(list_filter(map_keys(tags), lambda k: regexp_matches(k, '^(${LIFECYCLE_PREFIXES.join('|')}):(${KIND_KEYS.join('|')})$'))) > 0
)`;

// --- Where an object is: Minsk, another regional centre, or the rest ---------------------------
export type Area = 'Minsk' | 'regional centres' | 'rest';
export const AREAS: Area[] = ['Minsk', 'regional centres', 'rest'];
/** Wikidata items of the cities whose administrative boundaries are used, as the extract tags them. */
export const CAPITAL = 'Q2280';
export const REGIONAL_CENTRES = ['Q140147', 'Q102217', 'Q2678', 'Q181376', 'Q154835']; // Brest, Vitebsk, Gomel, Grodno, Mogilev

type Ring = number[][];
interface Polygonal { type: 'Polygon' | 'MultiPolygon'; coordinates: Ring[] | Ring[][] }
function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Point in polygon with holes, by ray casting; good to a few metres at a boundary. */
export function contains(g: Polygonal, lon: number, lat: number): boolean {
  const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as Ring[][];
  return polys.some((rings) => inRing(lon, lat, rings[0]!) && !rings.slice(1).some((hole) => inRing(lon, lat, hole)));
}
export interface City { qid: string; name: string; geometry: Polygonal; bbox: [number, number, number, number] }
export function areaOf(cities: City[], lon: number | null, lat: number | null): Area {
  if (lon === null || lat === null) return 'rest';
  for (const c of cities) {
    if (lon < c.bbox[0] || lon > c.bbox[2] || lat < c.bbox[1] || lat > c.bbox[3]) continue;
    if (contains(c.geometry, lon, lat)) return c.qid === CAPITAL ? 'Minsk' : 'regional centres';
  }
  return 'rest';
}
