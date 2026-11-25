# 0008. Maps: OpenStreetMap vector tiles as PMTiles, rendered by MapLibre

| | |
|---|---|
| **Status** | Accepted — confirmed by the product owner on 22 November 2026 |
| **Amended** | 23 November 2026, confirmed by the owner — the extract is copied into our own storage; the published builds stop at zoom 15. See [what changed](README.md#changes-after-the-independent-review) |
| **Fork** | #5 "Maps" ([PRODUCT-SPEC §10.2](../PRODUCT-SPEC.md#102-decision-forks)) |
| **Requirements** | `OUT-2`, `OUT-14`, `OUT-15`, `NFR-8`, `EDT-2`, `EDT-7`, `CUR-5`, `I18N-2`, `NFR-19`, `NFR-23`, `NFR-34` |

## Context

- The map of the Route's area travels inside the Route Pack and must work in airplane mode (`OUT-14`, `OUT-15`); the Pack is at most 150 MB including audio (`NFR-8`).
- Idle cost must be zero (`NFR-34`), which rules out an always-on tile server.
- The product does not build its own cartography (§1.6).

### Facts (22 November 2026)

| Fact | Source |
|---|---|
| Mapbox grants no right to redistribute downloaded maps and limits offline tile packs. Yandex MapKit offers offline mode only under a paid licence. Google Maps Platform forbids caching and pre-fetching. | provider terms: [Google](https://cloud.google.com/maps-platform/terms), [Yandex](https://yandex.ru/dev/commercial/doc/ru/concepts/mapkit), Mapbox terms of service |
| Protomaps basemaps: map design CC0, tilesets under ODbL with attribution to OpenStreetMap only. Daily planet builds are published; `pmtiles extract` cuts a bounding box or a region out of a remote archive by HTTP range requests. | [basemaps](https://github.com/protomaps/basemaps), [downloads](https://docs.protomaps.com/basemaps/downloads), [CLI](https://docs.protomaps.com/pmtiles/cli) |
| The OpenMapTiles schema additionally requires visible credit to OpenMapTiles and licenses its design under CC-BY. | OpenMapTiles licence |
| MapLibre Native reads PMTiles from a local file (`pmtiles://file://…`; Android 11.8, iOS 6.10). PMTiles sources do not take part in MapLibre's own offline-pack downloads — irrelevant for a file that is already on the device. | [MapLibre Native, PMTiles](https://maplibre.org/maplibre-native/android/examples/data/PMTiles/) |
| MapLibre Native cannot fall back to system fonts: glyph files must ship with the map. Cyrillic glyph ranges for Noto Sans exist (125 KB for the main block), under the Open Font License. | [style specification, glyphs](https://maplibre.org/maplibre-style-spec/glyphs/), [basemaps-assets](https://github.com/protomaps/basemaps-assets) |
| A PMTiles archive is served straight from object storage by HTTP range requests; no tile server is involved. | Protomaps documentation |
| Planetiler (Apache-2.0) builds the same tilesets from an OpenStreetMap extract. | [Planetiler](https://github.com/onthegomap/planetiler) |

## Options considered

| Option | For | Against |
|---|---|---|
| **A. Protomaps-schema PMTiles + MapLibre** | No restriction on offline use or redistribution; attribution to OpenStreetMap only; no tile server | We own the style and the tile pipeline |
| **B. OpenMapTiles-schema tiles + MapLibre** | More ready-made styles | An extra mandatory credit; design under CC-BY |
| **C. A commercial SDK** (Mapbox, Yandex MapKit, Google Maps) | Polished maps, no pipeline | Excluded by their own terms for a free, redistributable offline pack |

## Decision

Option A.

1. **Tiles** are OpenStreetMap data in the Protomaps basemap schema, stored as PMTiles. A region is cut from a daily build with `pmtiles extract` when city data is built and is copied into our own storage as part of the city version — the published builds are kept for a week only and go to zoom 15. Generating with Planetiler is the fallback if the builds become unavailable.
2. **Rendering** is MapLibre everywhere: MapLibre Native through `@maplibre/maplibre-react-native` on the phone, MapLibre GL JS on the web and in the console.
3. **Online**, the web reads a city's PMTiles file directly from the public bucket of [ADR-0010](0010-storage-postgres-on-neon-and-objects-in-r2.md). There is no tile server.
4. **Offline**, a Route Pack contains a PMTiles extract of the Route's area, the style, the glyph ranges for Latin and Cyrillic and the sprites, all as local files.
5. **Labels** use the name in the person's language where OpenStreetMap has one, and the local name otherwise (`I18N-2`).
6. **Attribution** to OpenStreetMap is always visible on the map (`NFR-19`).
7. The style and the tiles are data behind one map component; replacing the source does not touch the rest (`NFR-23`).

## Consequences

- No map provider can restrict offline use, charge per person or block an account.
- The map's look is our responsibility: a style in two themes has to be maintained.
- Map data is as fresh as the pinned build; it is refreshed when city data is rebuilt.

## Not verified

- The size of an extract of central Minsk at zoom 15, and how it looks when zoomed in further. The research estimate is 10–40 MB; it must be measured before the Route Pack budget is fixed.
- That the React Native binding passes a local `pmtiles://` source through to the native core. The fallback is side-loading a MapLibre offline database, which the binding documents.
- A fully offline style with bundled glyphs and sprites, end to end, on both platforms — part of the device check of [ADR-0005](0005-mobile-client-expo-and-a-typescript-monorepo.md).
