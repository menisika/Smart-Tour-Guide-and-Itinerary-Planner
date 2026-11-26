/**
 * What the timetable says about a Route: its head, the verdict of the check,
 * the chart drawn to time, and progress along it.
 */
import { format } from '../../directions/shared/data.js';
import { icons } from '../icons.js';
import { T } from '../strings.js';

/** @typedef {'ru' | 'en'} Lang */

/**
 * The verdict of the check, in words. Colour and icon repeat it.
 * @param {Lang} lang
 * @param {{ budgetMinutes: number, totalMinutes: number }} route
 */
export function verdict(lang, { budgetMinutes, totalMinutes }) {
  const t = T[lang];
  const reserve = budgetMinutes - totalMinutes;
  // RTE-5 asks for a buffer; a Route that eats into it is said to be tight.
  if (reserve < 0) {
    return `<p class="tt-verdict is-stop"><i>${icons.alert}</i><b>${t.tooLong}</b><span>${t.over(-reserve)}</span></p>`;
  }
  if (reserve < 10) {
    return `<p class="tt-verdict is-warn"><i>${icons.warning}</i><b>${t.tight}</b><span>${t.reserve(reserve)}</span></p>`;
  }
  return `<p class="tt-verdict"><i>${icons.check}</i><b>${t.fits(budgetMinutes)}</b><span>${t.reserve(reserve)}</span></p>`;
}

/**
 * The head of a Route: what was asked for, its two times, its verdict, its measures.
 * @param {any} data @param {Lang} lang @param {{ route?: any }} [options] another Route of the same data, to show a verdict that warns or fails
 */
export function head(data, lang, { route = data.route } = {}) {
  const t = T[lang];
  return `<h1 class="tt-head-title">${t.title}</h1>
    <div class="tt-frame">
      <p><span>${t.out}</span><b>${route.start}</b></p>
      <p class="tt-span"><span>${format.duration(route.totalMinutes, lang)}</span><i></i></p>
      <p><span>${t.back}</span><b>${route.finish}</b></p>
    </div>
    ${verdict(lang, route)}
    <ul class="tt-facts">
      <li>${icons.pin}${t.places(route.stopCount)}</li>
      <li>${icons.walk}${format.distance(route.walkingMetres, lang)}</li>
      <li>${icons.eye}${t.outside}</li>
    </ul>`;
}

/** The thumbnail of a Place: its photograph, or the sign of its kind on a tile of the map. @param {any} stop @param {string} className */
export const thumb = (stop, className) =>
  stop.photo
    ? `<img class="${className}" src="${stop.photo.src}" alt="" loading="lazy" />`
    : `<span class="${className} tt-thumb-plan">${icons[/** @type {keyof typeof icons} */ (stop.kind)] ?? icons.building}</span>`;

/**
 * The chart: every minute of the Outing takes the same height, so that a
 * glance down it is a glance along the afternoon.
 * @param {any} data @param {Lang} lang
 * @param {{ scale: number, minute?: number, compact?: boolean, until?: number, selected?: number, stops?: any[], route?: any, skipped?: any, ends?: boolean }} options
 *   `ends: false` leaves out the start and the finish: a window into the middle of an Outing;
 *   `skipped` is a Place that was skipped: it takes no time, so it is not a row, and is named
 *   in the leg that goes round it
 */
export function chart(data, lang, options) {
  const { scale, minute, compact = false, selected, skipped, ends = true } = options;
  const route = options.route ?? data.route;
  const stops = options.stops ?? data.stops;
  const until = options.until ?? route.totalMinutes;
  const t = T[lang];
  const y = (/** @type {number} */ m) => Math.round(m * scale);
  const total = route.totalMinutes;
  const top = 22;
  let html = '';
  html += `<i class="tt-spine" style="top:${top}px;height:${y(Math.min(until, total))}px"></i>`;
  if (minute !== undefined) {
    html += `<i class="tt-spine is-done" style="top:${top}px;height:${y(Math.min(minute, total))}px"></i>`;
  }
  if (ends)
    html += `<div class="tt-row tt-row-end" role="listitem" style="top:${top - 19}px"><b>${route.start}</b><i class="tt-square">${icons.station}</i><span class="tt-row-name">${route.startName[lang]}<small>${t.departure}</small></span></div>`;
  let leave = 0;
  for (const s of stops) {
    if (s.arriveMin > until) break;
    const legTop = y(leave) + top;
    const legHeight = y(s.arriveMin) - y(leave);
    // The leg that goes round a skipped Place names it under its own measure.
    const round = skipped && s.order === skipped.order + 1 && legHeight >= 44;
    if (legHeight >= (compact ? 22 : 14)) {
      html += `<span class="tt-leg" style="top:${legTop - (round ? 9 : 0)}px;height:${legHeight}px">${icons.walk}${format.duration(s.legMinutes, lang)}${compact ? '' : ` · ${format.distance(s.legMetres, lang)}`}</span>`;
    }
    if (round) {
      html += `<span class="tt-skipnote" style="top:${legTop + Math.round(legHeight / 2) + 1}px"><i>${skipped.order}</i><s>${skipped.name[lang]}</s> · ${t.skipped}</span>`;
    }
    const state =
      minute === undefined
        ? s.order === selected
          ? ' is-current'
          : ''
        : s.leaveMin <= minute
          ? ' is-done'
          : s.arriveMin <= minute
            ? ' is-current'
            : '';
    html += `<div class="tt-row tt-stop${state}" role="listitem" style="top:${y(s.arriveMin) + top}px;height:${y(s.leaveMin) - y(s.arriveMin)}px">
      <b>${s.arrive}</b>
      <i class="tt-dwell"><span>${s.order}</span></i>
      <span class="tt-row-body"><span class="tt-row-name">${s.name[lang]}</span>${compact ? '' : `<span class="tt-row-why">${s.why[lang]}</span>`}</span>
      ${compact ? '' : thumb(s, 'tt-row-photo')}
    </div>`;
    leave = s.leaveMin;
  }
  if (ends && until >= total) {
    const legHeight = y(total) - y(leave);
    if (legHeight >= (compact ? 22 : 14)) {
      html += `<span class="tt-leg" style="top:${y(leave) + top}px;height:${legHeight}px">${icons.walk}${format.duration(route.backMinutes, lang)}</span>`;
    }
    html += `<div class="tt-row tt-row-end" role="listitem" style="top:${y(total) + top + 1}px"><b>${route.finish}</b><i class="tt-square">${icons.station}</i><span class="tt-row-name">${route.startName[lang]}<small>${t.arrival}</small></span></div>`;
  }
  const height = y(Math.min(until, total)) + top + 26;
  return `<div class="tt-chart${compact ? ' is-compact' : ''}" style="height:${height}px" role="list" aria-label="${t.theLine}">${html}</div>`;
}

/**
 * The whole Outing as a strip to scale: stops as dots, "now" as a light.
 * @param {any} data @param {number} minute
 */
export function strip(data, minute) {
  const x = (/** @type {number} */ m) => `${((m / data.route.totalMinutes) * 100).toFixed(2)}%`;
  const dots = data.stops
    .map((/** @type {any} */ s) => {
      const state = s.leaveMin <= minute ? 'is-done' : s.arriveMin <= minute ? 'is-current' : '';
      return `<i class="tt-strip-dot ${state}" style="left:${x(s.arriveMin + 4)}"></i>`;
    })
    .join('');
  const done = data.stops.filter((/** @type {any} */ s) => s.leaveMin <= minute).length;
  return `<div class="tt-strip" role="img" aria-label="${done} / ${data.stops.length}, ${data.route.start} – ${data.route.finish}">
      <span>${data.route.start}</span>
      <div class="tt-strip-line"><i class="tt-strip-done" style="width:${x(minute)}"></i>${dots}<i class="tt-strip-now" style="left:${x(minute)}"></i></div>
      <span>${data.route.finish}</span>
    </div>`;
}

/**
 * The line of status: a lamp, a word, and what follows from it.
 * @param {Lang} lang
 * @param {{ kind?: 'ok' | 'warn' | 'stop' | 'held', lead: string, rest?: string }} status
 */
export const status = (lang, { kind = 'ok', lead, rest = '' }) =>
  `<p class="tt-status${kind === 'ok' ? '' : ` is-${kind}`}"><i class="tt-lamp"></i><b>${lead}</b>${rest ? `<span>${rest}</span>` : ''}</p>`;

/**
 * Whether one is on time, and under it the Outing as a strip: progress along
 * the Route, always in sight (OUT-18).
 * @param {any} data @param {Lang} lang @param {number} minute
 * @param {Parameters<typeof status>[1]} [say] another status than "on time"
 */
export function board(data, lang, minute, say) {
  const t = T[lang];
  return `<div class="tt-board lg">
    ${status(lang, say ?? { lead: t.onTime, rest: t.finishAt(data.route.finish) })}
    ${strip(data, minute)}
  </div>`;
}

/** The two actions that float over everything, where a thumb is. @param {any} data @param {Lang} lang */
export const dock = (data, lang) => `<div class="tt-dock">
    <button class="tt-action is-second lg">${icons.download}<span><b>${T[lang].pack}</b><small>${data.route.packMegabytes}${format.NBSP}${T[lang].megabytes}</small></span></button>
    <button class="tt-action lg lg-tint">${icons.play}<span>${T[lang].start}</span></button>
  </div>`;

/**
 * One of the Routes offered (RTE-7): its character in a word, why it is
 * that, its two times, its measures, and its Places in order as photographs.
 * It is one of several: the chosen one carries a tick as well as a ring.
 * @param {Lang} lang
 * @param {{ name: string, why: string, route: any, stops: any[], chosen: boolean, reserve?: boolean }} option
 */
export function variant(lang, { name, why, route, stops, chosen }) {
  const t = T[lang];
  const shown = stops.slice(0, 7);
  return `<button class="tt-variant" role="radio" aria-checked="${chosen}">
    <span class="tt-variant-head"><b>${name}</b><span class="tt-variant-times">${route.start} — ${route.finish}</span></span>
    <span class="tt-variant-why">${why}</span>
    <span class="tt-variant-foot"><span class="tt-variant-thumbs">${shown.map((s) => thumb(s, '')).join('')}${stops.length > shown.length ? `<i>+${stops.length - shown.length}</i>` : ''}</span><span class="tt-variant-facts">${t.places(route.stopCount)} · ${format.distance(route.walkingMetres, lang)}<br />${t.reserve(route.reserveMinutes)}</span></span>
    <span class="tt-option-mark">${icons.check}</span>
  </button>`;
}

/** @param {string} name what is being chosen @param {string[]} options the markup of each */
export const variants = (name, options) =>
  `<div class="tt-variants" role="radiogroup" aria-label="${name}">${options.join('')}</div>`;

/**
 * A few measures side by side, each a number in the timetable's numerals
 * over its name.
 * @param {{ value: string, label: string }[]} items
 */
export const figures = (items) =>
  `<dl class="tt-figures">${items.map((f) => `<div><dt>${f.label}</dt><dd>${f.value}</dd></div>`).join('')}</dl>`;

/**
 * The Place ahead, for the way between two Places (OUT-2): how far, how
 * long, and whether one gets there in time.
 * @param {Lang} lang
 * @param {{ stop: any, note: string, is?: 'warn' | 'stop', lead?: string, metres?: number, minutes?: number }} options
 */
export function ahead(
  lang,
  { stop, note, is, lead, metres = stop.legMetres, minutes = stop.legMinutes },
) {
  const t = T[lang];
  return `<section class="tt-ahead lg${is ? ` is-${is}` : ''}">
    <div class="tt-ahead-top"><i>${stop.order}</i><span class="tt-ahead-body"><small>${lead ?? t.next} · ${stop.arrive}</small><b>${stop.name[lang]}</b></span>${thumb(stop, 'tt-ahead-photo')}</div>
    <p class="tt-ahead-far"><b>${format.distance(metres, lang)}</b><span>${is ? icons.warning : ''}${format.duration(minutes, lang)} · ${note}</span></p>
  </section>`;
}
