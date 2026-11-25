/**
 * One screen at its real size, chosen by the address:
 *
 *     one.html#d=guidebook&screen=outing&os=ios&theme=dark&lang=en
 *
 * On a phone the outline of the device is dropped and the screen is fitted to
 * the width of the phone, so that a mockup can be held in the hand.
 */
import { directions } from './registry.js';
import { ready, renderScreen, settle } from './viewer.js';

const one = /** @type {HTMLElement} */ (document.getElementById('one'));

async function draw() {
  const query = new URLSearchParams(location.hash.slice(1));
  const direction = directions.find((d) => d.id === query.get('d')) ?? directions[0];
  const state = {
    screen: query.get('screen') === 'outing' ? 'outing' : 'route',
    os: ['ios', 'android', 'web'].includes(query.get('os') ?? '') ? query.get('os') : 'ios',
    theme: query.get('theme') === 'dark' ? 'dark' : 'light',
    lang: query.get('lang') === 'en' ? 'en' : 'ru',
  };
  const data = await ready();
  one.innerHTML = renderScreen(direction, { .../** @type {any} */ (state), data });
  const device = /** @type {HTMLElement} */ (one.querySelector('.device'));
  // A phone may enlarge the screen to its own width; a desktop shows it as it is.
  device.dataset.maxScale = innerWidth <= 480 ? '1.4' : '1';
  await settle(one, directions);
  document.body.dataset.ready = 'true';
}

addEventListener('hashchange', () => void draw());
addEventListener('resize', () => void settle(one, directions));
void draw();
