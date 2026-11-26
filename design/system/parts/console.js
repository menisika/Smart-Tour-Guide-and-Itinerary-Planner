/**
 * The components of the internal console: a desk and a long session. The
 * same faces, colours and icons as the product, at the console's own density
 * and with no glass. Each function returns markup; the rules are in
 * `css/console.css`, written from the tokens.
 *
 * A component says nothing by itself: every word, and the name of every
 * control that is only an icon, is given to it.
 */
import { icons, kindIcon } from '../icons.js';
import { fitView, layersOf, mapSvg, pinned } from './map.js';

/** @typedef {'ru' | 'en'} Lang */
/** @typedef {'light' | 'dark' | 'sun'} Theme */
/** @typedef {'ok' | 'warn' | 'stop' | 'info' | 'quiet'} Tone */

/** A file of the design system, by its path from the folder of the system. @param {string} path */
const asset = (path) => new URL(`../${path}`, import.meta.url).pathname;

/** An icon at the size of a line of text. @param {string} icon */
const small = (icon) => icon.replace('class="icon', 'class="icon cs-i');

// ── Marks and controls ──────────────────────────────────────────────────────

/**
 * A status mark: always a word, with a sign of its own, never colour alone.
 * @param {string} label @param {{ is?: Tone, icon?: string }} [options]
 */
export function tag(label, { is = 'quiet', icon } = {}) {
  const sign =
    icon ??
    { ok: icons.check, warn: icons.warning, stop: icons.alert, info: icons.info, quiet: '' }[is];
  return `<span class="cs-tag is-${is}">${sign ? small(sign) : ''}<span>${label}</span></span>`;
}

/**
 * An action. A screen has one that is prominent; the rest are quiet.
 * @param {string} label
 * @param {{ icon?: string, kind?: 'main' | 'second' | 'quiet' | 'danger', disabled?: boolean, busy?: boolean }} [options]
 */
export const button = (
  label,
  { icon = '', kind = 'second', disabled = false, busy = false } = {},
) =>
  `<button class="cs-btn is-${kind}"${disabled ? ' disabled' : ''}${busy ? ' aria-busy="true"' : ''}>${busy ? '<i class="tt-spinner"></i>' : icon ? small(icon) : ''}<span>${label}</span></button>`;

/** A control that is only an icon: it is given its name. @param {string} icon @param {string} name @param {{ on?: boolean, disabled?: boolean }} [options] */
export const iconButton = (icon, name, { on, disabled = false } = {}) =>
  `<button class="cs-icon-btn" aria-label="${name}"${on === undefined ? '' : ` aria-pressed="${on}"`}${disabled ? ' disabled' : ''}>${small(icon)}</button>`;

/** Words that lead somewhere: a row of a table opens what it names. @param {string} label @param {string} [note] */
export const link = (label, note = '') =>
  `<button class="cs-link"><span>${label}</span>${note ? `<small>${note}</small>` : ''}</button>`;

/**
 * A choice of a few, all in sight.
 * @param {string} name @param {{ label: string, count?: number | string }[]} items @param {number} chosen
 */
export const seg = (name, items, chosen) =>
  `<div class="cs-seg" role="radiogroup" aria-label="${name}">${items
    .map(
      (item, i) =>
        `<button role="radio" aria-checked="${i === chosen}">${i === chosen ? small(icons.check) : ''}<span>${item.label}</span>${item.count === undefined ? '' : `<b>${item.count}</b>`}</button>`,
    )
    .join('')}</div>`;

/**
 * The parts of one page, as tabs.
 * @param {string} name @param {{ label: string, count?: number | string }[]} items @param {number} chosen
 */
export const tabs = (name, items, chosen) =>
  `<div class="cs-tabs" role="tablist" aria-label="${name}">${items
    .map(
      (item, i) =>
        `<button role="tab" aria-selected="${i === chosen}"><span>${item.label}</span>${item.count === undefined ? '' : `<b>${item.count}</b>`}</button>`,
    )
    .join('')}</div>`;

/** A switch with its name; "on" is said by the place of the knob and by a tick. @param {string} name @param {boolean} on @param {{ label?: string }} [options] */
export const check = (name, on, { label = '' } = {}) =>
  `<button class="cs-switch" role="switch" aria-checked="${on}" aria-label="${name}"><i>${on ? small(icons.check) : ''}</i>${label ? `<span>${label}</span>` : ''}</button>`;

/**
 * A field of one line.
 * @param {{ name: string, value?: string, hint?: string, unit?: string, icon?: string, is?: 'serif' | 'wrong' | 'active' | '' }} field
 */
export const input = ({ name, value = '', hint = '', unit = '', icon = '', is = '' }) =>
  `<span class="cs-input${is ? ` is-${is}` : ''}${value ? '' : ' is-empty'}" role="textbox" tabindex="0" aria-label="${name}"${is === 'wrong' ? ' aria-invalid="true"' : ''}>${icon ? small(icon) : ''}<span>${value || hint}</span>${unit ? `<small>${unit}</small>` : ''}</span>`;

/** A field of several lines: the text of a fact being edited. @param {{ name: string, value: string }} field */
export const textarea = ({ name, value }) =>
  `<span class="cs-input is-area is-serif is-active" role="textbox" tabindex="0" aria-multiline="true" aria-label="${name}"><span>${value}</span></span>`;

/** One of a list, closed. @param {{ name: string, value: string, icon?: string }} field */
export const select = ({ name, value, icon = '' }) =>
  `<button class="cs-select" aria-haspopup="listbox" aria-label="${name}: ${value}">${icon ? small(icon) : ''}<span>${value}</span>${small(icons.chevronDown)}</button>`;

/**
 * A number that is stepped.
 * @param {{ name: string, value: string, less: string, more: string }} field
 */
export const stepper = ({ name, value, less, more }) =>
  `<span class="cs-stepper" role="group" aria-label="${name}"><button aria-label="${less}">${small(icons.minus)}</button><output>${value}</output><button aria-label="${more}">${small(icons.plus)}</button></span>`;

/** A person: an initial in a disc, a name, and what they are here. @param {{ name: string, note?: string }} person */
export const person = ({ name, note = '' }) =>
  `<span class="cs-person"><i aria-hidden="true">${name.slice(0, 1)}</i><span><b>${name}</b>${note ? `<small>${note}</small>` : ''}</span></span>`;

/** A number in a disc, as a stop of a Route has one: an order. @param {number | string} n @param {'' | 'off' | 'accent'} [is] */
export const disc = (n, is = '') => `<i class="cs-disc${is ? ` is-${is}` : ''}">${n}</i>`;

/** A sign of a kind of Place on a tile. @param {string} kind */
export const kindTile = (kind) => `<span class="cs-kind">${small(kindIcon(kind))}</span>`;

// ── The shell ───────────────────────────────────────────────────────────────

/**
 * The application: the navigation that stays at the side, a bar that says
 * where one is and who one is here, and the page.
 * @param {object} shell
 * @param {Theme} shell.theme
 * @param {string} shell.word the word for "console", beside the lockup
 * @param {string} shell.navName
 * @param {{ label: string, value: string }} shell.city
 * @param {{ title: string, items: { icon: string, label: string, count?: number | string, current?: boolean }[] }[]} shell.nav
 * @param {string[]} shell.crumbs where one is, the last being the page
 * @param {{ name: string, note: string }} shell.me
 * @param {string} shell.role
 * @param {{ search: string, hint: string, help: string }} shell.say
 * @param {string} shell.body
 */
export function shell({ theme, word, navName, city, nav, crumbs, me, role, say, body }) {
  const lockup = asset(theme === 'dark' ? 'mark/lockup-on-dark.svg' : 'mark/lockup.svg');
  const groups = nav
    .map(
      (group) =>
        `<div class="cs-nav-group"><h2>${group.title}</h2>${group.items
          .map(
            (item) =>
              `<button class="cs-nav-item"${item.current ? ' aria-current="page"' : ''}>${small(item.icon)}<span>${item.label}</span>${item.count === undefined ? '' : `<b>${item.count}</b>`}</button>`,
          )
          .join('')}</div>`,
    )
    .join('');
  return `<div class="cs">
    <nav class="cs-nav" aria-label="${navName}">
      <p class="cs-brand"><img src="${lockup}" alt="Promenade" /><span>${word}</span></p>
      <button class="cs-city" aria-label="${city.label}: ${city.value}">${small(icons.pin)}<span><small>${city.label}</small><b>${city.value}</b></span>${small(icons.chevronDown)}</button>
      ${groups}
    </nav>
    <header class="cs-bar">
      <ol class="cs-crumbs">${crumbs.map((crumb, i) => `<li${i === crumbs.length - 1 ? ' aria-current="page"' : ''}>${crumb}</li>`).join('')}</ol>
      ${input({ name: say.search, hint: say.hint, icon: icons.search })}
      ${tag(role, { is: 'quiet', icon: icons.shield })}
      <button class="cs-me" aria-label="${me.name}, ${me.note}">${person(me)}${small(icons.chevronDown)}</button>
    </header>
    <main class="cs-main">${body}</main>
  </div>`;
}

/**
 * The head of a page: what it is, in one line, with what can be done to all of it.
 * @param {{ title: string, kicker?: string, note?: string, tags?: string, actions?: string, lead?: string }} head
 *   `lead` stands before the title: the sign of a kind of Place, the way back
 */
export const pageHead = ({ title, kicker = '', note = '', tags = '', actions = '', lead = '' }) =>
  `<header class="cs-head">${lead}<div class="cs-head-words">${kicker ? `<p class="cs-kicker"><span>${kicker}</span>${tags}</p>` : ''}<div class="cs-head-title"><h1>${title}</h1>${kicker ? '' : tags}</div>${note ? `<p class="cs-head-note">${note}</p>` : ''}</div>${actions ? `<div class="cs-actions">${actions}</div>` : ''}</header>`;

/**
 * Panes side by side: a list and what is chosen in it, an editor and its map.
 * @param {string[]} panes @param {string} columns the widths, as a grid template
 * @param {string} [rows] the heights, where the panes stand one under another
 */
export const split = (panes, columns, rows = '') =>
  `<div class="cs-split" style="grid-template-columns:${columns}${rows ? `;grid-template-rows:${rows}` : ''}">${panes.join('')}</div>`;

/**
 * A pane: a head that stays, a body, and a foot for what is done with it.
 * @param {{ title?: string, note?: string, tools?: string, body: string, foot?: string, is?: string }} pane
 *   `is`: `flush` for a body that goes to the edges (a table, a map), `quiet` for the second ground
 */
export const pane = ({ title = '', note = '', tools = '', body, foot = '', is = '' }) =>
  `<section class="cs-pane${
    is
      ? ` ${is
          .split(' ')
          .map((name) => `is-${name}`)
          .join(' ')}`
      : ''
  }">${title || tools ? `<header class="cs-pane-head"><div><h2>${title}</h2>${note ? `<p>${note}</p>` : ''}</div>${tools ? `<div class="cs-actions">${tools}</div>` : ''}</header>` : ''}<div class="cs-pane-body">${body}</div>${foot ? `<footer class="cs-pane-foot">${foot}</footer>` : ''}</section>`;

/** A part of a pane under its own small title; without a title, a part set apart. @param {string} title @param {string} body @param {{ tools?: string, note?: string }} [options] */
export const block = (title, body, { tools = '', note = '' } = {}) =>
  `<section class="cs-block">${title ? `<header><h3>${title}</h3>${note ? `<p>${note}</p>` : ''}${tools ? `<div class="cs-actions">${tools}</div>` : ''}</header>` : ''}${body}</section>`;

/** The figures of a page, in a band under its head. @param {string} inner */
export const strip = (inner) => `<div class="cs-band">${inner}</div>`;

/** The inner space of a pane whose body otherwise goes to its edges. @param {string} inner */
export const padded = (inner) => `<div class="cs-pane-body">${inner}</div>`;

/** Something kept at a height: a map above a list. @param {string} inner @param {number} height in pixels */
export const fixed = (inner, height) =>
  `<div class="cs-fixed" style="height:${height}px">${inner}</div>`;

/**
 * A component standing alone, outside the shell: how the page of the system shows it.
 * @param {string} inner @param {string} [is] `flush` to the edges, `narrow` for what is read in a column
 */
export const sample = (inner, is = '') =>
  `<div class="cs cs-sample${
    is
      ? ` ${is
          .split(' ')
          .map((name) => `is-${name}`)
          .join(' ')}`
      : ''
  }">${inner}</div>`;

/** A state that takes the place of content stands in the middle of its pane. @param {string} inner */
export const centred = (inner) => `<div class="cs-empty">${inner}</div>`;

/** A few things one under another, as one column of a row. @param {string} inner */
export const column = (inner) => `<div class="cs-col">${inner}</div>`;

/** Controls or marks side by side. @param {string} inner */
export const group = (inner) => `<span class="cs-actions">${inner}</span>`;

/** A line of words in a pane. @param {string} words */
export const text = (words) => `<p class="cs-text">${words}</p>`;

/** Words said quietly: "none", "no data". @param {string} words */
export const quiet = (words) => `<small>${words}</small>`;

/** A value that matters in a line. @param {string} words */
export const strong = (words) => `<b>${words}</b>`;

/** Panes one under another, or a grid of them. @param {string[]} parts @param {string} [template] rows or columns, as a grid template @param {'rows' | 'columns'} [along] */
export const stack = (parts, template = '', along = 'rows') =>
  `<div class="cs-stack is-${along}"${template ? ` style="grid-template-${along}:${template}"` : ''}>${parts.join('')}</div>`;

// ── Tables and filters ──────────────────────────────────────────────────────

/**
 * What narrows a list: a search, a few switches that are all in sight, and
 * how much is shown.
 * @param {{ search?: { name: string, hint: string, value?: string }, chips?: { label: string, on: boolean, count?: number | string }[], selects?: { name: string, value: string }[], summary?: string, name: string }} filters
 */
export const filters = ({ search, chips = [], selects = [], summary = '', name }) =>
  `<div class="cs-filters" role="group" aria-label="${name}">${search ? input({ name: search.name, hint: search.hint, value: search.value, icon: icons.search }) : ''}${chips
    .map(
      (chip) =>
        `<button class="cs-chip" aria-pressed="${chip.on}">${chip.on ? small(icons.check) : ''}<span>${chip.label}</span>${chip.count === undefined ? '' : `<b>${chip.count}</b>`}</button>`,
    )
    .join(
      '',
    )}${selects.map((s) => select({ name: s.name, value: s.value })).join('')}${summary ? `<p class="cs-filters-sum">${summary}</p>` : ''}</div>`;

/**
 * A table. A head that sorts is a control and says which way; a row may be
 * chosen, struck out, or marked; the first cell of a row names it.
 * @param {object} table
 * @param {string} table.name
 * @param {{ label: string, sort?: 'ascending' | 'descending' | 'none', end?: boolean, width?: string, say?: string }[]} table.columns
 *   `say` names a column whose head shows nothing
 * @param {{ cells: string[], is?: 'chosen' | 'off' | 'warn' | 'stop' }[]} table.rows
 * @param {{ label: string, span: number, cells: string[] }} [table.foot] a last row that sums the others: its
 *   name over the first `span` columns, then a cell for each column left
 * @param {'tall' | ''} [table.is] `tall` for rows of two lines
 */
export function table({ name, columns, rows, foot, is = '' }) {
  const heads = columns
    .map((column) => {
      const style = column.width ? ` style="width:${column.width}"` : '';
      const end = column.end ? ' class="is-end"' : '';
      if (!column.sort)
        return `<th scope="col"${end}${style}>${column.label || `<span class="tt-sr">${column.say ?? ''}</span>`}</th>`;
      const sign =
        column.sort === 'ascending'
          ? icons.chevronUp
          : column.sort === 'descending'
            ? icons.chevronDown
            : icons.sort;
      return `<th scope="col" aria-sort="${column.sort}"${end}${style}><button class="cs-sort"><span>${column.label}</span>${small(sign)}</button></th>`;
    })
    .join('');
  const body = rows
    .map(
      (row) =>
        `<tr${row.is ? ` class="is-${row.is}"` : ''}${row.is === 'chosen' ? ' aria-selected="true"' : ''}>${row.cells
          .map((cell, i) =>
            i === 0
              ? `<th scope="row"${columns[i]?.end ? ' class="is-end"' : ''}>${cell}</th>`
              : `<td${columns[i]?.end ? ' class="is-end"' : ''}>${cell}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('');
  const sum = foot
    ? `<tfoot><tr><th scope="row" colspan="${foot.span}">${foot.label}</th>${foot.cells.map((cell, i) => `<td${columns[i + foot.span]?.end ? ' class="is-end"' : ''}>${cell}</td>`).join('')}</tr></tfoot>`
    : '';
  return `<table class="cs-table${is ? ` is-${is}` : ''}"><caption class="tt-sr">${name}</caption><thead><tr>${heads}</tr></thead><tbody>${body}</tbody>${sum}</table>`;
}

/** The cell that names a row: a sign or a picture, a name, a line under it. @param {{ lead?: string, name: string, note?: string, go?: boolean }} cell */
export const nameCell = ({ lead = '', name, note = '', go = true }) =>
  `<span class="cs-name">${lead}${go ? link(name, note) : `<span class="cs-name-words"><span>${name}</span>${note ? `<small>${note}</small>` : ''}</span>`}</span>`;

/** A number of a table, with what it counts. @param {string | number} value @param {string} [unit] */
export const num = (value, unit = '') =>
  `<span class="cs-num">${value}${unit ? `<small>${unit}</small>` : ''}</span>`;

/** A share as a number and a short bar. @param {number} share from 0 to 1 @param {string} text @param {Tone} [is] */
export const shareCell = (share, text, is = 'quiet') =>
  `<span class="cs-share is-${is}"><b>${text}</b><i><i style="width:${Math.round(Math.min(1, share) * 100)}%"></i></i></span>`;

/** "Yes" or "no" in a cell: a sign and a word for a screen reader. @param {boolean} on @param {string} yes @param {string} no */
export const mark = (on, yes, no) =>
  `<span class="cs-mark${on ? ' is-on' : ''}">${small(on ? icons.check : icons.minus)}<span class="tt-sr">${on ? yes : no}</span></span>`;

/** The shapes of rows not yet there. @param {number} rows */
export const skeleton = (rows) =>
  `<div class="cs-skel" aria-hidden="true">${Array.from({ length: rows }, () => '<i></i>').join('')}</div>`;

// ── Facts, forms, figures ───────────────────────────────────────────────────

/**
 * Where a fact comes from: the work, the article, its revision and licence.
 * @param {{ work: string, article: string, revision: string, licence: string, name: string }} source `name` names the control that opens it
 */
export const sourceLine = ({ work, article, revision, licence, name }) =>
  `<p class="cs-source">${small(icons.book)}<span><b>${work}</b> · ${article}</span><span>${revision}</span><span>${licence}</span><button class="cs-icon-btn" aria-label="${name}">${small(icons.external)}</button></p>`;

/**
 * A fact of a Dossier: one statement, in the guide's face, with its sources,
 * its themes and whether it is sensitive.
 * @param {object} fact
 * @param {number} fact.n
 * @param {string} fact.text
 * @param {string[]} fact.sources lines made by `sourceLine`
 * @param {string} [fact.tags] themes and marks
 * @param {string} [fact.tools] what can be done to it
 * @param {'removed' | 'flagged' | 'editing' | 'fixed' | ''} [fact.is]
 * @param {string} [fact.note] what is said about its state
 * @param {string} [fact.editor] the field it is edited in, in place of the text
 */
export const fact = ({
  n,
  text,
  sources,
  tags = '',
  tools = '',
  is = '',
  note = '',
  editor = '',
}) =>
  `<li class="cs-fact${is ? ` is-${is}` : ''}">${disc(n, is === 'removed' ? 'off' : '')}<div class="cs-fact-body">${editor || `<p class="cs-fact-text">${text}</p>`}${note ? `<p class="cs-fact-note">${note}</p>` : ''}${sources.join('')}</div><div class="cs-fact-side">${tags ? `<p class="cs-fact-tags">${tags}</p>` : ''}${tools ? `<p class="cs-fact-tools">${tools}</p>` : ''}</div></li>`;

/** @param {string[]} items facts */
export const facts = (items) => `<ol class="cs-facts">${items.join('')}</ol>`;

/**
 * A Story as it will be heard: sentences in the guide's face, each factual
 * one with the numbers of the facts it rests on.
 * @param {{ text: string, facts?: number[], is?: 'lost' | 'picked' | '' }[]} sentences @param {string} [lang]
 */
export const story = (sentences, lang = '') =>
  `<p class="cs-story"${lang ? ` lang="${lang}"` : ''}>${sentences
    .map(
      (s) =>
        `<span${s.is ? ` class="is-${s.is}"` : ''}>${s.text}${s.facts?.length ? `<sup>${s.facts.join(', ')}</sup>` : ''}</span>`,
    )
    .join(' ')}</p>`;

/**
 * A row of a form: what is set, the control, and where the value came from
 * and when it was last checked.
 * @param {{ label: string, control: string, from?: string, note?: string }} row
 */
export const formRow = ({ label, control, from = '', note = '' }) =>
  `<div class="cs-row"><span class="cs-row-label">${label}${note ? `<small>${note}</small>` : ''}</span><span class="cs-row-control">${control}</span>${from ? `<span class="cs-row-from">${from}</span>` : ''}</div>`;

/** @param {string[]} rows */
export const form = (rows) => `<div class="cs-form">${rows.join('')}</div>`;

/** Pairs of a name and a value, read down. @param {{ label: string, value: string }[]} items */
export const details = (items) =>
  `<dl class="cs-dl">${items.map((item) => `<div><dt>${item.label}</dt><dd>${item.value}</dd></div>`).join('')}</dl>`;

/**
 * Key figures: the number in the face of numbers, what it counts under it.
 * @param {{ value: string, unit?: string, label: string, note?: string, is?: Tone }[]} items
 */
export const figures = (items) =>
  `<dl class="cs-figures">${items
    .map(
      (item) =>
        `<div${item.is ? ` class="is-${item.is}"` : ''}><dt>${item.label}</dt><dd><b>${item.value}</b>${item.unit ? `<span>${item.unit}</span>` : ''}</dd>${item.note ? `<dd class="cs-figures-note">${item.note}</dd>` : ''}</div>`,
    )
    .join('')}</dl>`;

/**
 * A small bar chart, read across: a name, a bar, a value.
 * @param {{ name: string, items: { label: string, value: string, share: number, is?: Tone }[], limit?: { share: number, label: string } }} chart
 *   `limit` is a line the bars are read against: a budget
 */
export const bars = ({ name, items, limit }) =>
  `<div class="cs-bars" role="img" aria-label="${name}: ${items.map((item) => `${item.label} ${item.value}`).join('; ')}">${items
    .map(
      (item) =>
        `<div class="cs-bars-row${item.is ? ` is-${item.is}` : ''}"><span>${item.label}</span><i><i style="width:${(Math.min(1, item.share) * 100).toFixed(1)}%"></i>${limit ? `<u style="left:${(limit.share * 100).toFixed(1)}%"></u>` : ''}</i><b>${item.value}</b></div>`,
    )
    .join('')}${limit ? `<p class="cs-bars-limit"><u></u>${limit.label}</p>` : ''}</div>`;

/**
 * The same, read up: a few columns beside each other.
 * @param {{ name: string, items: { label: string, value: string, share: number, is?: Tone }[] }} chart
 */
export const columns = ({ name, items }) =>
  `<div class="cs-cols" role="img" aria-label="${name}: ${items.map((item) => `${item.label} ${item.value}`).join('; ')}">${items
    .map(
      (item) =>
        `<div${item.is ? ` class="is-${item.is}"` : ''}><b>${item.value}</b><i style="--v:${Math.min(1, item.share).toFixed(3)}"></i><span>${item.label}</span></div>`,
    )
    .join('')}</div>`;

/**
 * How much of something is used or done, as one bar with its words.
 * @param {{ name: string, share: number, lead: string, rest?: string, is?: Tone, parts?: { share: number, is: Tone }[] }} meter
 *   `parts` draws the bar in pieces: done, failed
 */
export const meter = ({ name, share, lead, rest = '', is = 'ok', parts }) =>
  `<div class="cs-meter is-${is}"><p><b>${lead}</b>${rest ? `<span>${rest}</span>` : ''}</p><div role="progressbar" aria-label="${name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(share * 100)}">${(
    parts ?? [{ share, is }]
  )
    .map((part) => `<i class="is-${part.is}" style="width:${(part.share * 100).toFixed(1)}%"></i>`)
    .join('')}</div></div>`;

// ── Sound ───────────────────────────────────────────────────────────────────

/**
 * A recording that can be played: a key, the voice as bars, its length.
 * @param {{ title: string, note?: string, seconds: number, played?: number, playing?: boolean, say: string, seed?: number, tags?: string, tools?: string }} audio
 *   `say` names the key; `played` is a share from 0 to 1; `tools` is what can be done to the recording
 */
export function audio({
  title,
  note = '',
  seconds,
  played = 0,
  playing = false,
  say,
  seed = 0,
  tags = '',
  tools = '',
}) {
  const count = 56;
  const done = Math.round(played * count);
  let wave = '';
  for (let i = 0; i < count; i++) {
    // A fixed, uneven outline: speech, not a pattern drawn anew on every load.
    const level = 0.24 + 0.76 * Math.abs(Math.sin((i + seed) * 1.7) * Math.cos(i * 0.61 + seed));
    wave += `<i${i < done ? ' class="is-played"' : ''} style="height:${Math.round(level * 100)}%"></i>`;
  }
  const clock = (/** @type {number} */ s) =>
    `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;
  return `<div class="cs-audio${playing ? ' is-playing' : ''}"><button class="cs-audio-key" aria-label="${say}: ${title}">${small(playing ? icons.pause : icons.play)}</button><div class="cs-audio-words"><b>${title}</b>${note ? `<small>${note}</small>` : ''}${tags}</div><div class="cs-audio-wave" aria-hidden="true">${wave}</div><span class="cs-audio-time">${clock(seconds * played)} / ${clock(seconds)}</span>${tools}</div>`;
}

/**
 * A word as it is said: the stressed vowel carries a stroke and a line under
 * it, drawn here and not left to a combining accent, which few faces place
 * well.
 * @param {string} word the stress as a combining acute accent after the vowel
 */
export const accented = (word) =>
  `<span class="cs-word">${word.normalize('NFC').replace(/(.)\u0301/gu, '<u>$1</u>')}</span>`;

/**
 * A word with its stress: every vowel is a key, the stressed one is marked
 * by an accent over it and by its weight.
 * @param {{ name: string, word: string, say: (letter: string, n: number) => string }} entry
 *   `word` carries the stress as a combining acute accent after the vowel, or none
 */
export function stress({ name, word, say }) {
  const vowels = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ';
  const letters = [...word.normalize('NFC')];
  let html = '';
  let n = 0;
  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    if (letter === '́') continue;
    if (!vowels.includes(letter)) {
      html += `<span>${letter}</span>`;
      continue;
    }
    n++;
    const on = letters[i + 1] === '́';
    html += `<button role="radio" aria-checked="${on}" aria-label="${say(letter, n)}">${letter}</button>`;
  }
  return `<div class="cs-stress" role="radiogroup" aria-label="${name}">${html}</div>`;
}

// ── Runs, changes, records ──────────────────────────────────────────────────

/**
 * A run through its steps: how many have passed each, and where it stands.
 * @param {{ label: string, value: string, share: number, is: 'done' | 'now' | 'wait' | 'failed', note?: string }[]} steps
 */
export const run = (steps) =>
  `<ol class="cs-run">${steps
    .map(
      (step) =>
        `<li class="is-${step.is}"${step.is === 'now' ? ' aria-current="step"' : ''}><i>${step.is === 'done' ? small(icons.check) : step.is === 'failed' ? small(icons.alert) : step.is === 'now' ? '<span class="tt-spinner"></span>' : ''}</i><span class="cs-run-label">${step.label}</span>${step.value ? `<b>${step.value}</b>` : ''}<u><u style="width:${(Math.min(1, step.share) * 100).toFixed(0)}%"></u></u>${step.note ? `<small>${step.note}</small>` : ''}</li>`,
    )
    .join('')}</ol>`;

/** An old value and the new one. @param {{ old: string, next: string, oldNote?: string, nextNote?: string, say: { old: string, next: string }, is?: 'serif' | 'code' | '' }} change */
export const diff = ({ old, next, oldNote = '', nextNote = '', say, is = '' }) =>
  `<div class="cs-diff${is ? ` is-${is}` : ''}"><p class="cs-diff-old"><small>${say.old}${oldNote ? ` · ${oldNote}` : ''}</small><del>${old}</del></p>${small(icons.arrowRight)}<p class="cs-diff-new"><small>${say.next}${nextNote ? ` · ${nextNote}` : ''}</small><ins>${next}</ins></p></div>`;

/**
 * What happened to something, by time, the latest first.
 * @param {{ at: string, title: string, note?: string, by?: string, body?: string, tools?: string, is?: Tone | 'now' }[]} entries
 */
export const timeline = (entries) =>
  `<ol class="cs-timeline">${entries
    .map(
      (e) =>
        `<li${e.is ? ` class="is-${e.is}"` : ''}><time>${e.at}</time><i></i><div><p><b>${e.title}</b>${e.by ? `<span>${e.by}</span>` : ''}</p>${e.note ? `<small>${e.note}</small>` : ''}${e.body ?? ''}${e.tools ? `<div class="cs-actions">${e.tools}</div>` : ''}</div></li>`,
    )
    .join('')}</ol>`;

/**
 * Two records beside each other, and what lies between them: a doubtful
 * match, two Places that may be one.
 * @param {{ sides: { kicker: string, title: string, rows: { label: string, value: string }[] }[], between: string, tools?: string }} pair
 */
export const pair = ({ sides, between, tools = '' }) =>
  `<div class="cs-pair">${sides
    .map(
      (side, i) =>
        `${i === 1 ? `<p class="cs-pair-between">${between}</p>` : ''}<div class="cs-pair-side"><small>${side.kicker}</small><b>${side.title}</b>${details(side.rows)}</div>`,
    )
    .join('')}${tools ? `<div class="cs-actions">${tools}</div>` : ''}</div>`;

/**
 * A Territory and what is nested in it.
 * @param {{ lead: string, name: string, note?: string, tags?: string }} root
 * @param {{ lead: string, name: string, note?: string, tags?: string }[]} items
 */
export const tree = (root, items) => {
  const row = (/** @type {typeof root} */ r) =>
    `${r.lead}<span class="cs-tree-words">${link(r.name, r.note)}</span>${r.tags ?? ''}`;
  return `<ul class="cs-tree"><li>${row(root)}<ul>${items.map((item) => `<li>${row(item)}</li>`).join('')}</ul></li></ul>`;
};

/** One item of a list from which something is chosen. @param {{ lead?: string, title: string, note?: string, tags?: string, at?: string, chosen?: boolean }} item */
export const listItem = ({ lead = '', title, note = '', tags = '', at = '', chosen = false }) =>
  `<li><button class="cs-item"${chosen ? ' aria-current="true"' : ''}>${lead}<span class="cs-item-words"><b>${title}</b>${note ? `<small>${note}</small>` : ''}</span>${at ? `<time>${at}</time>` : ''}${tags ? `<span class="cs-item-tags">${tags}</span>` : ''}</button></li>`;

/** @param {string} name @param {string[]} items @param {string} [title] the name of a group @param {string} [tools] what can be done to the whole group */
export const list = (name, items, title = '', tools = '') =>
  `${title ? `<div class="cs-list-head"><h3 class="cs-list-title">${title}</h3>${tools}</div>` : ''}<ul class="cs-list" aria-label="${name}">${items.join('')}</ul>`;

/** A note inside a pane: what follows from a state, in a line or two. @param {{ icon?: string, lead: string, rest?: string, is?: Tone, tools?: string }} note */
export const notice = ({ icon, lead, rest = '', is = 'info', tools = '' }) =>
  `<p class="cs-notice is-${is}" role="status">${small(icon ?? { ok: icons.check, warn: icons.warning, stop: icons.alert, info: icons.info, quiet: icons.info }[is])}<span><b>${lead}</b>${rest ? ` ${rest}` : ''}</span>${tools}</p>`;

/**
 * What has to hold before something is done: each line is so or not, in
 * words, with its way out beside it.
 * @param {{ is: Tone, lead: string, rest?: string, tool?: string }[]} items
 */
export const checklist = (items) =>
  `<ul class="cs-checks">${items
    .map(
      (item) =>
        `<li class="is-${item.is}">${small({ ok: icons.check, warn: icons.warning, stop: icons.alert, info: icons.info, quiet: icons.clock }[item.is])}<span><b>${item.lead}</b>${item.rest ? ` ${item.rest}` : ''}</span>${item.tool ?? ''}</li>`,
    )
    .join('')}</ul>`;

/**
 * A statement of the guide with where it comes from: the sentence in the
 * guide's face under a bar, then its source as pairs of a name and a value.
 * @param {{ quote: string, rows: { label: string, value: string }[] }} statement
 */
export const statement = ({ quote, rows }) =>
  `<div class="cs-statement"><blockquote>${quote}</blockquote>${details(rows)}</div>`;

/**
 * Opening hours as they resolve, day by day: a day is a line of twenty-four
 * hours with the open part filled and its times under it; a closed day and a
 * day nobody knows say so in words.
 * @param {{ name: string, days: { label: string, open?: [number, number][] , note: string, is?: 'today' | 'off' | 'unknown' }[] }} horizon
 *   `open` is in minutes of the day
 */
export const fortnight = ({ name, days }) =>
  `<ol class="cs-fortnight" aria-label="${name}">${days
    .map(
      (day) =>
        `<li${day.is ? ` class="is-${day.is}"` : ''}><b>${day.label}</b><i>${(day.open ?? [])
          .map(
            ([from, to]) =>
              `<i style="left:${((from / 1440) * 100).toFixed(1)}%;width:${(((to - from) / 1440) * 100).toFixed(1)}%"></i>`,
          )
          .join('')}</i><small>${day.note}</small></li>`,
    )
    .join('')}</ol>`;

/**
 * What stands in place of the console when one is not let in, or cannot go
 * on: the lockup with the word "console", one thing said plainly, and what
 * can be done about it.
 * @param {{ theme: Theme, word: string, icon?: string, title: string, text?: string, body?: string, foot?: string, note?: string, is?: 'stop' | '' }} gate
 */
export function gate({
  theme,
  word,
  icon = '',
  title,
  text = '',
  body = '',
  foot = '',
  note = '',
  is = '',
}) {
  const lockup = asset(theme === 'dark' ? 'mark/lockup-on-dark.svg' : 'mark/lockup.svg');
  return `<div class="cs cs-gate"><main class="cs-gate-card${is ? ` is-${is}` : ''}"><p class="cs-brand"><img src="${lockup}" alt="Promenade" /><span>${word}</span></p>${icon ? `<span class="cs-gate-icon">${icon}</span>` : ''}<h1>${title}</h1>${text ? `<p class="cs-gate-text">${text}</p>` : ''}${body ? `<div class="cs-gate-body">${body}</div>` : ''}${foot ? `<div class="cs-actions">${foot}</div>` : ''}</main>${note ? `<p class="cs-gate-note">${note}</p>` : ''}</div>`;
}

// ── The map ─────────────────────────────────────────────────────────────────

/**
 * A pane of the map with the tools of the work done on it.
 * @param {{ map: string, tools?: string, legend?: { mark: string, label: string }[], note?: string, credit: string }} pane
 */
export const mapPane = ({ map, tools = '', legend = [], note = '', credit }) =>
  `<figure class="cs-map">${map}${tools ? `<div class="cs-map-tools">${tools}</div>` : ''}${legend.length ? `<ul class="cs-map-legend">${legend.map((item) => `<li><i class="is-${item.mark}"></i>${item.label}</li>`).join('')}</ul>` : ''}${note ? `<p class="cs-map-note">${note}</p>` : ''}<figcaption>${credit}</figcaption></figure>`;

/** The tools of a map, as one column of keys. @param {{ icon: string, name: string, on?: boolean }[][]} groups */
export const mapTools = (groups) =>
  groups
    .map(
      (group) =>
        `<span class="cs-map-group">${group.map((tool) => iconButton(tool.icon, tool.name, tool.on === undefined ? {} : { on: tool.on })).join('')}</span>`,
    )
    .join('');

/**
 * The map of the work on a Place: its boundary with the points that shape
 * it, its Entrances, what is nested in it, and the circle in which a Story
 * starts. Everything is real geometry in the units of the map.
 * @param {any} data
 * @param {object} options
 * @param {Lang} options.lang @param {Theme} options.theme
 * @param {number} options.width @param {number} options.height
 * @param {string} options.label
 * @param {[number, number][]} [options.boundary]
 * @param {{ x: number, y: number }[]} [options.entrances]
 * @param {{ x: number, y: number, n: number | string, is?: 'chosen' | 'off' | 'warn' }[]} [options.places] numbered marks
 * @param {{ x: number, y: number, metres: number }} [options.radius]
 * @param {{ x: number, y: number }[]} [options.fit] what the view has to show; the boundary and the marks by default
 * @param {number} [options.margin] in pixels
 * @param {number} [options.labels]
 * @param {boolean} [options.handles] the boundary is being shaped
 * @param {{ x: number, y: number, n: number | string }} [options.anchor] the Place the work is done around
 * @param {{ x: number, y: number, kind: 'car' | 'bicycle' }[]} [options.parking] where one leaves a car or a bicycle
 */
export function workMap(data, options) {
  const { lang, theme, width, height, label, boundary = [], entrances = [], places = [] } = options;
  const { radius, anchor, parking = [], margin = 72, labels = 5, handles = true } = options;
  const unitsPerMetre = data.map.units_per_metre ?? 2;
  const reach = radius ? radius.metres * unitsPerMetre : 0;
  const fit = options.fit ?? [
    ...boundary.map(([x, y]) => ({ x, y })),
    ...places,
    ...parking,
    ...(anchor ? [anchor] : []),
    ...(radius
      ? [
          { x: radius.x - reach, y: radius.y - reach },
          { x: radius.x + reach, y: radius.y + reach },
        ]
      : []),
  ];
  const view = fitView(fit, width, height, {
    top: margin,
    right: margin,
    bottom: margin,
    left: margin,
  });
  const outline = boundary.length ? `M${boundary.map(([x, y]) => `${x} ${y}`).join('L')}Z` : '';
  return mapSvg(data, {
    view,
    lang,
    layers: layersOf(theme),
    labels: labels > 0 ? { max: labels, size: 10 } : undefined,
    label,
    over: ({ u }) =>
      `${outline ? `<path class="cs-m-area" d="${outline}"/><path class="cs-m-edge" d="${outline}"/>` : ''}${
        radius ? `<circle class="cs-m-radius" cx="${radius.x}" cy="${radius.y}" r="${reach}"/>` : ''
      }${
        handles
          ? boundary
              .map(([x, y]) =>
                pinned(
                  x,
                  y,
                  u,
                  '<rect x="-3.5" y="-3.5" width="7" height="7" rx="1.5"/>',
                  'cs-m-handle',
                ),
              )
              .join('')
          : ''
      }${entrances
        .map((e) =>
          pinned(
            e.x,
            e.y,
            u,
            '<rect x="-8" y="-8" width="16" height="16" rx="5"/><path d="M-2.5 4.5v-8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v8M-4.5 4.5h9"/>',
            'cs-m-entrance',
          ),
        )
        .join('')}${parking
        .map((p) =>
          pinned(
            p.x,
            p.y,
            u,
            `<rect x="-9" y="-9" width="18" height="18" rx="4"/>${
              p.kind === 'car'
                ? '<path d="M-2.6 5v-9.5h3.2a3 3 0 0 1 0 6h-3.2"/>'
                : '<circle cx="-3.6" cy="2.4" r="2.6"/><circle cx="3.6" cy="2.4" r="2.6"/><path d="M-3.6 2.4-1-3.4h3l1.6 5.8M-1-3.4 1.4 2.4"/>'
            }`,
            'cs-m-parking',
          ),
        )
        .join('')}${places
        .map((p) =>
          pinned(
            p.x,
            p.y,
            u,
            `<circle r="11"/><text y="3.6" text-anchor="middle">${p.n}</text>`,
            `cs-m-place${p.is ? ` is-${p.is}` : ''}`,
          ),
        )
        .join('')}${
        anchor
          ? pinned(
              anchor.x,
              anchor.y,
              u,
              `<rect x="-11" y="-11" width="22" height="22" rx="6"/><text y="3.6" text-anchor="middle">${anchor.n}</text>`,
              'cs-m-anchor',
            )
          : ''
      }`,
  });
}
