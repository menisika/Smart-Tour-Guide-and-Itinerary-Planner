/**
 * Lists: rows of settings, the Places of a Route being edited, the journal of
 * what waits for a network.
 */
import { format } from '../../directions/shared/data.js';
import { icons } from '../icons.js';
import { T } from '../strings.js';
import { thumb } from './route.js';

/** @typedef {'ru' | 'en'} Lang */

/**
 * A row.
 * @param {{ icon?: string, label: string, note?: string, value?: string, off?: string }} row
 *   `off` is the reason the row cannot be used now; it is shown, never hidden (OUT-15)
 */
export const item = ({ icon = '', label, note, value, off }) =>
  `<button class="tt-item${off ? ' is-off' : ''}"${off ? ' aria-disabled="true"' : ''}>${icon}<span class="tt-item-body">${label}${note ? `<small>${note}</small>` : ''}</span>${off ? `<span class="tt-item-value">${icons.noNetwork}${off}</span>` : `${value ? `<span class="tt-item-value">${value}</span>` : ''}${icons.chevronRight.replace('class="icon"', 'class="icon tt-item-go"')}`}</button>`;

/** A group of rows under a title. @param {string} title @param {string[]} rows */
export const list = (title, rows) =>
  `<section><h2 class="tt-list-title">${title}</h2><div class="tt-list">${rows.join('')}</div></section>`;

/**
 * A Place of a Route being edited. It can be moved by dragging, and by the
 * two keys that do the same (WCAG 2.2, criterion 2.5.7).
 * @param {any} stop @param {Lang} lang @param {{ first?: boolean, last?: boolean, visitMinutes: number }} options
 */
export function placeRow(stop, lang, { first = false, last = false, visitMinutes }) {
  const t = T[lang];
  return `<li class="tt-place">
    <i>${stop.order}</i>
    ${thumb(stop, '')}
    <span class="tt-place-body"><b>${stop.name[lang]}</b><small>${stop.arrive} · ${t.visit(visitMinutes)}</small></span>
    <button aria-label="${t.moveUp}: ${stop.name[lang]}"${first ? ' disabled' : ''}>${icons.chevronUp}</button>
    <button aria-label="${t.moveDown}: ${stop.name[lang]}"${last ? ' disabled' : ''}>${icons.chevronDown}</button>
    <button aria-label="${t.remove}: ${stop.name[lang]}">${icons.trash}</button>
  </li>`;
}

/**
 * The journal: what was done without a network and waits to be sent (OUT-16).
 * @param {Lang} lang @param {{ label: string, at: string, sent?: boolean }[]} entries
 */
export const journal = (lang, entries) =>
  `<ul class="tt-journal" aria-label="${T[lang].journal}">${entries
    .map(
      (e) =>
        `<li${e.sent ? ' class="is-sent"' : ''}><b>${e.at}</b><span>${e.label}</span><small>${e.sent ? icons.check : icons.sync}${e.sent ? T[lang].sent : T[lang].waiting}</small></li>`,
    )
    .join('')}</ul>`;

export { format };
