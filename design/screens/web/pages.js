/**
 * The pages of the public web, each at the width of a desk and of a phone:
 * the Route Page as it opens from a messenger, the Invitation, the Route
 * request and editing, a Story played by hand, signing in and deleting the
 * account — and what a messenger shows of the two links.
 *
 * The public web is the web target of the application (ADR-0007): the same
 * components, without what a browser cannot do.
 */
import { format } from '../../directions/shared/data.js';
import { SIZES } from '../../directions/shared/frames.js';
import { icons } from '../../system/icons.js';
import {
  action,
  chips,
  code,
  field,
  segments,
  stepper,
  toggle,
} from '../../system/parts/controls.js';
import { flow, heading, label, scroll, sheetHead } from '../../system/parts/layout.js';
import { item, points } from '../../system/parts/lists.js';
import { groundMap, lineMap, planMap } from '../../system/parts/map.js';
import { chart, head, verdict } from '../../system/parts/route.js';
import { banner, skeleton, state } from '../../system/parts/states.js';
import { guide, player } from '../../system/parts/story.js';
import {
  linkPicture,
  linkPreview,
  messenger,
  panel,
  webCard,
  webNav,
  webNote,
} from '../../system/parts/web.js';
import { editing } from '../phone/before.js';
import { asset, words } from '../phone/kit.js';
import { WB } from './words.js';

/**
 * @typedef {object} Ctx
 * @property {'web' | 'webphone'} os
 * @property {'light' | 'dark' | 'sun'} theme
 * @property {'ru' | 'en'} lang
 * @property {any} data
 * @property {string} state
 */

export const HOST = 'promenade.example';
/** The height of the browser's own bar. */
const BROWSER = 44;

/** @param {Ctx} ctx */
const pageSize = ({ os }) => ({
  width: SIZES[os].width,
  height: SIZES[os].height - BROWSER,
  wide: os === 'web',
});

/** The sign of the product, for the bar. */
const mark = () => asset('system/mark/sign.svg');

/** The words of the web, of the phone's screens and of the components. @param {'ru' | 'en'} lang */
const say = (lang) => ({ ...words(lang), wb: WB[lang] });

/**
 * A page of the web: the map, the bar, a panel, and what stands over them.
 * @param {Ctx} ctx
 * @param {{ map: string, body: string, foot?: string, note?: string, over?: string, top?: number, is?: string, nav?: string, extra?: string }} parts
 *   `top` is where the panel begins at the width of a phone
 */
export function shell(
  ctx,
  { map, body, foot = '', note = '', over = '', top = 250, is = '', nav, extra = '' },
) {
  const { wide } = pageSize(ctx);
  const { t } = say(ctx.lang);
  return `<div class="tt tt-web${wide ? '' : ' tt-webphone'}"${wide ? '' : ` style="--panel-top:${top}px"`}>
    <div class="tt-under">${map}<span class="tt-osm">© OpenStreetMap</span></div>
    ${webNav(ctx.lang, { mark: mark(), action: nav ?? (wide ? t.open : WB[ctx.lang].openShort) })}
    ${panel(body, { foot, is })}
    ${note && wide ? webNote(note) : ''}
    ${extra}${over}
  </div>`;
}

/** The map of the whole Route beside the panel. @param {Ctx} ctx @param {number} [top] of the panel on a phone */
export function routeMap(ctx, top = 250) {
  const { width, height, wide } = pageSize(ctx);
  return planMap(ctx.data, {
    lang: ctx.lang,
    theme: ctx.theme,
    width,
    height,
    padding: wide
      ? { top: 96, right: 90, bottom: 70, left: 530 }
      : { top: 78, right: 30, bottom: height - top + 30, left: 30 },
    labels: wide ? 12 : 3,
  });
}

/** The map with only the start on it. @param {Ctx} ctx @param {number} [top] @param {(ctx: { u: number }) => string} [extra] drawn last */
export function startMap(ctx, top = 250, extra) {
  const { width, height, wide } = pageSize(ctx);
  return groundMap(ctx.data, {
    lang: ctx.lang,
    theme: ctx.theme,
    width,
    height,
    u: wide ? 2.2 : 2.6,
    lift: wide ? 0 : height / 2 - (top + 70) / 2,
    aside: wide ? 250 : 0,
    labels: wide ? 10 : 4,
    extra,
  });
}

// ── The Route Page ──────────────────────────────────────────────────────────

/** @param {Ctx} ctx */
function routePage(ctx) {
  const { lang, data, state: is } = ctx;
  const { t, wb } = say(lang);
  const { wide } = pageSize(ctx);
  const body = {
    usual: () =>
      `<p class="tt-kicker">${wb.previewRoute} · ${t.checked(data.route.checkedAt)}</p>${head(data, lang)}${chart(data, lang, { scale: 6, until: wide ? 62 : 34 })}`,
    loading: () => state({ icon: icons.route, title: wb.routeLoading, extra: skeleton() }),
    error: () =>
      state({
        icon: icons.link,
        title: wb.routeGone,
        text: wb.routeGoneNote,
        is: 'off',
        actions: action(wb.planOwn, { icon: icons.plus }),
      }),
  }[is];
  const shown = is === 'usual';
  return {
    address: `${HOST}/r/early-20th-century`,
    inner: shell(ctx, {
      map: shown ? routeMap(ctx) : startMap(ctx, 330),
      top: shown ? 250 : 330,
      body: body?.() ?? '',
      foot: shown
        ? `${action(wb.takeCopy, { kind: 'second', icon: icons.bookmark, value: wb.takeCopyNote })}${action(wb.listen, { kind: 'second', icon: icons.headphones, value: wb.listenNote })}`
        : '',
      note: t.webNote,
    }),
  };
}

// ── The Invitation ──────────────────────────────────────────────────────────

/** The members of the sample Party, with the one who is answering. @param {any} data */
const partyOf = (data) => {
  const party = data.samples.party;
  return {
    party,
    organizer: party.members.find((/** @type {any} */ m) => m.organizer),
    me: party.members.find((/** @type {any} */ m) => m.id === 'olya'),
    answered: party.members.filter((/** @type {any} */ m) => m.answered).length,
  };
};

/** What an Invitation says first: who, when, how long, where. @param {Ctx} ctx */
function invitationHead({ lang, data }) {
  const { wb } = say(lang);
  const { party, organizer, answered } = partyOf(data);
  return `<p class="tt-kicker">${wb.invitation} · ${wb.answeredOf(answered, party.members.length)}</p>
    <h1 class="tt-head-title">${wb.invites(organizer.name[lang])}</h1>
    <ul class="tt-facts">
      <li>${icons.calendar}${party.weekday[lang]}, ${format.date(party.date, lang)} · ${party.start}</li>
      <li>${icons.timer}${wb.about(party.hours)}</li>
      <li>${icons.pin}${wb.meetingPoint}: ${data.route.startName[lang]}</li>
    </ul>`;
}

/** @param {Ctx} ctx */
function invitation(ctx) {
  const { lang, data, state: is } = ctx;
  const { w, wb } = say(lang);
  const { party, me } = partyOf(data);
  const liked = [1, 3];
  const form = () =>
    `${invitationHead(ctx)}<div class="tt-space"></div>${scroll(
      flow(
        [
          field({ name: wb.yourName, value: me.name[lang] }),
          `<div>${label(wb.likes)}${chips(w.themes.map((name, i) => [name, liked.includes(i)]))}</div>`,
          `<div>${label(wb.never)}${w.dealbreakers
            .map((name, i) => toggle(name, i === 0))
            .join('')}<p class="tt-aside">${wb.neverNote}</p></div>`,
          `<div>${label(w.pace)}${segments(
            w.pace,
            w.paces.map((name) => ({ label: name })),
            0,
          )}</div>`,
          field({ name: wb.wishOptional, hint: wb.wishOptionalHint, state: 'empty' }),
        ],
        'tight',
      ),
    )}`;
  const done = () =>
    `${invitationHead(ctx)}<div class="tt-space"></div>${scroll(`
    ${banner({ icon: icons.check, lead: wb.answered, rest: wb.answeredNote, is: 'ok' })}
    <div class="tt-space"></div>
    ${label(wb.whoAnswered)}
    ${points(
      party.members.map((/** @type {any} */ m) => ({
        icon: m.answered ? icons.check : icons.clock,
        text: `${m.name[lang]}${m.id === me.id ? ` (${wb.you})` : ''} · ${m.organizer ? wb.organizer : m.answered ? wb.hasAnswered : wb.notYet}`,
      })),
    )}
    <div class="tt-space"></div>
    ${field({ name: wb.emailOptional, hint: w.emailHint, note: wb.emailNote, state: 'empty', icon: icons.mail })}`)}`;
  const gone = () =>
    state({ icon: icons.link, title: wb.linkGone, text: wb.linkGoneNote, is: 'off' });
  const top = is === 'error' ? 400 : 210;
  return {
    address: `${HOST}/i/k7m2-saturday`,
    inner: shell(ctx, {
      map: startMap(ctx, top),
      top,
      is: 'is-wide',
      body: is === 'answered' ? done() : is === 'error' ? gone() : form(),
      foot:
        is === 'usual'
          ? `${action(wb.answer, { icon: icons.check })}<p class="tt-aside tt-panel-note">${wb.answerNote}</p>`
          : is === 'answered'
            ? action(wb.changeAnswer, { kind: 'second', icon: icons.edit })
            : '',
      nav: wb.signIn,
    }),
  };
}

// ── The Route request and editing ───────────────────────────────────────────

/** @param {Ctx} ctx */
function request(ctx) {
  const { lang, data } = ctx;
  const { t, w, wb } = say(lang);
  return {
    address: `${HOST}/plan`,
    inner: shell(ctx, {
      map: startMap(ctx, 150),
      top: 150,
      body: `${heading(wb.newOuting, wb.newOutingNote)}${flow(
        [
          `<div class="tt-list">${item({ icon: icons.station, label: data.route.startName[lang], note: w.startFinish })}</div>`,
          segments(
            w.when,
            [
              { label: `${w.whenNow} · ${data.route.checkedAt}` },
              { label: w.whenLater, icon: icons.calendar },
            ],
            0,
          ),
          stepper({
            name: t.budgetName,
            note: t.budgetNote,
            value: format.duration(data.route.budgetMinutes, lang),
            less: t.say.less,
            more: t.say.more15,
          }),
          field({ name: t.wishName, value: data.route.wish[lang], note: t.wishNote }),
          toggle(t.inside, false, w.insideNote),
        ],
        'tight',
      )}`,
      foot: action(w.showReading, { icon: icons.arrowRight }),
      nav: wb.signIn,
    }),
  };
}

/** @param {Ctx} ctx */
function edit(ctx) {
  const { lang, state: is } = ctx;
  const { w, wb } = say(lang);
  const broken = is === 'error';
  const { rows, budget } = editing(ctx, broken);
  return {
    address: `${HOST}/r/early-20th-century/edit`,
    inner: shell(ctx, {
      map: routeMap(ctx, 150),
      top: 150,
      body: `${sheetHead(w.editTitle)}${verdict(lang, budget)}
        ${broken ? `<div class="tt-space"></div>${banner({ icon: icons.alert, lead: w.violations, rest: w.violationsNote, is: 'stop' })}` : ''}
        <div class="tt-adds">${action(w.addPlace, { kind: 'plain', icon: icons.map })}${action(w.addCustom, { kind: 'plain', icon: icons.plus })}</div>
        ${scroll(`<ol>${rows.join('')}</ol>`)}`,
      is: 'is-column',
      foot: action(w.done, { icon: icons.check }),
      nav: wb.signIn,
    }),
  };
}

// ── A Story played by hand ──────────────────────────────────────────────────

/** @param {Ctx} ctx */
function story(ctx) {
  const { theme, lang, data } = ctx;
  const { t } = say(lang);
  const { width, height, wide } = pageSize(ctx);
  const now = data.outingNow;
  const around = data.stops.filter((/** @type {any} */ s) => s.order <= 6);
  const map = planMap(data, {
    lang,
    theme,
    width,
    height: wide ? height : 190,
    points: around.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
    padding: wide
      ? { top: 110, right: 340, bottom: 250, left: 550 }
      : { top: 70, right: 30, bottom: 30, left: 30 },
    labels: wide ? 6 : 0,
    state: { current: now.stop.order, done: now.stop.order - 1, marks: wide },
  });
  return {
    address: `${HOST}/r/early-20th-century/${now.stop.order}`,
    inner: `<div class="tt tt-web tt-web-outing${wide ? '' : ' tt-webphone'}">
      <div class="tt-under">${map}<span class="tt-osm">© OpenStreetMap</span></div>
      ${webNav(lang, { mark: mark(), action: wide ? t.open : WB[lang].openShort })}
      ${guide(data, lang, { from: wide ? 0 : undefined, theme, width: wide ? 490 : width })}
      ${player(data, lang)}
      ${wide ? `<section class="tt-webchart lg">${chart(data, lang, { scale: 3.5, compact: true, selected: now.stop.order })}</section>${webNote(t.webNote)}` : ''}
    </div>`,
  };
}

// ── Signing in, deleting the account ────────────────────────────────────────

/** A page of the web behind a card. @param {Ctx} ctx @param {string} card @param {string} name */
const behindCard = (ctx, card, name) => {
  const { t, wb } = say(ctx.lang);
  return shell(ctx, {
    map: routeMap(ctx),
    body: `${head(ctx.data, ctx.lang)}${chart(ctx.data, ctx.lang, { scale: 6, until: 40 })}`,
    nav: wb.signIn,
    note: t.webNote,
    over: webCard(card, { name }),
  });
};

/** @param {Ctx} ctx */
function signIn(ctx) {
  const { lang, data, state: is } = ctx;
  const { w } = say(lang);
  const email = data.samples.account.email;
  const card =
    is === 'code'
      ? `${heading(w.codeTitle, w.codeNote(email))}${code(w.codeName, data.samples.code.digits)}<div class="tt-space"></div>${action(w.codeAgain, { kind: 'plain', icon: icons.reload })}`
      : `${heading(w.signInTitle, w.signInNote)}${flow([
          field({ name: w.email, value: email, icon: icons.mail }),
          action(w.getCode),
          `<p class="tt-or">${w.or}</p>`,
          action(w.withApple, { kind: 'second', icon: icons.person }),
          action(w.withGoogle, { kind: 'second', icon: icons.person }),
        ])}`;
  return { address: `${HOST}/sign-in`, inner: behindCard(ctx, card, w.signInTitle) };
}

/** @param {Ctx} ctx */
function deleteAccount(ctx) {
  const { lang } = ctx;
  const { w } = say(lang);
  const signs = [icons.person, icons.flag, icons.bookmark];
  const card = `${heading(w.deleteTitle, w.deleteNote)}
    ${points(w.deleteItems.map((text, i) => ({ icon: signs[i], text })))}
    <p class="tt-aside tt-aside-under">${w.deleteKeeps}</p>
    <div class="tt-space"></div>
    ${flow([action(w.deleteAction, { kind: 'danger', icon: icons.trash }), action(w.cancel, { kind: 'plain' })], 'tight')}`;
  return { address: `${HOST}/account`, inner: behindCard(ctx, card, w.deleteTitle) };
}

// ── What a messenger shows of a link ────────────────────────────────────────

/** @param {{ os: 'ios' | 'android', theme: 'light' | 'dark' | 'sun', lang: 'ru' | 'en', data: any }} ctx @param {'route' | 'invitation'} what */
function preview({ theme, lang, data }, what) {
  const { t, wb } = say(lang);
  const { party, organizer } = partyOf(data);
  const anya = party.members.find((/** @type {any} */ m) => m.id === 'anya');
  const route = what === 'route';
  const title = route ? t.title : wb.invites(organizer.name[lang]);
  const when = `${party.weekday[lang]}, ${party.start}`;
  const picture = linkPicture({
    map: route
      ? lineMap(data, { lang, theme, size: 315 })
      : groundMap(data, { lang, theme, width: 324, height: 315, u: 3, labels: 3 }),
    mark: mark(),
    kicker: route ? wb.previewRoute : wb.invitation,
    title: route ? title : when,
    figure: route ? format.duration(data.route.totalMinutes, lang) : wb.about(party.hours),
    note: route
      ? `${t.places(data.route.stopCount)} · ${format.distance(data.route.walkingMetres, lang)}`
      : `${wb.meetingPoint}: ${data.route.startName[lang]}`,
  });
  return {
    clock: data.route.nowBeforeStart,
    inner: messenger({
      title: wb.chatName,
      people: wb.chatPeople(party.members.length),
      messages: [
        {
          from: organizer.name[lang],
          text: wb.chatAsk,
          at: format.clockPlus(data.route.checkedAt, -9),
        },
        { text: wb.chatYes, mine: true, at: format.clockPlus(data.route.checkedAt, -7) },
        {
          from: (route ? anya : organizer).name[lang],
          text: route ? wb.chatRoute : wb.chatInvite,
          link: linkPreview({
            picture,
            title,
            text: route
              ? wb.previewRouteText
              : `${when}, ${wb.about(party.hours)}. ${wb.previewInviteText}`,
            host: HOST,
          }),
          at: data.route.checkedAt,
        },
      ],
    }),
  };
}

export const web = {
  routePage,
  invitation,
  request,
  edit,
  story,
  signIn,
  deleteAccount,
  previewRoute: (/** @type {any} */ ctx) => preview(ctx, 'route'),
  previewInvitation: (/** @type {any} */ ctx) => preview(ctx, 'invitation'),
};
