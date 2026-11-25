/**
 * What the screens of the console share: their words, the shell with its
 * navigation, and how a number, a date and a sum of money are written.
 */
import { icons } from '../../system/icons.js';
import { centred, shell } from '../../system/parts/console.js';
import { state } from '../../system/parts/states.js';
import { C } from './words.js';

/**
 * @typedef {object} Ctx
 * @property {'console'} os
 * @property {'light' | 'dark' | 'sun'} theme
 * @property {'ru' | 'en'} lang
 * @property {any} data
 * @property {string} state the state the screen is drawn in
 */

/** @typedef {'ru' | 'en'} Lang */

const NBSP = ' ';
const NNBSP = ' ';

/** A whole number, its thousands apart. @param {number} n @param {Lang} lang */
export const count = (n, lang) =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'ru' ? NNBSP : ',');

/** A number with a fraction. @param {number} n @param {Lang} lang @param {number} [digits] */
export const decimal = (n, lang, digits = 1) =>
  lang === 'ru' ? n.toFixed(digits).replace('.', ',') : n.toFixed(digits);

/** A sum in US dollars. @param {number} value @param {Lang} lang @param {number} [digits] */
export const money = (value, lang, digits = 2) =>
  lang === 'ru' ? `${decimal(value, lang, digits)}${NBSP}$` : `$${value.toFixed(digits)}`;

/** A share from 0 to 1 as per cent. @param {number} share @param {Lang} lang @param {number} [digits] */
export const percent = (share, lang, digits = 0) =>
  lang === 'ru'
    ? `${decimal(share * 100, lang, digits)}${NBSP}%`
    : `${(share * 100).toFixed(digits)}%`;

/** A share as the research data writes it ("68.1 %"), as a number from 0 to 1. @param {string} text */
export const shareOf = (text) => Number.parseFloat(text) / 100;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** An ISO date, short enough for a cell. @param {string} iso @param {Lang} lang */
export function day(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number);
  return lang === 'ru'
    ? `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`
    : `${d}${NBSP}${MONTHS[m - 1]} ${y}`;
}

/** A name in the language of the screen, or as the source has it. @param {{ ru?: string | null, en?: string | null, local?: string | null }} name @param {Lang} lang */
export const nameOf = (name, lang) => name[lang] ?? name.local ?? name.ru ?? name.en ?? '';

/** The words of the console. @param {Lang} lang */
export const words = (lang) => C[lang];

/** The person at the desk. @param {any} data @param {Lang} lang @param {string} [id] */
export function who(data, lang, id = data.console.people.me) {
  const one = data.console.people.list.find((/** @type {any} */ p) => p.id === id);
  return { ...one, name: one.name[lang] };
}

/** A state that takes the place of content, in the middle of its pane. @param {Parameters<typeof state>[0]} options */
export const empty = (options) => centred(state(options));

/**
 * A page of the console in its shell.
 * @param {Ctx} ctx
 * @param {{ at: string, crumbs: string[], body: string, path: string, counts?: Record<string, number> }} page
 *   `at` is the destination of the navigation the page belongs to; `counts` replaces a count of the navigation
 */
export function frame({ theme, lang, data }, { at, crumbs, body, path, counts = {} }) {
  const c = C[lang];
  const k = data.console;
  const me = who(data, lang);
  const number = {
    queue: k.queue.items.length,
    corrections: k.corrections.items.filter((/** @type {any} */ i) => i.status === 'new').length,
    changes: k.changes.items.filter((/** @type {any} */ i) => i.group === 'waiting').length,
    ...counts,
  };
  /** @param {string} id @param {string} icon @param {string} label */
  const item = (id, icon, label) => ({
    icon,
    label,
    current: id === at,
    count: /** @type {Record<string, number>} */ (number)[id] || undefined,
  });
  return {
    address: `console.promenade.example/${path}`,
    inner: shell({
      theme,
      word: c.console,
      navName: c.navName,
      city: { label: c.city, value: k.city.name[lang] },
      nav: [
        {
          title: c.navKnowledge,
          items: [
            item('queue', icons.dossier, c.navDossiers),
            item('pronunciation', icons.speaker, c.navPronunciation),
            item('corrections', icons.flag, c.navCorrections),
            item('preparation', icons.download, c.navPreparation),
          ],
        },
        {
          title: c.navPlaces,
          items: [
            item('places', icons.pin, c.navPlacesList),
            item('changes', icons.swap, c.navChangesShort),
            item('sources', icons.book, c.navSources),
            item('venues', icons.cup, c.navVenues),
          ],
        },
        {
          title: c.navWatch,
          items: [
            item('dashboards', icons.bars, c.navDashboards),
            item('admin', icons.tune, c.navAdmin),
          ],
        },
      ],
      crumbs: [k.city.name[lang], ...crumbs],
      me: { name: me.name, note: me.email },
      role: c.roles[at === 'admin' ? 'administrator' : 'curator'],
      say: { search: c.search, hint: c.searchHint, help: c.help },
      body,
    }),
  };
}
