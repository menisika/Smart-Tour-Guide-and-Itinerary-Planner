/**
 * Controls: what a person touches. Each function returns the markup of one
 * control; a control that is only an icon is given its name, because a screen
 * reader has nothing else to say.
 */
import { icons, platformIcon } from '../icons.js';

/** @typedef {'ios' | 'android' | 'web'} Os */

/**
 * A round control over the map.
 * @param {string} icon the markup of an icon @param {string} name what a screen reader says
 * @param {{ glass?: 'clear' | 'regular', is?: string }} [options]
 */
export const round = (icon, name, { glass = 'clear', is = '' } = {}) =>
  `<button class="tt-round lg${glass === 'clear' ? ' lg-clear' : ''}${is ? ` ${is}` : ''}" aria-label="${name}">${icon}</button>`;

/** Round controls joined into one capsule. @param {[string, string][]} items icon and name */
export const group = (items) =>
  `<span class="tt-group lg lg-clear">${items.map(([icon, name]) => `<button aria-label="${name}">${icon}</button>`).join('')}</span>`;

/** A pill of words among the round controls. @param {string} lead @param {string} rest */
export const titlePill = (lead, rest) =>
  `<p class="tt-title lg lg-clear"><b>${lead}</b><span>${rest}</span></p>`;

/** The back control of the system the screen is on. @param {Os} os @param {string} name */
export const back = (os, name) => round(platformIcon('back', os), name);

/**
 * An action.
 * @param {string} label
 * @param {{ icon?: string, kind?: 'main' | 'second' | 'danger' | 'plain' | 'plain-danger', value?: string, state?: 'pressed' | 'disabled' | 'busy' | 'focused' }} [options]
 */
export function action(label, { icon = '', kind = 'main', value, state } = {}) {
  const classes = {
    main: 'tt-action lg lg-tint',
    second: 'tt-action is-second lg',
    danger: 'tt-action is-danger',
    plain: 'tt-action is-plain',
    'plain-danger': 'tt-action is-plain is-danger',
  }[kind];
  const is = state === 'pressed' ? ' is-pressed' : state === 'focused' ? ' is-focused' : '';
  const lead = state === 'busy' ? '<i class="tt-spinner"></i>' : icon;
  const words =
    value === undefined
      ? `<span>${label}</span>`
      : `<span><b>${label}</b><small>${value}</small></span>`;
  return `<button class="${classes}${is}"${state === 'disabled' ? ' disabled' : ''}${state === 'busy' ? ' aria-busy="true"' : ''}>${lead}${words}</button>`;
}

/** A chip that is on or off; "on" is said by a tick as well as by its fill. @param {string} label @param {boolean} on */
export const chip = (label, on) =>
  `<button class="tt-chip" aria-pressed="${on}"><span>${on ? icons.check : ''}${label}</span></button>`;

/** @param {[string, boolean][]} items */
export const chips = (items) =>
  `<div class="tt-chips">${items.map(([label, on]) => chip(label, on)).join('')}</div>`;

/**
 * A choice of a few, all in sight.
 * @param {string} name what is being chosen @param {{ label: string, icon?: string }[]} items @param {number} chosen
 */
export const segments = (name, items, chosen) =>
  `<div class="tt-seg" role="radiogroup" aria-label="${name}">${items
    .map(
      (item, i) =>
        `<button role="radio" aria-checked="${i === chosen}">${icons.check.replace('class="icon"', 'class="icon tt-seg-tick"')}${item.icon ?? ''}<span>${item.label}</span></button>`,
    )
    .join('')}</div>`;

/** A switch: the whole row is the control. @param {string} label @param {boolean} on @param {string} [note] */
export const toggle = (label, on, note) =>
  `<button class="tt-switch" role="switch" aria-checked="${on}"><span class="tt-switch-name">${label}${note ? `<small>${note}</small>` : ''}</span><i class="tt-switch-track"></i></button>`;

/**
 * A field.
 * @param {{ name: string, value?: string, hint?: string, note?: string, state?: 'empty' | 'filled' | 'focused' | 'wrong', icon?: string }} field
 */
export function field({ name, value = '', hint = '', note = '', state = 'filled', icon = '' }) {
  const shown = state === 'empty' || state === 'wrong' ? hint : value;
  const is = { empty: ' is-empty', filled: '', focused: ' is-active', wrong: ' is-empty is-wrong' }[
    state
  ];
  return `<label class="tt-field${is}">
    <span class="tt-field-name">${name}</span>
    <span class="tt-field-well" role="textbox" tabindex="0" aria-label="${name}"${state === 'wrong' ? ' aria-invalid="true"' : ''}><span>${shown}</span>${icon}</span>
    ${note ? `<span class="tt-field-note"${state === 'wrong' ? ' role="alert"' : ''}>${state === 'wrong' ? icons.alert : ''}${note}</span>` : ''}
  </label>`;
}

/**
 * A number that is stepped: two keys, never a wheel or a drag alone.
 * @param {{ name: string, note?: string, value: string, less: string, more: string }} stepper
 */
export const stepper = ({ name, note, value, less, more }) =>
  `<div class="tt-stepper" role="group" aria-label="${name}">
    <span class="tt-stepper-name">${name}${note ? `<small>${note}</small>` : ''}</span>
    <button aria-label="${less}">${icons.minus}</button>
    <output>${value}</output>
    <button aria-label="${more}">${icons.plus}</button>
  </div>`;

/** One of several, as rows. @param {string} name @param {{ label: string, note?: string }[]} items @param {number} chosen */
export const options = (name, items, chosen) =>
  `<div role="radiogroup" aria-label="${name}">${items
    .map(
      (item, i) =>
        `<button class="tt-option" role="radio" aria-checked="${i === chosen}"><span class="tt-option-name">${item.label}${item.note ? `<small>${item.note}</small>` : ''}</span><span class="tt-option-mark">${icons.check}</span></button>`,
    )
    .join('')}</div>`;
