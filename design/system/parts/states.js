/**
 * The states every screen needs: being made, nothing yet, no network,
 * unavailable, failed. Each says what is happening and what can be done.
 */
import { icons } from '../icons.js';
import { T } from '../strings.js';

/** @typedef {'ru' | 'en'} Lang */

/**
 * A state that takes the place of content.
 * @param {{ icon: string, title: string, text?: string, is?: 'error' | 'off', actions?: string, extra?: string }} state
 */
export const state = ({ icon, title, text = '', is, actions = '', extra = '' }) =>
  `<section class="tt-state${is ? ` is-${is}` : ''}"${is === 'error' ? ' role="alert"' : ''}>
    <span class="tt-state-icon">${icon}</span>
    <h2>${title}</h2>
    ${text ? `<p>${text}</p>` : ''}
    ${extra}
    ${actions ? `<div class="tt-state-actions">${actions}</div>` : ''}
  </section>`;

/** The steps of something being made, said one by one. @param {string[]} labels @param {number} now the step under way */
export const steps = (labels, now) =>
  `<ol class="tt-steps">${labels
    .map((label, i) =>
      i < now
        ? `<li class="is-done"><i>${icons.check}</i>${label}</li>`
        : i === now
          ? `<li class="is-now" aria-current="step"><i><span class="tt-spinner"></span></i>${label}</li>`
          : `<li><i></i>${label}</li>`,
    )
    .join('')}</ol>`;

/** The shapes of a chart not yet there. */
export const skeleton = () => '<div class="tt-skel" aria-hidden="true"><i></i><i></i><i></i></div>';

/**
 * A band that stays while something is so: there is no network, the battery
 * will not last — or, in the colour of "on time", something has gone through.
 * @param {{ icon: string, lead: string, rest: string, is: 'warn' | 'stop' | 'ok' }} band
 */
export const banner = ({ icon, lead, rest, is }) =>
  `<p class="tt-banner is-${is}" role="status">${icon}<span><b>${lead}</b>${rest}</span></p>`;

/**
 * The Route Pack: one plain status at a time (OUT-14).
 * @param {Lang} lang @param {{ megabytes: number, state: 'none' | 'loading' | 'ready' | 'failed', done?: number }} pack
 */
export function pack(lang, { megabytes, state: is, done = 0 }) {
  const t = T[lang];
  const what = {
    none: t.packWhat(megabytes),
    loading: t.packProgress(done, megabytes),
    ready: t.packReady,
    failed: t.packFailed,
  }[is];
  const key = { none: t.download, loading: t.pause, ready: '', failed: t.downloadAgain }[is];
  const icon = {
    none: icons.pack,
    loading: icons.download,
    ready: icons.check,
    failed: icons.alert,
  }[is];
  const bar =
    is === 'loading'
      ? `<div class="tt-pack-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${megabytes}" aria-valuenow="${done}"><i style="width:${((done / megabytes) * 100).toFixed(0)}%"></i></div>`
      : '';
  return `<section class="tt-pack is-${is}">
    <div class="tt-pack-head">${icon}<span>${t.packName}<small>${what}</small></span>${key ? `<button>${key}</button>` : ''}</div>
    ${bar}
  </section>`;
}

/**
 * What has to be in place before something can begin: each line is either
 * there or missing, in words, and what is missing has its way out beside it.
 * @param {{ label: string, note: string, ok: boolean, action?: string }[]} items
 */
export const checks = (items) =>
  `<ul class="tt-checks">${items
    .map(
      (c) =>
        `<li class="${c.ok ? 'is-ok' : 'is-missing'}"><i>${c.ok ? icons.check : icons.alert}</i><span><b>${c.label}</b><small>${c.note}</small></span>${c.action ? `<button>${c.action}</button>` : ''}</li>`,
    )
    .join('')}</ul>`;
