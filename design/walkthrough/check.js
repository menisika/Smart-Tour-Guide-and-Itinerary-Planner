/**
 * The check of the walks: every step of every walk is drawn, and its way on
 * is looked for as a person would find it. A walk has to run from its first
 * screen to its last without a dead end.
 */
import { screenOf } from '../screens/registry.js';
import { draw, ready, settle } from '../screens/render.js';
import { systemOf, walks, wayOn } from './walks.js';

const report = /** @type {HTMLElement} */ (document.getElementById('report'));
// Drawn small, so that a whole screen lies inside the window: what covers a
// control can only be asked of a point in the window.
const SCALE = 0.25;
const host = document.createElement('div');
host.style.cssText = `position:fixed;left:0;top:0;width:1500px;opacity:0;transform:scale(${SCALE});transform-origin:0 0`;
document.body.append(host);

const data = await ready();
/** @type {Map<string, Set<string>>} */
const problems = new Map();
const note = (/** @type {string} */ problem, /** @type {string} */ where) => {
  if (!problems.has(problem)) problems.set(problem, new Set());
  problems.get(problem)?.add(where);
};
let drawn = 0;
let byControl = 0;
let byItself = 0;

for (const walk of walks) {
  for (const [index, step] of walk.steps.entries()) {
    const last = index === walk.steps.length - 1;
    const what = `${walk.id} · step ${index + 1} (${step[0]}/${step[1]})`;
    /** @type {any} */
    let screen;
    try {
      screen = screenOf(step[0]);
    } catch {
      note(`${what}: no such screen`, '');
      continue;
    }
    if (!(step[1] in screen.states)) note(`${what}: the screen has no such state`, '');
    const systems = new Set(['ios', 'android'].map((phone) => systemOf(step, screen, phone)));
    for (const os of systems) {
      for (const lang of /** @type {const} */ (['ru', 'en'])) {
        try {
          host.innerHTML = draw(screen, { os, theme: 'light', lang, state: step[1], data });
        } catch (error) {
          note(
            `${what}: could not be drawn — ${error instanceof Error ? error.message : error}`,
            `${os} ${lang}`,
          );
          continue;
        }
        for (const device of host.querySelectorAll('.device')) {
          /** @type {HTMLElement} */ (device).style.setProperty('--z', '1');
        }
        await settle(host);
        for (const device of host.querySelectorAll('.device')) {
          /** @type {HTMLElement} */ (device).style.setProperty('--z', '1');
        }
        drawn++;
        if (last) continue;
        const frame = /** @type {HTMLElement} */ (host.querySelector('.screen'));
        const way = wayOn(step, frame);
        const where = `${os} ${lang}`;
        if (way.auto) {
          byItself++;
          continue;
        }
        if (!way.element) {
          note(
            `${what}: a dead end — ${way.declared ? 'the control it names is not on the screen' : 'no prominent action, and the step names none'}`,
            where,
          );
          continue;
        }
        byControl++;
        // A sentence runs over several lines: it is tapped on its first one.
        const box = way.element.getClientRects()[0] ?? way.element.getBoundingClientRect();
        const bounds = frame.getBoundingClientRect();
        if (box.width === 0 || box.bottom > bounds.bottom + 0.5 || box.top < bounds.top - 0.5) {
          note(`${what}: the way on lies outside the screen`, where);
          continue;
        }
        const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        if (
          top &&
          top !== way.element &&
          !way.element.contains(top) &&
          !top.contains(way.element)
        ) {
          note(
            `${what}: the way on is covered by “${top.closest('[class]')?.getAttribute('class') ?? top.tagName}”`,
            where,
          );
        }
      }
    }
  }
  report.textContent = `Walking… ${drawn}`;
}
host.remove();

const steps = walks.reduce((sum, walk) => sum + walk.steps.length, 0);
const lines = [...problems].map(
  ([problem, where]) =>
    `${problem}${[...where].filter(Boolean).length ? `\n    ${[...where].join(' · ')}` : ''}`,
);
report.textContent =
  problems.size === 0
    ? `${walks.length} walks, ${steps} steps, ${drawn} drawings.\n\nEvery walk runs from its first screen to its last: ${byControl} times the way on is a control of the screen that can be tapped, ${byItself} times the next step comes by itself.\n\n${walks.map((walk) => `${walk.id}  ${String(walk.steps.length).padStart(2)} steps  ${walk.title}`).join('\n')}`
    : `${walks.length} walks, ${steps} steps, ${problems.size} to look at:\n\n${lines.join('\n\n')}`;
document.body.dataset.ready = 'true';
document.body.dataset.problems = String(problems.size);
