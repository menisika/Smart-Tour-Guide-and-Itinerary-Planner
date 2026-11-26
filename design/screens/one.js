/**
 * One screen at its real size, chosen by the address:
 *
 *     one.html#screen=route&state=usual&os=ios&theme=dark&lang=en
 *     one.html#walk=SC-1&step=4&os=android&theme=light&lang=ru
 *
 * The second form is a step of a scenario and can be followed with “next”.
 * On a phone the outline of the device is dropped and the screen is fitted to
 * the width of the phone, so that a mockup can be held in the hand. With
 * `?bare` in the address the page is the screen and nothing else, at its
 * exact size: that is what `design/tools/export-approved.mjs` photographs.
 */
import { scenarios, screenOf } from './registry.js';
import { draw, ready, settle } from './render.js';

const one = /** @type {HTMLElement} */ (document.getElementById('one'));
const bar = /** @type {HTMLElement} */ (document.getElementById('bar'));

const bare = new URLSearchParams(location.search).has('bare');
document.body.classList.toggle('pg-bare', bare);

async function show() {
  const query = new URLSearchParams(location.hash.slice(1));
  const walk = scenarios.find((s) => s.id === query.get('walk'));
  const index = Math.min(Math.max(Number(query.get('step') ?? 1), 1), walk?.steps.length ?? 1) - 1;
  const step = walk?.steps[index];
  const screen = screenOf(step ? step[0] : (query.get('screen') ?? 'route'));
  const state = step ? step[1] : (query.get('state') ?? 'usual');
  const asked = query.get('os') ?? step?.[3] ?? screen.on[0];
  const view = {
    os: screen.on.includes(asked) ? asked : (step?.[3] ?? screen.on[0]),
    theme: ['dark', 'sun'].includes(query.get('theme') ?? '')
      ? String(query.get('theme'))
      : 'light',
    lang: /** @type {'ru' | 'en'} */ (query.get('lang') === 'en' ? 'en' : 'ru'),
  };
  const data = await ready();
  one.innerHTML = draw(screen, { ...view, state: state in screen.states ? state : 'usual', data });
  const device = /** @type {HTMLElement} */ (one.querySelector('.device'));
  // A phone may enlarge the screen to its own width; a desktop shows it as it is.
  device.dataset.maxScale = innerWidth <= 480 && !bare ? '1.4' : '1';
  await settle(one);

  const rest = `&theme=${view.theme}&lang=${view.lang}`;
  const link = (/** @type {number} */ n, /** @type {string} */ words) =>
    walk && n >= 1 && n <= walk.steps.length
      ? `<a href="#walk=${walk.id}&step=${n}&os=${query.get('os') ?? view.os}${rest}">${words}</a>`
      : `<span></span>`;
  bar.innerHTML = walk
    ? `${link(index, '← back')}<span><b>${walk.id}</b> · ${index + 1} / ${walk.steps.length} · ${step?.[2] ?? ''}</span>${link(index + 2, 'next →')}<a href="./#${walk.id}">index</a>`
    : `<span><b>${screen.title}</b> · ${screen.states[state] ?? ''} · ${screen.reqs.join(', ')}</span><a href="./#screen-${screen.id}">index</a>`;
  document.title = `Promenade — ${screen.title}`;
  document.body.dataset.ready = 'true';
}

addEventListener('hashchange', () => void show());
addEventListener('resize', () => void settle(one));
void show();
