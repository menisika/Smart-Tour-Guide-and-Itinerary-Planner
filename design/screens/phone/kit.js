/**
 * What the phone's screens share: the words of both files, the sizes of the
 * two phones, and the few arrangements that repeat — the attribution of the
 * map, the band that says there is no network.
 */
import { SIZES } from '../../directions/shared/frames.js';
import { icons } from '../../system/icons.js';
import { banner } from '../../system/parts/states.js';
import { T } from '../../system/strings.js';
import { W } from '../words.js';

/**
 * @typedef {object} Ctx
 * @property {'ios' | 'android'} os
 * @property {'light' | 'dark' | 'sun'} theme
 * @property {'ru' | 'en'} lang
 * @property {any} data
 * @property {string} state the state the screen is drawn in
 */

/** The words of the components and of the screens. @param {'ru' | 'en'} lang */
export const words = (lang) => ({ t: T[lang], w: W[lang] });

/** @param {'ios' | 'android'} os */
export const sizeOf = (os) => SIZES[os];

/** A file of the design folder, by its path from the folder. @param {string} path */
export const asset = (path) => new URL(`../../${path}`, import.meta.url).pathname;

/** The attribution of the map. @param {string} place a position, as CSS */
export const osm = (place) => `<span class="tt-osm" style="${place}">© OpenStreetMap</span>`;

/**
 * The band that says there is no network, and the one thing that follows.
 * @param {'ru' | 'en'} lang @param {{ top: number, rest?: string }} options
 */
export const noNetwork = (lang, { top, rest = T[lang].noNetworkNote }) =>
  `<div class="tt-band" style="top:${top}px">${banner({ icon: icons.noNetwork, lead: T[lang].noNetwork, rest, is: 'warn' })}</div>`;

/** Where a band stands under the controls at the top. @param {'ios' | 'android'} os */
export const underTop = (os) => (os === 'android' ? 108 : 112);
