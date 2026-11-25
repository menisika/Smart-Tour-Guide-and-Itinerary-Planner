/**
 * The six scenarios as click-through walks: for every step, the control that
 * leads on to the next one.
 *
 * The steps are those of the registry of the screens. A step may name its
 * way on itself; otherwise the way on is the prominent action of the screen
 * as it stands — in a dialog, in a sheet that waits, at the foot of a page.
 * A step whose next comes by itself — a Story that starts on arrival, a
 * download that ends — is marked `auto`: there the whole screen leads on. A
 * step with neither is a dead end, and the check of the walks reports it.
 */
import { scenarios } from '../screens/registry.js';

/** @param {string} id */
const stepsOf = (id) => {
  const scenario = scenarios.find((s) => s.id === id);
  if (!scenario) throw new Error(`No scenario “${id}” in the registry`);
  return scenario;
};

/** A scenario of the registry as a walk. @param {string} id @param {string} [then] another scenario that continues it */
const walk = (id, then) => {
  const first = stepsOf(id);
  return {
    id,
    title: first.title.replace(/ \(its main steps\)$/, ''),
    steps: then ? [...first.steps, ...stepsOf(then).steps] : first.steps,
  };
};

/** The six walks of work package D-05, in the order of the specification. */
export const walks = [
  walk('SC-1'),
  walk('SC-2'),
  walk('SC-4'),
  walk('SC-5'),
  // A Correction starts on the phone and ends at the Curator's desk.
  walk('SC-6', 'SC-6-console'),
  walk('SC-7'),
];

/**
 * The way on from a screen in a state, where it is always the same and is
 * not the prominent action.
 * @type {Record<string, string | [string, number]>}
 */
const WAY = {
  'pack/usual': '.tt-pack-head button',
  'preview-route/usual': '.tt-link',
  'preview-invitation/usual': '.tt-link',
  // The console: where the next step is another part of the navigation, or
  // comes by itself, the screen has no prominent action that leads there.
  'console-preparation/usual': 'auto',
  'console-pronunciation/fixed': 'auto',
  'console-dossier/verified': 'auto',
  'console-queue/verified': 'auto',
  'console-dossier/fixed': 'auto',
  'corrections/usual': 'auto',
};

/** The prominent action of a screen as it stands, the first that is there. */
const PROMINENT = [
  '.tt-dialog-actions .tt-action:not(.is-plain)',
  '.tt-webcard .tt-action:not(.is-plain):not(.is-second):not([disabled])',
  '.tt-over .tt-action:not(.is-plain):not(.is-second):not([disabled])',
  '.tt-dock .tt-action:not(.is-plain):not(.is-second):not([disabled])',
  '.tt-panel-foot .tt-action:not(.is-plain):not(.is-second):not([disabled])',
  '.tt-sheet .tt-flow > .tt-action:not(.is-plain):not([disabled])',
  '.tt-sheet.is-column > .tt-action:not(.is-plain):not([disabled])',
  '.tt-state-actions .tt-action:not(.is-plain):not([disabled])',
  '.cs-btn.is-main:not([disabled])',
];

/**
 * The way on from a step, on the screen as drawn.
 * @param {import('../screens/registry.js').Step} step @param {Element} screen
 * @returns {{ element: Element | null, auto: boolean, declared: boolean }}
 *   `element` is the control that leads on; with `auto` the whole screen does;
 *   with neither the step is a dead end. `declared` says the step named its way itself.
 */
export function wayOn(step, screen) {
  const way = step[4] ?? WAY[`${step[0]}/${step[1]}`];
  if (way === 'auto') return { element: null, auto: true, declared: true };
  if (way) {
    const [selector, index] = typeof way === 'string' ? [way, 0] : way;
    return {
      element: screen.querySelectorAll(selector)[index] ?? null,
      auto: false,
      declared: true,
    };
  }
  for (const selector of PROMINENT) {
    const element = screen.querySelector(selector);
    if (element) return { element, auto: false, declared: false };
  }
  return { element: null, auto: false, declared: false };
}

/** The system a step is drawn for, given the phone that was chosen. @param {import('../screens/registry.js').Step} step @param {any} screen @param {string} phone */
export const systemOf = (step, screen, phone) =>
  step[3] ?? (screen.on.includes(phone) ? phone : screen.on[0]);

// ── Stumbles: taps that led nowhere, kept on the device that made them ──────

const STUMBLES = 'promenade-walk-stumbles';

/** @returns {{ walk: string, step: number, screen: string, tapped: string, at: string }[]} */
export function stumbles() {
  try {
    return JSON.parse(localStorage.getItem(STUMBLES) ?? '[]');
  } catch {
    return [];
  }
}

/** @param {{ walk: string, step: number, screen: string, tapped: string }} stumble */
export function keepStumble(stumble) {
  try {
    localStorage.setItem(
      STUMBLES,
      JSON.stringify([...stumbles(), { ...stumble, at: new Date().toISOString() }]),
    );
  } catch {
    // A browser that keeps nothing still walks.
  }
}

export function clearStumbles() {
  try {
    localStorage.removeItem(STUMBLES);
  } catch {
    // Nothing was kept.
  }
}
