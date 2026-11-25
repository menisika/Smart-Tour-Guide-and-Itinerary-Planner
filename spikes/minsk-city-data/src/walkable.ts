// Walkability rules, shared by the city graph and the country-wide count. They are ours to
// maintain (ADR-0009 "Consequences").
import {
  FLAG_BRIDGE, FLAG_BUSY, FLAG_CROSSING, FLAG_ROAD, FLAG_STEPS, FLAG_TUNNEL, FLAG_UNPAVED,
} from './graph.ts';

// A way can be walked when it is a path, a footway, steps, a pedestrian street, or a carriageway
// on which walking is not forbidden. Motorways are never walked. A trunk road is walked only when
// it says so. A carriageway whose footway is mapped as its own way (foot=use_sidepath) is left out.
const HIGHWAY_FOOT = ['footway', 'path', 'pedestrian', 'steps', 'corridor', 'platform', 'bridleway', 'cycleway'];
const HIGHWAY_CALM = ['living_street', 'residential', 'service', 'track', 'unclassified', 'road'];
const HIGHWAY_MID = ['tertiary', 'tertiary_link'];
const HIGHWAY_BUSY = ['secondary', 'secondary_link', 'primary', 'primary_link', 'trunk', 'trunk_link'];
const sqlList = (xs: string[]) => xs.map((x) => `'${x}'`).join(', ');
export const t = (k: string) => `tags['${k}']`;

export const WALKABLE = `
  ${t('highway')} IN (${sqlList([...HIGHWAY_FOOT, ...HIGHWAY_CALM, ...HIGHWAY_MID, ...HIGHWAY_BUSY])})
  AND coalesce(${t('foot')}, '') NOT IN ('no', 'private', 'use_sidepath', 'discouraged')
  AND (coalesce(${t('access')}, '') NOT IN ('no', 'private') OR ${t('foot')} IN ('yes', 'designated', 'permissive'))
  AND coalesce(${t('motorroad')}, '') <> 'yes'
  AND NOT (${t('highway')} IN ('trunk', 'trunk_link')
           AND coalesce(${t('foot')}, '') NOT IN ('yes', 'designated')
           AND coalesce(${t('sidewalk')}, '') NOT IN ('both', 'left', 'right', 'yes'))
  AND NOT (${t('highway')} = 'cycleway' AND coalesce(${t('foot')}, '') NOT IN ('yes', 'designated', 'permissive')
           AND coalesce(${t('segregated')}, '') = '')`;

export const FLAGS = `(
    CASE WHEN ${t('highway')} = 'steps' THEN ${FLAG_STEPS} ELSE 0 END
  + CASE WHEN ${t('footway')} = 'crossing' OR ${t('highway')} = 'crossing' THEN ${FLAG_CROSSING} ELSE 0 END
  + CASE WHEN coalesce(${t('tunnel')}, 'no') NOT IN ('no') THEN ${FLAG_TUNNEL} ELSE 0 END
  + CASE WHEN coalesce(${t('bridge')}, 'no') NOT IN ('no') THEN ${FLAG_BRIDGE} ELSE 0 END
  + CASE WHEN ${t('surface')} IN ('unpaved', 'ground', 'dirt', 'earth', 'grass', 'sand', 'gravel', 'fine_gravel',
                                 'compacted', 'mud', 'woodchips', 'pebblestone') THEN ${FLAG_UNPAVED} ELSE 0 END
  + CASE WHEN ${t('highway')} IN (${sqlList([...HIGHWAY_CALM, ...HIGHWAY_MID, ...HIGHWAY_BUSY])}) THEN ${FLAG_ROAD} ELSE 0 END
  + CASE WHEN ${t('highway')} IN (${sqlList(HIGHWAY_BUSY)}) THEN ${FLAG_BUSY} ELSE 0 END)`;
