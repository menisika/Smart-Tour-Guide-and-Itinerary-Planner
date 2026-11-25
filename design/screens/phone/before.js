/**
 * The phone's screens before the Outing: the first launch and the Profile,
 * the Route request and how it was understood, the Routes offered, the Route
 * with its Places, editing and versions, the Route Pack and the check before
 * the start. Each arranges components of the design system and draws nothing
 * of its own.
 */
import { format } from '../../directions/shared/data.js';
import { icons, platformIcon } from '../../system/icons.js';
import {
  action,
  back,
  field,
  group,
  round,
  segments,
  stepper,
  tastes,
  titlePill,
  toggle,
} from '../../system/parts/controls.js';
import {
  bar,
  credit,
  flow,
  foot,
  heading,
  hero,
  label,
  over,
  page,
  photo,
  scroll,
  sheetHead,
} from '../../system/parts/layout.js';
import { item, log, placeRow, reading } from '../../system/parts/lists.js';
import { groundMap, planMap } from '../../system/parts/map.js';
import { tabs } from '../../system/parts/platform.js';
import { chart, dock, head, variant, variants, verdict } from '../../system/parts/route.js';
import { sheet } from '../../system/parts/sheets.js';
import { banner, checks, pack, skeleton, state, steps } from '../../system/parts/states.js';
import { placePage } from '../../system/parts/story.js';
import { asset, noNetwork, osm, sizeOf, underTop, words } from './kit.js';

/** @typedef {import('./kit.js').Ctx} Ctx */

// ── First launch and the Profile ────────────────────────────────────────────

/** @param {Ctx} ctx */
function welcome({ os, theme, lang, data }) {
  const { w } = words(lang);
  const stop = data.stops[1];
  return {
    clock: data.route.nowBeforeStart,
    inner: page({
      bar: bar(os, lang, { lead: 'none', trailing: round(icons.globe, w.language) }),
      hero: hero({ media: photo(stop), credit: credit(stop, lang) }),
      heroHeight: os === 'android' ? 460 : 440,
      body: `<img class="tt-lockup" src="${asset(`system/mark/${theme === 'dark' ? 'lockup-on-dark' : 'lockup'}.svg`)}" alt="Promenade" />
        ${heading(w.welcomeTitle, w.welcomeNote)}
        <p class="tt-aside">${icons.check}${w.welcomeGuest}</p>`,
      foot: foot(
        [action(w.setUp, { icon: icons.tune }), action(w.skipSetUp, { kind: 'plain' })],
        'stack',
      ),
    }),
  };
}

/** @param {Ctx} ctx */
function interests({ os, lang, data }) {
  const { w } = words(lang);
  const stop = data.stops[7];
  /** @type {Record<number, 'like' | 'dislike'>} */
  const chosen = { 0: 'like', 1: 'like', 5: 'dislike' };
  return {
    clock: data.route.nowBeforeStart,
    inner: page({
      bar: bar(os, lang),
      hero: hero({ media: photo(stop), kicker: w.stepOf(1), credit: credit(stop, lang) }),
      heroHeight: 196,
      body: `${heading(w.interestsTitle, w.interestsNote)}${tastes(
        w.themes.map((name, i) => [name, chosen[i] ?? 'neutral']),
        w.tasteSay,
      )}`,
      foot: foot([action(w.next), action(w.skipSetUp, { kind: 'plain' })]),
    }),
  };
}

/** @param {Ctx} ctx */
function limits({ os, lang, data }) {
  const { w } = words(lang);
  return {
    clock: data.route.nowBeforeStart,
    inner: page({
      bar: bar(os, lang, { title: w.stepOf(2) }),
      body: `${heading(w.limitsTitle, w.limitsNote)}
        ${w.dealbreakers.map((name) => toggle(name, false)).join('')}
        <div class="tt-space"></div>
        ${label(w.pace)}
        ${segments(
          w.pace,
          w.paces.map((name) => ({ label: name })),
          1,
        )}
        <p class="tt-aside tt-aside-under">${w.paceNote}</p>`,
      foot: foot([action(w.done, { icon: icons.check })]),
    }),
  };
}

// ── The Route request ───────────────────────────────────────────────────────

/** @param {Ctx} ctx */
function request({ os, theme, lang, data, state: is }) {
  const { t, w } = words(lang);
  const { width, height } = sizeOf(os);
  const map = groundMap(data, { lang, theme, width, height, lift: height / 2 - 150 });
  const wish = data.route.wish[lang];
  const offline = is === 'offline';
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="tt tt-request">
      <div class="tt-under">${map}${osm(`top:${underTop(os) - 4}px;right:auto;left:14px`)}</div>
      <header class="tt-top"><span class="tt-fill"></span>${round(icons.locate, t.say.locate)}</header>
      ${offline ? noNetwork(lang, { top: underTop(os) + 30, rest: w.needsNetworkToPlan }) : ''}
      ${sheet(
        flow(
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
            is === 'empty'
              ? field({ name: t.wishName, hint: t.wishHint, note: t.wishNote, state: 'empty' })
              : is === 'error'
                ? field({ name: t.wishName, hint: t.wishHint, note: t.wishWrong, state: 'wrong' })
                : field({ name: t.wishName, value: wish, note: t.wishNote }),
            toggle(t.inside, false, w.insideNote),
            segments(
              w.familiar,
              w.familiarOptions.map((name) => ({ label: name })),
              1,
            ),
            action(offline ? w.needsNetwork : w.showReading, {
              icon: offline ? icons.noNetwork : icons.arrowRight,
              state: offline ? 'disabled' : undefined,
            }),
          ],
          'tight',
        ),
        { lang },
      )}
      ${tabs(lang, 0)}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function understood({ os, theme, lang, data, state: is }) {
  const { t, w } = words(lang);
  const { width, height } = sizeOf(os);
  const map = groundMap(data, { lang, theme, width, height, lift: height / 2 - 190, u: 3 });
  const wish = field({ name: t.wishName, value: data.route.wish[lang], icon: icons.edit });
  const fromProfile = {
    icon: icons.person,
    label: w.readProfile,
    from: w.readProfileFrom,
    fixed: true,
  };
  const inner =
    is === 'loading'
      ? `${sheetHead(w.readingBusy, { note: w.readingBusyNote })}${wish}${steps([t.steps[0]], 0)}`
      : is === 'offline'
        ? `${sheetHead(w.readingTitle)}${wish}<div class="tt-space"></div>${banner({ icon: icons.noNetwork, lead: w.needsNetworkToPlan, rest: w.savedOpen, is: 'warn' })}`
        : is === 'error'
          ? `${sheetHead(w.readingTitle)}${wish}<div class="tt-space"></div>${banner({ icon: icons.warning, lead: w.notUnderstood, rest: w.notUnderstoodNote, is: 'warn' })}${reading(lang, [fromProfile])}`
          : `${sheetHead(w.readingTitle, { note: w.readingNote })}${wish}${reading(lang, [
              { icon: icons.clock, label: w.readPeriod, from: w.readPeriodFrom },
              { icon: icons.building, label: w.readTheme, from: w.readThemeFrom },
              {
                icon: icons.museum,
                label: w.readNoMuseums,
                from: w.readNoMuseumsFrom,
                is: 'hard',
              },
              fromProfile,
            ])}`;
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="tt tt-understood">
      <div class="tt-under">${map}${osm(`top:${underTop(os) - 4}px`)}</div>
      <header class="tt-top">${back(os, t.say.back)}<span class="tt-fill"></span></header>
      ${sheet(inner, { lang, className: 'has-foot-stack' })}
      ${foot(
        [
          action(w.build, {
            icon: icons.route,
            state: is === 'loading' ? 'busy' : is === 'offline' ? 'disabled' : undefined,
          }),
          action(t.changeRequest, { kind: 'plain' }),
        ],
        'stack',
      )}
    </div>`,
  };
}

// ── The Routes offered ──────────────────────────────────────────────────────

/** The three Routes offered: two measured, the third a sample. @param {any} data */
export function offered(data) {
  const third = data.samples.options.third;
  const reserve = data.route.budgetMinutes - third.total_min;
  return [
    { route: data.route, stops: data.stops },
    { route: data.recalculated.route, stops: data.recalculated.stops },
    {
      route: {
        ...data.route,
        finish: format.clockPlus(data.route.start, third.total_min),
        totalMinutes: third.total_min,
        reserveMinutes: reserve,
        walkingMetres: third.walking_m,
        stopCount: third.stop_orders.length,
      },
      stops: third.stop_orders.map((/** @type {number} */ order) => data.stops[order - 1]),
    },
  ];
}

/** @param {Ctx} ctx */
function options({ os, theme, lang, data, state: is }) {
  const { t, w } = words(lang);
  const { width, height } = sizeOf(os);
  const usual = is === 'usual';
  const top = os === 'android' ? 322 : 300;
  const map = usual
    ? planMap(data, {
        lang,
        theme,
        width,
        height,
        padding: { top: 112, right: 40, bottom: height - top + 26, left: 40 },
        labels: 3,
      })
    : groundMap(data, { lang, theme, width, height, lift: height / 2 - 170, u: 3 });
  const sample = data.samples.nothing_fits;
  const first = data.stops[0];
  const least = first.legMinutes * 2 + data.route.visitMinutes;
  const inner = {
    usual: () =>
      `<p class="tt-kicker">${w.optionsKicker(3, data.route.checkedAt)}</p>${variants(
        w.optionsName,
        offered(data).map((o, i) =>
          variant(lang, { ...o, name: w.options[i], why: w.optionsWhy[i], chosen: i === 0 }),
        ),
      )}`,
    loading: () =>
      state({
        icon: icons.route,
        title: t.building,
        text: t.buildingNote,
        extra: `${steps(t.steps, 1)}${skeleton()}`,
      }),
    empty: () =>
      state({
        icon: icons.timer,
        title: w.nothingFits,
        text: w.nothingFitsNote(sample.budget_min, least),
        extra: `<div class="tt-relax">${action(w.relaxTime(sample.add_min), { kind: 'second', icon: icons.plus, value: w.relaxTimeNote(sample.budget_min + sample.add_min) })}${action(w.relaxStart, { kind: 'second', icon: icons.pin, value: w.relaxStartNote })}</div>`,
        actions: action(t.changeRequest, { kind: 'plain' }),
      }),
    offline: () =>
      state({
        icon: icons.noNetwork,
        title: w.offlineNoRoute,
        text: w.offlineNoRouteNote,
        is: 'off',
        actions: `${action(w.toSaved, { icon: icons.bookmark })}${action(t.retry, { kind: 'plain' })}`,
      }),
    error: () =>
      state({
        icon: icons.alert,
        title: t.failed,
        text: t.failedNote,
        is: 'error',
        actions: `${action(t.retry, { icon: icons.reload })}${action(t.changeRequest, { kind: 'plain' })}`,
      }),
  }[is];
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="tt tt-options">
      <div class="tt-under">${map}${osm(usual ? `top:${top - 22}px` : `top:${underTop(os) - 4}px`)}</div>
      <header class="tt-top">${back(os, t.say.back)}<span class="tt-fill"></span></header>
      ${sheet(inner?.() ?? '', usual ? { lang, top } : { lang, className: 'is-state' })}
      ${
        usual
          ? foot([
              action(w.another, { kind: 'second', icon: icons.reload, value: w.anotherNote }),
              action(w.openRoute),
            ])
          : ''
      }
    </div>`,
  };
}

// ── The Route ───────────────────────────────────────────────────────────────

/** The controls at the top of the Route. @param {Ctx} ctx */
const routeTop = ({ os, lang, data }) => {
  const { t } = words(lang);
  return `<header class="tt-top">
    ${back(os, t.say.back)}
    ${titlePill(t.kicker, t.checked(data.route.checkedAt))}
    ${group([
      [icons.edit, t.say.edit],
      [platformIcon('share', os), t.say.share],
    ])}
  </header>`;
};

/** The map of the whole Route above a sheet. @param {Ctx} ctx @param {number} top of the sheet */
const routeMap = ({ os, theme, lang, data }, top) => {
  const { width, height } = sizeOf(os);
  return planMap(data, {
    lang,
    theme,
    width,
    height,
    padding: { top: 116, right: 34, bottom: height - top + 30, left: 34 },
  });
};

/** @param {Ctx} ctx */
function route(ctx) {
  const { os, lang, data, state: is } = ctx;
  const { t, w } = words(lang);
  const top = is === 'list' ? underTop(os) + 6 : os === 'android' ? 352 : 362;
  const shown = is !== 'loading' && is !== 'error';
  const inner =
    is === 'loading'
      ? state({ icon: icons.route, title: w.routeLoading, extra: skeleton() })
      : is === 'error'
        ? state({
            icon: icons.alert,
            title: w.routeFailed,
            text: w.routeFailedNote,
            is: 'error',
            actions: action(t.retry, { icon: icons.reload }),
          })
        : `${head(data, lang)}${chart(data, lang, { scale: 6, until: is === 'list' ? 118 : 44 })}`;
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="tt tt-route">
      <div class="tt-under">${routeMap(ctx, shown ? top : 560)}${osm(shown ? `top:${top - 22}px` : `top:${underTop(os) - 4}px`)}</div>
      ${routeTop(ctx)}
      ${is === 'offline' ? noNetwork(lang, { top: underTop(os), rest: w.routeOffline }) : ''}
      ${sheet(inner, shown ? { lang, top } : { lang, className: 'is-state' })}
      ${shown ? dock(data, lang) : ''}
    </div>`,
  };
}

/** The Route behind something that rises over it. @param {Ctx} ctx */
const routeBehind = (ctx) => {
  const top = ctx.os === 'android' ? 352 : 362;
  return `<div class="tt-under">${routeMap(ctx, top)}</div>${routeTop(ctx)}${sheet(
    `${head(ctx.data, ctx.lang)}${chart(ctx.data, ctx.lang, { scale: 6, until: 44 })}`,
    { lang: ctx.lang, top },
  )}`;
};

/** @param {Ctx} ctx */
function place(ctx) {
  const { os, theme, lang, data, state: is } = ctx;
  const { w } = words(lang);
  const unknown = is === 'unknown';
  // A Place that is seen from outside has no hours to miss; the state of
  // unknown hours is shown on a theatre, as a sample of a Place one goes into.
  const stop = data.stops[unknown ? 4 : 2];
  const facts = [
    unknown ? '' : `${icons.eye}${w.factOutside}`,
    stop.heritage ? `${icons.shield}${w.factHeritage}` : '',
    `${icons.clock}${w.factVisit(data.route.visitMinutes)}`,
  ].filter(Boolean);
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="tt tt-place-screen">
      ${routeBehind(ctx)}<i class="tt-scrim"></i>
      ${placePage(data, stop, lang, {
        theme,
        width: sizeOf(os).width,
        facts,
        warning: unknown
          ? `${banner({ icon: icons.warning, lead: w.unknownHours, rest: w.unknownHoursNote, is: 'warn' })}${toggle(w.excludeUnknown, false)}`
          : '',
        actions: `${action(w.pin, { kind: 'plain', icon: icons.tack })}${action(w.replace, { kind: 'plain', icon: icons.swap })}${action(w.removeFromRoute, { kind: 'plain-danger', icon: icons.trash })}`,
      })}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function edit(ctx) {
  const { os, lang, data, state: is } = ctx;
  const { t, w } = words(lang);
  const broken = is === 'error';
  const sample = data.samples.custom_place;
  const again = data.recalculated;
  const over = sample.visit_min - data.route.reserveMinutes;
  const custom = {
    order: '+',
    name: { ru: w.customName, en: w.customName },
    kind: 'pin',
    photo: undefined,
  };
  const visitMinutes = data.route.visitMinutes;
  const rows = broken
    ? data.stops.flatMap((/** @type {any} */ s, /** @type {number} */ i) => [
        placeRow(s, lang, { first: i === 0, visitMinutes, pinned: s.order === 2 }),
        ...(s.order === sample.after_order
          ? [
              placeRow(custom, lang, {
                visitMinutes,
                note: w.customNote(sample.visit_min),
                problem: w.customProblem(over, data.route.budgetMinutes),
              }),
            ]
          : []),
      ])
    : again.stops.map((/** @type {any} */ s, /** @type {number} */ i) =>
        placeRow(s, lang, {
          first: i === 0,
          last: i === again.stops.length - 1,
          visitMinutes,
          pinned: s.order === 2,
        }),
      );
  const budget = broken
    ? {
        budgetMinutes: data.route.budgetMinutes,
        totalMinutes: data.route.totalMinutes + sample.visit_min,
      }
    : again.route;
  const top = underTop(os) + 6;
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="tt tt-edit">
      <div class="tt-under">${routeMap(ctx, 362)}</div>
      <header class="tt-top">${back(os, t.say.back)}<span class="tt-fill"></span>${round(icons.history, w.versions)}</header>
      ${sheet(
        `${sheetHead(w.editTitle)}${verdict(lang, budget)}
        ${broken ? `<div class="tt-space"></div>${banner({ icon: icons.alert, lead: w.violations, rest: w.violationsNote, is: 'stop' })}` : ''}
        <div class="tt-adds">${action(w.addPlace, { kind: 'plain', icon: icons.map })}${action(w.addCustom, { kind: 'plain', icon: icons.plus })}</div>
        ${scroll(`<ol>${rows.join('')}</ol>`)}`,
        { lang, top, className: 'is-column' },
      )}
      ${foot([action(w.done, { icon: icons.check })])}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function versions(ctx) {
  const { lang, data } = ctx;
  const { w } = words(lang);
  const again = data.recalculated;
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="tt tt-route">
      ${routeBehind(ctx)}
      ${over(
        `${sheetHead(w.versions, { note: w.versionsNote })}${log([
          {
            at: data.route.nowBeforeStart,
            label: w.versionNow(again.route.stopCount),
            note: w.versionRemoved(again.skipped.name[lang]),
            is: 'now',
          },
          {
            at: data.route.checkedAt,
            label: w.versionFirst(data.route.stopCount),
            note: w.versionFirstNote,
          },
        ])}`,
        { lang },
      )}
    </div>`,
  };
}

// ── The Route Pack and the check before the start ───────────────────────────

/** @param {Ctx} ctx */
function routePack(ctx) {
  const { lang, data, state: is } = ctx;
  const { t, w } = words(lang);
  const megabytes = data.route.packMegabytes;
  const done = data.samples.pack.done_mb;
  /** @type {Record<string, 'none' | 'loading' | 'ready' | 'failed'>} */
  const packState = {
    usual: 'none',
    loading: 'loading',
    ready: 'ready',
    error: 'failed',
    offline: 'loading',
  };
  const ready = is === 'ready';
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="tt tt-route">
      ${routeBehind(ctx)}
      ${over(
        `${sheetHead(t.packName, { note: w.packNote })}
        ${is === 'offline' ? `${banner({ icon: icons.noNetwork, lead: w.packPaused, rest: w.packPausedNote, is: 'warn' })}<div class="tt-space"></div>` : ''}
        ${pack(lang, { megabytes, state: packState[is], done })}
        ${toggle(t.wifiOnly, true)}
        <div class="tt-space"></div>
        ${action(t.start, { icon: icons.play, state: ready ? undefined : 'disabled' })}
        ${ready ? '' : `<p class="tt-aside tt-aside-under">${w.startAfterPack}</p>`}`,
        { lang },
      )}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function preflight(ctx) {
  const { lang, data, state: is } = ctx;
  const { t, w } = words(lang);
  const missing = is === 'error';
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="tt tt-route">
      ${routeBehind(ctx)}
      ${over(
        `${sheetHead(w.preflight, { note: w.preflightNote })}
        ${checks([
          { label: w.checkPack, note: w.checkPackOk, ok: true },
          { label: w.checkSound, note: w.checkSoundOk, ok: true },
          missing
            ? { label: w.checkLocation, note: w.checkLocationMissing, ok: false, action: w.allow }
            : { label: w.checkLocation, note: w.checkLocationOk, ok: true },
        ])}
        <p class="tt-aside tt-aside-over">${icons.locate}${w.locationWhy}</p>
        ${action(t.start, { icon: icons.play, state: missing ? 'disabled' : undefined })}`,
        { lang },
      )}
    </div>`,
  };
}

export const before = {
  welcome,
  interests,
  limits,
  request,
  understood,
  options,
  route,
  place,
  edit,
  versions,
  routePack,
  preflight,
};
