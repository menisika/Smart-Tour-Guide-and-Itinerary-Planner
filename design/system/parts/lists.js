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
 * @param {any} stop @param {Lang} lang
 * @param {{ first?: boolean, last?: boolean, visitMinutes: number, pinned?: boolean, problem?: string, note?: string }} options
 *   `pinned`: the Route is built around this Place (EDT-3); `problem`: a constraint this Place
 *   breaks, listed under it (EDT-1); `note` replaces the line of time, for a Custom Place
 */
export function placeRow(
  stop,
  lang,
  { first = false, last = false, visitMinutes, pinned = false, problem = '', note },
) {
  const t = T[lang];
  return `<li class="tt-place${pinned ? ' is-pinned' : ''}">
    <i>${stop.order}</i>
    ${thumb(stop, '')}
    <span class="tt-place-body"><b>${stop.name[lang]}</b><small>${pinned ? `${icons.tack}${t.pinned} · ` : ''}${note ?? `${stop.arrive} · ${t.visit(visitMinutes)}`}</small></span>
    <button aria-label="${t.moveUp}: ${stop.name[lang]}"${first ? ' disabled' : ''}>${icons.chevronUp}</button>
    <button aria-label="${t.moveDown}: ${stop.name[lang]}"${last ? ' disabled' : ''}>${icons.chevronDown}</button>
    <button aria-label="${t.remove}: ${stop.name[lang]}">${icons.trash}</button>
  </li>${problem ? `<li class="tt-place-problem" role="alert">${icons.alert}<span>${problem}</span></li>` : ''}`;
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

/**
 * How a Wish was understood (RTE-2): each row is one constraint or weight of
 * the closed set, said in words beside the words it was read from, and each
 * can be taken out before the Route is calculated.
 * @param {Lang} lang
 * @param {{ icon: string, label: string, from: string, is?: 'hard' | 'unsure', fixed?: boolean }[]} rows
 *   `hard`: a condition the Route may not break; `unsure`: read with doubt; `fixed`: not from the Wish
 */
export const reading = (lang, rows) =>
  `<ul class="tt-read">${rows
    .map(
      (r) =>
        `<li${r.is ? ` class="is-${r.is}"` : ''}>${r.icon}<span class="tt-read-body"><b>${r.label}</b><small>${r.from}</small></span>${r.fixed ? '' : `<button aria-label="${T[lang].remove}: ${r.label}">${icons.close}</button>`}</li>`,
    )
    .join('')}</ul>`;

/**
 * A list of what happened, by time: the versions of a Route (EDT-8), the
 * outcomes of Corrections, notifications.
 * @param {{ at: string, label: string, note?: string, icon?: string, media?: string, is?: 'now' | 'ok' | 'warn' | 'off', go?: boolean }[]} entries
 *   `media` is a picture of what the line is about: the photograph of a Place
 */
export const log = (entries) =>
  `<ul class="tt-log">${entries
    .map(
      (e) =>
        `<li${e.is ? ` class="is-${e.is}"` : ''}><button>${e.media ?? ''}<b>${e.at}</b><span class="tt-log-body">${e.label}${e.note ? `<small>${e.icon ?? ''}${e.note}</small>` : ''}</span>${e.go === false ? '' : icons.chevronRight}</button></li>`,
    )
    .join('')}</ul>`;

/**
 * A Route in the person's collection (EDT-6), or a past Outing (ACC-10): its
 * line on the map, what was asked for, its two times and its measures.
 * @param {{ map: string, title: string, times: string, facts: string, note?: string }} route
 */
export const saved = ({ map, title, times, facts, note = '' }) =>
  `<button class="tt-saved"><span class="tt-saved-map">${map}</span><span class="tt-saved-body"><b>${title}</b><span class="tt-saved-times">${times}</span><small>${facts}</small>${note ? `<small class="tt-saved-note">${note}</small>` : ''}</span>${icons.chevronRight}</button>`;

/**
 * A few plain statements, each with its sign: what a decision takes away,
 * what a page keeps.
 * @param {{ icon: string, text: string }[]} items
 */
export const points = (items) =>
  `<ul class="tt-points">${items.map((p) => `<li>${p.icon}<span>${p.text}</span></li>`).join('')}</ul>`;

export { format };
