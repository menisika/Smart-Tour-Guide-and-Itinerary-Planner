/**
 * The map and what stands on it: the line of the Route, the stops, the clock
 * written on the line, the person, and the plan of a Place that has no
 * photograph.
 *
 * The drawing is the one of `directions/shared/map.js`: real geometry, styled
 * by `css/map.css` from the same tokens as the MapLibre styles.
 */
import {
  bearingAt,
  fitView,
  mapSvg,
  pathThrough,
  pinned,
  pitchedMap,
  positionAt,
  routePath,
  routeSamples,
  spread,
} from '../../directions/shared/map.js';
import { kindIcon } from '../icons.js';
import { T } from '../strings.js';

/** @typedef {'ru' | 'en'} Lang */
/** @typedef {'light' | 'dark' | 'sun'} Theme */

const STREETS = ['roads_minor', 'roads_mid', 'roads_major'];

/**
 * The layers of the map, bottom first. In the sun theme a street has an edge;
 * elsewhere the edge has the colour of the ground and is not drawn at all.
 * @param {Theme} theme @param {boolean} [buildings] seen from above, they are a layer; seen at an angle, they stand
 */
export function layersOf(theme, buildings = true) {
  return [
    'green',
    'water',
    ...(theme === 'sun' ? STREETS.map((s) => `${s}:edge`) : []),
    ...STREETS,
    ...(buildings ? ['buildings'] : []),
    'rail',
    'rail:ties',
  ];
}

/** @param {string} clock @param {number} minutes */
export const clockPlus = (clock, minutes) => {
  const [h, m] = clock.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * The line as it lies on the ground: what has been walked, then a glow, a
 * casing, the line, and the part ahead in motion.
 * @param {any} data @param {number} walkedLegs
 */
export const routeLine = (data, walkedLegs = 0) => {
  const ahead = routePath(data, walkedLegs);
  const walked =
    walkedLegs > 0 ? `<path class="tt-line-walked" d="${routePath(data, 0, walkedLegs)}"/>` : '';
  return `${walked}<path class="tt-line-glow" d="${ahead}"/><path class="tt-line-case" d="${ahead}"/><path class="tt-line" d="${ahead}"/><path class="tt-line-march" d="${ahead}"/>`;
};

/**
 * What lies on the flat map: footprints, the line, the clock at the
 * half-hours, the start, and the stops as numbered discs.
 * @param {any} data @param {Lang} lang @param {{ u: number }} ctx
 * @param {{ current?: number, done?: number, skipped?: number, marks?: boolean, walkedLegs?: number }} [state]
 */
export function overlay(data, lang, { u }, state = {}) {
  const { current = 0, done = 0, skipped = 0, marks = true, walkedLegs = 0 } = state;
  const at = spread(
    data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
    25 * u,
  );
  let ticks = '';
  if (marks) {
    for (let m = 30; m < data.route.totalMinutes; m += 30) {
      const p = positionAt(data, m);
      if ('atStop' in p) continue;
      if (at.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 30 * u)) continue;
      ticks += pinned(
        p.x,
        p.y,
        u,
        `<rect x="-19" y="-10" width="38" height="20" rx="10"/><text y="4" text-anchor="middle">${clockPlus(data.route.start, m)}</text>`,
        'tt-mark',
      );
    }
  }
  const stations = data.stops
    .map((/** @type {any} */ s, /** @type {number} */ i) => {
      const is =
        s.order === skipped
          ? ' is-skipped'
          : s.order === current
            ? ' is-current'
            : s.order <= done
              ? ' is-done'
              : '';
      return pinned(
        at[i].x,
        at[i].y,
        u,
        `<circle class="tt-station-shade" r="12" cy="1.5"/><circle r="11.5"/><text y="3.6" text-anchor="middle">${s.order}</text>`,
        `tt-station${is}`,
      );
    })
    .join('');
  const start = pinned(
    data.map.start.street_x,
    data.map.start.street_y,
    u,
    `<rect class="tt-terminus-mark" x="-8" y="-8" width="16" height="16" rx="4"/><text x="15" y="4.5">${data.route.startShort[lang]}</text>`,
    'tt-terminus',
  );
  const feet = data.stops
    .map((/** @type {any} */ s) => `<use href="#m-foot-${s.order}" class="tt-foot"/>`)
    .join('');
  return `${feet}${routeLine(data, walkedLegs)}${ticks}${start}${stations}`;
}

/** The points a view of the whole Route has to show. @param {any} data */
export const routePoints = (data) => [
  ...data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
  { x: data.map.start.street_x, y: data.map.start.street_y },
];

/**
 * The Route seen from above, north up: the map of the plan.
 * @param {any} data
 * @param {object} options
 * @param {Lang} options.lang @param {Theme} options.theme
 * @param {number} options.width @param {number} options.height
 * @param {{ top?: number, right?: number, bottom?: number, left?: number }} [options.padding]
 * @param {number} [options.labels] how many street names at most
 * @param {{ x: number, y: number }[]} [options.points] what the view has to show; the whole Route by default
 * @param {Parameters<typeof overlay>[3]} [options.state]
 * @param {(ctx: { u: number }) => string} [options.extra] drawn last
 */
export function planMap(data, options) {
  const { lang, theme, width, height, padding, labels = 5, state, extra } = options;
  const view = fitView(options.points ?? routePoints(data), width, height, padding);
  return mapSvg(data, {
    view,
    lang,
    layers: layersOf(theme),
    labels: labels > 0 ? { max: labels, size: 10, clearOf: routeSamples(data) } : undefined,
    over: (ctx) => `${overlay(data, lang, ctx, state)}${extra?.(ctx) ?? ''}`,
    label: T[lang].theLine,
  });
}

/**
 * The mark of the person. Facing is a wedge of light; an uncertain position
 * is a wide pale ring, without the pulse.
 * @param {{ heading?: number, unsure?: boolean }} [state] heading in degrees clockwise from the top of the screen
 */
export const meDot = ({ heading, unsure = false } = {}) =>
  `${unsure ? '' : '<span class="tt-me-pulse"></span>'}${heading === undefined || unsure ? '' : `<span class="tt-me-heading" style="transform:rotate(${heading}deg)"></span>`}<span class="tt-me-dot"></span>`;

/** A Place as it stands on the tilted map. @param {any} stop @param {'current' | 'done' | ''} [is] */
export const pinBadge = (stop, is = '') => ({
  x: stop.x,
  y: stop.y,
  className: `tt-pin${is ? ` is-${is}` : ''}`,
  html: `<span class="tt-pin-badge">${kindIcon(stop.kind)}<b>${stop.order}</b></span>`,
});

/**
 * The map of the Outing: seen at an angle with the direction of travel up,
 * buildings standing. In the saver mode it is flat and nothing stands.
 * @param {any} data
 * @param {object} options
 * @param {Lang} options.lang @param {Theme} options.theme
 * @param {number} options.width @param {number} options.height
 * @param {number} options.minute of the plan: where the person is
 * @param {number} options.walkedLegs
 * @param {any[]} options.pins the Places to stand on it; the first is the one being told
 * @param {boolean} [options.saver]
 * @param {boolean} [options.unsure] the position is uncertain
 */
export function walkMap(data, options) {
  const { lang, theme, width, height, minute, walkedLegs, pins, saver = false } = options;
  const here = positionAt(data, minute);
  return pitchedMap(data, {
    width,
    height,
    lang,
    layers: layersOf(theme, saver),
    at: here,
    bearing: bearingAt(data, minute),
    u: saver ? 1.5 : 1.25,
    near: 150,
    pitch: saver ? 0 : data.tokens.map.camera.walk.pitch,
    walls: saver ? [] : [3, 6, 9, 12, 15],
    over: () =>
      `${routeLine(data, walkedLegs)}${pins.map((/** @type {any} */ s) => `<use href="#m-foot-${s.order}" class="tt-foot"/>`).join('')}`,
    standing: [
      ...pins.map((/** @type {any} */ s, /** @type {number} */ i) =>
        pinBadge(s, i === 0 ? 'current' : ''),
      ),
      {
        x: here.x,
        y: here.y,
        className: `tt-me${options.unsure ? ' is-unsure' : ''}`,
        html: meDot({ heading: 0, unsure: options.unsure }),
      },
    ],
    label: T[lang].theLine,
  });
}

/**
 * A Place without a photograph is shown by its plan: its own walls, as the
 * map has them, with the sign of its kind. It is real, and it says honestly
 * that there is no picture; nothing is drawn to stand in for one.
 * @param {any} data @param {any} stop
 * @param {{ lang: Lang, theme: Theme, width: number, height: number }} options
 */
export function plate(data, stop, { lang, theme, width, height }) {
  const u = 0.62;
  const view = {
    x: stop.x - (width * u) / 2,
    y: stop.y - (height * u) / 2,
    w: width * u,
    h: height * u,
    u,
  };
  const map = mapSvg(data, {
    view,
    lang,
    layers: layersOf(theme),
    over: () => `<use href="#m-foot-${stop.order}" class="tt-foot"/>`,
    label: stop.name[lang],
  });
  return `<div class="tt-plate">${map}<span class="tt-plate-kind">${kindIcon(stop.kind)}</span></div>`;
}

/**
 * A piece of the map to stand behind a component, so that glass has
 * something to be glass over.
 * @param {any} data
 * @param {{ lang: Lang, theme: Theme, width: number, height: number, around?: number, u?: number, state?: Parameters<typeof overlay>[3] }} options
 */
export function backdrop(data, { lang, theme, width, height, around = 4, u = 1.9, state }) {
  const stop = data.stops[around - 1];
  const view = {
    x: stop.streetX - (width * u) / 2,
    y: stop.streetY - (height * u) / 2,
    w: width * u,
    h: height * u,
    u,
  };
  return mapSvg(data, {
    view,
    lang,
    layers: layersOf(theme),
    over: (ctx) => overlay(data, lang, ctx, { marks: false, ...state }),
    label: T[lang].theLine,
  });
}

export { pathThrough, positionAt, bearingAt, fitView, mapSvg, pinned, routePath, routeSamples };
