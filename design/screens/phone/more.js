/**
 * What the walk through the work packages of stage S1 added (`D-05`): states
 * and screens that a package builds and no mockup showed. Each new state is
 * a screen of `before.js`, `outing.js` or `after.js` with something more
 * over it, so the screens stay what they were.
 */
import { format } from '../../directions/shared/data.js';
import { icons, kindIcon } from '../../system/icons.js';
import { action, back, code, field, options, stepper } from '../../system/parts/controls.js';
import { bar, foot, heading, over, page, sheetHead } from '../../system/parts/layout.js';
import { item, points } from '../../system/parts/lists.js';
import { groundMap, planMap } from '../../system/parts/map.js';
import { ask, dialog, sheet } from '../../system/parts/sheets.js';
import { banner, state } from '../../system/parts/states.js';
import { placePage } from '../../system/parts/story.js';
import { letter } from '../../system/parts/web.js';
import { after } from './after.js';
import { before } from './before.js';
import { asset, osm, sizeOf, underTop, words } from './kit.js';
import { during, wayBehind } from './outing.js';

/** @typedef {import('./kit.js').Ctx} Ctx */
/** @typedef {(ctx: Ctx) => { inner: string, clock?: string }} Render */

/** A screen with states of its own beside those it already had. @param {Render} base @param {Record<string, Render>} states */
const withStates = (base, states) =>
  /** @type {Render} */ ((ctx) => (states[ctx.state] ?? base)(ctx));

/** A screen as it usually is. @param {Render} base @param {Ctx} ctx @param {string} [is] */
const usual = (base, ctx, is = 'usual') => base({ ...ctx, state: is });

/** Puts something over a screen: inside it, after everything else. @param {{ inner: string, clock?: string }} screen @param {string} above */
const withOver = (screen, above) => ({
  ...screen,
  inner: screen.inner.replace(/<\/div>\s*$/, `${above}</div>`),
});

/** A question that does not wait, at a height of its own. @param {string} text @param {string} inner @param {number} bottom */
const askAt = (text, inner, bottom) =>
  ask(text, inner).replace('class="tt-ask lg"', `class="tt-ask lg" style="bottom:${bottom}px"`);

/** Two answers of the same weight. @param {string} first @param {string} second */
const pair = (first, second) =>
  `<div class="tt-pair">${action(first, { kind: 'second' })}${action(second, { kind: 'second' })}</div>`;

/** Places of the base that are like those of the Route and are not on it: real ones, from the queue of the console. @param {any} data */
const similar = (data) =>
  data.console.queue.items
    .filter((/** @type {any} */ p) => p.kind === 'building' && !p.sensitive)
    .slice(0, 3);

// ── The request and the Routes offered ──────────────────────────────────────

/** A state of the Routes offered in which there is nothing to offer. @param {Ctx} ctx @param {string} body */
function nothing({ os, theme, lang, data }, body) {
  const { t } = words(lang);
  const { width, height } = sizeOf(os);
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="tt tt-options">
      <div class="tt-under">${groundMap(data, { lang, theme, width, height, lift: height / 2 - 170, u: 3 })}${osm(`top:${underTop(os) - 4}px`)}</div>
      <header class="tt-top">${back(os, t.say.back)}<span class="tt-fill"></span></header>
      ${sheet(body, { lang, className: 'is-state' })}
    </div>`,
  };
}

const optionsMore = withStates(before.options, {
  closed: (ctx) => {
    const { t, w } = words(ctx.lang);
    return nothing(
      ctx,
      state({
        icon: icons.clock,
        title: w.allClosed,
        text: w.allClosedNote,
        extra: `<div class="tt-relax">${action(w.relaxOutside, { kind: 'second', icon: icons.eye, value: w.relaxOutsideNote })}${action(w.relaxLater, { kind: 'second', icon: icons.calendar, value: w.relaxLaterNote })}</div>`,
        actions: action(t.changeRequest, { kind: 'plain' }),
      }),
    );
  },
  nowhere: (ctx) => {
    const { t, w } = words(ctx.lang);
    return nothing(
      ctx,
      state({
        icon: icons.map,
        title: w.noCity,
        text: w.noCityNote,
        is: 'off',
        actions: `${action(w.chooseCity, { icon: icons.pin })}${action(t.changeRequest, { kind: 'plain' })}`,
      }),
    );
  },
});

// ── A Place, editing, the collection ────────────────────────────────────────

const placeMore = withStates(before.place, {
  replace: (ctx) => {
    const { w } = words(ctx.lang);
    return withOver(
      usual(before.place, ctx),
      over(
        `${sheetHead(w.similarTitle, { note: w.similarNote })}<div class="tt-list">${similar(
          ctx.data,
        )
          .map((/** @type {any} */ p) =>
            item({
              icon: kindIcon(p.kind),
              label: p.name[ctx.lang],
              note: `${w.similarWhy}${p.heritage ? ` · ${w.factHeritage.toLowerCase()}` : ''}`,
            }),
          )
          .join('')}</div>`,
        { lang: ctx.lang },
      ),
    );
  },
  // A Place that is closed for a time is offered only with a warning and never
  // as one to go into (§4.3, rules). Shown on a theatre, as a sample.
  closed: ({ os, theme, lang, data }) => {
    const { w } = words(lang);
    const { width, height } = sizeOf(os);
    const stop = data.stops[4];
    return {
      clock: data.route.nowBeforeStart,
      inner: `<div class="tt tt-place-screen">
        <div class="tt-under">${planMap(data, { lang, theme, width, height, padding: { top: 116, right: 34, bottom: 520, left: 34 } })}</div>
        <i class="tt-scrim"></i>
        ${placePage(data, stop, lang, {
          theme,
          width,
          facts: [
            `${icons.eye}${w.relaxOutside}`,
            `${icons.clock}${w.factVisit(data.route.visitMinutes)}`,
          ],
          warning: banner({
            icon: icons.warning,
            lead: w.tempClosed,
            rest: w.tempClosedNote,
            is: 'warn',
          }),
          actions: `${action(w.replace, { kind: 'plain', icon: icons.swap })}${action(w.removeFromRoute, { kind: 'plain-danger', icon: icons.trash })}`,
        })}
      </div>`,
    };
  },
  wrong: (ctx) => {
    const { w } = words(ctx.lang);
    return withOver(
      usual(before.place, ctx),
      over(
        `${sheetHead(w.placeWrongTitle)}
        ${options(
          w.placeWrongTitle,
          w.placeWrongKinds.map((name) => ({ label: name })),
          0,
        )}
        <div class="tt-space"></div>
        ${field({ name: w.wrongName, hint: w.wrongHint, state: 'empty' })}
        <div class="tt-space"></div>
        ${action(w.sendCorrection, { icon: icons.send })}`,
        { lang: ctx.lang },
      ),
    );
  },
});

const editMore = withStates(before.edit, {
  custom: (ctx) => {
    const { t, w } = words(ctx.lang);
    return withOver(
      usual(before.edit, ctx),
      over(
        `${sheetHead(w.customTitle, { note: w.customTitleNote })}
        ${field({ name: w.customField, hint: w.customHint, state: 'empty' })}
        <div class="tt-space"></div>
        <div class="tt-list">${item({ icon: icons.pin, label: w.customPoint, value: w.pickOnMap })}</div>
        <div class="tt-space"></div>
        ${stepper({ name: w.customStay, value: format.duration(ctx.data.samples.custom_place.visit_min, ctx.lang), less: t.say.less, more: t.say.more15 })}
        <div class="tt-space"></div>
        ${action(w.add, { icon: icons.plus })}`,
        { lang: ctx.lang },
      ),
    );
  },
  add: (ctx) => {
    const { w } = words(ctx.lang);
    const [place] = similar(ctx.data);
    return withOver(
      usual(before.edit, ctx),
      over(
        `${sheetHead(w.fromMapTitle, { note: w.fromMapNote })}
        <div class="tt-list">${item({ icon: kindIcon(place.kind), label: place.name[ctx.lang], note: w.similarWhy })}</div>
        <div class="tt-space"></div>
        ${action(w.add, { icon: icons.plus })}`,
        { lang: ctx.lang },
      ),
    );
  },
});

const routesMore = withStates(after.routes, {
  manage: (ctx) => {
    const { t, w } = words(ctx.lang);
    return withOver(
      usual(after.routes, ctx),
      over(
        `${sheetHead(w.renameTitle)}
        ${field({ name: w.routeName, value: t.title, icon: icons.edit })}
        <div class="tt-space"></div>
        ${action(w.save, { icon: icons.check })}
        <div class="tt-space"></div>
        ${action(w.deleteRoute, { kind: 'plain-danger', icon: icons.trash })}
        <p class="tt-aside">${w.deleteRouteNote}</p>`,
        { lang: ctx.lang },
      ),
    );
  },
});

// ── The Outing: pause, and what the triggers ask ────────────────────────────

const walkMore = withStates(during.walk, {
  paused: (ctx) => {
    const { t, w } = words(ctx.lang);
    return {
      clock: usual(during.walk, ctx).clock,
      inner: `<div class="tt tt-outing tt-walk">
        ${wayBehind(ctx, { kind: 'held', lead: t.held, rest: '' })}
        ${askAt(t.held, `<p class="tt-aside">${w.paused}</p><div class="tt-space"></div><div class="tt-pair">${action(t.resume, { icon: icons.play })}${action(t.finish, { kind: 'second', icon: icons.stop })}</div>`, 40)}
      </div>`,
    };
  },
});

const strayMore = withStates(during.stray, {
  far: (ctx) => {
    const { w } = words(ctx.lang);
    return withOver(
      usual(during.stray, ctx),
      askAt(`${w.strayFar}. ${w.strayFarNote}`, pair(w.replanHere, w.backToRoute), 214),
    );
  },
});

/** The prompts of the trigger rules, over the Outing on the way. @param {Ctx} ctx */
function prompts(ctx) {
  const { lang, data, state: is } = ctx;
  const { t, w } = words(lang);
  const place = data.outingNow.stop;
  const next = data.outingNow.next;
  const inside = data.stops[4];
  const waits = {
    order: () =>
      dialog({
        icon: icons.route,
        title: w.otherOrder,
        lead: data.stops[4].name[lang],
        text: w.otherOrderNote,
        yes: w.replan,
        no: w.keepPlan,
      }),
    manual: () =>
      dialog({
        title: w.manualPlace,
        lead: next.name[lang],
        text: w.manualPlaceNote,
        yes: t.yesStart,
        no: t.notYet,
      }),
    far: () =>
      dialog({
        icon: icons.navigate,
        title: w.farStart,
        text: w.farStartNote(format.distance(next.legMetres * 2, lang)),
        yes: w.replanHere,
        no: w.goToStart,
      }),
    closes: () =>
      dialog({
        icon: icons.clock,
        title: w.closesEarly,
        lead: inside.name[lang],
        text: w.closesEarlyNote,
        yes: w.replaceIt,
        no: w.seeOutside,
      }),
  }[is];
  const above = waits
    ? waits()
    : is === 'passed'
      ? askAt(
          `${w.passed}: ${place.name[lang]}`,
          `<p class="tt-aside">${w.passedNote}</p><div class="tt-space"></div>${pair(w.listen, w.leaveIt)}`,
          330,
        )
      : askAt(
          w.tellOnWay,
          `<p class="tt-aside">${w.tellOnWayNote}</p><div class="tt-space"></div>${pair(w.tell, w.leaveIt)}`,
          330,
        );
  return withOver(usual(during.walk, ctx), above);
}

// ── The account ─────────────────────────────────────────────────────────────

const guestMore = withStates(after.guest, {
  conflict: (ctx) => {
    const { w } = words(ctx.lang);
    const versus = (
      /** @type {string} */ name,
      /** @type {string} */ here,
      /** @type {string} */ there,
    ) =>
      `<div class="tt-versus"><h2 class="tt-label">${name}</h2>${options(
        name,
        [
          { label: here, note: w.hereValue },
          { label: there, note: w.thereValue },
        ],
        0,
      )}</div>`;
    return withOver(
      usual(after.guest, ctx),
      over(
        `${sheetHead(w.conflictTitle, { note: w.conflictNote })}
        ${versus(w.pace, w.paces[1], w.paces[2])}
        ${versus(w.limits, w.none, w.dealbreakers[3])}
        <div class="tt-space"></div>
        ${action(w.merge, { icon: icons.check })}`,
        { lang: ctx.lang },
      ),
    );
  },
});

const deleteMore = withStates(after.deleteAccount, {
  guest: ({ os, lang, data }) => {
    const { w } = words(lang);
    const signs = [icons.person, icons.flag];
    return {
      clock: data.route.finish,
      inner: page({
        bar: bar(os, lang),
        body: `${heading(w.deleteGuestTitle, w.deleteGuestNote)}${points(w.deleteGuestItems.map((text, i) => ({ icon: signs[i], text })))}`,
        foot: foot(
          [
            action(w.deleteData, { kind: 'danger', icon: icons.trash }),
            action(w.cancel, { kind: 'plain' }),
          ],
          'stack',
        ),
      }),
    };
  },
});

// ── What arrives outside the application ────────────────────────────────────

const lockMore = withStates(during.lock, {
  // The two notifications of stage S1 (NTF-1), as the system shows them.
  push: ({ lang, data }) => {
    const { w } = words(lang);
    const notice = (
      /** @type {string} */ icon,
      /** @type {string} */ title,
      /** @type {string} */ text,
    ) =>
      `<section class="tt-notice"><p class="tt-notice-app"><i>${icon}</i>Promenade</p><b>${title}</b><p>${text}</p></section>`;
    return {
      clock: data.route.nowBeforeStart,
      inner: `<div class="tt-lock">
        <p class="tt-lock-clock"><b>${data.route.nowBeforeStart}</b></p>
        <div class="tt-lock-stack">
          ${notice(icons.pack, w.pushStories, w.pushStoriesNote)}
          ${notice(icons.flag, w.pushCorrection, w.outcome.accepted)}
        </div>
      </div>`,
    };
  },
});

/** The letter with the one-time code. @param {Ctx} ctx */
function mail({ theme, lang, data }) {
  const { w } = words(lang);
  const digits = data.samples.code.wrong;
  return {
    clock: data.route.nowBeforeStart,
    inner: letter({
      from: w.mailFrom,
      address: 'no-reply@promenade.example',
      subject: w.mailSubject(digits),
      mark: asset(`system/mark/${theme === 'dark' ? 'lockup-on-dark' : 'lockup'}.svg`),
      body: `<p>${w.mailText}</p>${code(w.codeName, digits)}<small>${w.mailNote}</small>`,
    }),
  };
}

export const added = {
  options: optionsMore,
  place: placeMore,
  edit: editMore,
  routes: routesMore,
  walk: walkMore,
  stray: strayMore,
  prompts,
  guest: guestMore,
  deleteAccount: deleteMore,
  lock: lockMore,
  mail,
};
