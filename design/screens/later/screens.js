/**
 * The key screens of the Party (stage S2) and of the Catalog (stage S3): where
 * the product goes after the solo Outing, drawn in the same system before
 * anything of it is built. The full sets come with `D-06` and `D-07`.
 *
 * A screen that the web has too is one function: on a phone it is the map
 * under a sheet or a page; in a browser it is a page of the web.
 */
import { format } from '../../directions/shared/data.js';
import { SIZES } from '../../directions/shared/frames.js';
import { icons, platformIcon } from '../../system/icons.js';
import {
  action,
  back,
  chips,
  field,
  options,
  round,
  segments,
  stepper,
  toggle,
} from '../../system/parts/controls.js';
import {
  bar,
  flow,
  foot,
  heading,
  hero,
  label,
  over,
  page,
  scroll,
  sheetHead,
} from '../../system/parts/layout.js';
import { item, saved } from '../../system/parts/lists.js';
import {
  groundMap,
  lineMap,
  memberOnPlan,
  planMap,
  positionAt,
  walkMap,
} from '../../system/parts/map.js';
import {
  chat,
  composer,
  faces,
  memberRow,
  members,
  partyOption,
  recap,
  review,
  stars,
} from '../../system/parts/party.js';
import { board, figures } from '../../system/parts/route.js';
import { sheet } from '../../system/parts/sheets.js';
import { webCard } from '../../system/parts/web.js';
import { banner, skeleton, state } from '../../system/parts/states.js';
import { offered } from '../phone/before.js';
import { asset, noNetwork, osm, underTop, words } from '../phone/kit.js';
import { HOST, routeMap as webRouteMap, shell, startMap as webStartMap } from '../web/pages.js';
import { WB } from '../web/words.js';
import { L } from './words.js';

/**
 * @typedef {object} Ctx
 * @property {'ios' | 'android' | 'web' | 'webphone'} os
 * @property {'light' | 'dark' | 'sun'} theme
 * @property {'ru' | 'en'} lang
 * @property {any} data
 * @property {string} state
 */

/** The words of this file, of the web, of the phone and of the components. @param {'ru' | 'en'} lang */
const say = (lang) => ({ ...words(lang), wb: WB[lang], l: L[lang] });

/** @param {Ctx} ctx */
const onWeb = ({ os }) => os === 'web' || os === 'webphone';

/** The Party of SC-2, with the member a screen is seen by. @param {any} data @param {string} [as] */
function partyOf(data, as = 'dima') {
  const party = data.samples.party;
  const by = (/** @type {string} */ id) =>
    party.members.find((/** @type {any} */ m) => m.id === id);
  return {
    party,
    by,
    me: by(as),
    organizer: party.members.find((/** @type {any} */ m) => m.organizer),
    answered: party.members.filter((/** @type {any} */ m) => m.answered),
  };
}

/** When the Party goes: the day, the date and the time. @param {any} data @param {'ru' | 'en'} lang */
const whenOf = (data, lang) => {
  const party = data.samples.party;
  return `${party.weekday[lang]}, ${format.date(party.date, lang)} · ${party.start}`;
};

/** The map of the whole Route above a sheet, on a phone. @param {Ctx} ctx @param {number} top */
function phoneRouteMap({ os, theme, lang, data }, top) {
  const { width, height } = SIZES[/** @type {'ios'} */ (os)];
  return planMap(data, {
    lang,
    theme,
    width,
    height,
    padding: { top: 116, right: 34, bottom: height - top + 30, left: 34 },
    labels: 3,
  });
}

/** The map around the Meeting Point, on a phone. @param {Ctx} ctx @param {number} top @param {(ctx: { u: number }) => string} [extra] */
function phoneStartMap({ os, theme, lang, data }, top, extra) {
  const { width, height } = SIZES[/** @type {'ios'} */ (os)];
  return groundMap(data, {
    lang,
    theme,
    width,
    height,
    u: 2.6,
    lift: height / 2 - (top + 100) / 2,
    labels: 4,
    extra,
  });
}

/**
 * A screen that is the map under a sheet on a phone and a page in a browser.
 * @param {Ctx} ctx
 * @param {{ kind: 'route' | 'start', top: number, body: string, actions?: string[], over?: string, path: string, band?: string, extra?: (ctx: { u: number }) => string, trailing?: string }} parts
 */
function mapScreen(
  ctx,
  { kind, top, body, actions = [], over: above = '', path, band = '', extra, trailing = '' },
) {
  const { t } = say(ctx.lang);
  if (onWeb(ctx)) {
    const web = /** @type {any} */ (ctx);
    return {
      address: `${HOST}/${path}`,
      inner: shell(web, {
        map: kind === 'route' ? webRouteMap(web, 170) : webStartMap(web, 170, extra),
        top: 170,
        body: scroll(body),
        foot: actions.join(''),
        is: 'is-wide',
        nav: WB[ctx.lang].signIn,
        over: above,
      }),
    };
  }
  const os = /** @type {'ios' | 'android'} */ (ctx.os);
  return {
    clock: ctx.data.route.nowBeforeStart,
    inner: `<div class="tt tt-later">
      <div class="tt-under">${kind === 'route' ? phoneRouteMap(ctx, top) : phoneStartMap(ctx, top, extra)}${osm(`top:${top - 22}px`)}</div>
      <header class="tt-top">${back(os, t.say.back)}<span class="tt-fill"></span>${trailing}</header>
      ${band}
      ${sheet(scroll(body), { lang: ctx.lang, top, className: `is-column${actions.length ? ' has-foot' : ''}` })}
      ${actions.length ? foot(actions) : ''}
      ${above}
    </div>`,
  };
}

// ── Stage S2 · The Party ────────────────────────────────────────────────────

/** @param {Ctx} ctx */
function create(ctx) {
  const { lang, data, state: is } = ctx;
  const { t, l } = say(lang);
  const party = data.samples.party;
  const body = `${sheetHead(l.createTitle, { note: l.createNote })}${flow(
    [
      `<div class="tt-list">${item({ icon: icons.calendar, label: whenOf(data, lang), note: l.date })}${item({ icon: icons.pin, label: data.route.startName[lang], note: l.area })}${item({ icon: icons.walk, label: l.onFoot, note: l.travel })}</div>`,
      stepper({
        name: t.budgetName,
        note: t.budgetNote,
        value: format.duration(party.hours * 60, lang),
        less: t.say.less,
        more: t.say.more15,
      }),
      `<div>${label(l.mode)}${segments(
        l.mode,
        [
          { label: t.guided, icon: icons.voice },
          { label: t.quiet, icon: icons.quiet },
        ],
        1,
      )}</div>`,
      `<p class="tt-aside">${icons.people}${l.partyLimit}</p>`,
    ],
    'tight',
  )}`;
  const link = over(
    `${sheetHead(l.invitationReady, { note: l.invitationReadyNote })}
    ${field({ name: WB[lang].invitation, value: `${HOST}/i/k7m2-saturday`, icon: icons.link })}
    <div class="tt-space"></div>
    ${action(l.shareLink, { icon: platformIcon('share', ctx.os === 'android' ? 'android' : 'ios') })}
    <div class="tt-space"></div>
    <div class="tt-list">${item({ icon: icons.link, label: l.copyLink })}${item({ icon: icons.reload, label: l.replaceLink, note: l.replaceNote })}</div>
    <p class="tt-aside tt-aside-under">${l.notRoute}</p>`,
    { lang },
  );
  return mapScreen(ctx, {
    kind: 'start',
    top: ctx.os === 'android' ? 300 : 290,
    body,
    actions: [action(l.createInvitation, { icon: icons.people })],
    over: is === 'link' ? link : '',
    path: 'party/new',
  });
}

/** @param {Ctx} ctx */
function answer({ os, lang, data }) {
  const { w, wb, l } = say(lang);
  const { organizer, answered, party } = partyOf(data);
  const phone = /** @type {'ios' | 'android'} */ (os);
  return {
    clock: data.route.nowBeforeStart,
    inner: page({
      bar: bar(phone, lang, { title: wb.invitation }),
      body: `${heading(wb.invites(organizer.name[lang]), `${whenOf(data, lang)} · ${wb.about(party.hours)} · ${wb.answeredOf(answered.length, party.members.length)}`)}
        ${banner({ icon: icons.person, lead: l.answerTitle, rest: l.answerNote, is: 'ok' })}
        <div class="tt-space"></div>
        ${scroll(
          flow(
            [
              `<div>${label(`${wb.likes} · ${l.fromProfile}`)}${chips(w.themes.map((name, i) => [name, i < 2]))}</div>`,
              `<div>${label(wb.never)}${w.dealbreakers
                .map((name) => toggle(name, false))
                .join('')}</div>`,
              `<div>${label(w.pace)}${segments(
                w.pace,
                w.paces.map((name) => ({ label: name })),
                1,
              )}</div>`,
              field({ name: wb.wishOptional, hint: wb.wishOptionalHint, state: 'empty' }),
            ],
            'tight',
          ),
        )}`,
      foot: foot([action(wb.answer, { icon: icons.check })]),
      is: 'is-column',
    }),
  };
}

/**
 * The three Routes offered to the Party, each with what is in it for whom.
 * @param {Ctx} ctx @param {{ vote?: boolean, as?: string, chosen?: boolean }} [show]
 */
function partyOptions({ lang, data }, { vote = false, as = 'olya', chosen = false } = {}) {
  const { t, w, l } = say(lang);
  const { by } = partyOf(data);
  const sample = data.samples.party.options;
  const mine = ['', 'for', 'against'];
  return offered(data)
    .map((o, i) =>
      partyOption(lang, {
        name: w.options[i],
        line: sample.lines[i][lang],
        route: o.route,
        stops: o.stops,
        times: `${o.route.start} — ${o.route.finish}`,
        facts: `${t.places(o.route.stopCount)} · ${format.distance(o.route.walkingMetres, lang)}`,
        tags: Object.entries(sample.got[i]).map(([id, got]) => ({
          member: by(id),
          got: got[lang],
        })),
        chosen: chosen && i === sample.chosen,
        vote: vote
          ? {
              mine: /** @type {any} */ (as === 'olya' ? mine[i] : i === 0 ? 'for' : ''),
              ...sample.votes[i],
              labels: l.voteLabels,
            }
          : undefined,
      }),
    )
    .join('');
}

/** @param {Ctx} ctx */
function optionsScreen(ctx) {
  const { lang, data, state: is } = ctx;
  const { l } = say(lang);
  const { party, answered } = partyOf(data);
  return mapScreen(ctx, {
    kind: 'route',
    top: underTop(ctx.os === 'android' ? 'android' : 'ios') + 6,
    body: `<p class="tt-kicker">${l.optionsFor(party.members.length)} · ${l.answersIn(answered.length, party.members.length)}</p>
      ${
        is === 'late'
          ? banner({ icon: icons.people, lead: l.newAnswer, rest: l.newAnswerNote, is: 'warn' })
          : banner({ icon: icons.check, lead: l.noDealbreaker, rest: l.waitingFor, is: 'ok' })
      }
      <div class="tt-space"></div>
      ${partyOptions(ctx)}`,
    actions: [
      is === 'late'
        ? action(l.recalculateOptions, { icon: icons.reload })
        : action(l.offerVote, { icon: icons.people }),
    ],
    path: 'party/k7m2/options',
  });
}

/** @param {Ctx} ctx */
function vote(ctx) {
  const { lang, data, state: is } = ctx;
  const { l } = say(lang);
  const { organizer } = partyOf(data);
  const organizing = is === 'organizer';
  const chosen = is === 'chosen';
  return mapScreen(ctx, {
    kind: 'route',
    top: underTop(ctx.os === 'android' ? 'android' : 'ios') + 6,
    body: `${sheetHead(l.voteTitle, { note: l.voteNote })}
      ${chosen ? `${banner({ icon: icons.check, lead: l.chosen, rest: l.chosenNote(organizer.name[lang]), is: 'ok' })}<div class="tt-space"></div>` : ''}
      ${partyOptions(ctx, { vote: true, as: organizing ? 'dima' : 'olya', chosen })}`,
    actions: organizing ? [action(l.choose, { icon: icons.check })] : [],
    trailing: round(icons.chat, l.chatTitle),
    path: 'party/k7m2/vote',
  });
}

/** @param {Ctx} ctx */
function chatScreen(ctx) {
  const { lang, data, state: is } = ctx;
  const { l } = say(lang);
  const { by, party } = partyOf(data);
  const offline = is === 'offline';
  const lines = party.chat.lines.map((/** @type {any} */ line, /** @type {number} */ i) =>
    line.event
      ? { event: line.event[lang] }
      : {
          from: line.mine ? undefined : by(line.from),
          mine: line.mine,
          text: line.text[lang],
          at: line.at,
          reaction: line.reaction,
          waiting: offline && i === party.chat.lines.length - 1 ? l.waitingToSend : undefined,
        },
  );
  const write = composer({ hint: l.message, send: l.send, off: offline ? l.chatOff : undefined });
  if (onWeb(ctx)) {
    const web = /** @type {any} */ (ctx);
    return {
      address: `${HOST}/party/k7m2/chat`,
      inner: shell(web, {
        map: webRouteMap(web, 170),
        top: 170,
        body: `${sheetHead(l.chatTitle, { note: whenOf(data, lang) })}${chat(lang, lines, l.chatTitle)}`,
        foot: write,
        nav: WB[lang].signIn,
      }),
    };
  }
  const os = /** @type {'ios' | 'android'} */ (ctx.os);
  return {
    clock: data.route.nowBeforeStart,
    inner: page({
      bar: bar(os, lang, {
        title: l.chatTitle,
        trailing: `<span class="tt-bar-faces">${faces(party.members, lang, l.partyName)}</span>`,
      }),
      body: `${offline ? `${banner({ icon: icons.noNetwork, lead: l.chatOff, rest: '', is: 'warn' })}<div class="tt-space"></div>` : ''}${chat(lang, lines, l.chatTitle)}`,
      over: write,
      is: 'has-composer',
    }),
  };
}

/** @param {Ctx} ctx */
function meeting(ctx) {
  const { lang, data, state: is } = ctx;
  const { l } = say(lang);
  const { party } = partyOf(data);
  const offline = is === 'offline';
  const os = /** @type {'ios' | 'android'} */ (ctx.os);
  // The one who shares a position is drawn on the way to the start: on the
  // first leg of the reference Outing, which is a real street.
  const where = positionAt(data, 5);
  const sharer = party.members.find((/** @type {any} */ m) => m.id === 'olya');
  const rows = party.members.map((/** @type {any} */ m) =>
    memberRow(m, lang, {
      note: `${l.status[/** @type {'here'} */ (m.status)]}${m.id === sharer.id && !offline ? ` · ${l.shares}` : ''}`,
      mark:
        m.status === 'here'
          ? `${icons.check}${l.status.here}`
          : m.status === 'on_the_way'
            ? `${icons.walk}${l.status.on_the_way}`
            : '',
      is: offline ? 'off' : m.status === 'here' ? 'ok' : m.status === 'unknown' ? 'off' : 'wait',
    }),
  );
  const top = os === 'android' ? 280 : 270;
  return mapScreen(ctx, {
    kind: 'start',
    top,
    extra: offline
      ? undefined
      : ({ u }) =>
          'atStop' in where ? '' : memberOnPlan(where.x, where.y, u, sharer.name[lang].slice(0, 1)),
    body: `${sheetHead(l.meetingTitle, { note: `${data.route.startName[lang]} · ${l.meetAt(format.clockPlus(party.start, -10))}` })}
      ${offline ? `${banner({ icon: icons.noNetwork, lead: l.positionsOff, rest: '', is: 'warn' })}` : ''}
      ${members(l.partyName, rows)}
      ${toggle(l.sharing, false, l.sharingNote)}`,
    actions: [action(l.imHere, { icon: icons.check })],
    band: '',
    trailing: round(icons.chat, l.chatTitle),
    path: 'party/k7m2',
  });
}

/** @param {Ctx} ctx */
function sharedOuting(ctx) {
  const { theme, lang, data } = ctx;
  const { t, l } = say(lang);
  const { party } = partyOf(data);
  const os = /** @type {'ios' | 'android'} */ (ctx.os);
  const now = data.outingNow;
  const map = walkMap(data, {
    lang,
    theme,
    width: SIZES[os].width,
    height: 330,
    minute: now.stop.arriveMin - 0.6,
    walkedLegs: now.stop.order - 1,
    pins: [now.stop, now.next],
  });
  const been = [2, 2, 1, 2, 1];
  const tongue = ['Русский', 'English'];
  const rows = party.members.map((/** @type {any} */ m, /** @type {number} */ i) =>
    memberRow(m, lang, {
      note: `${l.visited(been[i], data.stops.length)} · ${tongue[i === 4 ? 1 : 0]}`,
      mark:
        been[i] === 2 ? `${icons.pin}${now.stop.order}` : `${icons.walk}${t.next.toLowerCase()}`,
      is: been[i] === 2 ? 'ok' : 'wait',
    }),
  );
  return {
    clock: now.clock,
    inner: `<div class="tt tt-outing tt-later">
      <div class="tt-under">${map}</div>
      <header class="tt-top">${back(os, t.say.back)}${board(data, lang, now.stop.arriveMin + 1)}${round(icons.chat, l.chatTitle)}</header>
      ${sheet(`${sheetHead(l.partyAt, { note: now.stop.name[lang] })}${members(l.partyName, rows)}`, { lang, top: os === 'android' ? 330 : 320 })}
    </div>`,
  };
}

// ── Stage S3 · The Catalog ──────────────────────────────────────────────────

/** A Route of the Catalog as a row. @param {Ctx} ctx @param {any} entry */
function catalogRow({ theme, lang, data }, entry) {
  const { t, l } = say(lang);
  const { by } = partyOf(data);
  const route = offered(data)[entry.option].route;
  const author = entry.author ? entry.author[lang] : by(entry.author_member).name[lang];
  return saved({
    map: lineMap(data, { lang, theme, size: 104, again: entry.option === 1 }),
    title: entry.title ? entry.title[lang] : t.title,
    times: format.duration(route.totalMinutes, lang),
    facts: `${t.places(route.stopCount)} · ${format.distance(route.walkingMetres, lang)} · ${l.by(author)}`,
    note: `${stars(entry.rating, l.ratingSay(entry.rating))} · ${l.outings(entry.outings)}`,
  });
}

/** @param {Ctx} ctx */
function catalog(ctx) {
  const { lang, data, state: is } = ctx;
  const { t, l } = say(lang);
  const entries = data.samples.catalog.entries;
  const filters = chips([
    [l.filterDuration[1], is !== 'empty'],
    [l.filterThemes[0], true],
    [l.filterArea, false],
    [l.onFoot, true],
    [l.filterThemes[2], is === 'empty'],
  ]);
  const body = {
    usual: () => entries.map((/** @type {any} */ e) => catalogRow(ctx, e)).join(''),
    loading: () => state({ icon: icons.compass, title: l.catalogLoading, extra: skeleton() }),
    empty: () =>
      state({
        icon: icons.search,
        title: l.catalogEmpty,
        text: l.catalogEmptyNote,
        actions: `${action(l.clearFilters, { kind: 'second', icon: icons.close })}${action(t.newRoute, { kind: 'plain', icon: icons.plus })}`,
      }),
    offline: () =>
      state({
        icon: icons.noNetwork,
        title: l.catalogOffline,
        text: l.catalogOfflineNote,
        is: 'off',
      }),
  }[is];
  const inner = `${is === 'offline' ? '' : `${label(l.filters)}${filters}<div class="tt-space"></div>`}${body?.() ?? ''}`;
  if (onWeb(ctx)) {
    const web = /** @type {any} */ (ctx);
    return {
      address: `${HOST}/catalog`,
      inner: shell(web, {
        map: webRouteMap(web, 170),
        top: 170,
        body: `${heading(l.catalogTitle)}${scroll(inner)}`,
        is: 'is-wide is-column',
        nav: WB[lang].signIn,
      }),
    };
  }
  const os = /** @type {'ios' | 'android'} */ (ctx.os);
  return {
    clock: data.route.nowBeforeStart,
    inner: page({
      bar: bar(os, lang, { trailing: round(icons.search, l.filters) }),
      body: `${heading(l.catalogTitle)}${inner}`,
    }),
  };
}

/** @param {Ctx} ctx */
function published(ctx) {
  const { lang, data, state: is } = ctx;
  const { t, w, wb, l } = say(lang);
  const { by } = partyOf(data);
  const entry = data.samples.catalog.entries[0];
  const reviews = data.samples.catalog.reviews
    .map((/** @type {any} */ r) =>
      review(lang, {
        member: by(r.member),
        date: format.date(r.date, lang),
        rating: r.rating,
        say: l.ratingSay(r.rating),
        text: r.text[lang],
        more: l.moreOnReview,
      }),
    )
    .join('');
  const asked = `${sheetHead(l.complaintTitle, { note: l.complaintNote })}
    ${options(
      l.complaintTitle,
      l.complaintKinds.map((name) => ({ label: name })),
      0,
    )}
    <div class="tt-space"></div>
    ${flow([action(l.sendComplaint, { icon: icons.flag })])}`;
  // In a browser what waits is a card in the middle; on a phone, a sheet.
  const complaint = onWeb(ctx) ? webCard(asked, { name: l.complaintTitle }) : over(asked, { lang });
  return mapScreen(ctx, {
    kind: 'route',
    top: ctx.os === 'android' ? 330 : 320,
    body: `<p class="tt-kicker">${l.catalogTitle} · ${l.by(entry.author[lang])}</p>
      <h1 class="tt-head-title">${t.title}</h1>
      <p class="tt-published">${stars(entry.rating, l.ratingSay(entry.rating))}<span>${l.outings(entry.outings)} · ${t.places(data.route.stopCount)} · ${format.distance(data.route.walkingMetres, lang)} · ${format.duration(data.route.totalMinutes, lang)}</span></p>
      <div class="tt-space"></div>
      ${label(l.reviews)}
      ${reviews}
      <p class="tt-aside tt-aside-under">${l.reviewRule}</p>`,
    actions: [
      action(wb.takeCopy, { kind: 'second', icon: icons.bookmark }),
      action(l.startHere, { icon: icons.play }),
    ],
    over: is === 'complaint' ? complaint : '',
    band:
      is === 'offline' ? noNetwork(lang, { top: underTop('ios'), rest: l.catalogOfflineNote }) : '',
    path: 'catalog/early-20th-century',
    trailing: round(platformIcon('share', ctx.os === 'android' ? 'android' : 'ios'), w.shareRoute),
  });
}

/** @param {Ctx} ctx */
function recapScreen({ os, theme, lang, data }) {
  const { w, l } = say(lang);
  const phone = /** @type {'ios' | 'android'} */ (os);
  const map = planMap(data, {
    lang,
    theme,
    width: SIZES[phone].width - 40,
    height: 300,
    padding: { top: 36, right: 36, bottom: 36, left: 36 },
    labels: 0,
    state: { done: data.stops.length, marks: false, walkedLegs: data.map.legs.length - 1 },
  });
  return {
    clock: data.route.finish,
    inner: page({
      bar: bar(phone, lang, { lead: 'close', title: l.recapTitle }),
      body: `${recap({
        map,
        mark: asset('system/mark/sign.svg'),
        kicker: l.recapKicker(format.date(data.samples.today, lang)),
        title: words(lang).t.title,
        figures: figures([
          { label: w.figTime, value: format.duration(data.route.totalMinutes, lang) },
          { label: w.figWalked, value: format.distance(data.route.walkingMetres, lang) },
          { label: w.figPlaces, value: String(data.stops.length) },
        ]),
      })}
      <div class="tt-space"></div>
      <div class="tt-pair">${action(l.saveImage, { kind: 'second', icon: icons.download })}${action(l.post, { kind: 'second', icon: platformIcon('share', phone) })}</div>
      <div class="tt-space"></div>
      <div class="tt-list">${item({ icon: icons.compass, label: l.publish, note: l.publishNote })}</div>`,
    }),
  };
}

/** @param {Ctx} ctx */
function visits(ctx) {
  const { os, theme, lang, data, state: is } = ctx;
  const { t, l } = say(lang);
  const phone = /** @type {'ios' | 'android'} */ (os);
  const empty = is === 'empty';
  const heroHeight = 360;
  const map = empty
    ? groundMap(data, {
        lang,
        theme,
        width: SIZES[phone].width,
        height: heroHeight,
        u: 4,
        labels: 0,
      })
    : planMap(data, {
        lang,
        theme,
        width: SIZES[phone].width,
        height: heroHeight,
        padding: { top: 116, right: 44, bottom: 90, left: 44 },
        labels: 0,
        state: { done: data.stops.length, marks: false, walkedLegs: data.map.legs.length - 1 },
      });
  const counts = data.samples.catalog.visits;
  return {
    clock: data.route.finish,
    inner: page({
      bar: bar(phone, lang),
      hero: hero({ media: map, title: l.visitsTitle }),
      heroHeight,
      body: empty
        ? state({ icon: icons.pin, title: l.visitsEmpty, text: l.visitsEmptyNote })
        : `${figures([
            { label: l.figCities, value: String(counts.cities) },
            { label: l.figPlaces, value: String(data.stops.length) },
            { label: l.figOutings, value: String(counts.outings) },
          ])}
          <div class="tt-space"></div><div class="tt-space"></div>
          ${saved({
            map: lineMap(data, { lang, theme, size: 104, walked: true }),
            title: t.title,
            times: `${data.route.start} — ${data.route.finish}`,
            facts: `${t.places(data.route.stopCount)} · ${format.distance(data.route.walkingMetres, lang)}`,
            note: words(lang).w.walkedOn(format.date(data.samples.today, lang)),
          })}`,
    }),
  };
}

export const later = {
  create,
  answer,
  optionsScreen,
  vote,
  chatScreen,
  meeting,
  sharedOuting,
  catalog,
  published,
  recapScreen,
  visits,
};
