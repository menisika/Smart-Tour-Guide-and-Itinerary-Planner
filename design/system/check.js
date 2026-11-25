/**
 * The check of every component, drawn: the part of the accessibility rules
 * that can only be measured on a rendered control.
 *
 * `pnpm lint:design` checks what follows from the tokens alone — contrast,
 * the declared sizes, the names of icons. This page checks what follows from
 * the drawing: each control as it is laid out, in every system, theme,
 * language and text size.
 */
import { SIZES, frame } from '../directions/shared/frames.js';
import { ready } from '../directions/viewer.js';
import { settle } from './parts/story.js';
import { specimens, stage } from './specimens.js';

/** Anything a person can act on. */
const CONTROLS =
  'button, a[href], input, textarea, [role="button"], [role="switch"], [role="radio"], [role="menuitem"], [role="textbox"], [role="slider"], [tabindex]';
/** What is set on one line and may not be cut. */
const ONE_LINE =
  '.tt-action span, .tt-action b, .tt-title b, .tt-status b, .tt-frame b, .tt-stepper output, .tt-seg span, .tt-chip span, .tt-tabs button';
/** What has to lie wholly inside its screen. */
const WHOLE =
  'button, .tt-sheet, .tt-guide, .tt-player, .tt-mini, .tt-board, .tt-dock, .tt-dialog, .tt-menu, .tt-toast, .tt-tabs, .tt-banner, .tt-pack, .tt-state, .tt-field, .tt-stepper, .tt-verdict, .tt-frame, .tt-facts';
/** What is used on the move, and so has to lie within reach of a thumb. */
const IN_REACH =
  '.tt-dock .tt-action, .tt-keys button, .tt-dialog-actions .tt-action, .tt-mini button';

const report = /** @type {HTMLElement} */ (document.getElementById('report'));
const host = document.createElement('div');
host.style.cssText = 'position:absolute;left:0;top:0;width:1400px;visibility:hidden';
document.body.append(host);

const data = await ready();
const tokens = data.tokens;
const reach = tokens.size.reach.value;

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
  const text = [...element.childNodes]
    .map((node) =>
      node instanceof Element && node.closest('[aria-hidden="true"]') ? '' : node.textContent,
    )
    .join('')
    .trim();
  return text;
}

/**
 * @param {import('./specimens.js').Specimen} specimen @param {string} variant
 * @param {'ios' | 'android'} os @param {'light' | 'dark' | 'sun'} theme @param {'ru' | 'en'} lang @param {number} text
 */
async function check(specimen, variant, os, theme, lang, text) {
  const ctx = { os, theme, lang, text, data, width: SIZES[os].width };
  host.innerHTML = specimen.device
    ? frame({
        os,
        theme: /** @type {any} */ (theme),
        lang,
        direction: 'timetable',
        clock: data.outingNow.clock,
        inner: specimen.render(ctx, variant),
      })
    : stage(specimen, ctx, variant);
  for (const device of host.querySelectorAll('.device')) {
    /** @type {HTMLElement} */ (device).style.setProperty('--z', '1');
  }
  await document.fonts.ready;
  settle(host);
  drawn++;
  const screen = /** @type {HTMLElement} */ (host.querySelector('.screen'));
  const bounds = screen.getBoundingClientRect();
  const what = `${specimen.id}${variant ? `/${variant}` : ''}`;
  const where = `${os} ${theme} ${lang}${text === 1 ? '' : ` ${Math.round(text * 100)}%`}`;
  const minimum = tokens.size.target[os];

  for (const element of screen.querySelectorAll(CONTROLS)) {
    if (element.closest('[aria-hidden="true"]')) continue;
    const box = element.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue;
    // The size a control is laid out at, whatever a pressed state does to it.
    const width = element instanceof HTMLElement ? element.offsetWidth : box.width;
    const height = element instanceof HTMLElement ? element.offsetHeight : box.height;
    controls++;
    const label = nameOf(element);
    const id = `${what}: “${label || element.className || element.tagName.toLowerCase()}”`;
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
    if (
      specimen.device &&
      element.matches(IN_REACH) &&
      box.top + box.height / 2 < bounds.top + bounds.height * (1 - reach)
    ) {
      note(`${id} lies above the reach of a thumb`, where);
    }
  }

  for (const element of screen.querySelectorAll(WHOLE)) {
    if (element.closest('svg')) continue;
    const box = element.getBoundingClientRect();
    if (box.width === 0) continue;
    if (
      box.right > bounds.right + 1 ||
      box.left < bounds.left - 1 ||
      box.bottom > bounds.bottom + 1
    ) {
      note(
        `${what}: “${element.className || element.tagName.toLowerCase()}” leaves its screen`,
        where,
      );
    }
  }

  for (const element of screen.querySelectorAll(ONE_LINE)) {
    const style = getComputedStyle(element);
    if (style.textOverflow === 'ellipsis') continue;
    if (element.scrollWidth > element.clientWidth + 1 && style.overflow !== 'visible') {
      note(`${what}: “${element.textContent?.trim().slice(0, 40)}” is cut`, where);
    }
  }
  // Text that grows may wrap, and may not be clipped by the control that holds it.
  for (const element of screen.querySelectorAll(
    'button, .tt-field-well, .tt-verdict, .tt-banner, .tt-toast',
  )) {
    if (element.closest('[aria-hidden="true"]') || element.matches('.tt-grab')) continue;
    if (
      element.scrollHeight > element.clientHeight + 2 &&
      getComputedStyle(element).overflow !== 'visible'
    ) {
      note(`${what}: “${nameOf(element).slice(0, 40)}” is clipped by its control`, where);
    }
  }
}

for (const specimen of specimens) {
  for (const variant of specimen.variants ?? [{ id: '' }]) {
    for (const os of /** @type {const} */ (['ios', 'android'])) {
      for (const theme of /** @type {const} */ (['light', 'dark', 'sun'])) {
        for (const lang of /** @type {const} */ (['ru', 'en'])) {
          await check(specimen, variant.id, os, theme, lang, 1);
        }
      }
      // The text size changes the layout and not the colours: one theme is enough.
      if (!specimen.device) {
        for (const lang of /** @type {const} */ (['ru', 'en'])) {
          for (const text of [1.3, 2]) await check(specimen, variant.id, os, 'light', lang, text);
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
    ? `${drawn} drawings of ${specimens.length} components, ${controls} controls measured.\n\nEvery control is at least its platform’s target (${tokens.size.target.ios} pt on iOS, ${tokens.size.target.android} dp on Android) and has a name.\nNothing is cut, clipped or leaves its screen, at 100 %, 130 % and 200 % of the text size.\nOn whole screens, what is used on the move lies in the lower ${Math.round(reach * 100)} %.`
    : `${drawn} drawings of ${specimens.length} components, ${controls} controls measured, ${problems.size} to look at:\n\n${lines.join('\n\n')}`;
document.body.dataset.ready = 'true';
document.body.dataset.problems = String(problems.size);
