/**
 * What surrounds a screen: the outline of a phone or of a browser window, the
 * system's own bars, and the product's icons.
 *
 * The outlines are plain on purpose. They say "this is an iPhone", "this is an
 * Android phone", "this is a browser" and nothing more, so that what is judged
 * is the design inside them.
 */

/** @typedef {'ios' | 'android' | 'web'} Os */

export const SIZES = {
  ios: { width: 393, height: 852 },
  android: { width: 412, height: 892 },
  web: { width: 1280, height: 800 },
};

/** Height the system keeps at the top and at the bottom of a phone screen. */
export const INSETS = {
  ios: { top: 54, bottom: 34 },
  android: { top: 44, bottom: 24 },
  web: { top: 0, bottom: 0 },
};

// ── Icons ───────────────────────────────────────────────────────────────────
// Drawn for these mockups on a 24-unit grid; lines take the colour of the text.

const stroke = (/** @type {string} */ body) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const solid = (/** @type {string} */ body) =>
  `<svg class="icon icon-solid" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">${body}</svg>`;

export const icons = {
  backIos: stroke('<path d="M15 4.5 7.5 12l7.5 7.5"/>'),
  backAndroid: stroke('<path d="M20 12H4.5M11 5.5 4.5 12l6.5 6.5"/>'),
  close: stroke('<path d="m6 6 12 12M18 6 6 18"/>'),
  shareIos: stroke(
    '<path d="M12 15V3.5M8 7l4-4 4 4M7.5 11H6a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 18 11h-1.5"/>',
  ),
  shareAndroid: stroke(
    '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/>',
  ),
  moreIos: solid(
    '<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>',
  ),
  moreAndroid: solid(
    '<circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>',
  ),
  download: stroke('<path d="M12 3.5v12M7 10.5l5 5 5-5M5 20.5h14"/>'),
  edit: stroke('<path d="M4 20h4L19.5 8.5l-4-4L4 16v4ZM13.5 6.5l4 4"/>'),
  play: solid(
    '<path d="M7.5 4.3v15.4a.8.8 0 0 0 1.22.68l12.3-7.7a.8.8 0 0 0 0-1.36L8.72 3.62a.8.8 0 0 0-1.22.68Z"/>',
  ),
  pause: solid(
    '<rect x="6" y="4" width="4.5" height="16" rx="1"/><rect x="13.5" y="4" width="4.5" height="16" rx="1"/>',
  ),
  next: `<svg class="icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 5.5v13l10-6.5-10-6.5Z"/><path d="M19 5v14" fill="none"/></svg>`,
  back10: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.3 8.2A8 8 0 1 1 4 12.5"/><path d="M4.8 3.5v5h5"/><text x="12.3" y="15.3" text-anchor="middle" font-size="6.8" font-weight="700" fill="currentColor" stroke="none" font-family="inherit">10</text></svg>`,
  map: stroke('<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4ZM9 4v14M15 6v14"/>'),
  list: stroke(
    '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2.6"/>',
  ),
  check: stroke('<path d="m5 12.7 4.5 4.5L19 7.5"/>'),
  walk: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13.4" cy="4.3" r="1.7" fill="currentColor" stroke="none"/><path d="M12.6 8.3 10.4 13.6l3.2 2.6V21M10.4 13.6 8 21M12.6 8.3l3 3.2 2.9.7M12.3 8.3 8.9 10.1 8 13.5"/></svg>`,
  headphones: stroke(
    '<path d="M4 14.5V12a8 8 0 0 1 16 0v2.5"/><path d="M4 14.5h3V20H5.5A1.5 1.5 0 0 1 4 18.5v-4ZM20 14.5h-3V20h1.5a1.5 1.5 0 0 0 1.5-1.5v-4Z"/>',
  ),
  locate: stroke(
    '<circle cx="12" cy="12" r="5"/><path d="M12 2.5V7M12 17v4.5M2.5 12H7M17 12h4.5"/>',
  ),
  flag: stroke('<path d="M5.5 21V4h12l-2.5 4 2.5 4h-12"/>'),
  book: stroke(
    '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5v-15ZM5 20.5A2.5 2.5 0 0 0 7.5 21H19v-3"/>',
  ),
  pack: stroke('<path d="m4 8 8-4.5L20 8v8l-8 4.5L4 16V8ZM4 8l8 4.5L20 8M12 12.5v8"/>'),
  arrowDown: stroke('<path d="M12 4.5v15M6 13.5l6 6 6-6"/>'),
  arrowRight: stroke('<path d="M4.5 12h15M13.5 6l6 6-6 6"/>'),
  // The kinds of Place, in the same hand.
  building: stroke(
    '<path d="M5 20.5V7l7-3.5L19 7v13.5M3.5 20.5h17M9 10h1.5M13.5 10H15M9 13.5h1.5M13.5 13.5H15M10.5 20.5V17h3v3.5"/>',
  ),
  church: stroke(
    '<path d="M12 2.5v3.5M10.4 4h3.2M9.5 20.5V9.5L12 6l2.5 3.5v11M9.5 12.5l-5 2.5v5.5M14.5 12.5l5 2.5v5.5M3.5 20.5h17M12 20.5v-3.5"/>',
  ),
  theatre: stroke(
    '<path d="M3.5 9.5 12 4l8.5 5.5h-17ZM6 12.5V18M10 12.5V18M14 12.5V18M18 12.5V18M3.5 20.5h17"/>',
  ),
  ensemble: stroke(
    '<path d="M4.5 20.5V8.5L7 5l2.5 3.5v12M14.5 20.5v-12L17 5l2.5 3.5v12M9.5 14h5M3 20.5h18"/>',
  ),
  station: stroke(
    '<rect x="6" y="3.5" width="12" height="13" rx="3"/><path d="M6 10.5h12M9.5 16.5 8 20.5M14.5 16.5l1.5 4"/><path d="M9.5 13.5h.01M14.5 13.5h.01" stroke-width="2.4"/>',
  ),
  pin: stroke(
    '<path d="M12 21s-6.5-5.7-6.5-10.6a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21Z"/><circle cx="12" cy="10.4" r="2.3"/>',
  ),
  clock: stroke('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  eye: stroke(
    '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  ),
  shield: stroke(
    '<path d="M12 3 5 5.8v5.6c0 4.3 2.9 7.7 7 9.1 4.1-1.4 7-4.8 7-9.1V5.8L12 3Z"/><path d="m8.8 12 2.3 2.3 4.2-4.6"/>',
  ),
  lines: stroke('<path d="M5 6.5h14M5 11.5h14M5 16.5h9"/>'),
  chevronRight: stroke('<path d="m9 5 7 7-7 7"/>'),
  lock: stroke(
    '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  ),
  reload: stroke('<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19.5 4v4.5H15"/>'),
};

// ── System bars ─────────────────────────────────────────────────────────────

const iosStatus = (/** @type {string} */ clock) => `
  <div class="sys sys-ios-status" aria-hidden="true">
    <span class="sys-clock">${clock}</span>
    <span class="sys-island"></span>
    <span class="sys-right">
      <svg viewBox="0 0 18 12" width="18" height="12"><rect x="0" y="8" width="3" height="4" rx="0.8"/><rect x="5" y="5.5" width="3" height="6.5" rx="0.8"/><rect x="10" y="3" width="3" height="9" rx="0.8"/><rect x="15" y="0" width="3" height="12" rx="0.8"/></svg>
      <svg viewBox="0 0 17 12" width="17" height="12"><path d="M8.5 2.4c2.3 0 4.4.9 6 2.4l1.1-1.2A10.3 10.3 0 0 0 8.5.8 10.3 10.3 0 0 0 1.4 3.6l1.1 1.2a8.7 8.7 0 0 1 6-2.4Zm0 3.7c1.3 0 2.5.5 3.4 1.3l1.1-1.2a6.6 6.6 0 0 0-9 0l1.1 1.2c.9-.8 2.1-1.3 3.4-1.3Zm0 3.5c-.7 0-1.3.3-1.8.7l1.8 1.9 1.8-1.9c-.5-.4-1.1-.7-1.8-.7Z"/></svg>
      <svg viewBox="0 0 27 13" width="27" height="13"><rect x="0.5" y="0.5" width="22" height="12" rx="3.8" fill="none" stroke="currentColor" opacity="0.4"/><rect x="2" y="2" width="15" height="9" rx="2.3"/><path d="M24 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z" opacity="0.45"/></svg>
    </span>
  </div>`;

const androidStatus = (/** @type {string} */ clock) => `
  <div class="sys sys-android-status" aria-hidden="true">
    <span class="sys-clock">${clock}</span>
    <span class="sys-camera"></span>
    <span class="sys-right">
      <svg viewBox="0 0 16 13" width="16" height="13"><path d="M8 13 .3 3.6A12 12 0 0 1 8 .8c2.9 0 5.6 1 7.7 2.8L8 13Z"/></svg>
      <svg viewBox="0 0 13 13" width="13" height="13"><path d="M13 0v13H0L13 0Z"/></svg>
      <svg viewBox="0 0 9 14" width="9" height="14"><path d="M3 0h3v1.5h1.5A1.5 1.5 0 0 1 9 3v9.5A1.5 1.5 0 0 1 7.5 14h-6A1.5 1.5 0 0 1 0 12.5V3a1.5 1.5 0 0 1 1.5-1.5H3V0Z"/></svg>
    </span>
  </div>`;

const browserBar = (/** @type {string} */ address) => `
  <div class="sys sys-browser" aria-hidden="true">
    <span class="sys-browser-nav">${icons.backAndroid}${icons.reload}</span>
    <span class="sys-browser-address">${icons.lock}<span>${address}</span></span>
    <span class="sys-browser-space"></span>
  </div>`;

/**
 * @param {object} options
 * @param {Os} options.os
 * @param {'light' | 'dark'} options.theme
 * @param {'ru' | 'en'} options.lang
 * @param {string} options.direction id of the direction, used as a class
 * @param {string} options.clock what the system clock shows
 * @param {string} options.inner the screen itself
 * @param {string} [options.address] for the browser
 * @param {string} [options.screen] a class for the kind of screen
 */
export function frame({ os, theme, lang, direction, clock, inner, address = '', screen = '' }) {
  const size = SIZES[os];
  const bars =
    os === 'ios'
      ? `${iosStatus(clock)}<span class="sys sys-ios-home" aria-hidden="true"></span>`
      : os === 'android'
        ? `${androidStatus(clock)}<span class="sys sys-android-nav" aria-hidden="true"></span>`
        : browserBar(address);
  return `<div class="device device-${os}" style="--w:${size.width};--h:${size.height}">
    <div class="device-zoom">
      <div class="screen d-${direction} s-${screen}" data-theme="${theme}" data-os="${os}" lang="${lang}">
        ${os === 'web' ? `${bars}<div class="page">${inner}</div>` : `${inner}${bars}`}
      </div>
    </div>
  </div>`;
}

/**
 * Scales every device inside the element to the width it has been given.
 * @param {ParentNode} root
 */
export function fitDevices(root = document) {
  for (const device of root.querySelectorAll('.device')) {
    if (!(device instanceof HTMLElement)) continue;
    const natural = Number(device.style.getPropertyValue('--w'));
    const available = device.parentElement?.clientWidth ?? natural;
    const limit = Number(device.dataset.maxScale ?? 1);
    device.style.setProperty('--z', String(Math.min(limit, available / natural)));
  }
}
