/**
 * The public web: the same components in a browser's window. At the width of
 * a desk the map fills the window and what the timetable says stands in a
 * panel of glass at its side; at the width of a phone the panel is a sheet
 * under the map. And what a messenger shows of a link: the preview.
 */
import { icons } from '../icons.js';
import { T } from '../strings.js';

/** @typedef {'ru' | 'en'} Lang */

/**
 * The bar of the web: the name of the product, the two languages, and the
 * way into the application.
 * @param {Lang} lang @param {{ mark: string, action?: string }} options `mark` is the address of the sign
 */
export const webNav = (lang, { mark, action = T[lang].open }) =>
  `<nav class="tt-webnav lg">
    <span class="tt-wordmark"><img src="${mark}" alt="" />Promenade</span>
    <button class="tt-langs" aria-label="${lang === 'ru' ? 'Язык: русский' : 'Language: English'}"><b>${lang === 'ru' ? 'Рус' : 'Eng'}</b>${lang === 'ru' ? 'Eng' : 'Рус'}</button>
    <button class="tt-action lg lg-tint">${action}</button>
  </nav>`;

/**
 * The panel of a web page: glass, because it is the timetable speaking. What
 * it holds may scroll; its actions stay at its foot.
 * @param {string} inner @param {{ foot?: string, is?: string }} [options]
 */
export const panel = (inner, { foot = '', is = '' } = {}) =>
  `<section class="tt-sheet tt-panel lg${is ? ` ${is}` : ''}"><div class="tt-panel-body">${inner}</div>${foot ? `<div class="tt-panel-foot">${foot}</div>` : ''}</section>`;

/**
 * A card in the middle of the window, over a dimmed page: signing in,
 * deleting the account.
 * @param {string} inner @param {{ name: string }} options what a screen reader calls it
 */
export const webCard = (inner, { name }) =>
  `<i class="tt-scrim"></i><section class="tt-webcard" role="dialog" aria-label="${name}">${inner}</section>`;

/** A line under the page: what a browser cannot do, said once. @param {string} text */
export const webNote = (text) => `<p class="tt-webnote lg">${text}</p>`;

/**
 * The picture a link carries into a messenger (ADR-0007, point 2): the line
 * of the Route on the map, the name of the product, and in the timetable's
 * numerals what matters first. It is composed at half of 1200 × 630 and
 * shown at the size a messenger gives it.
 * @param {{ map: string, mark: string, kicker: string, title: string, figure: string, note: string }} picture
 */
export const linkPicture = ({ map, mark, kicker, title, figure, note }) =>
  `<span class="tt-og"><span class="tt-og-in"><span class="tt-og-map">${map}</span><span class="tt-og-words"><span class="tt-og-brand"><img src="${mark}" alt="" />Promenade</span><small>${kicker}</small><b>${title}</b><span class="tt-og-figure">${figure}</span><small>${note}</small></span></span></span>`;

/**
 * A link as a messenger shows it: the picture, a title, a line, the site.
 * The frame is the messenger's own; only what is inside is ours.
 * @param {{ picture: string, title: string, text: string, host: string }} link
 */
export const linkPreview = ({ picture, title, text, host }) =>
  `<a class="tt-link" href="https://${host}">${picture}<span class="tt-link-words"><small>${host}</small><b>${title}</b><span>${text}</span></span></a>`;

/**
 * A conversation in someone else's messenger, drawn plainly: it is not our
 * design, it is where our link arrives.
 * @param {{ title: string, people: string, messages: { from?: string, text?: string, link?: string, mine?: boolean, at: string }[] }} chat
 */
export const messenger = ({ title, people, messages }) =>
  `<div class="tt-msgr" aria-label="${title}">
    <header><span class="tt-msgr-face">${icons.people}</span><span><b>${title}</b><small>${people}</small></span></header>
    <ol>${messages
      .map(
        (m) =>
          `<li class="${m.mine ? 'is-mine' : ''}">${m.from ? `<small class="tt-msgr-from">${m.from}</small>` : ''}${m.text ? `<p>${m.text}</p>` : ''}${m.link ?? ''}<time>${m.at}</time></li>`,
      )
      .join('')}</ol>
  </div>`;

/**
 * A letter the product sends, as a mail application shows it: who it is
 * from, its subject, and the letter itself. The frame is the mail
 * application's; the letter is ours.
 * @param {{ from: string, address: string, subject: string, mark: string, body: string }} mail
 */
export const letter = ({ from, address, subject, mark, body }) =>
  `<article class="tt-letter"><header><span class="tt-msgr-face">${icons.mail}</span><span><b>${from}</b><small>${address}</small></span></header><h1>${subject}</h1><div class="tt-letter-body"><img src="${mark}" alt="Promenade" />${body}</div></article>`;
