/**
 * A check of every drawing of the two reference screens: three systems, two
 * themes, two languages. It finds what a person scanning twenty-four drawings
 * would miss — a button that leaves the screen in one language, a label cut in
 * one theme — and nothing else.
 */
import { directions } from './registry.js';
import { ready, renderScreen, settle } from './viewer.js';

/** What has to lie wholly inside its screen. */
const WHOLE =
  'button, h1, .tt-sheet, .tt-guide, .tt-player, .tt-board, .tt-dock, .tt-top, .tt-keys, .tt-frame, .tt-verdict, .tt-facts, .tt-voice, .tt-next, .tt-footnote, .tt-made, .tt-status, .tt-title, .tt-strip, .tt-guide-chip, .tt-webnav, .tt-webnote, .tt-webchart';
/** What is set on one line and may not be cut. */
const ONE_LINE =
  '.tt-action span, .tt-action small, .tt-title b, .tt-status b, .tt-frame b, .tt-row-end .tt-row-name, .tt-guide-chip, .tt-guide-photo figcaption';

const report = /** @type {HTMLElement} */ (document.getElementById('report'));
const host = document.createElement('div');
host.style.cssText = 'position:absolute;left:0;top:0;width:1400px;visibility:hidden';
document.body.append(host);

const data = await ready();
/** @type {Set<string>} */
const problems = new Set();
let drawn = 0;
for (const direction of directions) {
  for (const screen of /** @type {const} */ (['route', 'outing'])) {
    for (const os of /** @type {const} */ (['ios', 'android', 'web'])) {
      for (const theme of /** @type {const} */ (['light', 'dark'])) {
        for (const lang of /** @type {const} */ (['ru', 'en'])) {
          host.innerHTML = renderScreen(direction, { screen, os, theme, lang, data });
          await settle(host, directions);
          drawn++;
          const frame = /** @type {HTMLElement} */ (host.querySelector('.screen'));
          const bounds = frame.getBoundingClientRect();
          const where = `${direction.id} · ${screen} · ${os} · ${theme} · ${lang}`;
          for (const element of frame.querySelectorAll(WHOLE)) {
            if (element.closest('svg')) continue;
            const box = element.getBoundingClientRect();
            if (box.width === 0) continue;
            if (
              box.right > bounds.right + 1 ||
              box.left < bounds.left - 1 ||
              box.bottom > bounds.bottom + 1
            ) {
              problems.add(`${where}: “${element.className || element.tagName}” leaves the screen`);
            }
          }
          for (const element of frame.querySelectorAll(ONE_LINE)) {
            if (
              element.scrollWidth > element.clientWidth + 1 &&
              getComputedStyle(element).overflow !== 'visible'
            ) {
              problems.add(`${where}: “${element.className}” is cut`);
            }
          }
        }
      }
    }
  }
}
host.remove();

report.textContent =
  problems.size === 0
    ? `${drawn} drawings, nothing leaves its screen and nothing is cut.`
    : `${drawn} drawings, ${problems.size} to look at:\n\n${[...problems].join('\n')}`;
document.body.dataset.ready = 'true';
