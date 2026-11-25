// The kinds of specification §3.2 as SQL over OpenStreetMap tags, shared by the city step and the
// country-wide count. The expressions expect the columns `tags` (a map) and `area_m2`.
export const t = (k: string) => `tags['${k}']`;

// First matching rule wins. `subkind` is the rule; `kind` is the kind of §3.2 it belongs to.
// A memorial plaque is recognised before anything else: it is a kind of its own (PLC-5).
export const SUBKIND = `CASE
  WHEN ${t('historic')} = 'memorial' AND (${t('memorial')} IN ('plaque', 'blue_plaque', 'stolperstein', 'plate')
       OR ${t('memorial:type')} IN ('plaque', 'plate')) THEN 'memorial_plaque'
  WHEN ${t('amenity')} = 'marketplace' THEN 'marketplace'
  WHEN ${t('amenity')} = 'cafe' THEN 'cafe'
  WHEN ${t('amenity')} = 'restaurant' THEN 'restaurant'
  WHEN ${t('amenity')} IN ('bar', 'pub', 'biergarten') THEN 'bar'
  WHEN ${t('amenity')} IN ('fast_food', 'food_court', 'ice_cream') THEN 'fast_food'
  WHEN ${t('tourism')} = 'museum' THEN 'museum'
  WHEN ${t('tourism')} = 'gallery' THEN 'gallery'
  WHEN ${t('amenity')} = 'place_of_worship' THEN 'place_of_worship'
  WHEN ${t('historic')} = 'monument' THEN 'monument'
  WHEN ${t('historic')} = 'memorial' THEN 'memorial'
  WHEN ${t('tourism')} = 'artwork' THEN 'artwork'
  WHEN ${t('amenity')} = 'fountain' THEN 'fountain'
  WHEN ${t('amenity')} IN ('theatre', 'arts_centre', 'planetarium') THEN 'theatre'
  WHEN ${t('tourism')} = 'viewpoint' THEN 'viewpoint'
  WHEN ${t('tourism')} IN ('attraction', 'zoo', 'theme_park', 'aquarium') THEN 'attraction'
  WHEN ${t('leisure')} = 'park' THEN 'park'
  WHEN ${t('leisure')} = 'garden' AND (${t('name')} IS NOT NULL OR ${t('garden:type')} IN ('botanical', 'arboretum')) THEN 'garden'
  WHEN ${t('leisure')} = 'nature_reserve' OR ${t('boundary')} = 'protected_area' THEN 'nature_reserve'
  WHEN ${t('historic')} IS NOT NULL AND ${t('historic')} NOT IN ('no', 'district', 'road', 'railway') THEN 'historic_other'
  WHEN ${t('natural')} = 'beach' OR ${t('leisure')} = 'beach_resort' THEN 'beach'
  WHEN ${t('natural')} = 'water' AND ${t('name')} IS NOT NULL AND area_m2 >= 10000 THEN 'named_water'
  WHEN ${t('highway')} IS NOT NULL AND (lower(${t('name')}) LIKE '%набережная%' OR lower(${t('name:be')}) LIKE '%набярэжная%') THEN 'embankment'
  WHEN ${t('building')} IS NOT NULL AND ${t('building')} <> 'no' AND (${t('wikidata')} IS NOT NULL OR ${t('heritage')} IS NOT NULL) THEN 'notable_building'
END`;
export const KIND = `CASE
  WHEN subkind = 'memorial_plaque' THEN 'plaque'
  WHEN subkind = 'marketplace' THEN 'market'
  WHEN subkind IN ('cafe', 'restaurant', 'bar', 'fast_food') THEN 'venue'
  WHEN subkind IN ('park', 'garden', 'nature_reserve', 'viewpoint', 'beach', 'named_water', 'embankment') THEN 'nature'
  ELSE 'sight'
END`;
