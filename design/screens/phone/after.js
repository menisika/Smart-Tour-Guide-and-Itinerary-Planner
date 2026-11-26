/**
 * The phone's screens around the Outing: the Routes and Outings a person
 * keeps, the account and what a Guest keeps without one, Corrections with
 * their outcomes, notifications, deleting the account, "update required",
 * and the Profile with its settings.
 */
import { format } from '../../directions/shared/data.js';
import { icons } from '../../system/icons.js';
import { action, code, field, segments, toggle } from '../../system/parts/controls.js';
import {
  bar,
  credit,
  flow,
  foot,
  heading,
  hero,
  label,
  page,
  photo,
  scroll,
} from '../../system/parts/layout.js';
import { item, list, log, points, saved } from '../../system/parts/lists.js';
import { lineMap } from '../../system/parts/map.js';
import { tabs } from '../../system/parts/platform.js';
import { thumb } from '../../system/parts/route.js';
import { dialog } from '../../system/parts/sheets.js';
import { banner, skeleton, state } from '../../system/parts/states.js';
import { words } from './kit.js';

/** @typedef {import('./kit.js').Ctx} Ctx */

/** A Route as a row of the collection. @param {Ctx} ctx @param {boolean} again @param {string} [note] @param {boolean} [walked] */
function routeRow({ theme, lang, data }, again, note, walked = false) {
  const { t } = words(lang);
  const route = again ? data.recalculated.route : data.route;
  return saved({
    map: lineMap(data, { lang, theme, size: 104, again, walked }),
    title: t.title,
    times: `${route.start} — ${route.finish}`,
    facts: `${t.places(route.stopCount)} · ${format.distance(route.walkingMetres, lang)}`,
    note,
  });
}

/** @param {Ctx} ctx */
function routes(ctx) {
  const { os, lang, data, state: is } = ctx;
  const { t, w } = words(lang);
  const past = is === 'past' || is === 'empty';
  const chooser = segments(
    w.routesTitle,
    w.routesTabs.map((name) => ({ label: name })),
    past ? 1 : 0,
  );
  const both = `${routeRow(ctx, true, w.edited)}${routeRow(ctx, false)}`;
  const body = {
    usual: () => `${both}<p class="tt-aside tt-aside-under">${w.onDevice}</p>`,
    past: () => routeRow(ctx, false, w.walkedOn(format.date(data.samples.today, lang)), true),
    loading: () => state({ icon: icons.bookmark, title: w.routesLoading, extra: skeleton() }),
    empty: () =>
      state({
        icon: icons.walk,
        title: w.noOutings,
        text: w.noOutingsNote,
        actions: action(t.newRoute, { icon: icons.plus }),
      }),
    error: () =>
      `${banner({ icon: icons.alert, lead: w.routesFailed, rest: w.routesFailedNote, is: 'stop' })}<div class="tt-space"></div>${both}`,
  }[is];
  return {
    clock: data.route.nowBeforeStart,
    inner: page({
      bar: bar(os, lang, { lead: 'none', title: '' }),
      body: `${heading(w.routesTitle)}${chooser}<div class="tt-space"></div>${body?.() ?? ''}`,
      tabs: tabs(lang, 1),
      is: 'is-root',
    }),
  };
}

/** @param {Ctx} ctx */
function signIn({ os, lang, data, state: is }) {
  const { w } = words(lang);
  const email = data.samples.account.email;
  const offline = is === 'offline';
  const entering = is === 'code' || is === 'error';
  const body = entering
    ? `${heading(w.codeTitle, w.codeNote(email))}
      ${code(w.codeName, is === 'error' ? data.samples.code.wrong : data.samples.code.digits)}
      ${is === 'error' ? `<div class="tt-space"></div>${banner({ icon: icons.alert, lead: w.codeWrong, rest: '', is: 'stop' })}` : ''}
      <div class="tt-space"></div>
      ${action(w.codeAgain, { kind: 'plain', icon: icons.reload })}`
    : `<p class="tt-aside">${w.signInNote}</p><div class="tt-space"></div>
      ${offline ? `${banner({ icon: icons.noNetwork, lead: w.signInOffline, rest: w.signInOfflineNote, is: 'warn' })}<div class="tt-space"></div>` : ''}
      ${flow([
        field({ name: w.email, value: email, icon: icons.mail }),
        action(is === 'loading' ? w.sending : w.getCode, {
          state: is === 'loading' ? 'busy' : offline ? 'disabled' : undefined,
        }),
        `<p class="tt-or">${w.or}</p>`,
        action(w.withApple, {
          kind: 'second',
          icon: icons.person,
          state: offline ? 'disabled' : undefined,
        }),
        action(w.withGoogle, {
          kind: 'second',
          icon: icons.person,
          state: offline ? 'disabled' : undefined,
        }),
      ])}`;
  const stop = data.stops[4];
  return {
    clock: data.route.nowBeforeStart,
    inner: page({
      bar: bar(os, lang, { lead: entering ? 'back' : 'close' }),
      ...(entering
        ? {}
        : {
            hero: hero({ media: photo(stop), title: w.signInTitle, credit: credit(stop, lang) }),
            heroHeight: 250,
          }),
      body,
    }),
  };
}

/** @param {Ctx} ctx */
function guest({ os, lang, data, state: is }) {
  const { w } = words(lang);
  const here = 2;
  return {
    clock: data.route.finish,
    inner: page({
      bar: bar(os, lang),
      hero: hero({
        media: photo(data.stops[10]),
        title: w.guestTitle,
        credit: credit(data.stops[10], lang),
      }),
      heroHeight: 230,
      body: `<p class="tt-aside">${w.guestNote}</p><div class="tt-space"></div>
        ${list(w.guestKeeps, [
          item({ icon: icons.tune, label: w.keepProfile, note: w.keepProfileNote }),
          item({ icon: icons.bookmark, label: w.keepRoutes, value: String(here) }),
          item({ icon: icons.walk, label: w.keepOutings, value: '1' }),
        ])}
        <p class="tt-aside tt-aside-under">${w.guestMove}</p>`,
      foot: foot([action(w.signIn, { icon: icons.person })]),
      over:
        is === 'merge'
          ? dialog({
              icon: icons.people,
              title: w.mergeTitle,
              text: w.mergeNote(here, data.samples.account.routes_in_account),
              yes: w.merge,
              no: w.keepApart,
            })
          : '',
    }),
  };
}

/** @param {Ctx} ctx */
function corrections({ os, lang, data, state: is }) {
  const { w } = words(lang);
  const sentences = data.outingNow.story[lang].sentences;
  /** @type {Record<string, 'ok' | 'now' | 'off'>} */
  const mark = { accepted: 'ok', pending: 'now', declined: 'off' };
  const entries = data.samples.corrections.items.map(
    (/** @type {any} */ c, /** @type {number} */ i) => {
      const text = sentences[c.sentence[lang]].text;
      const waiting = is === 'offline' && i === 0;
      return {
        media: thumb(data.outingNow.stop, ''),
        at: format.date(c.sent, 'ru').slice(0, 5),
        label: `${lang === 'ru' ? '«' : '“'}${text.slice(0, 56).trimEnd()}…${lang === 'ru' ? '»' : '”'}`,
        note: waiting ? w.outcome.waiting : w.outcome[/** @type {'accepted'} */ (c.outcome)],
        icon: waiting ? icons.sync : c.outcome === 'accepted' ? icons.check : undefined,
        is: waiting ? /** @type {const} */ ('warn') : mark[c.outcome],
      };
    },
  );
  const body = {
    usual: () => log(entries),
    offline: () => log(entries),
    loading: () => state({ icon: icons.flag, title: w.myCorrections, extra: skeleton() }),
    empty: () => state({ icon: icons.flag, title: w.noCorrections, text: w.noCorrectionsNote }),
    error: () =>
      state({
        icon: icons.alert,
        title: w.correctionsFailed,
        is: 'error',
        actions: action(words(lang).t.retry, { icon: icons.reload }),
      }),
  }[is];
  const listed = is === 'usual' || is === 'offline';
  return {
    clock: data.route.finish,
    inner: page({
      bar: bar(os, lang, { title: listed ? '' : w.myCorrections }),
      body: `${listed ? heading(w.myCorrections) : ''}${is === 'offline' ? `${banner({ icon: icons.noNetwork, lead: words(lang).t.noNetwork, rest: w.correctionKeptNote, is: 'warn' })}<div class="tt-space"></div>` : ''}${body?.() ?? ''}`,
    }),
  };
}

/** @param {Ctx} ctx */
function notifications({ os, lang, data, state: is }) {
  const { w } = words(lang);
  return {
    clock: data.route.finish,
    inner: page({
      bar: bar(os, lang, { title: is === 'empty' ? w.notifications : '' }),
      body:
        is === 'empty'
          ? state({ icon: icons.bell, title: w.noNotifications, text: w.noNotificationsNote })
          : `${heading(w.notifications)}${log([
              {
                at: format.clockPlus(data.route.start, -4),
                media: thumb(data.stops[0], ''),
                label: w.noticeStories,
                note: w.noticeStoriesNote,
                icon: icons.pack,
                is: 'now',
              },
              {
                at: format.clockPlus(data.route.start, -40),
                media: thumb(data.outingNow.stop, ''),
                label: w.noticeCorrection,
                note: w.outcome.accepted,
                icon: icons.check,
                is: 'ok',
              },
            ])}`,
    }),
  };
}

/** @param {Ctx} ctx */
function deleteAccount({ os, lang, data, state: is }) {
  const { w } = words(lang);
  const offline = is === 'offline';
  const signs = [icons.person, icons.flag, icons.bookmark];
  return {
    clock: data.route.finish,
    inner: page({
      bar: bar(os, lang),
      body: `${heading(w.deleteTitle, w.deleteNote)}
        ${points(w.deleteItems.map((text, i) => ({ icon: signs[i], text })))}
        <p class="tt-aside tt-aside-under">${w.deleteKeeps}</p>
        ${offline ? `<div class="tt-space"></div>${banner({ icon: icons.noNetwork, lead: w.deleteOffline, rest: '', is: 'warn' })}` : ''}`,
      foot: foot(
        [
          action(w.deleteAction, {
            kind: 'danger',
            icon: icons.trash,
            state: offline ? 'disabled' : undefined,
          }),
          action(w.cancel, { kind: 'plain' }),
        ],
        'stack',
      ),
    }),
  };
}

/** @param {Ctx} ctx */
function updateRequired({ lang, data }) {
  const { w } = words(lang);
  return {
    clock: data.route.nowBeforeStart,
    inner: page({
      hero: hero({ media: photo(data.stops[2]), credit: credit(data.stops[2], lang) }),
      heroHeight: 300,
      body: state({
        icon: icons.download,
        title: w.updateTitle,
        text: w.updateNote,
        actions: `${action(w.update, { icon: icons.download })}${action(w.toSaved, { kind: 'plain' })}`,
      }),
    }),
  };
}

/** @param {Ctx} ctx */
function profile({ os, lang, data }) {
  const { t, w } = words(lang);
  const tongue = lang === 'ru' ? 'Русский' : 'English';
  return {
    clock: data.route.finish,
    inner: page({
      bar: bar(os, lang, { lead: 'none', title: '' }),
      body: `${heading(w.profileTitle)}${scroll(
        `${list(w.account, [
          item({ icon: icons.person, label: w.guestRow, note: w.guestRowNote, value: w.signIn }),
        ])}
        <div class="tt-space"></div>
        ${list(w.preferences, [
          item({ icon: icons.star, label: w.interests, value: w.interestsValue(2) }),
          item({ icon: icons.lock, label: w.limits, value: w.none }),
          item({ icon: icons.walk, label: w.pace, value: w.paces[1] }),
        ])}
        <div class="tt-space"></div>
        ${list(w.languages, [
          item({ icon: icons.globe, label: w.interfaceLanguage, value: tongue }),
          item({ icon: icons.voice, label: t.storyLanguage, value: tongue }),
        ])}
        <div class="tt-space"></div>
        ${label(w.outingSettings)}
        ${toggle(t.autoStart, true, t.autoStartNote)}
        ${toggle(t.wifiOnly, true)}
        <div class="tt-space"></div>
        ${list('', [
          item({ icon: icons.route, label: w.track, note: w.trackNote, value: w.clear }),
          item({ icon: icons.sync, label: t.journal }),
          item({ icon: icons.flag, label: w.myCorrections }),
          item({ icon: icons.bell, label: w.notifications }),
        ])}`,
      )}`,
      tabs: tabs(lang, 2),
      is: 'is-root',
    }),
  };
}

export const after = {
  routes,
  signIn,
  guest,
  corrections,
  notifications,
  deleteAccount,
  updateRequired,
  profile,
};
