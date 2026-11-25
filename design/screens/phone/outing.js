/**
 * The phone's screens of the Outing itself: a Story playing and its text, the
 * way between two Places, Quiet Mode, the source of a sentence and a
 * Correction, the lock screen, the questions and the changes on the way, and
 * the end. Each arranges components of the design system.
 */
import { format } from '../../directions/shared/data.js';
import { icons, platformIcon } from '../../system/icons.js';
import {
  action,
  back,
  field,
  liked,
  options,
  rate,
  round,
  stepper,
} from '../../system/parts/controls.js';
import {
  bar,
  foot,
  heading,
  hero,
  label,
  over,
  page,
  sheetHead,
} from '../../system/parts/layout.js';
import { item, journal } from '../../system/parts/lists.js';
import { planMap, replanMap, strayMap, walkMap } from '../../system/parts/map.js';
import { lockScreen } from '../../system/parts/platform.js';
import { ahead, board, chart, figures } from '../../system/parts/route.js';
import { ask, dialog, menu, sheet, toast } from '../../system/parts/sheets.js';
import { banner } from '../../system/parts/states.js';
import { guide, mini, player, source } from '../../system/parts/story.js';
import { noNetwork, osm, sizeOf, words } from './kit.js';

/** @typedef {import('./kit.js').Ctx} Ctx */

/**
 * The controls at the top of the Outing: back, the board, "more".
 * @param {Ctx} ctx @param {number} minute @param {Parameters<typeof board>[3]} [say] @param {boolean} [pressed]
 */
const outingTop = ({ os, lang, data }, minute, say, pressed = false) => {
  const { t } = words(lang);
  return `<header class="tt-top">${back(os, t.say.back)}${board(data, lang, minute, say)}${round(platformIcon('more', os), t.say.more, pressed ? { is: 'is-pressed' } : {})}</header>`;
};

/** Where a band stands under the board. @param {'ios' | 'android'} os */
const underBoard = (os) => (os === 'android' ? 142 : 148);

/** The map of the way while a Story plays at the second Place. @param {Ctx} ctx @param {object} [more] */
const mapAtPlace = ({ os, theme, lang, data }, more = {}) => {
  const now = data.outingNow;
  return walkMap(data, {
    lang,
    theme,
    width: sizeOf(os).width,
    height: 304,
    minute: now.stop.arriveMin - 0.6,
    walkedLegs: now.stop.order - 1,
    pins: [now.stop, now.next],
    ...more,
  });
};

/** The moment between the second Place and the third. @param {any} data */
const onTheWay = (data) => {
  const next = data.outingNow.next;
  return { next, after: data.stops[next.order], minute: next.arriveMin - 2.4 };
};

/** The map of the way between two Places, to the foot of the screen. @param {Ctx} ctx @param {object} [more] */
const mapOnTheWay = ({ os, theme, lang, data }, more = {}) => {
  const { next, after, minute } = onTheWay(data);
  const { width, height } = sizeOf(os);
  return walkMap(data, {
    lang,
    theme,
    width,
    height: height - 150,
    // A tall map is seen from higher up: at the walking angle its far end
    // would be a line at the horizon.
    pitch: 34,
    minute,
    walkedLegs: next.order - 1,
    pins: [next, after],
    ...more,
  });
};

/** The Outing on the way, as what stands behind a pane. @param {Ctx} ctx @param {Parameters<typeof board>[3]} [say] @param {boolean} [pressed] */
const wayBehind = (ctx, say, pressed) =>
  `<div class="tt-under">${mapOnTheWay(ctx)}</div>${outingTop(ctx, onTheWay(ctx.data).minute, say, pressed)}`;

// ── A Story ─────────────────────────────────────────────────────────────────

/** @param {Ctx} ctx */
function story(ctx) {
  const { os, theme, lang, data, state: is } = ctx;
  const { w } = words(lang);
  const now = data.outingNow;
  const told = now.story[lang];
  const width = sizeOf(os).width;
  const minute = now.stop.arriveMin + 1;
  const ended = is === 'ended';
  const over = { ...told, current: -1, elapsed: told.total };
  return {
    clock: now.clock,
    inner: `<div class="tt tt-outing${ended ? ' tt-outing-ended' : ''}">
      <div class="tt-under">${mapAtPlace(ctx)}</div>
      ${outingTop(ctx, minute)}
      ${osm('top:208px')}
      ${is === 'offline' ? noNetwork(lang, { top: underBoard(os) }) : ''}
      ${guide(data, lang, { theme, width, full: is === 'full', ...(ended ? { story: over, from: Math.max(0, told.sentences.length - 3) } : {}) })}
      ${is === 'full' ? mini(data, lang) : player(data, lang, ended ? { state: 'ended' } : {})}
      ${ended ? ask(w.storyOver, liked(w.storyOver, '', w.likeLabels)) : ''}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function walk(ctx) {
  const { os, lang, data, state: is } = ctx;
  const { t, w } = words(lang);
  const { next, minute } = onTheWay(data);
  const late = data.samples.late.minutes;
  const say =
    is === 'late'
      ? /** @type {const} */ ({
          kind: 'warn',
          lead: t.behind(late),
          rest: t.finishAt(format.clockPlus(data.route.finish, late)),
        })
      : undefined;
  return {
    clock: format.clockPlus(data.route.start, Math.floor(minute) + (is === 'late' ? late : 0)),
    inner: `<div class="tt tt-outing tt-walk">
      <div class="tt-under">${mapOnTheWay(ctx)}</div>
      ${outingTop(ctx, minute, say)}
      ${is === 'offline' ? noNetwork(lang, { top: underBoard(os) }) : ''}
      <div class="tt-rail">${round(icons.layers, t.say.mapView)}${round(icons.locate, t.say.locate)}</div>
      ${osm('bottom:214px')}
      ${ahead(lang, {
        stop: next,
        metres: Math.round((next.legMetres * 2.4) / next.legMinutes / 10) * 10,
        minutes: 2,
        note: is === 'late' ? w.behindNote : w.inTime,
        is: is === 'late' ? 'warn' : undefined,
      })}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function quiet(ctx) {
  const { os, theme, lang, data } = ctx;
  const { t } = words(lang);
  const now = data.outingNow;
  const told = now.story[lang];
  return {
    clock: now.clock,
    inner: `<div class="tt tt-outing">
      <div class="tt-under">${mapAtPlace(ctx)}</div>
      ${outingTop(ctx, now.stop.arriveMin + 1, { kind: 'held', lead: t.quietOn, rest: t.finishAt(data.route.finish) })}
      ${osm('top:208px')}
      ${guide(data, lang, { theme, width: sizeOf(os).width, story: { ...told, current: -1, elapsed: 0 }, from: 0 })}
      ${player(data, lang, { state: 'quiet' })}
    </div>`,
  };
}

/** The guide's page opened in full, with a sentence chosen. @param {Ctx} ctx */
const pageWithSentence = (ctx) => {
  const { os, theme, lang, data } = ctx;
  const now = data.outingNow;
  return `<div class="tt-under">${mapAtPlace(ctx)}</div>
    ${outingTop(ctx, now.stop.arriveMin + 1)}
    ${guide(data, lang, { theme, width: sizeOf(os).width, full: true, picked: now.story[lang].current })}
    ${mini(data, lang)}`;
};

/** @param {Ctx} ctx */
function sentence(ctx) {
  const { lang, data, state: is } = ctx;
  const { t, w } = words(lang);
  const told = data.outingNow.story[lang];
  const offline = is === 'offline';
  return {
    clock: data.outingNow.clock,
    inner: `<div class="tt tt-outing">
      ${pageWithSentence(ctx)}
      ${over(
        `${sheetHead(t.sourceWork)}${source(lang, {
          quote: told.sentences[told.current].text,
          source: told.source,
          actions: `${
            offline
              ? `<div class="tt-list">${item({ icon: icons.external, label: w.openSource, off: t.needsNetwork })}</div>`
              : action(w.openSource, {
                  kind: 'second',
                  icon: icons.external,
                  value: new URL(told.source.url).hostname,
                })
          }${action(w.inaccurate, { kind: 'plain', icon: icons.flag })}`,
        })}`,
        { lang, solid: true },
      )}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function correction(ctx) {
  const { os, lang, data, state: is } = ctx;
  const { w } = words(lang);
  const told = data.outingNow.story[lang];
  const sent = is === 'sent' || is === 'offline';
  return {
    clock: data.outingNow.clock,
    inner: `<div class="tt tt-outing">
      ${pageWithSentence(ctx)}
      ${
        sent
          ? toast({
              icon: is === 'offline' ? icons.sync : icons.check,
              lead: is === 'offline' ? w.correctionKept : w.correctionSent,
              rest: is === 'offline' ? w.correctionKeptNote : w.correctionSentNote,
              style: `bottom:${os === 'android' ? 96 : 104}px`,
            })
          : over(
              `${sheetHead(w.whatIsWrong)}
              <div class="tt-source"><blockquote>${told.sentences[told.current].text}</blockquote></div>
              <div class="tt-space"></div>
              ${options(
                w.whatIsWrong,
                w.wrongKinds.map((name) => ({ label: name })),
                0,
              )}
              <div class="tt-space"></div>
              ${field({ name: w.wrongName, hint: w.wrongHint, state: 'empty' })}
              <div class="tt-space"></div>
              ${action(w.sendCorrection, { icon: icons.send })}`,
              { lang, solid: true },
            )
      }
    </div>`,
  };
}

// ── The lock screen, the questions, the changes on the way ──────────────────

/** @param {Ctx} ctx */
const lock = ({ os, lang, data }) => ({
  clock: data.outingNow.clock,
  inner: lockScreen(data, { os, lang }),
});

/** @param {Ctx} ctx */
function areYouAt(ctx) {
  const { lang, data } = ctx;
  const { t } = words(lang);
  const now = data.outingNow;
  return {
    clock: now.clock,
    inner: `<div class="tt tt-outing tt-walk">
      <div class="tt-under">${mapAtPlace(ctx, { height: sizeOf(ctx.os).height - 150, pitch: 34, unsure: true })}</div>
      ${outingTop(ctx, now.stop.arriveMin)}
      ${dialog({ title: t.atPlace, lead: now.stop.name[lang], text: t.atPlaceNote, yes: t.yesStart, no: t.notYet })}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function stray(ctx) {
  const { os, theme, lang, data } = ctx;
  const { t, w } = words(lang);
  const { width, height } = sizeOf(os);
  const detour = data.map.detour;
  const to = data.stops[detour.skip - 1];
  const metres = 120;
  return {
    clock: format.clockPlus(data.route.start, data.stops[detour.from - 1].leaveMin + 3),
    inner: `<div class="tt tt-outing tt-walk">
      <div class="tt-under">${strayMap(data, {
        lang,
        theme,
        width,
        height,
        metres,
        padding: { top: 190, right: 60, bottom: 260, left: 60 },
      })}</div>
      ${outingTop(ctx, data.stops[detour.from - 1].leaveMin + 3, { kind: 'stop', lead: t.offRoute, rest: t.toLine(format.distance(metres, lang)) })}
      ${osm('bottom:214px')}
      ${ahead(lang, { stop: to, lead: w.backToRoute, metres, minutes: 2, note: w.notReset, is: 'stop' })}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function outingMenu(ctx) {
  const { lang, data, state: is } = ctx;
  const { t, w } = words(lang);
  const offline = is === 'offline';
  return {
    clock: format.clockPlus(data.route.start, Math.floor(onTheWay(data).minute)),
    inner: `<div class="tt tt-outing tt-walk">
      ${wayBehind(ctx, undefined, true)}
      ${offline ? noNetwork(lang, { top: sizeOf(ctx.os).height - 140 }) : ''}
      ${menu(t.say.more, [
        { icon: icons.next, label: t.skip },
        { icon: icons.timer, label: t.shorten, note: t.shortenNote },
        { icon: icons.plus, label: w.extend, note: w.extendNote },
        { icon: icons.cup, label: t.coffee, note: t.coffeeNote },
        { icon: icons.pause, label: w.hold, note: w.holdNote },
        'rule',
        { icon: icons.quiet, label: t.quietOn, note: t.quietNote },
        { icon: icons.sun, label: t.sunMode, note: t.sunNote },
        { icon: icons.battery, label: t.saver, note: t.saverNote },
        offline
          ? {
              icon: platformIcon('share', ctx.os),
              label: w.shareRoute,
              note: t.needsNetwork,
              is: 'off',
            }
          : { icon: platformIcon('share', ctx.os), label: w.shareRoute },
        'rule',
        { icon: icons.stop, label: t.finish, is: 'danger' },
      ])}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function skipped(ctx) {
  const { os, theme, lang, data, state: is } = ctx;
  const { t } = words(lang);
  const { width, height } = sizeOf(os);
  const again = data.recalculated;
  const top = os === 'android' ? 500 : 478;
  const shown = again.stops.filter((/** @type {any} */ s) => s.order >= again.skipped.order - 1);
  const from = shown[0].arriveMin - 4;
  const shifted = shown.map((/** @type {any} */ s) => ({
    ...s,
    arriveMin: s.arriveMin - from,
    leaveMin: s.leaveMin - from,
  }));
  const minute = shown[0].leaveMin + 0.6;
  return {
    clock: format.clockPlus(data.route.start, Math.floor(minute)),
    inner: `<div class="tt tt-outing tt-walk">
      <div class="tt-under">${replanMap(data, {
        lang,
        theme,
        width,
        height,
        padding: { top: 200, right: 44, bottom: height - top + 36, left: 44 },
      })}${osm(`top:${top - 22}px`)}</div>
      ${outingTop(ctx, minute, { lead: t.onTime, rest: t.finishAt(again.route.finish) })}
      ${is === 'offline' ? noNetwork(lang, { top: underBoard(os) + 62 }) : ''}
      ${toast({ icon: icons.route, lead: t.recalculated, rest: `${t.finishAt(again.route.finish)} · ${t.reserve(again.route.reserveMinutes)}`, undo: t.undo, style: `top:${underBoard(os)}px` })}
      ${sheet(
        `<div class="tt-chart-window" style="height:${height - top - 40}px">${chart(data, lang, {
          scale: 6,
          stops: shifted,
          until: 70,
          minute: minute - from,
          skipped: again.skipped,
          ends: false,
        })}</div>`,
        { lang, top },
      )}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function retime(ctx) {
  const { lang, data, state: is } = ctx;
  const { t, w } = words(lang);
  const sample = data.samples.shorten;
  const more = is === 'extend';
  return {
    clock: format.clockPlus(data.route.start, Math.floor(onTheWay(data).minute)),
    inner: `<div class="tt tt-outing tt-walk">
      ${wayBehind(ctx)}
      ${over(
        `${sheetHead(more ? w.extendTitle : w.shortenTitle, { note: w.shortenNote })}
        ${stepper({
          name: more ? w.extra : w.left,
          note: t.budgetNote,
          value: format.duration(more ? sample.extend_min : sample.left_min, lang),
          less: t.say.less,
          more: t.say.more15,
        })}
        <div class="tt-space"></div>
        ${action(w.recalculate, { icon: icons.route })}`,
        { lang },
      )}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function coffee(ctx) {
  const { lang, data } = ctx;
  const { t, w } = words(lang);
  return {
    clock: format.clockPlus(data.route.start, data.stops[5].leaveMin),
    inner: `<div class="tt tt-outing tt-walk">
      ${wayBehind(ctx)}
      ${over(
        `${sheetHead(w.breakTitle, { note: w.breakNote })}
        ${stepper({ name: w.breakLong, value: format.duration(data.samples.shorten.break_min, lang), less: t.say.less, more: t.say.more15 })}
        <div class="tt-space"></div>
        ${label(w.nearby)}
        <div class="tt-list">${data.venues.venues
          .map((/** @type {any} */ v) =>
            item({
              icon: icons.cup,
              label: v.name[lang],
              note: `${w.until(v.closes_today)} · ${format.distance(v.straight_m, lang)} ${w.straight}`,
            }),
          )
          .join('')}</div>
        <div class="tt-space"></div>
        ${action(w.insertBreak, { icon: icons.cup })}`,
        { lang },
      )}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function battery(ctx) {
  const { lang, data } = ctx;
  const { w } = words(lang);
  const minute = Math.floor(onTheWay(data).minute);
  return {
    clock: format.clockPlus(data.route.start, minute),
    inner: `<div class="tt tt-outing tt-walk">
      ${wayBehind(ctx)}
      ${dialog({
        icon: icons.battery,
        title: w.batteryTitle,
        text: w.batteryNote(
          data.samples.battery.percent,
          format.duration(data.route.totalMinutes - minute, lang),
        ),
        yes: w.saverOn,
        no: w.notNow,
      })}
    </div>`,
  };
}

// ── The end, and the journal ────────────────────────────────────────────────

/** @param {Ctx} ctx */
function finish({ os, theme, lang, data, state: is }) {
  const { t, w } = words(lang);
  const { width } = sizeOf(os);
  const heroHeight = 318;
  const map = planMap(data, {
    lang,
    theme,
    width,
    height: heroHeight,
    padding: { top: 112, right: 44, bottom: 96, left: 44 },
    labels: 0,
    state: { done: data.stops.length, marks: false, walkedLegs: data.map.legs.length - 1 },
  });
  return {
    clock: data.route.finish,
    inner: page({
      bar: bar(os, lang, { lead: 'close' }),
      hero: hero({
        media: map,
        kicker: w.finishedKicker(data.route.start, data.route.finish),
        title: w.finished,
      }),
      heroHeight,
      body: `${figures([
        { label: w.figTime, value: format.duration(data.route.totalMinutes, lang) },
        { label: w.figWalked, value: format.distance(data.route.walkingMetres, lang) },
        { label: w.figPlaces, value: w.of(data.stops.length, data.stops.length) },
      ])}
      <div class="tt-space"></div><div class="tt-space"></div>
      ${label(w.rateOuting)}
      ${rate(w.rateOuting, 4, w.rateSay)}
      <p class="tt-aside tt-aside-under">${w.rateNote}</p>
      ${is === 'offline' ? `<div class="tt-space"></div>${banner({ icon: icons.noNetwork, lead: t.noNetwork, rest: w.ratingKept, is: 'warn' })}` : ''}`,
      foot: foot(
        [action(w.done, { icon: icons.check }), action(w.saveRoute, { kind: 'plain' })],
        'stack',
      ),
    }),
  };
}

/** @param {Ctx} ctx */
function journalScreen({ os, lang, data, state: is }) {
  const { t, w } = words(lang);
  const synced = is === 'synced';
  const [first, second] = data.stops;
  return {
    clock: format.clockPlus(data.route.start, second.leaveMin + (synced ? 12 : 2)),
    inner: page({
      bar: bar(os, lang),
      body: `${heading(t.journal, w.journalNote)}
        ${
          synced
            ? `<p class="tt-aside">${icons.check}${w.allSent(format.clockPlus(data.route.start, second.leaveMin + 11))}</p>`
            : banner({
                icon: icons.noNetwork,
                lead: t.noNetwork,
                rest: t.noNetworkNote,
                is: 'warn',
              })
        }
        <div class="tt-space"></div>
        ${journal(lang, [
          { at: first.arrive, label: `${t.journalItems[0]} · ${first.name[lang]}`, sent: true },
          { at: second.arrive, label: `${t.journalItems[0]} · ${second.name[lang]}`, sent: synced },
          { at: second.leave, label: `${t.journalItems[1]} · ${second.name[lang]}`, sent: synced },
        ])}`,
    }),
  };
}

export const during = {
  story,
  walk,
  quiet,
  sentence,
  correction,
  lock,
  areYouAt,
  stray,
  outingMenu,
  skipped,
  retime,
  coffee,
  battery,
  finish,
  journalScreen,
};
