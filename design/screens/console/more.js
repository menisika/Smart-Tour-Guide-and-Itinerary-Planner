/**
 * The console's screens that the audit of the work plan asked for: the list
 * of Places with the list of Key Places, the operations view, signing in and
 * being refused, and "update required".
 */
import { icons } from '../../system/icons.js';
import {
  bars,
  block,
  button,
  check,
  checklist,
  details,
  figures,
  filters,
  gate,
  input,
  kindTile,
  meter,
  nameCell,
  notice,
  num,
  pageHead,
  pane,
  quiet,
  split,
  stack,
  strip,
  table,
  tag,
  text,
} from '../../system/parts/console.js';
import { count, day, decimal, empty, frame, money, nameOf, percent, words } from './kit.js';

/** @typedef {import('./kit.js').Ctx} Ctx */

// ── The list of Places, and the list of Key Places ──────────────────────────

/** @param {Ctx} ctx */
function placesList(ctx) {
  const { lang, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console.places;
  const keys = is === 'keys';
  const flagged = is === 'flagged';
  const none = is === 'empty';
  /** @type {any[]} */
  const rows = none
    ? []
    : flagged
      ? k.no_entrance.map((/** @type {any} */ t) => ({
          ...t,
          kind: 'park',
          territory: true,
          entrances: 0,
          flag: 'no_entrance',
          status: 'open',
          key: false,
        }))
      : k.items.filter((/** @type {any} */ p) => !keys || p.key);

  const board = table({
    name: c.navPlacesList,
    columns: [
      { label: c.keyShort, width: '92px' },
      { label: c.place, sort: 'none' },
      ...(flagged || keys ? [] : [{ label: c.area, width: '104px' }]),
      { label: c.status, width: '112px' },
      { label: c.openingHours, width: '184px' },
      { label: c.nestedAndEntrances, width: '148px' },
      ...(flagged
        ? [{ label: c.pathsCross, end: true, width: '176px' }]
        : [
            {
              label: c.views,
              sort: /** @type {const} */ ('descending'),
              end: true,
              width: '104px',
            },
          ]),
      ...(keys ? [] : [{ label: c.flag, width: '204px' }]),
    ],
    rows: rows.map((/** @type {any} */ p, /** @type {number} */ i) => ({
      is: /** @type {'chosen' | 'warn' | undefined} */ (
        p.flag ? 'warn' : keys && i === 0 ? 'chosen' : undefined
      ),
      cells: [
        check(`${c.keyPlace}: ${nameOf(p.name, lang)}`, p.key),
        nameCell({
          lead: kindTile(p.kind),
          name: nameOf(p.name, lang),
          note: `${p.territory ? `${c.territory} · ` : ''}${p.subkind ? (c.subkinds[p.subkind] ?? c.kinds[p.kind]) : c.kinds[p.kind]}${p.seeded && keys ? ` · ${c.seededBy[p.seeded]}` : ''}`,
        }),
        ...(flagged || keys ? [] : [p.in_centre ? c.inCentre : quiet(c.outOfCentre)]),
        tag(c.placeStatus[p.status], { is: 'ok' }),
        p.opening_hours ?? quiet(c.hoursUnknownShort),
        p.territory ? c.nestedCount(p.nested, p.entrances) : quiet(c.no),
        ...(flagged
          ? [num(count(p.crossings, lang))]
          : [p.monthly_views ? num(count(p.monthly_views, lang)) : quiet(c.noViews)]),
        ...(keys ? [] : [p.flag ? tag(c.flags[p.flag], { is: 'warn' }) : quiet(c.no)]),
      ],
    })),
  });

  const list = k.key_list;
  const keyPane = pane({
    title: c.keyListTitle,
    note: c.keyListNote,
    is: 'quiet',
    body: `${figures([{ value: String(k.counts.key), label: c.keyPlaces }])}${block(
      c.howOnList,
      bars({
        name: c.howOnList,
        items: [
          {
            label: c.seededBy.views,
            value: String(list.from_views),
            share: list.from_views / k.counts.key,
          },
          {
            label: c.seededBy.heritage,
            value: String(list.from_heritage),
            share: list.from_heritage / k.counts.key,
          },
          {
            label: c.seededBy.curator,
            value: String(list.by_curator),
            share: list.by_curator / k.counts.key,
          },
        ],
      }),
    )}${block(
      '',
      details([
        { label: c.removedByCurator, value: String(list.removed_by_curator) },
        { label: c.keyRule, value: c.keyRuleValue },
      ]),
    )}${block('', notice({ is: 'info', lead: c.keyRecord, rest: c.keyRecordRest }))}`,
    foot: `${text(c.keyFootNote)}${button(c.addToKeyList, { kind: 'main', icon: icons.plus })}`,
  });

  const head = pageHead({
    title: c.navPlacesList,
    note: c.placesNote,
    actions: button(c.addPlace, { icon: icons.plus }),
  });
  const band = strip(
    figures([
      { value: count(k.counts.places, lang), label: c.placesInCity },
      { value: String(k.counts.territories), label: c.territories },
      { value: String(k.counts.key), label: c.keyPlaces },
      {
        value: String(k.counts.territories_without_tagged_entrance),
        label: c.territoriesNoEntrance,
        is: 'warn',
        note: c.openOnAllSides,
      },
    ]),
  );
  const narrow = filters({
    name: c.filter,
    search: {
      name: c.findPlace,
      hint: c.findPlace,
      value: none ? c.searchSample : '',
    },
    chips: [
      { label: c.all, on: !keys && !flagged, count: count(k.counts.places, lang) },
      { label: c.keyOnly, on: keys, count: k.counts.key },
      { label: c.flaggedOnly, on: flagged, count: k.counts.territories_without_tagged_entrance },
    ],
    selects: [
      { name: c.kind, value: flagged ? c.territories : c.anyKind },
      { name: c.area, value: c.wholeCity },
      { name: c.status, value: c.anyStatus },
    ],
    summary: none ? c.shown(0) : c.shown(rows.length),
  });
  const body = none
    ? `${head}${band}${narrow}${split(
        [
          empty({
            icon: icons.search,
            title: c.nothingFound,
            text: c.nothingFoundNote,
            actions: button(c.addPlace, { icon: icons.plus }),
          }),
        ],
        'minmax(0, 1fr)',
      )}`
    : `${head}${band}${narrow}${split(
        [pane({ is: 'flush', body: board }), ...(keys ? [keyPane] : [])],
        keys ? 'minmax(0, 1fr) 320px' : 'minmax(0, 1fr)',
      )}`;
  return frame(ctx, { at: 'places', crumbs: [c.navPlacesList], body, path: 'places' });
}

// ── Operations ──────────────────────────────────────────────────────────────

/** @param {Ctx} ctx */
function operations(ctx) {
  const { lang, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console;
  const o = k.operations;
  const alert = is === 'alert';
  const reset = day(o.resets, lang);

  /** @param {any} a */
  const allowance = (a) => {
    const used = alert && a.id === 'db_compute' ? o.failed.db_compute_used : a.used;
    const share = used / a.of;
    return block(
      '',
      meter({
        name: c.allowances[a.id],
        share,
        lead: c.allowances[a.id],
        rest: `${c.usedOf(decimal(used, lang, used % 1 ? 1 : 0), String(a.of), c.units[a.unit])} · ${percent(share, lang)}${share > 0.8 ? ` · ${c.aboveThreshold}` : ''}`,
        is: share > 0.8 ? 'stop' : 'ok',
        parts: [{ share, is: share > 0.8 ? 'stop' : 'info' }],
      }),
    );
  };
  /** @param {any} b */
  const budget = (b) => {
    const share = b.money / b.money_budget;
    return block(
      '',
      meter({
        name: c.costParts[b.id],
        share,
        lead: c.costParts[b.id],
        rest: `${c.costOfBudget(money(b.money, lang), money(b.money_budget, lang))} · ${percent(share, lang)}`,
        parts: [{ share, is: 'info' }],
      }),
    );
  };

  const runs = table({
    name: c.lastRuns,
    columns: [
      { label: c.job },
      { label: c.howOften, width: '116px' },
      { label: c.lastRun, sort: 'descending', width: '148px' },
      { label: c.result, width: '124px' },
      { label: c.took, end: true, width: '84px' },
    ],
    rows: o.runs.map((/** @type {any} */ r) => {
      const failed = alert && r.id === 'rehearsal';
      return {
        is: /** @type {'stop' | undefined} */ (failed ? 'stop' : undefined),
        cells: [
          nameCell({
            name: c.jobs[r.id],
            note: failed ? c.jobFailed[o.failed.rehearsal_check] : c.jobDetail[r.detail],
            go: false,
          }),
          c.every[r.every],
          day(r.last, lang),
          failed ? tag(c.failedTag, { is: 'stop' }) : tag(c.okTag, { is: 'ok' }),
          c.tookText(r.took),
        ],
      };
    }),
  });

  const journal = alert
    ? { waiting: o.failed.journal_waiting, oldest: o.failed.journal_oldest_minutes }
    : { waiting: o.backlogs.journal.waiting, oldest: o.backlogs.journal.oldest_minutes };
  const queues = pane({
    title: c.backlogs,
    note: c.backlogsNote,
    body: `${figures([
      { value: String(o.backlogs.outbox.waiting), label: c.outboxWaiting, note: c.nothingWaits },
      {
        value: String(journal.waiting),
        label: c.journalWaiting,
        is: alert ? 'stop' : undefined,
        note: c.oldestMinutes(journal.oldest),
      },
    ])}${block(
      c.platformAlerts,
      checklist(
        o.alerts.platform.map((/** @type {string} */ id) => ({
          is: /** @type {const} */ (alert && id === 'db_compute' ? 'stop' : 'ok'),
          lead: c.alertNames[id],
          rest: alert && id === 'db_compute' ? c.alertRaised : c.alertQuiet,
        })),
      ),
      { note: c.platformAlertsNote },
    )}${block(
      c.systemAlerts,
      checklist(
        (alert
          ? [
              { what: 'rehearsal_failed', at: day(o.refreshed, lang), state: 'sent' },
              { what: 'journal_backlog', at: day(o.refreshed, lang), state: 'sent' },
            ]
          : o.alerts.recent.map((/** @type {any} */ a) => ({
              ...a,
              at: day(a.at.slice(0, 10), lang),
            }))
        ).map((/** @type {any} */ a) => ({
          is: /** @type {const} */ (a.state === 'sent' ? 'warn' : 'quiet'),
          lead: c.alertNames[a.what],
          rest: `${a.at} · ${c.alertStates[a.state]}`,
        })),
      ),
      { note: c.systemAlertsNote },
    )}`,
  });

  const body = `${pageHead({
    title: c.navOperations,
    note: c.operationsNote,
    actions: `${tag(c.refreshedOn(day(o.refreshed, lang)), { icon: icons.reload })}${
      alert ? tag(c.alertsSent(3), { is: 'stop' }) : tag(c.noAlerts, { is: 'ok' })
    }`,
  })}${split(
    [
      pane({
        title: c.canRunOut,
        note: c.canRunOutNote,
        body: `${block(c.freeAllowances, o.allowances.map(allowance).join(''), {
          note: c.resetsOn(reset),
        })}${block('', text(c.heldByConnections(decimal(o.allowances[0].held_by_connections, lang))))}${block(
          c.ledgerBudgets,
          k.admin.budgets.map(budget).join(''),
          { note: c.resetsOn(reset) },
        )}`,
      }),
      stack(
        [
          pane({
            title: c.lastRuns,
            note: c.lastRunsNote,
            tools: alert ? notice({ is: 'stop', lead: c.rehearsalFailed }) : '',
            is: 'flush',
            body: runs,
          }),
          queues,
        ],
        'auto minmax(0, 1fr)',
      ),
    ],
    '460px minmax(0, 1fr)',
  )}`;
  return frame(ctx, { at: 'operations', crumbs: [c.navOperations], body, path: 'operations' });
}

// ── Signing in, and being refused ───────────────────────────────────────────

/** @param {Ctx} ctx */
function signIn(ctx) {
  const { theme, lang, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console;
  if (is === 'wrongrole') {
    return frame(ctx, {
      at: 'admin',
      role: 'curator',
      crumbs: [c.navAdmin],
      body: split(
        [
          empty({
            icon: icons.lock,
            is: 'error',
            title: c.wrongRole,
            text: c.wrongRoleNote(day(k.today, lang), k.sign_in.refused_at),
            actions: `${button(c.toQueue, { icon: icons.dossier })}`,
          }),
        ],
        'minmax(0, 1fr)',
      ),
      path: 'administration',
    });
  }
  const refused = is === 'refused';
  return {
    address: `console.promenade.example/${refused ? 'refused' : 'sign-in'}`,
    inner: refused
      ? gate({
          theme,
          word: c.console,
          icon: icons.lock,
          is: 'stop',
          title: c.noAccess,
          text: c.noAccessNote(data.samples.account.email),
          body: details([
            { label: c.when, value: `${day(k.today, lang)}, ${k.sign_in.refused_at}` },
            { label: c.recorded, value: c.recordedWhat },
            { label: c.whoGrants, value: c.roles.administrator },
          ]),
          foot: `${button(c.signOut, { icon: icons.signOut })}${button(c.toProduct, { kind: 'quiet', icon: icons.external })}`,
          note: c.refusalNote,
        })
      : gate({
          theme,
          word: c.console,
          title: c.signInTitle,
          text: c.signInNote,
          body: `${input({ name: c.email, hint: 'name@promenade.example', icon: icons.mail })}${button(c.getCode, { kind: 'main' })}${button(c.withApple)}${button(c.withGoogle)}`,
          note: c.signInFoot,
        }),
  };
}

// ── "Update required" ───────────────────────────────────────────────────────

/** @param {Ctx} ctx */
function update(ctx) {
  const { theme, lang, data } = ctx;
  const c = words(lang);
  const v = data.console.sign_in;
  return {
    address: 'console.promenade.example/dossiers',
    inner: gate({
      theme,
      word: c.console,
      icon: icons.reload,
      title: c.updateTitle,
      text: c.updateNote,
      body: details([
        { label: c.thisTab, value: c.version(v.client) },
        { label: c.serverAccepts, value: c.versionFrom(v.minimum) },
      ]),
      foot: button(c.reloadPage, { kind: 'main', icon: icons.reload }),
      note: c.updateFoot,
    }),
  };
}

export const more = { placesList, operations, signIn, update };
