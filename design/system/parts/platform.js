/**
 * Where the two systems differ by rule: the bar of destinations, and the
 * Outing on a locked phone. These are surfaces of the system; the product
 * supplies its words, its numbers and its accent.
 */
import { format } from '../../directions/shared/data.js';
import { icons } from '../icons.js';
import { T } from '../strings.js';
import { strip, thumb } from './route.js';

/** @typedef {'ru' | 'en'} Lang */
/** @typedef {'ios' | 'android' | 'web'} Os */

/** The bar of destinations. Which destinations there are is settled in `D-03`. @param {Lang} lang @param {number} chosen */
export function tabs(lang, chosen = 0) {
  const signs = [icons.route, icons.bookmark, icons.person];
  return `<nav class="tt-tabs lg">${T[lang].tabs
    .map(
      (label, i) =>
        `<button${i === chosen ? ' aria-current="page"' : ''}><span class="tt-tabs-icon">${signs[i]}</span>${label}</button>`,
    )
    .join('')}</nav>`;
}

/** @param {any} story */
const played = (story) => `${((story.elapsed / story.total) * 100).toFixed(0)}%`;

/**
 * The Outing on a locked phone (NFR-25, OUT-5): everything a glance needs,
 * and the keys of the Story, without unlocking.
 * @param {any} data @param {{ os: Os, lang: Lang }} ctx
 */
export function lockScreen(data, { os, lang }) {
  const t = T[lang];
  const now = data.outingNow;
  const story = now.story[lang];
  const minute = now.stop.arriveMin + 1;
  const far = `${format.distance(now.next.legMetres, lang)} · ${format.duration(now.next.legMinutes, lang)}`;
  const keys = `<div class="tt-playing-keys" aria-hidden="true"><span>${icons.back10}</span><span>${icons.pause}</span><span>${icons.next}</span></div>`;
  const track = `<div class="tt-playing-top">${thumb(now.stop, '')}<span><b>${now.stop.name[lang]}</b><small>Promenade · ${now.stop.order} / ${data.stops.length}</small></span></div>`;

  if (os === 'android') {
    const done = data.stops.filter((/** @type {any} */ s) => s.leaveMin <= minute).length;
    const bar = data.stops
      .map((/** @type {any} */ s, /** @type {number} */ i) => {
        const span = s.leaveMin - (i === 0 ? 0 : data.stops[i - 1].leaveMin);
        return `<i class="${i < done ? 'is-done' : i === done ? 'is-now' : ''}" style="--share:${span}"></i>`;
      })
      .join('');
    return `<div class="tt-lock">
      <p class="tt-lock-clock"><b>${now.clock}</b></p>
      <div class="tt-lock-stack">
        <section class="tt-notice">
          <p class="tt-notice-app"><i>${icons.walk}</i>Promenade · ${t.onTime}</p>
          <b>${t.next}: ${now.next.name[lang]}</b>
          <p>${far} · ${t.finishAt(data.route.finish)}</p>
          <div class="tt-notice-bar" role="img" aria-label="${done} / ${data.stops.length}">${bar}</div>
        </section>
        <section class="tt-notice">${track}${keys}</section>
      </div>
    </div>`;
  }

  return `<div class="tt-lock">
    <p class="tt-island" aria-hidden="true"><i>${now.next.order}</i>${format.distance(now.next.legMetres, lang)}<span>${t.onTime}</span></p>
    <p class="tt-lock-clock"><b>${now.clock}</b></p>
    <div class="tt-lock-stack">
      <section class="tt-live">
        <p class="tt-live-top"><i class="tt-lamp"></i><b>${t.onTime}</b>${t.finishAt(data.route.finish)}<span>Promenade</span></p>
        <div class="tt-live-next"><i>${now.next.order}</i><span><small>${t.next} · ${now.next.arrive}</small><b>${now.next.name[lang]}</b></span><span class="tt-live-far">${format.distance(now.next.legMetres, lang)}</span></div>
        ${strip(data, minute)}
      </section>
      <section class="tt-playing">
        ${track}
        <div class="tt-playing-bar" style="--played:${played(story)}"><span>${format.playback(story.elapsed)}</span><i></i><span>${format.playback(story.total)}</span></div>
        ${keys}
      </section>
    </div>
  </div>`;
}
