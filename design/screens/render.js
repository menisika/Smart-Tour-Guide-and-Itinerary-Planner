/**
 * Draws a screen of the registry inside the outline of its device, and loads
 * what the screens show.
 */
import { fitDevices, frame } from '../directions/shared/frames.js';
import { ready as readyBase } from '../directions/viewer.js';
import { settle as settleText } from '../system/parts/story.js';

/** @param {string} name */
const read = async (name) => {
  const response = await fetch(new URL(`../data/${name}.json`, import.meta.url));
  if (!response.ok) throw new Error(`design/data/${name}.json: ${response.status}`);
  return response.json();
};

/** @type {Promise<any> | undefined} */
let loading;

/**
 * The data of the mockups, with what the screens add to the reference
 * Outing: marked samples, the Venues near it, and what the console shows.
 */
export function ready() {
  loading ??= Promise.all([readyBase(), read('samples'), read('venues'), read('console')]).then(
    ([data, samples, venues, console]) => ({ ...data, samples, venues, console }),
  );
  return loading;
}

/**
 * @param {import('./registry.js').Screen} screen
 * @param {{ os: string, theme: string, lang: 'ru' | 'en', state: string, data: any }} view
 */
export function draw(screen, view) {
  const { inner, clock, address } = screen.render(/** @type {any} */ (view));
  return frame({
    os: /** @type {any} */ (view.os),
    theme: /** @type {any} */ (view.theme),
    lang: view.lang,
    direction: 'timetable',
    clock: clock ?? view.data.route.nowBeforeStart,
    inner,
    address,
    screen: screen.id,
  });
}

/**
 * Fits the devices to their places and finishes what needs measuring.
 * @param {ParentNode} root
 */
export async function settle(root) {
  fitDevices(root);
  await document.fonts.ready;
  for (const screen of root.querySelectorAll('.screen')) settleText(screen);
}
