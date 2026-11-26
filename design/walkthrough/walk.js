/**
 * One step of a walk, at its real size, where the screen itself leads on:
 *
 *     walk.html#walk=SC-1&step=1&os=ios&theme=light&lang=ru&hints=on
 *
 * The control that leads to the next step is marked with a ring while hints
 * are on. A tap anywhere else is counted as a stumble and kept on this device
 * with the name of what was tapped, so that a walk by someone who has never
 * seen the product leaves a record of where they hesitated; after two of
 * them on one step the ring appears by itself. Where the next step comes by
 * itself, a tap anywhere goes on. The arrow keys go on and back.
 */
import { screenOf } from '../screens/registry.js';
import { draw, ready, settle } from '../screens/render.js';
import { SIZES } from '../directions/shared/frames.js';
import { keepStumble, systemOf, walks, wayOn } from './walks.js';

const stage = /** @type {HTMLElement} */ (document.getElementById('stage'));
const bar = /** @type {HTMLElement} */ (document.getElementById('bar'));

/** What a person tapped, in words. @param {Element} target */
function nameOf(target) {
  const control = target.closest('button, a, [role="textbox"], [role="slider"], [tabindex]');
  if (!control) return 'not a control';
  const label = control.getAttribute('aria-label') ?? control.textContent ?? '';
  return label.replace(/\s+/g, ' ').trim().slice(0, 60) || control.className;
}

function read() {
  const query = new URLSearchParams(location.hash.slice(1));
  const found = walks.find((w) => w.id === query.get('walk')) ?? walks[0];
  const index = Math.min(Math.max(Number(query.get('step') ?? 1), 1), found.steps.length) - 1;
  return {
    walk: found,
    index,
    os: query.get('os') === 'android' ? 'android' : 'ios',
    theme: ['dark', 'sun'].includes(query.get('theme') ?? '')
      ? String(query.get('theme'))
      : 'light',
    lang: /** @type {'ru' | 'en'} */ (query.get('lang') === 'en' ? 'en' : 'ru'),
    hints: query.get('hints') !== 'off',
  };
}

/** @param {ReturnType<typeof read>} view @param {number} step counted from one */
const address = (view, step) =>
  `#walk=${view.walk.id}&step=${step}&os=${view.os}&theme=${view.theme}&lang=${view.lang}&hints=${view.hints ? 'on' : 'off'}`;

/** Fits the device to the window: its real size where there is room, smaller where there is not. */
function fit() {
  const device = stage.querySelector('.device');
  if (!(device instanceof HTMLElement)) return;
  const width = Number(device.style.getPropertyValue('--w'));
  const height = Number(device.style.getPropertyValue('--h'));
  const phone = innerWidth <= 480;
  const room = phone ? innerWidth : innerWidth - 32;
  // On a phone the screen takes the width and the page scrolls; at a desk it
  // is seen whole.
  const z = phone
    ? Math.min(1.4, room / width)
    : Math.min(1, room / width, (innerHeight - bar.offsetHeight - 28) / height);
  device.style.setProperty('--z', String(z));
}

let misses = 0;

async function show() {
  const view = read();
  const { walk, index } = view;
  const step = walk.steps[index];
  const screen = screenOf(step[0]);
  const os = systemOf(step, screen, view.os);
  const data = await ready();
  stage.innerHTML = draw(screen, { os, theme: view.theme, lang: view.lang, state: step[1], data });
  stage.dataset.wide = String(SIZES[/** @type {keyof typeof SIZES} */ (os)].width > 500);
  fit();
  await settle(stage);
  fit();
  misses = 0;

  const frame = /** @type {HTMLElement} */ (stage.querySelector('.screen'));
  const last = index === walk.steps.length - 1;
  const way = wayOn(step, frame);
  const go = () => {
    location.hash = last ? `#end=${walk.id}` : address(view, index + 2);
  };
  if (way.element && !last) {
    way.element.classList.add('wt-go');
    if (view.hints) way.element.classList.add('is-shown');
  }
  frame.addEventListener('click', (event) => {
    event.preventDefault();
    if (last) return;
    const target = /** @type {Element} */ (event.target);
    if (way.auto || !way.element || way.element.contains(target)) return go();
    // A tap that leads nowhere: kept, with what was tapped.
    keepStumble({
      walk: walk.id,
      step: index + 1,
      screen: `${step[0]}/${step[1]}`,
      tapped: nameOf(target),
    });
    if (++misses >= 2) way.element.classList.add('is-shown');
    way.element.classList.remove('is-nudged');
    void (/** @type {HTMLElement} */ (way.element).offsetWidth);
    way.element.classList.add('is-nudged');
  });

  const how = last
    ? 'The end of the walk.'
    : way.auto
      ? 'This goes on by itself: tap the screen.'
      : way.element
        ? view.hints
          ? 'Tap the marked control.'
          : 'Find the way on.'
        : 'No way on from here.';
  bar.innerHTML = `
    <a class="wt-back" href="${index > 0 ? address(view, index) : './'}" aria-label="Back">←</a>
    <p><b>${walk.id} · ${index + 1} / ${walk.steps.length}</b><span>${step[2]}</span><small>${how}</small></p>
    ${last ? `<a class="wt-next" href="./#done=${walk.id}">All walks</a>` : `<a class="wt-next" href="${address(view, index + 2)}" aria-label="Next">→</a>`}`;
  document.title = `Promenade — ${walk.id}, step ${index + 1}`;
  document.body.dataset.ready = 'true';
}

addEventListener('hashchange', () => {
  if (location.hash.startsWith('#end=')) location.href = `./#done=${location.hash.slice(5)}`;
  else void show();
});
addEventListener('resize', fit);
addEventListener('keydown', (event) => {
  const view = read();
  if (event.key === 'ArrowRight' && view.index < view.walk.steps.length - 1)
    location.hash = address(view, view.index + 2);
  if (event.key === 'ArrowLeft' && view.index > 0) location.hash = address(view, view.index);
});
void show();
