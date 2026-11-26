/**
 * Panes that rise over the content: a sheet, a question, a menu, a note.
 */
import { icons } from '../icons.js';
import { T } from '../strings.js';
import { action } from './controls.js';

/** @typedef {'ru' | 'en'} Lang */

/**
 * A sheet of glass. Its grabber is a control with a name: a sheet can always
 * be opened without dragging.
 * @param {string} inner @param {{ lang: Lang, top?: number, className?: string }} options
 */
export const sheet = (inner, { lang, top, className = '' }) =>
  `<section class="tt-sheet lg ${className}"${top === undefined ? '' : ` style="top:${top}px"`}>
    <button class="tt-grab" aria-label="${T[lang].say.expand}"></button>
    ${inner}
  </section>`;

/**
 * A question that waits for an answer: "Are you at…?" (OUT-4).
 * @param {{ icon?: string, title: string, lead?: string, text: string, yes: string, no: string }} question
 */
export const dialog = ({ icon = icons.question, title, lead = '', text, yes, no }) =>
  `<i class="tt-scrim"></i>
  <section class="tt-dialog lg" role="alertdialog" aria-label="${title}">
    <span class="tt-dialog-icon">${icon}</span>
    <h2>${title}</h2>
    ${lead ? `<p><b>${lead}</b></p>` : ''}
    <p>${text}</p>
    <div class="tt-dialog-actions">${action(yes)}${action(no, { kind: 'plain' })}</div>
  </section>`;

/**
 * A menu of what can be done now.
 * @param {string} name @param {({ icon: string, label: string, note?: string, is?: 'danger' | 'off' } | 'rule')[]} items
 */
export const menu = (name, items) =>
  `<section class="tt-menu lg" role="menu" aria-label="${name}">${items
    .map((item) =>
      item === 'rule'
        ? '<hr />'
        : `<button role="menuitem"${item.is ? ` class="is-${item.is}"` : ''}${item.is === 'off' ? ' aria-disabled="true"' : ''}>${item.icon}<span>${item.label}${item.note ? `<small>${item.note}</small>` : ''}</span></button>`,
    )
    .join('')}</section>`;

/**
 * A note that comes and goes by itself; what it says can be taken back.
 * @param {{ icon?: string, lead: string, rest?: string, undo?: string, style?: string }} note
 */
export const toast = ({ icon = icons.check, lead, rest = '', undo, style = '' }) =>
  `<p class="tt-toast lg" role="status"${style ? ` style="${style}"` : ''}>${icon}<span><b>${lead}</b>${rest}</span>${undo ? action(undo, { kind: 'plain' }) : ''}</p>`;

/**
 * A question that does not wait: it stands over the content and can be left
 * unanswered — "did you like the Story?" (FBK-2).
 * @param {string} text @param {string} inner the keys that answer it
 */
export const ask = (text, inner) =>
  `<section class="tt-ask lg" role="group" aria-label="${text}"><p>${text}</p>${inner}</section>`;
