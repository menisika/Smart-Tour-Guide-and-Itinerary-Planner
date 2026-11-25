/**
 * Draws the map of the mockups from design/data/map.json.
 *
 * The geometry is put into the document once, as shared definitions; every
 * map on a page is a small SVG that refers to it and brings its own view,
 * labels and markers. How a layer looks is decided by the style sheet of a
 * direction, through the classes named here. A treatment may use only what a
 * MapLibre style can express later (ADR-0008): fills, fill patterns, lines
 * with widths, casings and dashes, symbols, text along a line.
 */

const LAYERS = [
  'water',
  'green',
  'buildings',
  'rail',
  'rail_side',
  'roads_major',
  'roads_mid',
  'roads_minor',
  'paths',
];

/** @type {{ labels: { points: [number, number][], length: number, mid: [number, number] }[] } | undefined} */
let installed;
let serial = 0;

/** @param {string} d a path written as "Mx yl dx dy…" @returns {[number, number][]} */
function pointsOf(d) {
  const numbers = d.match(/-?\d+/g)?.map(Number) ?? [];
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
}

/** @param {[number, number][]} points */
function lengthOf(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++)
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return length;
}

/** @param {[number, number][]} points @param {number} fraction 0…1 @returns {{ x: number, y: number, angle: number }} */
export function pointAlong(points, fraction) {
  const target = lengthOf(points) * Math.min(1, Math.max(0, fraction));
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const step = Math.hypot(bx - ax, by - ay);
    if (walked + step >= target && step > 0) {
      const t = (target - walked) / step;
      return {
        x: ax + (bx - ax) * t,
        y: ay + (by - ay) * t,
        angle: (Math.atan2(by - ay, bx - ax) * 180) / Math.PI,
      };
    }
    walked += step;
  }
  const last = points[points.length - 1];
  return { x: last[0], y: last[1], angle: 0 };
}

/** @param {[number, number][]} points */
export const pathThrough = (points) =>
  points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join('');

/** Puts the shared geometry into the document. @param {any} map */
export function installMap(map) {
  if (installed) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  const defs = document.createElementNS(ns, 'defs');
  /** @param {string} id @param {string} d */
  const add = (id, d) => {
    const path = document.createElementNS(ns, 'path');
    path.id = id;
    path.setAttribute('d', d);
    defs.append(path);
  };
  for (const layer of LAYERS) add(`m-${layer}`, map.layers[layer]);
  map.labels.forEach((/** @type {any} */ label, /** @type {number} */ i) =>
    add(`m-label-${i}`, label.d),
  );
  map.stops.forEach((/** @type {any} */ stop) => add(`m-foot-${stop.order}`, stop.footprint));
  svg.append(defs);
  document.body.prepend(svg);
  installed = {
    labels: map.labels.map((/** @type {any} */ label) => {
      const points = pointsOf(label.d);
      if (points.length < 2) return { points, length: 0, mid: [NaN, NaN] };
      const mid = pointAlong(points, 0.5);
      return { points, length: lengthOf(points), mid: [mid.x, mid.y] };
    }),
  };
}

/**
 * The view that shows the given points with a margin, in the proportions of
 * the box it is drawn into.
 * @param {{ x: number, y: number }[]} points
 * @param {number} pxWidth @param {number} pxHeight
 * @param {{ top?: number, right?: number, bottom?: number, left?: number }} [padding] in pixels
 */
export function fitView(points, pxWidth, pxHeight, padding = {}) {
  const { top = 24, right = 24, bottom = 24, left = 24 } = padding;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  // Map units per pixel: the larger of what each axis needs.
  const u = Math.max(
    (maxX - minX || 1) / (pxWidth - left - right),
    (maxY - minY || 1) / (pxHeight - top - bottom),
  );
  const cx = (minX + maxX) / 2 + ((right - left) / 2) * u;
  const cy = (minY + maxY) / 2 + ((bottom - top) / 2) * u;
  return {
    x: cx - (pxWidth * u) / 2,
    y: cy - (pxHeight * u) / 2,
    w: pxWidth * u,
    h: pxHeight * u,
    u,
  };
}

/**
 * @param {any} data the loaded data
 * @param {object} options
 * @param {{ x: number, y: number, w: number, h: number, u: number }} options.view
 * @param {string[]} options.layers which layers to draw, bottom first
 * @param {'ru' | 'en'} options.lang
 * @param {{ max: number, size: number, ranks?: number[], upper?: boolean, clearOf?: [number, number][] }} [options.labels] street names along the streets; `clearOf` lists points a name may not sit on
 * @param {(ctx: { u: number, id: string, view: { x: number, y: number, w: number, h: number } }) => string} [options.defs]
 * @param {(ctx: { u: number, id: string, view: { x: number, y: number, w: number, h: number } }) => string} [options.under] drawn above the base, under the labels
 * @param {(ctx: { u: number, id: string, view: { x: number, y: number, w: number, h: number } }) => string} [options.over] drawn last
 * @param {string} [options.label] what a screen reader is told
 */
export function mapSvg(data, options) {
  if (!installed) throw new Error('installMap has not been called');
  const { view, layers, lang } = options;
  const id = `map${++serial}`;
  const ctx = { u: view.u, id, view };
  // "roads_major:casing" draws the layer once more under another class, which
  // is how a line gets a casing or a second colour.
  const base = layers
    .map((layer) => {
      const [name, pass] = layer.split(':');
      return `<use href="#m-${name}" class="m-${name}${pass ? `-${pass}` : ''}"/>`;
    })
    .join('');
  let labels = '';
  if (options.labels) {
    const { max, size, ranks = [1, 2, 3], upper = false, clearOf = [] } = options.labels;
    const clearance = 15 * view.u;
    /** @type {[number, number][]} */
    const placed = [];
    const gap = 46 * view.u;
    data.map.labels.forEach((/** @type {any} */ label, /** @type {number} */ i) => {
      if (placed.length >= max || !ranks.includes(label.rank)) return;
      const geometry = installed?.labels[i];
      if (!geometry) return;
      const [mx, my] = geometry.mid;
      const inset = 30 * view.u;
      if (
        mx < view.x + inset ||
        mx > view.x + view.w - inset ||
        my < view.y + inset ||
        my > view.y + view.h - inset
      )
        return;
      const text = upper ? label.name[lang].toUpperCase() : label.name[lang];
      // The name has to fit on the piece of street that carries it.
      if (text.length * size * 0.62 * view.u > geometry.length) return;
      if (placed.some(([px, py]) => Math.hypot(px - mx, py - my) < gap)) return;
      // A name under the Route would be cut by it: every point of the piece
      // of street the text covers has to stay clear.
      const half = Math.min(0.5, (text.length * size * 0.31 * view.u) / geometry.length);
      const covered = [0.5 - half, 0.5 - half / 2, 0.5, 0.5 + half / 2, 0.5 + half].map((f) =>
        pointAlong(geometry.points, f),
      );
      if (
        clearOf.some(([cx, cy]) => covered.some((p) => Math.hypot(p.x - cx, p.y - cy) < clearance))
      )
        return;
      placed.push([mx, my]);
      labels += `<text class="m-label m-label-${label.rank}" dy="0.34em"><textPath href="#m-label-${i}" startOffset="50%" text-anchor="middle">${text}</textPath></text>`;
    });
  }
  return `<svg class="map" viewBox="${view.x} ${view.y} ${view.w} ${view.h}" preserveAspectRatio="xMidYMid slice" style="--u:${view.u}" role="img" aria-label="${options.label ?? ''}">
    <defs>${options.defs?.(ctx) ?? ''}</defs>
    <rect class="m-ground" x="${view.x}" y="${view.y}" width="${view.w}" height="${view.h}"/>
    ${base}
    ${options.under?.(ctx) ?? ''}
    <g class="m-labels" style="font-size:${options.labels ? options.labels.size * view.u : 0}px">${labels}</g>
    ${options.over?.(ctx) ?? ''}
  </svg>`;
}

/**
 * The walked line. Legs are numbered from zero: leg 0 runs from the start to
 * the first stop, the last one from the last stop back.
 * @param {any} data @param {number} from first leg @param {number} to one past the last leg
 */
export function routePath(data, from = 0, to = data.map.legs.length) {
  /** @type {[number, number][]} */
  const points = [];
  for (let i = from; i < to; i++) {
    const leg = data.map.legs[i].points;
    points.push(...(points.length === 0 ? leg : leg.slice(1)));
  }
  return pathThrough(points);
}

/**
 * Where a person who keeps to the plan is at a given minute of the Outing.
 * @param {any} data @param {number} minute
 */
export function positionAt(data, minute) {
  let leave = 0;
  for (let i = 0; i < data.stops.length; i++) {
    const stop = data.stops[i];
    if (minute < stop.arriveMin)
      return pointAlong(data.map.legs[i].points, (minute - leave) / (stop.arriveMin - leave));
    if (minute <= stop.leaveMin)
      return { x: stop.streetX, y: stop.streetY, angle: 0, atStop: stop.order };
    leave = stop.leaveMin;
  }
  const back = data.map.legs[data.stops.length].points;
  return pointAlong(back, (minute - leave) / (data.route.totalMinutes - leave));
}

/**
 * A group placed at a point of the map and drawn in pixels, whatever the view.
 * @param {number} x @param {number} y @param {number} u @param {string} inner @param {string} [className]
 */
export const pinned = (x, y, u, inner, className = '') =>
  `<g class="${className}" transform="translate(${x} ${y}) scale(${u})">${inner}</g>`;

/**
 * Moves markers that would overlap apart, as little as needed.
 * @param {{ x: number, y: number }[]} points in map units
 * @param {number} minDistance in map units
 * @returns {{ x: number, y: number }[]}
 */
export function spread(points, minDistance) {
  const moved = points.map((p) => ({ x: p.x, y: p.y }));
  for (let pass = 0; pass < 40; pass++) {
    let touched = false;
    for (let i = 0; i < moved.length; i++) {
      for (let j = i + 1; j < moved.length; j++) {
        const dx = moved[j].x - moved[i].x;
        const dy = moved[j].y - moved[i].y;
        const distance = Math.hypot(dx, dy) || 0.001;
        if (distance >= minDistance) continue;
        const push = (minDistance - distance) / 2;
        moved[i].x -= (dx / distance) * push;
        moved[i].y -= (dy / distance) * push;
        moved[j].x += (dx / distance) * push;
        moved[j].y += (dy / distance) * push;
        touched = true;
      }
    }
    if (!touched) break;
  }
  return moved;
}

/**
 * Points along the walked line, one every few metres: what labels keep clear of.
 * @param {any} data @param {number} everyUnits
 * @returns {[number, number][]}
 */
export function routeSamples(data, everyUnits = 30) {
  /** @type {[number, number][]} */
  const samples = [];
  for (const leg of data.map.legs) {
    const steps = Math.max(1, Math.round(lengthOf(leg.points) / everyUnits));
    for (let i = 0; i <= steps; i++) {
      const p = pointAlong(leg.points, i / steps);
      samples.push([p.x, p.y]);
    }
  }
  return samples;
}

/**
 * The map seen at an angle with the direction of travel up, as navigation
 * shows it. The ground is the same drawing, turned and tilted by the browser;
 * what stands on it is placed by the same arithmetic, so that it stays upright
 * and shrinks with distance. A MapLibre style does this with `pitch`,
 * `bearing` and extruded buildings (ADR-0008).
 *
 * @param {any} data
 * @param {object} options
 * @param {number} options.width of the place for the map, in pixels
 * @param {number} options.height of it
 * @param {'ru' | 'en'} options.lang
 * @param {string[]} options.layers the flat layers, bottom first
 * @param {{ x: number, y: number }} options.at where the person stands, in map units
 * @param {number} options.bearing direction of travel, degrees clockwise from north
 * @param {number} [options.u] map units per pixel at the person
 * @param {number} [options.near] how far above the bottom edge the person stands, in pixels
 * @param {number} [options.pitch] degrees
 * @param {number[]} [options.walls] heights at which buildings are drawn again, in pixels; the last is the roof
 * @param {(ctx: { u: number }) => string} [options.over] drawn on the ground, above the buildings
 * @param {{ x: number, y: number, html: string, className?: string }[]} [options.standing] what stands upright
 * @param {string} [options.label]
 */
export function pitchedMap(data, options) {
  if (!installed) throw new Error('installMap has not been called');
  const {
    width,
    height,
    layers,
    at,
    bearing,
    u = 1.7,
    near = 150,
    pitch = 50,
    walls = [],
    standing = [],
  } = options;
  const perspective = 1000;
  const sin = Math.sin((pitch * Math.PI) / 180);
  const cos = Math.cos((pitch * Math.PI) / 180);
  // The size the drawing needs so that, once tilted, it fills the place given to it.
  const boxHeight = Math.round((height * perspective) / (cos * perspective - height * sin));
  const farScale = perspective / (perspective + sin * boxHeight);
  const boxWidth = Math.round((width / farScale) * 1.06);
  const view = {
    x: at.x - (boxWidth * u) / 2,
    y: at.y - (boxHeight - near) * u,
    w: boxWidth * u,
    h: boxHeight * u,
    u,
  };
  const turn = `rotate(${-bearing} ${at.x} ${at.y})`;
  const flat = layers
    .map((layer) => {
      const [name, pass] = layer.split(':');
      return `<use href="#m-${name}" class="m-${name}${pass ? `-${pass}` : ''}"/>`;
    })
    .join('');
  const built = walls
    .map(
      (lift, i) =>
        `<g transform="translate(0 ${-lift * u}) ${turn}"><use href="#m-buildings" class="${i === walls.length - 1 ? 'm-roof' : 'm-wall'}"/></g>`,
    )
    .join('');

  /** From the ground to the screen. @param {number} gx @param {number} gy */
  const project = (gx, gy) => {
    const angle = (-bearing * Math.PI) / 180;
    const rx = at.x + (gx - at.x) * Math.cos(angle) - (gy - at.y) * Math.sin(angle);
    const ry = at.y + (gx - at.x) * Math.sin(angle) + (gy - at.y) * Math.cos(angle);
    const dx = (rx - view.x) / u - boxWidth / 2;
    const dy = (ry - view.y) / u - boxHeight;
    const scale = perspective / (perspective - dy * sin);
    return { x: width / 2 + dx * scale, y: height + dy * cos * scale, scale };
  };

  const upright = standing
    .map((item) => {
      const p = project(item.x, item.y);
      if (p.x < -20 || p.x > width + 20 || p.y < 0 || p.y > height + 10) return '';
      return `<div class="map3d-pin ${item.className ?? ''}" style="left:${p.x.toFixed(1)}px;top:${p.y.toFixed(1)}px;--far:${p.scale.toFixed(3)}">${item.html}</div>`;
    })
    .join('');

  return `<div class="map3d" style="height:${height}px" role="img" aria-label="${options.label ?? ''}">
    <svg class="map map3d-ground" viewBox="${view.x} ${view.y} ${view.w} ${view.h}" preserveAspectRatio="none"
      style="--u:${u};left:${(width - boxWidth) / 2}px;top:${height - boxHeight}px;width:${boxWidth}px;height:${boxHeight}px;transform:perspective(${perspective}px) rotateX(${pitch}deg)">
      <rect class="m-ground" x="${view.x - view.w}" y="${view.y - view.h}" width="${view.w * 3}" height="${view.h * 3}"/>
      <g transform="${turn}">${flat}</g>
      ${built}
      <g transform="${turn}">${options.over?.({ u }) ?? ''}</g>
    </svg>
    <div class="map3d-haze"></div>
    ${upright}
  </div>`;
}

/**
 * The direction of travel at a minute of the plan: towards a point a little
 * further along the walked line. Degrees clockwise from north.
 * @param {any} data @param {number} minute
 */
export function bearingAt(data, minute) {
  const here = positionAt(data, minute);
  const ahead = positionAt(data, Math.min(data.route.totalMinutes, minute + 1.2));
  if (Math.hypot(ahead.x - here.x, ahead.y - here.y) < 1) return 0;
  return (Math.atan2(ahead.x - here.x, -(ahead.y - here.y)) * 180) / Math.PI;
}
