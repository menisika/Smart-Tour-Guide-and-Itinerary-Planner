/**
 * The style of the map, running: the generated MapLibre style of a theme,
 * drawn by MapLibre GL JS from a tile archive of the area of the reference
 * Outing — the renderer, the tile schema and the file format of ADR-0008.
 *
 * It is here to prove the style on real tiles, not to be a component: the
 * application has its own map component, which this file is not.
 *
 * MapLibre and the PMTiles reader are development dependencies of the
 * repository, served by design/serve.mjs under /vendor/.
 */
import { meDot, positionAt, bearingAt } from './parts/map.js';

const M_PER_DEG_LAT = 111_320;

/** @param {string} src */
const script = (src) =>
  new Promise((resolve, reject) => {
    const element = document.createElement('script');
    element.src = src;
    element.onload = resolve;
    element.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.append(element);
  });

/**
 * From the units of design/data/map.json back to longitude and latitude.
 * @param {any} map
 */
function unproject(map) {
  const { west, north, south } = map.box;
  const perLon = M_PER_DEG_LAT * Math.cos((((south + north) / 2) * Math.PI) / 180);
  return (/** @type {number} */ x, /** @type {number} */ y) => [
    west + x / (perLon * map.units_per_metre),
    north - y / (M_PER_DEG_LAT * map.units_per_metre),
  ];
}

/**
 * The rings of a footprint written as "Mx yl dx dy…z", one ring to each "M":
 * a Place may be more than one building.
 * @param {string} d @returns {[number, number][][]}
 */
function rings(d) {
  return d
    .split('M')
    .filter(Boolean)
    .map((part) => {
      const numbers = part.match(/-?\d+/g)?.map(Number) ?? [];
      /** @type {[number, number][]} */
      const points = [];
      let x = 0;
      let y = 0;
      for (let i = 0; i + 1 < numbers.length; i += 2) {
        x = i === 0 ? numbers[0] : x + numbers[i];
        y = i === 0 ? numbers[1] : y + numbers[i + 1];
        points.push([x, y]);
      }
      return points;
    })
    .filter((points) => points.length >= 3);
}

/**
 * The Route as the style's `route` source expects it: the line walked and
 * ahead, the footprints of the Places, the stops, the start.
 * @param {any} data @param {number} current the order of the Place being visited
 */
function routeData(data, current) {
  const at = unproject(data.map);
  const line = (/** @type {number} */ from, /** @type {number} */ to) =>
    data.map.legs
      .slice(from, to)
      .flatMap((/** @type {any} */ leg, /** @type {number} */ i) =>
        (i === 0 ? leg.points : leg.points.slice(1)).map((/** @type {number[]} */ p) =>
          at(p[0], p[1]),
        ),
      );
  const features = [
    { part: 'walked', geometry: { type: 'LineString', coordinates: line(0, current - 1) } },
    {
      part: 'ahead',
      geometry: { type: 'LineString', coordinates: line(current - 1, data.map.legs.length) },
    },
    ...data.stops.map((/** @type {any} */ s) => ({
      part: 'place',
      order: s.order,
      geometry: {
        type: 'MultiPolygon',
        coordinates: rings(s.footprint).map((ring) => {
          const points = ring.map(([x, y]) => at(x, y));
          return [[...points, points[0]]];
        }),
      },
    })),
    ...data.stops.map((/** @type {any} */ s) => ({
      part: 'stop',
      order: s.order,
      state: s.order < current ? 'done' : s.order === current ? 'current' : 'ahead',
      geometry: { type: 'Point', coordinates: at(s.streetX, s.streetY) },
    })),
    {
      part: 'terminus',
      geometry: {
        type: 'Point',
        coordinates: at(data.map.start.street_x, data.map.start.street_y),
      },
    },
  ];
  return {
    type: 'FeatureCollection',
    features: features.map(({ geometry, ...properties }) => ({
      type: 'Feature',
      properties,
      geometry,
    })),
  };
}

/**
 * @param {HTMLElement} container
 * @param {{ data: any, theme: 'light' | 'dark' | 'sun', lang: 'ru' | 'en' }} options
 */
export async function liveMap(container, { data, theme, lang }) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/vendor/maplibre-gl.css';
  document.head.append(link);
  await script('/vendor/pmtiles.js');
  const maplibre = await import(/* @vite-ignore */ `${location.origin}/vendor/maplibre-gl.mjs`);
  const pm = /** @type {any} */ (globalThis).pmtiles;
  maplibre.addProtocol('pmtiles', new pm.Protocol().tile);

  const style = await fetch(new URL(`./map/style.${theme}.json`, import.meta.url)).then((r) =>
    r.json(),
  );
  // What the map component of the application does with the generated style:
  // it says where the tiles and the glyphs are, and which language to name things in.
  style.sources.basemap.url = `pmtiles://${new URL('../data/outing.pmtiles', import.meta.url)}`;
  style.glyphs = `${new URL('../assets/glyphs/', import.meta.url)}{fontstack}/{range}.pbf`;
  for (const layer of style.layers) {
    if (style.metadata['promenade:name-layers'].includes(layer.id)) {
      layer.layout['text-field'] = ['coalesce', ['get', `name:${lang}`], ['get', 'name']];
    }
  }
  const now = data.outingNow;
  style.sources.route.data = routeData(data, now.stop.order);

  const at = unproject(data.map);
  const { west, east, south, north } = data.map.box;
  const corners = data.stops.map((/** @type {any} */ s) => at(s.streetX, s.streetY));
  const lons = corners.map((/** @type {number[]} */ c) => c[0]);
  const lats = corners.map((/** @type {number[]} */ c) => c[1]);
  const place = document.createElement('div');
  place.style.cssText = 'position:absolute;inset:0';
  container.prepend(place);
  const map = new maplibre.Map({
    container: place,
    style,
    bounds: [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)],
    ],
    fitBoundsOptions: { padding: 70 },
    maxBounds: [
      [west, south],
      [east, north],
    ],
    maxZoom: 18.5,
    maxPitch: 60,
    attributionControl: false,
  });
  await map.once('load');

  // The person, a few steps before the Place being told.
  const minute = now.stop.arriveMin - 0.6;
  const here = positionAt(data, minute);
  const me = document.createElement('div');
  me.className = 'tt-me';
  me.innerHTML = meDot({ heading: 0 });
  new maplibre.Marker({ element: me, rotationAlignment: 'viewport' })
    .setLngLat(at(here.x, here.y))
    .addTo(map);

  const camera = data.tokens.map.camera;
  const plan = { center: map.getCenter(), zoom: map.getZoom(), pitch: 0, bearing: 0 };
  let walking = false;
  const key = /** @type {HTMLButtonElement} */ (document.getElementById('live-view'));
  key.hidden = false;
  key.addEventListener('click', () => {
    walking = !walking;
    key.textContent = walking ? 'The plan, from above' : 'The way, at an angle';
    // The walking camera of the tokens: tilted, the direction of travel up, buildings standing.
    map.setLayoutProperty('buildings-standing', 'visibility', walking ? 'visible' : 'none');
    map.setLayoutProperty('buildings', 'visibility', walking ? 'none' : 'visible');
    map.easeTo(
      walking
        ? {
            center: at(here.x, here.y),
            zoom: camera.walk.zoom,
            pitch: camera.walk.pitch,
            bearing: bearingAt(data, minute),
            offset: [0, 150],
            duration: data.tokens.motion.duration.arrive.value,
          }
        : { ...plan, duration: data.tokens.motion.duration.arrive.value },
    );
  });
  return map;
}
