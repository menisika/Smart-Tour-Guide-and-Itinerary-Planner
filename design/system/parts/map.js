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
 * @param {number} [options.bearing] the direction that is up; the direction of travel by default
 * @param {number} [options.pitch] the angle of the view; the walking camera of the tokens by default
 * @param {('current' | 'done' | '')[]} [options.pinStates] how each pin is drawn; the first is "current" by default
 */
export function walkMap(data, options) {
  const { lang, theme, width, height, minute, walkedLegs, pins, saver = false } = options;
  const here = positionAt(data, minute);
  const states = options.pinStates ?? pins.map((_, i) => (i === 0 ? 'current' : ''));
  return pitchedMap(data, {
    width,
    height,
    lang,
    layers: layersOf(theme, saver),
    at: here,
    bearing: options.bearing ?? bearingAt(data, minute),
    u: saver ? 1.5 : 1.25,
    near: 150,
    pitch: saver ? 0 : (options.pitch ?? data.tokens.map.camera.walk.pitch),
    walls: saver ? [] : [3, 6, 9, 12, 15],
    over: () =>
      `${routeLine(data, walkedLegs)}${pins.map((/** @type {any} */ s) => `<use href="#m-foot-${s.order}" class="tt-foot"/>`).join('')}`,
    standing: [
      ...pins.map((/** @type {any} */ s, /** @type {number} */ i) => pinBadge(s, states[i])),
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

/**
 * The map with nothing of a Route on it yet: the ground of a request, with
 * the point one starts from.
 * @param {any} data
 * @param {{ lang: Lang, theme: Theme, width: number, height: number, u?: number, lift?: number, labels?: number }} options
 *   `lift` moves the start up from the middle, in points, to clear a sheet
 */
export function groundMap(data, { lang, theme, width, height, u = 2.4, lift = 0, labels = 6 }) {
  const start = data.map.start;
  const view = {
    x: start.street_x - (width * u) / 2,
    y: start.street_y - (height * u) / 2 + lift * u,
    w: width * u,
    h: height * u,
    u,
  };
  return mapSvg(data, {
    view,
    lang,
    layers: layersOf(theme),
    labels: labels > 0 ? { max: labels, size: 10 } : undefined,
    over: (ctx) =>
      pinned(
        start.street_x,
        start.street_y,
        ctx.u,
        `<rect class="tt-terminus-mark" x="-8" y="-8" width="16" height="16" rx="4"/><text x="15" y="4.5">${data.route.startShort[lang]}</text>`,
        'tt-terminus',
      ),
    label: data.route.startName[lang],
  });
}

/**
 * A Route as a small picture: its line on the map and where it starts,
 * nothing else. For a row of a list.
 * @param {any} data
 * @param {{ lang: Lang, theme: Theme, size: number, again?: boolean, walked?: boolean }} options
 *   `again`: the Route without the skipped Place; `walked`: an Outing that is over
 */
export function lineMap(data, { lang, theme, size, again = false, walked = false }) {
  const view = fitView(routePoints(data), size, size, { top: 14, right: 14, bottom: 14, left: 14 });
  const skip = data.recalculated.skipped.order;
  const way = again
    ? `${routePath(data, 0, skip - 1)} ${pathThrough(data.recalculated.leg.points)} ${routePath(data, skip + 1)}`
    : routePath(data);
  return mapSvg(data, {
    view,
    lang,
    layers: layersOf(theme),
    over: ({ u }) =>
      `<path class="${walked ? 'tt-line-walked' : 'tt-line-case'}" d="${way}"/>${walked ? '' : `<path class="tt-line" d="${way}"/>`}${pinned(data.map.start.street_x, data.map.start.street_y, u, '<rect class="tt-terminus-mark" x="-5" y="-5" width="10" height="10" rx="3"/>', 'tt-terminus')}`,
    label: T[lang].theLine,
  });
}

/** The mark of the person on the flat map. @param {number} x @param {number} y @param {number} u @param {Parameters<typeof meDot>[0]} [state] */
const meOnPlan = (x, y, u, state) =>
  pinned(
    x,
    y,
    u,
    `<foreignObject x="-12" y="-12" width="24" height="24" style="overflow:visible"><div xmlns="http://www.w3.org/1999/xhtml" class="tt-me">${meDot(state)}</div></foreignObject>`,
  );

/**
 * The Route as it is once a Place has been skipped (OUT-9): what was walked,
 * the way round the skipped Place as the pedestrian graph has it, and the
 * rest of the line. Seen from above.
 * @param {any} data
 * @param {{ lang: Lang, theme: Theme, width: number, height: number, padding?: object, labels?: number }} options
 */
export function replanMap(data, { lang, theme, width, height, padding, labels = 4 }) {
  const again = data.recalculated;
  const skip = again.skipped.order;
  const around = [skip - 1, skip, skip + 1].map((order) => data.stops[order - 1]);
  const view = fitView(
    [
      ...around.map((s) => ({ x: s.streetX, y: s.streetY })),
      ...again.leg.points.map((/** @type {number[]} */ p) => ({ x: p[0], y: p[1] })),
    ],
    width,
    height,
    padding,
  );
  const here = positionAt(data, around[0].leaveMin + 0.6);
  const newWay = pathThrough(again.leg.points);
  const rest = routePath(data, skip + 1);
  return mapSvg(data, {
    view,
    lang,
    layers: layersOf(theme),
    labels: labels > 0 ? { max: labels, size: 10 } : undefined,
    over: ({ u }) => {
      const at = spread(
        data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
        25 * u,
      );
      const discs = data.stops
        .map((/** @type {any} */ s, /** @type {number} */ i) =>
          pinned(
            at[i].x,
            at[i].y,
            u,
            `<circle class="tt-station-shade" r="12" cy="1.5"/><circle r="11.5"/><text y="3.6" text-anchor="middle">${s.order}</text>`,
            `tt-station${s.order < skip ? ' is-done' : s.order === skip ? ' is-skipped' : ''}`,
          ),
        )
        .join('');
      return `${data.stops.map((/** @type {any} */ s) => `<use href="#m-foot-${s.order}" class="tt-foot"/>`).join('')}
        <path class="tt-line-walked" d="${routePath(data, 0, skip - 1)}"/>
        <path class="tt-line-glow" d="${newWay}"/><path class="tt-line-case" d="${newWay} ${rest}"/><path class="tt-line" d="${newWay} ${rest}"/><path class="tt-line-march" d="${newWay}"/>
        ${discs}${meOnPlan(here.x, here.y, u)}`;
    },
    label: T[lang].theLine,
  });
}

/**
 * Off the Route (OUT-12): the person stands on a street beside the line, and
 * the way back to it is drawn as a dashed line. The street is a real one:
 * the way round a Place that the pedestrian graph found; the person is put
 * some metres along it from where it leaves the line.
 * @param {any} data
 * @param {{ lang: Lang, theme: Theme, width: number, height: number, padding?: object, metres?: number, labels?: number }} options
 */
export function strayMap(data, { lang, theme, width, height, padding, metres = 120, labels = 4 }) {
  const detour = data.map.detour;
  const leg = data.map.legs[detour.skip - 1];
  const onLine = new Set(leg.points.map((/** @type {number[]} */ p) => p.join()));
  // Where the street leaves the line: the last point the two have in common.
  let fork = 0;
  while (fork + 1 < detour.points.length && onLine.has(detour.points[fork + 1].join())) fork++;
  /** @type {number[][]} */
  const back = [detour.points[fork]];
  let left = metres * data.map.units_per_metre;
  for (let i = fork + 1; i < detour.points.length && left > 0; i++) {
    const [ax, ay] = back[back.length - 1];
    const [bx, by] = detour.points[i];
    const step = Math.hypot(bx - ax, by - ay);
    if (step <= left) back.push([bx, by]);
    else back.push([ax + ((bx - ax) * left) / step, ay + ((by - ay) * left) / step]);
    left -= step;
  }
  const here = back[back.length - 1];
  const from = data.stops[detour.from - 1];
  const to = data.stops[detour.skip - 1];
  const view = fitView(
    [
      { x: from.streetX, y: from.streetY },
      { x: to.streetX, y: to.streetY },
      ...back.map(([x, y]) => ({ x, y })),
    ],
    width,
    height,
    padding,
  );
  return mapSvg(data, {
    view,
    lang,
    layers: layersOf(theme),
    labels: labels > 0 ? { max: labels, size: 10 } : undefined,
    over: (ctx) =>
      `${overlay(data, lang, ctx, { done: detour.from, marks: false, walkedLegs: detour.from })}<path class="tt-line-back" d="${pathThrough(back)}"/>${meOnPlan(here[0], here[1], ctx.u, { unsure: false })}`,
    label: T[lang].theLine,
  });
}

export {
  pathThrough,
  positionAt,
  bearingAt,
  fitView,
  mapSvg,
  pinned,
  routePath,
  routeSamples,
  spread,
};
