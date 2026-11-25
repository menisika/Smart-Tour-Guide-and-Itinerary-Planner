/**
 * Renders a screen of a direction inside the outline of a device.
 */
import { loadData } from './shared/data.js';
import { fitDevices, frame } from './shared/frames.js';
import { installMap } from './shared/map.js';

/** @type {Promise<any> | undefined} */
let loading;

/** The data of the mockups, loaded once, with the map put into the document. */
export function ready() {
  loading ??= loadData().then(async (data) => {
    installMap(data.map);
    await document.fonts.ready;
    return data;
  });
  return loading;
}

/**
 * @param {any} direction
 * @param {{ screen: 'route' | 'outing', os: 'ios' | 'android' | 'web', theme: 'light' | 'dark', lang: 'ru' | 'en', data: any }} state
 */
export function renderScreen(direction, state) {
  const draw = state.os === 'web' ? direction.web[state.screen] : direction.screens[state.screen];
  const { inner, clock, address } = draw(state);
  return frame({ ...state, direction: direction.id, clock, inner, address });
}

/**
 * Fits the devices to their places and lets each direction finish what needs
 * measuring: the size of the text is known only once it is on the page.
 * @param {ParentNode} root @param {any[]} directions
 */
export async function settle(root, directions) {
  fitDevices(root);
  // Fonts asked for by the screens just added.
  await document.fonts.ready;
  for (const direction of directions) {
    for (const screen of root.querySelectorAll(`.d-${direction.id}`)) direction.settle?.(screen);
  }
}
