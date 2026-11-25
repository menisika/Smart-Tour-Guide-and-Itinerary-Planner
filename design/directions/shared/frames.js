/**
 * What surrounds a screen: the outline of a phone or of a browser window and
 * the system's own bars.
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
// The product's icons are part of the design system.

import { icons } from '../../system/icons.js';

export { icons };

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
