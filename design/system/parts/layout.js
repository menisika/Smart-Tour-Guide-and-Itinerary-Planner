/**
 * How a screen is laid out when it is not the map with a sheet over it: a
 * solid page under a bar, with a photograph or a piece of the map at its
 * head. A screen arranges these and the other parts, and draws nothing of
 * its own.
 */
import { icons } from '../icons.js';
import { T } from '../strings.js';
import { back, round } from './controls.js';

/** @typedef {'ru' | 'en'} Lang */
/** @typedef {'ios' | 'android' | 'web'} Os */

/**
 * The bar at the top of a page: the way back, where one is, and at most two
 * controls. On iOS the title stands in the middle between round controls of
 * glass; on Android it is the top app bar of Material, the title at the start.
 * @param {Os} os @param {Lang} lang
 * @param {{ title?: string, lead?: 'back' | 'close' | 'none', trailing?: string }} [options]
 */
export function bar(os, lang, { title = '', lead = 'back', trailing = '' } = {}) {
  const t = T[lang];
  const first =
    lead === 'close'
      ? round(icons.close, t.say.close)
      : lead === 'back'
        ? back(os, t.say.back)
        : '';
  return `<header class="tt-bar">${first}<p class="tt-bar-title">${title}</p>${trailing || '<span class="tt-bar-space"></span>'}</header>`;
}

/**
 * The head of a page: a photograph of a Place, or a piece of the map, with
 * the words of the page over its foot.
 * @param {{ media: string, kicker?: string, title?: string, credit?: string }} head
 */
export const hero = ({ media, kicker = '', title = '', credit = '' }) =>
  `<figure class="tt-hero">${media}<div class="tt-hero-words">${kicker ? `<p>${kicker}</p>` : ''}${title ? `<h1>${title}</h1>` : ''}</div>${credit ? `<figcaption>${credit}</figcaption>` : ''}</figure>`;

/** The photograph of a Place, to stand in a head. @param {any} stop */
export const photo = (stop) => `<img src="${stop.photo.src}" alt="" />`;

/** Who made a photograph and under which licence: said wherever one is large. @param {any} stop @param {Lang} lang */
export const credit = (stop, lang) =>
  `${T[lang].photo}: ${stop.photo.author} · ${stop.photo.licence}`;

/**
 * The words that open a page: what it is about, in the timetable's voice.
 * @param {string} title @param {string} [note]
 */
export const heading = (title, note = '') =>
  `<div class="tt-heading"><h1>${title}</h1>${note ? `<p>${note}</p>` : ''}</div>`;

/** The name of a group of controls. @param {string} text */
export const label = (text) => `<h2 class="tt-label">${text}</h2>`;

/** A few things one under another, with the same distance between them. @param {string[]} parts @param {'tight' | 'loose' | ''} [is] */
export const flow = (parts, is = '') =>
  `<div class="tt-flow${is ? ` is-${is}` : ''}">${parts.join('')}</div>`;

/** What can be scrolled: it fades at its foot, where there is more. @param {string} inner */
export const scroll = (inner) => `<div class="tt-scroll">${inner}</div>`;

/**
 * The actions at the foot of a page, where a thumb is.
 * @param {string[]} actions @param {'stack' | ''} [is] `stack` puts a quiet action under the prominent one
 */
export const foot = (actions, is = '') =>
  `<div class="tt-dock${is ? ` is-${is}` : ''}">${actions.join('')}</div>`;

/**
 * A page: solid, because it is read.
 * @param {{ bar?: string, hero?: string, heroHeight?: number, body: string, foot?: string, tabs?: string, over?: string, is?: string }} parts
 *   `over` is what rises over the page: a question, a note
 */
export function page({
  bar: top = '',
  hero: head = '',
  heroHeight = 232,
  body,
  foot: actions = '',
  tabs = '',
  over = '',
  is = '',
}) {
  const classes = [
    'tt tt-page',
    head ? 'has-hero' : '',
    actions ? 'has-foot' : '',
    tabs ? 'has-tabs' : '',
    is,
  ]
    .filter(Boolean)
    .join(' ');
  return `<div class="${classes}"${head ? ` style="--hero:${heroHeight}px"` : ''}>${head}${top}<main class="tt-page-body">${body}</main>${actions}${tabs}${over}</div>`;
}

/**
 * The head of a sheet: what the sheet is for, and the control that closes it.
 * @param {string} title @param {{ note?: string, trailing?: string }} [options]
 */
export const sheetHead = (title, { note = '', trailing = '' } = {}) =>
  `<header class="tt-sheet-head"><div><h2>${title}</h2>${note ? `<p>${note}</p>` : ''}</div>${trailing}</header>`;

/**
 * A sheet that rises over a screen and waits: the screen behind it is dimmed
 * and cannot be touched until the sheet is answered or closed.
 * @param {string} inner @param {{ lang: Lang, solid?: boolean }} options `solid` for a sheet that is read
 */
export const over = (inner, { lang, solid = false }) =>
  `<i class="tt-scrim"></i><section class="tt-over${solid ? ' is-solid' : ' lg'}" role="dialog"><button class="tt-grab" aria-label="${T[lang].say.close}"></button>${inner}</section>`;
