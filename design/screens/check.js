/**
 * The check of every screen, drawn: what can only be measured once a browser
 * has laid a screen out.
 *
 * It draws each screen of the registry in each of its states, for every
 * system it is made for, in the three themes and both languages, and reports
 *
 *  - a control smaller than its platform's target, or without a name;
 *  - a control cut by the pane that holds it, or covered by another pane;
 *  - a pane or a control that leaves its screen;
 *  - a line of text that is cut, or clipped by its control.
 *
 * What stands in a part that scrolls (`.tt-scroll`) may lie below its edge:
 * it is reached by scrolling. Everything else has to be whole.
 */
import { screens } from './registry.js';
import { draw, ready, settle } from './render.js';

/** Anything a person can act on. */
const CONTROLS =
  'button, a[href], input, textarea, [role="button"], [role="switch"], [role="radio"], [role="menuitem"], [role="textbox"], [role="slider"], [tabindex]';
/** What is set on one line and may not be cut. */
const ONE_LINE =
  '.tt-action span, .tt-action b, .tt-action small, .tt-title b, .tt-status b, .tt-frame b, .tt-stepper output, .tt-seg span, .tt-chip span, .tt-tabs button, .tt-bar-title, .tt-variant-times, .tt-figures dd, .tt-ahead-far b, .tt-saved-times, .tt-guide-chip, .tt-row-end .tt-row-name, .cs-btn span, .cs-tag span, .cs-seg span, .cs-tabs button, .cs-chip span, .cs-sort span, .cs-figures b, .cs-stepper output, .cs-audio-time, .cs-num';
/** What has to lie wholly inside its screen. */
const WHOLE =
  'h1, .tt-sheet, .tt-over, .tt-guide, .tt-player, .tt-mini, .tt-board, .tt-dock, .tt-dialog, .tt-menu, .tt-toast, .tt-tabs, .tt-banner, .tt-bar, .tt-top, .tt-ahead, .tt-hero, .tt-band, .tt-state, .tt-heading, .tt-webnav, .tt-webcard, .tt-panel, .tt-panel-foot, .tt-link, .tt-msgr li, .tt-composer, .tt-recap, .cs-nav, .cs-bar, .cs-head, .cs-pane-head, .cs-pane-foot, .cs-filters, .cs-band, .cs-tabs, .cs-notice, .cs-map, .cs-audio, .cs-run, .cs-pair, .cs-fact, .cs-diff';
/** A pane that waits for an answer: what is behind it is covered on purpose. */
const MODAL = '.tt-scrim, .tt-dialog, .tt-menu, .tt-over, .tt-webcard, .tt-guide.is-place';

const report = /** @type {HTMLElement} */ (document.getElementById('report'));
// Drawn at a quarter of its size, so that a whole screen lies inside the
// window: what covers a control can only be asked of a point in the window.
const SCALE = 0.25;
const host = document.createElement('div');
host.style.cssText = `position:fixed;left:0;top:0;width:1400px;opacity:0;pointer-events:none;transform:scale(${SCALE});transform-origin:0 0`;
document.body.append(host);

const data = await ready();
const tokens = data.tokens;

/** @type {Map<string, Set<string>>} problem → where it was seen */
const problems = new Map();
const note = (/** @type {string} */ problem, /** @type {string} */ where) => {
  if (!problems.has(problem)) problems.set(problem, new Set());
  problems.get(problem)?.add(where);
};
let drawn = 0;
let controls = 0;

/** What a screen reader would say of a control. @param {Element} element */
function nameOf(element) {
  const labelled = element.getAttribute('aria-label');
  if (labelled) return labelled.trim();
  return [...element.childNodes]
    .map((node) =>
      node instanceof Element && node.closest('[aria-hidden="true"]') ? '' : node.textContent,
    )
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The pane that cuts an element, if one does. @param {Element} element @param {Element} screen */
function cutBy(element, screen) {
  const box = element.getBoundingClientRect();
  for (let up = element.parentElement; up && up !== screen; up = up.parentElement) {
    const style = getComputedStyle(up);
    if (style.overflowY === 'visible' && style.overflowX === 'visible') continue;
    const pane = up.getBoundingClientRect();
    if (
      box.bottom > pane.bottom + 0.5 ||
      box.right > pane.right + 0.5 ||
      box.left < pane.left - 0.5
    )
      return up;
  }
  return null;
}

/**
 * @param {import('./registry.js').Screen} screen @param {string} state
 * @param {string} os @param {string} theme @param {'ru' | 'en'} lang
 */
async function check(screen, state, os, theme, lang) {
  host.innerHTML = draw(screen, { os, theme, lang, state, data });
  for (const device of host.querySelectorAll('.device')) {
    /** @type {HTMLElement} */ (device).style.setProperty('--z', '1');
  }
  await settle(host);
  for (const device of host.querySelectorAll('.device')) {
    /** @type {HTMLElement} */ (device).style.setProperty('--z', '1');
  }
  drawn++;
  const frame = /** @type {HTMLElement} */ (host.querySelector('.screen'));
  const bounds = frame.getBoundingClientRect();
  const what = `${screen.id}/${state}`;
  const where = `${os} ${theme} ${lang}`;
  // A finger on a phone and in a phone's browser; a pointer at a desk.
  const minimum =
    os === 'console'
      ? tokens.console.target.value
      : tokens.size.target[os === 'webphone' ? 'web' : os];
  const short = (/** @type {string} */ text) => text.slice(0, 44);

  for (const element of frame.querySelectorAll(CONTROLS)) {
    if (element.closest('[aria-hidden="true"]')) continue;
    const box = element.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue;
    const width = element instanceof HTMLElement ? element.offsetWidth : box.width / SCALE;
    const height = element instanceof HTMLElement ? element.offsetHeight : box.height / SCALE;
    controls++;
    const label = nameOf(element);
    const id = `${what}: “${short(label) || element.className || element.tagName.toLowerCase()}”`;
    if (!label)
      note(
        `${what}: a control (${element.className || element.tagName.toLowerCase()}) has no name`,
        where,
      );
    if (width < minimum - 0.5 || height < minimum - 0.5) {
      note(
        `${id} is ${Math.round(width)} × ${Math.round(height)}, under the target of ${minimum}`,
        where,
      );
    }
    if (box.right > bounds.right + 0.5 || box.left < bounds.left - 0.5) {
      note(`${id} leaves its screen`, where);
      continue;
    }
    // What scrolls is reached by scrolling.
    if (element.closest('.tt-scroll')) continue;
    if (box.bottom > bounds.bottom + 0.5) {
      note(`${id} leaves its screen`, where);
      continue;
    }
    const pane = cutBy(element, frame);
    if (pane) {
      note(`${id} is cut by “${pane.className}”`, where);
      continue;
    }
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
    host.style.pointerEvents = 'auto';
    const top = document.elementFromPoint(x, y);
    host.style.pointerEvents = 'none';
    if (!top || top === element || element.contains(top) || top.contains(element)) continue;
    // A pane that waits covers what is behind it on purpose — the screen, and
    // an earlier pane that waited before it.
    const waiting = top.closest(MODAL);
    const own = element.closest(MODAL);
    if (
      waiting &&
      waiting !== own &&
      (!own || own.compareDocumentPosition(waiting) & Node.DOCUMENT_POSITION_FOLLOWING)
    )
      continue;
    const cover = top.closest('[class]');
    note(`${id} is covered by “${cover?.className ?? top.tagName.toLowerCase()}”`, where);
  }

  for (const element of frame.querySelectorAll(WHOLE)) {
    if (element.closest('svg')) continue;
    const box = element.getBoundingClientRect();
    if (box.width === 0) continue;
    if (
      box.right > bounds.right + 0.5 ||
      box.left < bounds.left - 0.5 ||
      box.bottom > bounds.bottom + 0.5
    ) {
      note(
        `${what}: “${element.className || element.tagName.toLowerCase()}” leaves its screen`,
        where,
      );
    } else if (!element.closest('.tt-scroll') && cutBy(element, frame)) {
      note(
        `${what}: “${element.className || element.tagName.toLowerCase()}” is cut by its pane`,
        where,
      );
    }
  }

  for (const element of frame.querySelectorAll(ONE_LINE)) {
    const style = getComputedStyle(element);
    if (style.textOverflow === 'ellipsis') continue;
    if (element.scrollWidth > element.clientWidth + 1 && style.overflow !== 'visible') {
      note(`${what}: “${short(element.textContent?.trim() ?? '')}” is cut`, where);
    }
  }
  // The words of a prominent action stand on one line.
  for (const element of frame.querySelectorAll(
    '.tt-action:not(.is-second):not(.is-plain) > span',
  )) {
    const line = parseFloat(getComputedStyle(element).lineHeight);
    if (element instanceof HTMLElement && element.offsetHeight > line * 1.5) {
      note(
        `${what}: the action “${short(element.textContent?.trim() ?? '')}” takes two lines`,
        where,
      );
    }
  }
  // Text may wrap, and may not be clipped by the control that holds it.
  for (const element of frame.querySelectorAll(
    'button, .tt-field-well, .tt-verdict, .tt-banner, .tt-toast',
  )) {
    if (element.closest('[aria-hidden="true"]') || element.matches('.tt-grab')) continue;
    if (
      element.scrollHeight > element.clientHeight + 2 &&
      getComputedStyle(element).overflow !== 'visible'
    ) {
      note(`${what}: “${short(nameOf(element))}” is clipped by its control`, where);
    }
  }
}

/** A part of the registry can be checked alone: check.html#route,edit */
const only = location.hash.slice(1).split(',').filter(Boolean);
const chosen = only.length
  ? screens.filter((s) => only.includes(s.id) || only.includes(s.pkg))
  : screens;

for (const screen of chosen) {
  for (const state of Object.keys(screen.states)) {
    for (const os of screen.on) {
      for (const theme of ['light', 'dark', 'sun']) {
        for (const lang of /** @type {const} */ (['ru', 'en'])) {
          try {
            await check(screen, state, os, theme, lang);
          } catch (error) {
            note(
              `${screen.id}/${state}: could not be drawn — ${error instanceof Error ? error.message : error}`,
              `${os} ${theme} ${lang}`,
            );
          }
        }
      }
    }
  }
  report.textContent = `Drawing… ${drawn}`;
}
host.remove();

const lines = [...problems].map(([problem, where]) => {
  const places = [...where];
  return `${problem}\n    ${places.length > 6 ? `${places.slice(0, 6).join(' · ')} · and ${places.length - 6} more` : places.join(' · ')}`;
});
report.textContent =
  problems.size === 0
    ? `${drawn} drawings of ${chosen.length} screens, ${controls} controls measured.\n\nEvery control is at least its platform’s target (${tokens.size.target.ios} pt on iOS, ${tokens.size.target.android} dp on Android, ${tokens.size.target.web} px on the web, ${tokens.console.target.value} px in the console) and has a name.\nNo control is cut by its pane or covered by another; nothing leaves its screen; no line of text is cut.`
    : `${drawn} drawings of ${chosen.length} screens, ${controls} controls measured, ${problems.size} to look at:\n\n${lines.join('\n\n')}`;
document.body.dataset.ready = 'true';
document.body.dataset.problems = String(problems.size);
