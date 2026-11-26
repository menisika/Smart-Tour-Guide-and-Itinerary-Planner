/**
 * Every component of the system as a specimen: a small piece of a screen in
 * which the component stands as it would in the product, on real content.
 *
 * This list is the one source for the system's page, which shows each
 * specimen for iOS and for Android, and for the check page, which draws each
 * in every theme, language and text size and measures it.
 *
 * A specimen says what stands behind it — the map, a photograph, or the solid
 * page — because glass is only glass over something.
 */
import { format } from '../directions/shared/data.js';
import { SIZES } from '../directions/shared/frames.js';
import { icons, platformIcon } from './icons.js';
import {
  action,
  back,
  chips,
  code,
  field,
  group,
  liked,
  options,
  rate,
  round,
  segments,
  stepper,
  tastes,
  titlePill,
  toggle,
} from './parts/controls.js';
import {
  bar,
  credit,
  heading,
  hero,
  over,
  page as pageOf,
  photo,
  sheetHead,
} from './parts/layout.js';
import { item, journal, list, log, placeRow, points, reading, saved } from './parts/lists.js';
import { backdrop, lineMap, meDot, planMap, walkMap } from './parts/map.js';
import { lockScreen, tabs } from './parts/platform.js';
import {
  ahead,
  board,
  chart,
  dock,
  figures,
  head,
  thumb,
  variant,
  variants,
  verdict,
} from './parts/route.js';
import { ask, dialog, menu, sheet, toast } from './parts/sheets.js';
import { banner, checks, pack, skeleton, state, steps } from './parts/states.js';
import { guide, mini, placePage, player, source } from './parts/story.js';
import { linkPicture, linkPreview, messenger, panel, webCard, webNav } from './parts/web.js';
import { consoleSpecimens } from './specimens/console.js';
import { partySpecimens } from './specimens/party.js';
import { T } from './strings.js';

/**
 * @typedef {object} Ctx
 * @property {'ios' | 'android'} os
 * @property {'light' | 'dark' | 'sun'} theme
 * @property {'ru' | 'en'} lang
 * @property {any} data
 * @property {number} text the text size of the system: 1, 1.3 or 2
 * @property {number} width of the stage, in points
 */

/**
 * @typedef {object} Specimen
 * @property {string} id
 * @property {string} group the kind of component, as the work plan names it
 * @property {string} title
 * @property {string} note what to look at, and the rule behind it
 * @property {number} height of the stage at the usual text size
 * @property {boolean} [device] a whole screen, drawn inside the outline of a phone
 * @property {boolean} [grows] the stage grows with the text size
 * @property {boolean} [wide] a component of a web page or of the console: drawn once, at the width of a desk
 * @property {'web' | 'console'} [face] which of the two a wide specimen belongs to; the console by default
 * @property {number} [width] of a wide stage; 1440 by default
 * @property {{ id: string, label: string }[]} [variants] states of the same component, one stage each
 * @property {(ctx: Ctx, variant: string) => string} render
 */

/** The sign of the product, for the bar of the web. */
const sign = new URL('./mark/sign.svg', import.meta.url).pathname;

/** The map behind a specimen. @param {Ctx} ctx @param {number} height @param {object} [options] */
const map = ({ data, lang, theme, width }, height, options = {}) =>
  `<div class="tt-under">${backdrop(data, { lang, theme, width, height, ...options })}</div>`;

/** A solid page behind a specimen, with room around what stands on it. @param {string} inner */
const page = (inner) => `<div class="tt-on-page">${inner}</div>`;

/** A pane of glass over the map, holding what the timetable says. @param {string} inner */
const pane = (inner) => `<section class="tt-pane lg">${inner}</section>`;

/** The same Route held against another budget of time, to show the other verdicts. @param {any} data @param {number} budget */
const against = (data, budget) => ({ ...data.route, budgetMinutes: budget });

/** @type {Specimen[]} */
export const specimens = [
  // ── Materials ───────────────────────────────────────────────────────────
  {
    id: 'materials',
    group: 'Materials',
    title: 'The two materials',
    note: 'Regular glass for a pane that may carry text, clear glass for a small control, tinted glass for the one prominent action — and the solid page.',
    height: 300,
    render: (ctx) => {
      const t = T[ctx.lang];
      return `${map(ctx, 300, { around: 4, u: 1.5 })}
      <div class="tt-materials">
        <p class="tt-swatch lg"><b>${ctx.os === 'android' ? 'surface' : 'regular'}</b><span>${t.onTime} · ${t.finishAt(ctx.data.route.finish)}</span></p>
        <p class="tt-swatch lg lg-clear"><b>${ctx.os === 'android' ? 'surface, raised' : 'clear'}</b>${icons.locate}</p>
        <p class="tt-swatch lg lg-tint"><b>${ctx.os === 'android' ? 'filled' : 'tint'}</b>${icons.play}</p>
        <p class="tt-swatch tt-swatch-page"><b>page</b><span>${ctx.data.outingNow.stop.name[ctx.lang]}</span></p>
      </div>`;
    },
  },

  // ── Buttons ─────────────────────────────────────────────────────────────
  {
    id: 'dock',
    group: 'Buttons',
    title: 'The prominent action and its companion',
    note: 'One prominent action to a screen, at the bottom, where a thumb is. It is the only thing that takes the accent as a fill. On iOS it is tinted glass; on Android a filled Material button of a squarer shape.',
    height: 150,
    render: (ctx) => `${map(ctx, 150)}${dock(ctx.data, ctx.lang)}`,
  },
  {
    id: 'action-states',
    group: 'Buttons',
    title: 'An action in each of its states',
    note: 'At rest, pressed, in keyboard focus, busy and unavailable. Pressing answers within 120 ms, before anything else happens. A busy action says what it is doing; an unavailable one keeps its place and its words.',
    height: 392,
    grows: true,
    render: ({ lang }) => {
      const t = T[lang];
      return page(
        `<div class="tt-stack">${[undefined, 'pressed', 'focused', 'busy', 'disabled']
          .map((s) =>
            action(s === 'busy' ? t.building : t.start, {
              icon: icons.play,
              state: /** @type {any} */ (s),
            }),
          )
          .join('')}</div>`,
      );
    },
  },
  {
    id: 'round',
    group: 'Buttons',
    title: 'Round controls over the map',
    note: 'Clear glass, an icon, a full target. “Back”, “share” and “more” are drawn the way each system has taught them. A control that is only an icon has a name for a screen reader.',
    height: 250,
    render: (ctx) => {
      const t = T[ctx.lang];
      return `${map(ctx, 250)}
      <header class="tt-top tt-top-stage">
        ${back(ctx.os, t.say.back)}
        ${titlePill(t.kicker, t.checked(ctx.data.route.checkedAt))}
        ${group([
          [icons.edit, t.say.edit],
          [platformIcon('share', ctx.os), t.say.share],
        ])}
      </header>
      <div class="tt-side">${round(icons.layers, t.say.mapView)}${round(icons.locate, t.say.locate)}</div>`;
    },
  },
  {
    id: 'quiet-actions',
    group: 'Buttons',
    title: 'Quiet and irreversible actions',
    note: 'A second action is words in the colour of “on time”, with no pane behind them. What cannot be taken back is red and says exactly what it ends.',
    height: 236,
    grows: true,
    render: ({ lang }) => {
      const t = T[lang];
      return page(
        `<div class="tt-stack">${action(t.skip, { kind: 'plain', icon: icons.next })}${action(t.finish, { kind: 'plain-danger', icon: icons.stop })}${action(t.finish, { kind: 'danger', icon: icons.stop })}</div>`,
      );
    },
  },
  {
    id: 'chips',
    group: 'Buttons',
    title: 'Chips and segments',
    note: 'A chip that is on gains a tick as well as its fill: a state is never told by colour alone. The chip is drawn smaller than it is: the control around it is a full target. The names of the themes are samples; the list of themes is the product’s to fix (PRF-2).',
    height: 248,
    grows: true,
    render: ({ lang }) => {
      const t = T[lang];
      return page(
        `${chips([
          [t.themes[0], true],
          [t.themes[1], false],
          [t.themes[2], false],
          [t.inside, false],
        ])}
        <div class="tt-gap"></div>
        ${segments(
          t.settings,
          [
            { label: t.guided, icon: icons.voice },
            { label: t.quiet, icon: icons.quiet },
          ],
          0,
        )}
        <div class="tt-gap"></div>
        ${segments(
          t.speed(''),
          [{ label: '0,8×' }, { label: '1×' }, { label: '1,25×' }, { label: '1,5×' }].map((s) =>
            lang === 'en' ? { label: s.label.replace(',', '.') } : s,
          ),
          1,
        )}`,
      );
    },
  },

  // ── Inputs ──────────────────────────────────────────────────────────────
  {
    id: 'field',
    group: 'Inputs',
    title: 'A field: the Wish',
    note: 'Written in, being written in, empty, and wrong. An error says what is wrong in words and with an icon, under the field it belongs to. iOS has a round well; Android has the filled field of Material 3.',
    height: 470,
    grows: true,
    render: ({ lang, data }) => {
      const t = T[lang];
      const wish = data.route.wish[lang];
      return page(
        `<div class="tt-stack">${field({ name: t.wishName, value: wish, note: t.wishNote })}${field({ name: t.wishName, value: wish.slice(0, 24), state: 'focused' })}${field({ name: t.wishName, hint: t.wishHint, state: 'empty' })}${field({ name: t.wishName, hint: t.wishHint, note: t.wishWrong, state: 'wrong' })}</div>`,
      );
    },
  },
  {
    id: 'choices',
    group: 'Inputs',
    title: 'A stepper, switches, one of several',
    note: 'How long one has is stepped with two keys: nothing is set by dragging alone. A switch is its whole row. One of several is a tick at the end of the row on iOS and a radio button at its start on Android.',
    height: 372,
    grows: true,
    render: ({ lang, data }) => {
      const t = T[lang];
      return page(
        `${stepper({ name: t.budgetName, note: t.budgetNote, value: format.duration(data.route.budgetMinutes, lang), less: t.say.less, more: t.say.more15 })}
        <div class="tt-gap"></div>
        ${toggle(t.autoStart, true, t.autoStartNote)}
        ${toggle(t.wifiOnly, false)}
        <div class="tt-gap"></div>
        ${options(t.storyLanguage, [{ label: 'Русский' }, { label: 'English' }], lang === 'ru' ? 0 : 1)}`,
      );
    },
  },

  {
    id: 'tastes',
    group: 'Inputs',
    title: 'Themes of the Profile: liked, neutral, disliked',
    note: 'One chip, three states, a tap to the next (PRF-2). Liked is filled and ticked; disliked is outlined and struck through; neutral is plain. None is told by colour alone. The themes are samples of the list the product fixes.',
    height: 150,
    grows: true,
    render: ({ lang }) => {
      const t = T[lang];
      return page(
        tastes(
          [
            [t.themes[0], 'like'],
            [t.themes[1], 'neutral'],
            [t.themes[2], 'dislike'],
          ],
          t.tasteSay,
        ),
      );
    },
  },
  {
    id: 'rating',
    group: 'Inputs',
    title: 'A rating, and “liked or not”',
    note: 'An Outing is rated from one to five, each key saying its own number (FBK-1). A Story is liked or not, with words on the keys (FBK-2). Neither is ever required.',
    height: 190,
    grows: true,
    render: ({ lang }) => {
      const t = T[lang];
      return page(
        `${rate(t.rateName, 4, t.rateSay)}<div class="tt-gap"></div>${liked(t.likedName, 'like', t.likedLabels)}`,
      );
    },
  },
  {
    id: 'code',
    group: 'Inputs',
    title: 'A one-time code',
    note: 'Six cells, one field: a screen reader and a keyboard meet a single text box (ACC-3). The digits are a sample.',
    height: 110,
    grows: true,
    render: ({ lang }) => page(code(T[lang].codeName, '482')),
  },

  // ── Sheets ──────────────────────────────────────────────────────────────
  {
    id: 'route-sheet',
    group: 'Sheets',
    title: 'The sheet of the Route',
    note: 'Glass, because it is the timetable speaking. On iOS it floats off the edges with every corner round; on Android it is attached to the bottom edge, as Material has it. The grabber is a control with a name: a sheet is never opened by dragging alone.',
    height: 560,
    grows: true,
    render: (ctx) =>
      `${map(ctx, 560, { around: 4, u: 3.2 })}${sheet(`${head(ctx.data, ctx.lang)}${chart(ctx.data, ctx.lang, { scale: 6 * ctx.text, until: 30 })}`, { lang: ctx.lang, top: 150 })}`,
  },
  {
    id: 'verdicts',
    group: 'Sheets',
    title: 'The verdict of the check',
    note: 'The same Route held against three hours, two hours fifty and two and a half: it fits, it is tight, it does not fit. Each verdict is said in words, with an icon; the colour only repeats it.',
    height: 300,
    grows: true,
    render: ({ data, lang }) =>
      `<div class="tt-under tt-under-plain"></div>${pane([180, 170, 150].map((budget) => `<p class="tt-kicker">${T[lang].budgetOf(budget)}</p>${verdict(lang, against(data, budget))}`).join('<div class="tt-gap"></div>'))}`,
  },
  {
    id: 'guide',
    group: 'Sheets',
    title: 'The page of the guide',
    note: 'Solid, because it is read. At half height the map stays in sight above it. Opened in full — by the grabber, by the key “Text” in the player, or by a tap on the text — the photograph grows and the Story is set a size larger; position, time and the next Place stay on the board and in the player (OUT-2). A Place without a free photograph is shown by its own plan.',
    height: 852,
    device: true,
    variants: [
      { id: 'half', label: 'At half height' },
      { id: 'full', label: 'Opened in full' },
      { id: 'plan', label: 'A Place without a photograph' },
    ],
    render: (ctx, variant) => {
      const { data, lang, theme, os } = ctx;
      const t = T[lang];
      const now = data.outingNow;
      const full = variant === 'full';
      return `<div class="tt tt-outing">
        <div class="tt-under">${walkMap(data, { lang, theme, width: SIZES[os].width, height: 304, minute: now.stop.arriveMin - 0.6, walkedLegs: now.stop.order - 1, pins: [now.stop, now.next] })}</div>
        <header class="tt-top">${back(os, t.say.back)}${board(data, lang, now.stop.arriveMin + 1)}${round(platformIcon('more', os), t.say.more)}</header>
        ${guide(data, lang, { theme, width: SIZES[os].width, full, photo: variant !== 'plan' })}
        ${full ? mini(data, lang) : player(data, lang)}
      </div>`;
    },
  },
  {
    id: 'dialog',
    group: 'Sheets',
    title: 'A question that waits: “Are you at this place?”',
    note: 'Asked when the position is uncertain, instead of starting a Story at the wrong wall (OUT-4). On iOS it is a pane of glass at the bottom, within reach of a thumb; on Android a Material dialog with its answers at the end of the row.',
    height: 470,
    grows: true,
    render: (ctx) => {
      const t = T[ctx.lang];
      return `${map(ctx, 470, { around: 2, u: 1.4, state: { current: 2, done: 1 } })}${dialog({ title: t.atPlace, lead: ctx.data.outingNow.stop.name[ctx.lang], text: t.atPlaceNote, yes: t.yesStart, no: t.notYet })}`;
    },
  },
  {
    id: 'menu',
    group: 'Sheets',
    title: 'What can be done during the Outing',
    note: 'A menu from the control “more”. Each row is a full target with an icon and, where it helps, a line saying what follows. Ending the Outing stands apart and is red.',
    height: 500,
    grows: true,
    render: (ctx) => {
      const t = T[ctx.lang];
      return `${map(ctx, 500, { around: 3, u: 1.6 })}
        <header class="tt-top tt-top-stage"><span class="tt-fill"></span>${round(platformIcon('more', ctx.os), t.say.more, { is: 'is-pressed' })}</header>
        ${menu(t.say.more, [
          { icon: icons.next, label: t.skip },
          { icon: icons.timer, label: t.shorten, note: t.shortenNote },
          { icon: icons.cup, label: t.coffee, note: t.coffeeNote },
          'rule',
          { icon: icons.quiet, label: t.quietOn, note: t.quietNote },
          { icon: icons.sun, label: t.sunMode, note: t.sunNote },
          { icon: icons.battery, label: t.saver, note: t.saverNote },
          'rule',
          { icon: icons.stop, label: t.finish, is: 'danger' },
        ])}`;
    },
  },
  {
    id: 'toast',
    group: 'Sheets',
    title: 'A note that comes and goes',
    note: 'Says what has just changed and lets it be taken back. The numbers are those of the Route recalculated without one Place, found on the same pedestrian graph.',
    height: 170,
    grows: true,
    render: (ctx) => {
      const t = T[ctx.lang];
      const again = ctx.data.recalculated.route;
      return `${map(ctx, 170, { around: 8, u: 2.4 })}${toast({ icon: icons.route, lead: t.recalculated, rest: `${t.finishAt(again.finish)} · ${t.reserve(again.reserveMinutes)}`, undo: t.undo, style: 'top:54px' })}`;
    },
  },

  {
    id: 'place-page',
    group: 'Sheets',
    title: 'The page of a Place, before the Outing',
    note: 'The guide speaking, so it is solid and set in the serif: the photograph with its author, the name, why the Place is on the Route in italic (RTE-9), what is known of it, and what can be done with it.',
    height: 852,
    device: true,
    render: ({ data, lang, theme, os }) => {
      const t = T[lang];
      const stop = data.stops[2];
      return `<div class="tt"><div class="tt-under tt-under-plain"></div>${placePage(
        data,
        stop,
        lang,
        {
          theme,
          width: SIZES[os].width,
          facts: [`${icons.eye}${t.outside}`, `${icons.clock}${t.visit(data.route.visitMinutes)}`],
          actions: `${action(t.remove, { kind: 'plain-danger', icon: icons.trash })}`,
        },
      )}</div>`;
    },
  },
  {
    id: 'source',
    group: 'Sheets',
    title: 'Where a sentence comes from',
    note: 'One tap on a sentence of a Story (KNW-16): the sentence, the work, the article, its revision and its licence. It is read, so the sheet is solid. A sheet that waits dims what is behind it; its grabber closes it.',
    height: 470,
    grows: true,
    render: ({ data, lang }) => {
      const t = T[lang];
      const told = data.outingNow.story[lang];
      return `<div class="tt-under tt-under-page"></div>${over(
        `${sheetHead(t.sourceWork)}${source(lang, { quote: told.sentences[told.current].text, source: told.source, actions: action(t.remove, { kind: 'plain', icon: icons.flag }) })}`,
        { lang, solid: true },
      )}`;
    },
  },
  {
    id: 'ask',
    group: 'Sheets',
    title: 'A question that does not wait',
    note: 'Stands over the content and can be left unanswered: nothing is dimmed and nothing is blocked (FBK-2).',
    height: 150,
    grows: true,
    render: (ctx) => {
      const t = T[ctx.lang];
      return `${map(ctx, 150, { around: 2, u: 2 })}${ask(t.likedName, liked(t.likedName, '', t.likedLabels)).replace('class="tt-ask lg"', 'class="tt-ask lg" style="top:14px"')}`;
    },
  },

  // ── Lists ───────────────────────────────────────────────────────────────
  {
    id: 'chart',
    group: 'Lists',
    title: 'The chart of a Route, under way',
    note: 'The product’s own list: every minute takes the same height. What has been visited is in the colour of the line, and the Place one is at carries the accent and a ring. A skipped Place takes no time, so it is not a row: it is named, struck out, in the leg that goes round it. A row is one Place and is never lower than a target: the scale grows before a row shrinks.',
    height: 560,
    render: (ctx) => {
      const { data, lang } = ctx;
      const again = data.recalculated;
      const shown = again.stops.filter((/** @type {any} */ s) => s.order >= 5 && s.order <= 10);
      const from = shown[0].arriveMin - 6;
      const shifted = shown.map((/** @type {any} */ s) => ({
        ...s,
        arriveMin: s.arriveMin - from,
        leaveMin: s.leaveMin - from,
      }));
      return `<div class="tt-under tt-under-plain"></div>${pane(
        `<p class="tt-kicker">${T[lang].onTime} · ${T[lang].finishAt(again.route.finish)}</p>
        <div class="tt-chart-window" style="height:${Math.round(430 * ctx.text)}px">${chart(
          data,
          lang,
          {
            scale: 6 * ctx.text,
            stops: shifted,
            until: 76,
            minute: shifted[1].arriveMin + 3,
            skipped: again.skipped,
            ends: false,
          },
        )}</div>`,
      )}`;
    },
  },
  {
    id: 'rows',
    group: 'Lists',
    title: 'Rows of settings, and what needs a network',
    note: 'A row is a full target; on Android it is a Material list item 56 high. What needs a network is shown as unavailable, with the reason, never hidden (OUT-15).',
    height: 440,
    grows: true,
    render: ({ lang, data }) => {
      const t = T[lang];
      return page(
        list(t.settings, [
          item({
            icon: icons.globe,
            label: t.storyLanguage,
            value: lang === 'ru' ? 'Русский' : 'English',
          }),
          item({
            icon: icons.pack,
            label: t.packName,
            value: `${data.route.packMegabytes} ${t.megabytes}`,
          }),
          item({ icon: icons.sun, label: t.sunMode, note: t.sunNote }),
          item({ icon: icons.chat, label: t.chat, off: t.needsNetwork }),
          item({ icon: icons.mic, label: t.askGuide, off: t.needsNetwork }),
          item({ icon: icons.people, label: t.partyPositions, off: t.needsNetwork }),
        ]),
      );
    },
  },
  {
    id: 'places',
    group: 'Lists',
    title: 'The Places of a Route being edited',
    note: 'A Place can be moved by dragging, and by the two keys that do the same; each key names the Place it moves, for a screen reader. The third Place is shown as one that has no photograph: the sign of its kind on a tile of the map.',
    height: 268,
    grows: true,
    render: ({ lang, data }) =>
      page(
        `<ol>${data.stops
          .slice(0, 3)
          .map((/** @type {any} */ s, /** @type {number} */ i) =>
            placeRow(i === 2 ? { ...s, photo: undefined } : s, lang, {
              first: i === 0,
              visitMinutes: data.route.visitMinutes,
            }),
          )
          .join('')}</ol>`,
      ),
  },
  {
    id: 'journal',
    group: 'Lists',
    title: 'The journal of what waits for a network',
    note: 'What was done without a network is kept and delivered once the network returns (OUT-16). The times are those of the reference Outing.',
    height: 210,
    grows: true,
    render: ({ lang, data }) => {
      const t = T[lang];
      return page(
        `<h2 class="tt-list-title">${t.journal}</h2>${journal(lang, [
          {
            at: data.stops[0].arrive,
            label: `${t.journalItems[0]} · ${data.stops[0].name[lang]}`,
            sent: true,
          },
          { at: data.stops[1].arrive, label: `${t.journalItems[0]} · ${data.stops[1].name[lang]}` },
          { at: data.stops[1].leave, label: t.journalItems[1] },
        ])}`,
      );
    },
  },

  {
    id: 'reading',
    group: 'Lists',
    title: 'How a Wish was understood',
    note: 'Each row is one constraint or weight, beside the words it was read from, and can be taken out (RTE-2). A hard condition has its own sign and colour; one read with doubt has another. The rows are samples.',
    height: 250,
    grows: true,
    render: ({ lang, data }) => {
      const t = T[lang];
      return page(
        reading(lang, [
          { icon: icons.building, label: t.themes[0], from: data.route.wish[lang] },
          { icon: icons.museum, label: t.inside, from: data.route.wish[lang], is: 'hard' },
          { icon: icons.question, label: t.themes[2], from: data.route.wish[lang], is: 'unsure' },
          { icon: icons.person, label: t.settings, from: t.budgetNote, fixed: true },
        ]),
      );
    },
  },
  {
    id: 'log',
    group: 'Lists',
    title: 'What happened, by time',
    note: 'The versions of a Route, the outcomes of Corrections, notifications: a time, what it was, what became of it. A line about a Place carries its photograph.',
    height: 210,
    grows: true,
    render: ({ lang, data }) => {
      const t = T[lang];
      return page(
        log([
          {
            at: data.route.checkedAt,
            label: data.stops[1].name[lang],
            note: t.sent,
            icon: icons.check,
            media: thumb(data.stops[1], ''),
            is: 'ok',
          },
          { at: data.route.nowBeforeStart, label: t.recalculated, note: t.waiting, is: 'now' },
        ]),
      );
    },
  },
  {
    id: 'saved',
    group: 'Lists',
    title: 'A Route in the collection',
    note: 'A Route is shown by its own line on the map, with its two times in the timetable’s numerals (EDT-6). An Outing that is over has a walked line.',
    height: 270,
    grows: true,
    render: ({ lang, theme, data }) => {
      const t = T[lang];
      const row = (/** @type {boolean} */ walked) =>
        saved({
          map: lineMap(data, { lang, theme, size: 104, walked }),
          title: t.title,
          times: `${data.route.start} — ${data.route.finish}`,
          facts: `${t.places(data.route.stopCount)} · ${format.distance(data.route.walkingMetres, lang)}`,
        });
      return page(`${row(false)}${row(true)}`);
    },
  },
  {
    id: 'points',
    group: 'Lists',
    title: 'A few plain statements',
    note: 'What a decision takes away, what a page keeps: each with its sign, none a control.',
    height: 150,
    grows: true,
    render: ({ lang }) => {
      const t = T[lang];
      return page(
        points([
          { icon: icons.pack, text: t.packName },
          { icon: icons.sync, text: t.journal },
        ]),
      );
    },
  },

  // ── The Story player ────────────────────────────────────────────────────
  {
    id: 'player',
    group: 'Story player',
    title: 'The player',
    note: 'The voice as bars, five keys, the next Place. The bars can be dragged; “back ten seconds” and “next” do the same without dragging. When nothing plays, the player says why: the Story has ended, it is still being prepared (SC-9), or the Outing is in Quiet Mode.',
    height: 236,
    grows: true,
    variants: [
      { id: 'playing', label: 'Playing' },
      { id: 'paused', label: 'Paused' },
      { id: 'ended', label: 'Ended' },
      { id: 'preparing', label: 'Not ready yet' },
      { id: 'quiet', label: 'Quiet Mode' },
    ],
    render: ({ data, lang }, variant) =>
      `<div class="tt-under tt-under-page"></div>${player(data, lang, { state: /** @type {any} */ (variant) })}`,
  },
  {
    id: 'mini',
    group: 'Story player',
    title: 'The player folded to a row',
    note: 'For a screen that is about something else: the page opened in full, the Route being edited.',
    height: 118,
    grows: true,
    render: ({ data, lang }) => `<div class="tt-under tt-under-page"></div>${mini(data, lang)}`,
  },

  // ── Progress along a Route ──────────────────────────────────────────────
  {
    id: 'board',
    group: 'Progress',
    title: 'The board: whether one is on time',
    note: 'A lamp, a word, and the whole Outing as a strip to scale with “now” as a light on it. The word always says the state; the lamp repeats it. Progress is always in sight (OUT-18). The lateness and the distance in the second and third states are samples of a state, not measurements.',
    height: 132,
    grows: true,
    variants: [
      { id: 'ok', label: 'On time' },
      { id: 'warn', label: 'Behind' },
      { id: 'stop', label: 'Off the Route' },
      { id: 'held', label: 'Paused' },
    ],
    render: (ctx, variant) => {
      const { data, lang } = ctx;
      const t = T[lang];
      const minute = data.outingNow.stop.arriveMin + 1;
      const say = {
        ok: undefined,
        warn: {
          kind: 'warn',
          lead: t.behind(6),
          rest: t.finishAt(format.clockPlus(data.route.finish, 6)),
        },
        stop: { kind: 'stop', lead: t.offRoute, rest: t.toLine(format.distance(120, lang)) },
        held: { kind: 'held', lead: t.held, rest: t.resume },
      }[variant];
      return `${map(ctx, 132, { around: 2, u: 2.2 })}<header class="tt-top tt-top-stage">${board(data, lang, minute, /** @type {any} */ (say))}</header>`;
    },
  },

  {
    id: 'variants',
    group: 'Progress',
    title: 'The Routes offered',
    note: 'One of two or three (RTE-7): the character in a word, why in the guide’s italic, the two times, the Places in order as photographs, the measures. The chosen one has a ring and a tick. Both Routes here are measured: the reference Outing, and the same without one Place.',
    height: 290,
    grows: true,
    render: ({ data, lang }) => {
      const t = T[lang];
      return `<div class="tt-under tt-under-plain"></div>${pane(
        variants(t.theLine, [
          variant(lang, {
            name: t.guided,
            why: data.stops[0].why[lang],
            route: data.route,
            stops: data.stops,
            chosen: true,
          }),
          variant(lang, {
            name: t.quiet,
            why: data.stops[1].why[lang],
            route: data.recalculated.route,
            stops: data.recalculated.stops,
            chosen: false,
          }),
        ]),
      )}`;
    },
  },
  {
    id: 'figures',
    group: 'Progress',
    title: 'A few measures side by side',
    note: 'Numbers in the timetable’s numerals over their names: the end of an Outing.',
    height: 110,
    grows: true,
    render: ({ data, lang }) => {
      const t = T[lang];
      return page(
        figures([
          { label: t.out, value: data.route.start },
          { label: t.back, value: data.route.finish },
          { label: t.theLine, value: format.distance(data.route.walkingMetres, lang) },
        ]),
      );
    },
  },
  {
    id: 'ahead',
    group: 'Progress',
    title: 'The Place ahead',
    note: 'For the way between two Places (OUT-2): one number large enough for a glance, and in words whether one is in time. A warning and “off the Route” change the words; the colour only repeats them.',
    height: 190,
    grows: true,
    variants: [
      { id: 'ok', label: 'In time' },
      { id: 'warn', label: 'Behind' },
      { id: 'stop', label: 'Off the Route' },
    ],
    render: (ctx, variantId) => {
      const t = T[ctx.lang];
      const next = ctx.data.outingNow.next;
      const note = { ok: t.onTime, warn: t.behind(6), stop: t.offRoute }[variantId] ?? '';
      return `${map(ctx, 190, { around: 3, u: 2 })}${ahead(ctx.lang, { stop: next, note, is: variantId === 'ok' ? undefined : /** @type {any} */ (variantId) }).replace('class="tt-ahead lg', 'style="bottom:14px" class="tt-ahead lg')}`;
    },
  },

  // ── Map markers ─────────────────────────────────────────────────────────
  {
    id: 'markers-plan',
    group: 'Map markers',
    title: 'What lies on the map of the plan',
    note: 'A stop is a numbered disc on the line; the one being visited takes the accent, those behind take the colour of the line, a skipped one is struck out. The clock is written on the line at the half-hours, the start is a square, and the footprint of every Place is tinted: the map shows the very walls a Story is about.',
    height: 330,
    render: (ctx) =>
      `<div class="tt-under">${planMap(ctx.data, {
        lang: ctx.lang,
        theme: ctx.theme,
        width: ctx.width,
        height: 330,
        padding: { top: 40, right: 40, bottom: 40, left: 40 },
        labels: 4,
        state: { done: 2, current: 3, skipped: ctx.data.recalculated.skipped.order, walkedLegs: 3 },
      })}</div><span class="tt-osm" style="bottom:8px">© OpenStreetMap</span>`,
  },
  {
    id: 'markers-walk',
    group: 'Map markers',
    title: 'What stands on the map of the way',
    note: 'Seen at an angle with the direction of travel up. A Place stands as a badge with the icon of its kind; the person is a dot with a white ring and a darker one, which lifts it off any ground, a wedge of light for where they face, and a breath. An uncertain position loses the wedge and the breath and gains a wide pale ring. In the saver mode the map is flat, nothing stands and nothing moves.',
    height: 304,
    variants: [
      { id: 'sure', label: 'On the way' },
      { id: 'unsure', label: 'Position uncertain' },
      { id: 'saver', label: 'Saver mode' },
    ],
    render: ({ data, lang, theme, width }, variant) => {
      const now = data.outingNow;
      return `<div class="tt-under">${walkMap(data, {
        lang,
        theme,
        width,
        height: 304,
        minute: now.stop.arriveMin - 0.6,
        walkedLegs: now.stop.order - 1,
        pins: [now.stop, now.next],
        unsure: variant === 'unsure',
        saver: variant === 'saver',
      })}</div><span class="tt-osm" style="bottom:8px">© OpenStreetMap</span>`;
    },
  },

  // ── States ──────────────────────────────────────────────────────────────
  {
    id: 'state-loading',
    group: 'States',
    title: 'Loading: a Route being built',
    note: 'Says what is being done, step by step, in the product’s own terms: the Wish understood, Places chosen, times checked. Under it, the shape of what will come.',
    height: 470,
    grows: true,
    render: ({ lang }) => {
      const t = T[lang];
      return page(
        state({
          icon: icons.route,
          title: t.building,
          text: t.buildingNote,
          extra: `${steps(t.steps, 1)}${skeleton()}`,
        }),
      );
    },
  },
  {
    id: 'state-empty',
    group: 'States',
    title: 'Empty: nothing yet',
    note: 'Says what will be here and offers the one thing to do about it. No mascot, no illustration standing in for an explanation.',
    height: 300,
    grows: true,
    render: ({ lang }) => {
      const t = T[lang];
      return page(
        state({
          icon: icons.bookmark,
          title: t.empty,
          text: t.emptyNote,
          actions: action(t.newRoute, { icon: icons.plus }),
        }),
      );
    },
  },
  {
    id: 'state-offline',
    group: 'States',
    title: 'No network',
    note: 'A band that stays while it is so, and says the one thing that matters: the Outing goes on. Below it, the same control “more” as always, with what needs a network marked as unavailable.',
    height: 330,
    grows: true,
    render: ({ lang }) => {
      const t = T[lang];
      return page(
        `${banner({ icon: icons.noNetwork, lead: t.noNetwork, rest: t.noNetworkNote, is: 'warn' })}
        <div class="tt-gap"></div>
        ${list(t.settings, [
          item({ icon: icons.chat, label: t.chat, off: t.needsNetwork }),
          item({ icon: icons.mic, label: t.askGuide, off: t.needsNetwork }),
          item({ icon: icons.next, label: t.skip }),
        ])}`,
      );
    },
  },
  {
    id: 'state-unavailable',
    group: 'States',
    title: 'Unavailable: the Route Pack in each of its states',
    note: 'One plain status at a time: not on the device, coming, on the device, failed its check. A Pack is usable only once complete and checked (OUT-14), and a failed one says so and offers the way out. The 18 MB is the estimate of the brief; “7 of 18” is a sample of the state.',
    height: 110,
    grows: true,
    variants: [
      { id: 'none', label: 'Not on the device' },
      { id: 'loading', label: 'Coming' },
      { id: 'ready', label: 'On the device' },
      { id: 'failed', label: 'Failed its check' },
    ],
    render: ({ lang, data }, variant) =>
      page(
        pack(lang, {
          megabytes: data.route.packMegabytes,
          state: /** @type {any} */ (variant),
          done: 7,
        }),
      ),
  },
  {
    id: 'state-error',
    group: 'States',
    title: 'Error: a Route that could not be built',
    note: 'Says what happened, what was kept, and the two ways on. An error is told by an icon and by words; red only repeats them.',
    height: 320,
    grows: true,
    render: ({ lang }) => {
      const t = T[lang];
      return page(
        state({
          icon: icons.alert,
          title: t.failed,
          text: t.failedNote,
          is: 'error',
          actions: `${action(t.retry, { icon: icons.reload })}${action(t.changeRequest, { kind: 'plain' })}`,
        }),
      );
    },
  },

  {
    id: 'checks',
    group: 'States',
    title: 'What has to be in place before the start',
    note: 'Each line is there or missing, in words; what is missing has its way out beside it. The check before an Outing: the Route Pack, the sound, the permission (§4.7).',
    height: 230,
    grows: true,
    render: ({ lang }) => {
      const t = T[lang];
      return page(
        checks([
          { label: t.packName, note: t.packReady, ok: true },
          { label: t.autoStart, note: t.needsNetwork, ok: false, action: t.retry },
        ]),
      );
    },
  },

  // ── Where the systems differ ────────────────────────────────────────────
  {
    id: 'tabs',
    group: 'Navigation',
    title: 'The bar of destinations',
    note: 'On iOS a capsule of glass that floats over the content; on Android the navigation bar of Material 3, attached to the bottom edge, the chosen destination in a pill behind its icon. Which destinations there are is settled with the screens (D-03).',
    height: 170,
    render: (ctx) => `${map(ctx, 170, { around: 5, u: 2.6 })}${tabs(ctx.lang, 0)}`,
  },
  {
    id: 'lock',
    group: 'Navigation',
    title: 'The Outing on a locked phone',
    note: 'Audio is the main channel (NFR-25): the Outing is followed and the Story is controlled without unlocking (OUT-5). On iOS: a Live Activity of our layout — whether one is on time, the next Place, the strip — the Dynamic Island, and the system’s own “now playing”. On Android: a Live Update and media controls, both the system’s templates, in which only the words, the numbers and the progress are ours.',
    height: 852,
    device: true,
    render: (ctx) => lockScreen(ctx.data, ctx),
  },
  {
    id: 'page-head',
    group: 'Navigation',
    title: 'A page: its bar and its head',
    note: 'A screen that is not the map under a sheet is a solid page. On iOS the way back is a round control of glass and the title stands in the middle; on Android it is the top app bar of Material. A page may open with a photograph of a Place — credited where it stands — with its words on a shade that belongs to the photograph.',
    height: 852,
    device: true,
    variants: [
      { id: 'photo', label: 'With a photograph' },
      { id: 'plain', label: 'With a bar' },
    ],
    render: ({ data, lang, os }, variantId) => {
      const t = T[lang];
      const stop = data.outingNow.stop;
      return variantId === 'photo'
        ? pageOf({
            bar: bar(os, lang),
            hero: hero({
              media: photo(stop),
              kicker: t.kicker,
              title: stop.name[lang],
              credit: credit(stop, lang),
            }),
            body: `<p class="tt-aside">${t.emptyNote}</p>`,
          })
        : pageOf({
            bar: bar(os, lang, { title: t.journal }),
            body: heading(t.settings, t.emptyNote),
          });
    },
  },
  // ── The public web ──────────────────────────────────────────────────────
  {
    id: 'web-panel',
    group: 'Web',
    title: 'A page of the web: the bar and the panel',
    note: 'The same components in a browser’s window. The map fills it; the bar holds the name of the product, the two languages and the way into the application; what the timetable says stands in a panel of glass at the side, with its actions at its foot. At the width of a phone the panel is a sheet under the map.',
    height: 560,
    wide: true,
    face: 'web',
    width: 1280,
    render: ({ data, lang, theme }) => {
      const t = T[lang];
      return `<div class="tt tt-web"><div class="tt-under">${planMap(data, { lang, theme, width: 1280, height: 560, padding: { top: 80, right: 80, bottom: 60, left: 520 }, labels: 8 })}<span class="tt-osm">© OpenStreetMap</span></div>
        ${webNav(lang, { mark: sign })}
        ${panel(`${head(data, lang)}${chart(data, lang, { scale: 6, until: 24 })}`, { foot: `${action(t.pack, { kind: 'second', icon: icons.download, value: `${data.route.packMegabytes} ${t.megabytes}` })}${action(t.playStory, { kind: 'second', icon: icons.headphones })}` })}
      </div>`;
    },
  },
  {
    id: 'web-card',
    group: 'Web',
    title: 'A card over a page',
    note: 'For what interrupts a page of the web and waits: signing in, deleting the account. Solid, in the middle of the window; at the width of a phone it rises from the bottom edge.',
    height: 420,
    wide: true,
    face: 'web',
    width: 1280,
    render: ({ data, lang, theme }) => {
      const t = T[lang];
      return `<div class="tt tt-web"><div class="tt-under">${planMap(data, { lang, theme, width: 1280, height: 420, padding: { top: 60, right: 80, bottom: 60, left: 80 }, labels: 6 })}</div>
        ${webCard(`${heading(t.failed, t.failedNote)}${action(t.retry, { icon: icons.reload })}`, { name: t.failed })}
      </div>`;
    },
  },
  {
    id: 'link-preview',
    group: 'Web',
    title: 'What a messenger shows of a link',
    note: 'The frame is the messenger’s and is drawn plainly on purpose: it is not our design, it is where our link arrives. Ours are the picture — the line of the Route on the map, the name of the product, the length of the walk in the timetable’s numerals —, a title, one line and the address.',
    height: 430,
    render: ({ data, lang, theme }) => {
      const t = T[lang];
      const length = format.duration(data.route.totalMinutes, lang);
      return messenger({
        title: t.settings,
        people: t.places(data.route.stopCount),
        messages: [
          {
            text: t.kicker,
            at: data.route.checkedAt,
            link: linkPreview({
              picture: linkPicture({
                map: lineMap(data, { lang, theme, size: 315 }),
                mark: sign,
                kicker: t.theLine,
                title: t.title,
                figure: length,
                note: format.distance(data.route.walkingMetres, lang),
              }),
              title: t.title,
              text: `${t.places(data.route.stopCount)} · ${length}`,
              host: 'promenade.example',
            }),
          },
        ],
      });
    },
  },
  ...partySpecimens,
  ...consoleSpecimens,
];

/** The kinds of component, in the order the work plan names them. */
export const GROUPS = [...new Set(specimens.map((s) => s.group))];

/**
 * The markup of one stage: a piece of a screen, of the width of its system.
 * @param {Specimen} specimen @param {Ctx} ctx @param {string} [variant]
 */
export function stage(specimen, ctx, variant = specimen.variants?.[0].id ?? '') {
  const height = Math.round(specimen.height * (specimen.grows ? 1 + (ctx.text - 1) * 1.25 : 1));
  const inner = specimen.render(ctx, variant);
  // What stands on the solid page is as high as its content; what stands over
  // the map has the height it was given.
  const flows = inner.startsWith('<div class="tt-on-page">');
  // A web page has the materials of the web; the console has no glass.
  const system = specimen.wide
    ? `data-os="web" data-face="${faceOf(specimen)}"${faceOf(specimen) === 'console' ? ' data-glass="solid"' : ''}`
    : `data-os="${ctx.os}"`;
  return `<div class="screen stage${specimen.wide ? ' stage-wide' : ''}" ${system} data-theme="${ctx.theme}" lang="${ctx.lang}" style="--text-scale:${ctx.text};width:${ctx.width}px;${flows ? 'min-height' : 'height'}:${height}px">${inner}</div>`;
}

/** Which face a wide specimen belongs to. @param {Specimen} specimen */
export const faceOf = (specimen) => specimen.face ?? 'console';

/** The width a wide specimen is drawn at. @param {Specimen} specimen */
export const wideWidth = (specimen) => specimen.width ?? 1440;

export { meDot };
