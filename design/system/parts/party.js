/**
 * The Party and the Catalog: the people of an Outing, what a Route offers to
 * each of them, their votes, their Chat, where they meet — and a published
 * Route with what people say of it.
 */
import { icons } from '../icons.js';
import { thumb } from './route.js';

/** @typedef {'ru' | 'en'} Lang */

/** A member of a Party as a disc with the first letter of the name. @param {any} member @param {Lang} lang @param {string} [is] */
export const face = (member, lang, is = '') =>
  `<i class="tt-face${is ? ` is-${is}` : ''}" aria-hidden="true">${member.name[lang].slice(0, 1)}</i>`;

/** The members of a Party as overlapping discs. @param {any[]} members @param {Lang} lang @param {string} name what a screen reader says */
export const faces = (members, lang, name) =>
  `<span class="tt-faces" role="img" aria-label="${name}">${members.map((m) => face(m, lang)).join('')}</span>`;

/**
 * A member of a Party in a list: the name, what is known of them now, and a
 * mark that is always a word.
 * @param {any} member @param {Lang} lang @param {{ note: string, mark?: string, is?: 'ok' | 'wait' | 'off' }} options
 */
export const memberRow = (member, lang, { note, mark = '', is }) =>
  `<li class="tt-member${is ? ` is-${is}` : ''}">${face(member, lang)}<span class="tt-member-body"><b>${member.name[lang]}</b><small>${note}</small></span>${mark ? `<span class="tt-member-mark">${mark}</span>` : ''}</li>`;

/** @param {string} name @param {string[]} rows */
export const members = (name, rows) =>
  `<ul class="tt-members" aria-label="${name}">${rows.join('')}</ul>`;

/**
 * A Route offered to a Party (PTY-8): its character, one line on what is in
 * it for whom, a tag for each member, and — once the Party votes — the two
 * keys "for" and "against" with the count of each (PTY-10).
 * @param {Lang} lang
 * @param {{ name: string, line: string, route: any, stops: any[], tags: { member: any, got: string }[], times: string, facts: string, chosen?: boolean, vote?: { mine: 'for' | 'against' | '', for: number, against: number, labels: { for: string, against: string } } }} option
 */
export function partyOption(lang, { name, line, stops, tags, times, facts, chosen = false, vote }) {
  const shown = stops.slice(0, 6);
  return `<article class="tt-party-option${chosen ? ' is-chosen' : ''}">
    <header><b>${name}</b><span class="tt-variant-times">${times}</span></header>
    <p class="tt-party-line">${line}</p>
    <ul class="tt-party-tags">${tags.map((tag) => `<li>${face(tag.member, lang)}<span><b>${tag.member.name[lang]}</b> · ${tag.got}</span></li>`).join('')}</ul>
    <div class="tt-variant-foot"><span class="tt-variant-thumbs">${shown.map((s) => thumb(s, '')).join('')}${stops.length > shown.length ? `<i>+${stops.length - shown.length}</i>` : ''}</span><span class="tt-variant-facts">${facts}</span></div>
    ${
      vote
        ? `<div class="tt-vote" role="group" aria-label="${name}"><button aria-pressed="${vote.mine === 'for'}">${icons.like}<span>${vote.labels.for}</span><b>${vote.for}</b></button><button aria-pressed="${vote.mine === 'against'}">${icons.dislike}<span>${vote.labels.against}</span><b>${vote.against}</b></button></div>`
        : ''
    }
    ${chosen ? `<span class="tt-option-mark">${icons.check}</span>` : ''}
  </article>`;
}

/**
 * The Chat of a Party (PTY-13): messages, reactions, and what the system
 * says — "Dima answered", "option 2 chosen". No files, no voice.
 * @param {Lang} lang
 * @param {({ event: string } | { from?: any, text: string, at: string, mine?: boolean, reaction?: string, waiting?: string })[]} lines
 * @param {string} name what a screen reader calls the list
 */
export const chat = (lang, lines, name) =>
  `<ol class="tt-chat" aria-label="${name}">${lines
    .map((line) =>
      'event' in line
        ? `<li class="tt-chat-event">${line.event}</li>`
        : `<li class="tt-chat-line${line.mine ? ' is-mine' : ''}">${line.from ? face(line.from, lang) : ''}<div>${line.from ? `<small>${line.from.name[lang]}</small>` : ''}<p>${line.text}</p><time>${line.waiting ? `${icons.sync}${line.waiting}` : line.at}</time>${line.reaction ? `<span class="tt-chat-reaction">${icons.like}${line.reaction}</span>` : ''}</div></li>`,
    )
    .join('')}</ol>`;

/**
 * Where a message is written. Without a network it stays in its place and
 * says why it cannot be used (OUT-15).
 * @param {{ hint: string, send: string, off?: string }} options
 */
export const composer = ({ hint, send, off }) =>
  `<div class="tt-composer lg${off ? ' is-off' : ''}"><span class="tt-composer-well" role="textbox" tabindex="0" aria-label="${hint}"${off ? ' aria-disabled="true"' : ''}>${off ? `${icons.noNetwork}${off}` : hint}</span><button aria-label="${send}"${off ? ' disabled' : ''}>${icons.send}</button></div>`;

/**
 * A rating shown, not asked for: the number, and five stars of which that
 * many are filled.
 * @param {number} value @param {string} say what a screen reader says
 */
export const stars = (value, say) =>
  `<span class="tt-stars" role="img" aria-label="${say}"><b>${value.toFixed(1)}</b>${[1, 2, 3, 4, 5].map((n) => (n <= Math.round(value) ? icons.star.replace('class="icon"', 'class="icon is-on"') : icons.star)).join('')}</span>`;

/**
 * A Review of a published Route (CAT-7): who, when, the rating, the words —
 * and the way to say that it is unacceptable (FBK-4).
 * @param {Lang} lang @param {{ member: any, date: string, rating: number, say: string, text: string, more: string }} review
 */
export const review = (lang, { member, date, rating, say, text, more }) =>
  `<article class="tt-review">${face(member, lang)}<div><header><b>${member.name[lang]}</b><small>${date}</small>${stars(rating, say)}</header><p>${text}</p></div><button aria-label="${more}">${icons.moreIos}</button></article>`;

/**
 * The Recap of a finished Outing (OUT-21): one card with the walked line,
 * the name of the product, what was asked for and the measures — made to be
 * saved or posted.
 * @param {{ map: string, mark: string, kicker: string, title: string, figures: string }} card
 */
export const recap = ({ map, mark, kicker, title, figures }) =>
  `<figure class="tt-recap"><div class="tt-recap-map">${map}</div><figcaption><span class="tt-og-brand"><img src="${mark}" alt="" />Promenade</span><small>${kicker}</small><b>${title}</b>${figures}</figcaption></figure>`;
