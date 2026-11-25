/**
 * The console's screens of oversight: the dashboards, and Administration
 * with roles, Plans, limits, budgets and the audit log.
 */
import { icons } from '../../system/icons.js';
import {
  bars,
  block,
  button,
  check,
  columns,
  figures,
  form,
  formRow,
  mark,
  meter,
  nameCell,
  notice,
  pageHead,
  pane,
  person,
  seg,
  select,
  skeleton,
  split,
  stack,
  stepper,
  table,
  tag,
  padded,
  column,
  quiet,
} from '../../system/parts/console.js';
import { count, day, decimal, empty, frame, money, percent, shareOf, who, words } from './kit.js';

/** @typedef {import('./kit.js').Ctx} Ctx */

// ── Dashboards ──────────────────────────────────────────────────────────────

/** @param {Ctx} ctx */
function dashboards(ctx) {
  const { lang, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console;
  const d = k.dashboards;
  const key = k.coverage.key_places;
  const hours = k.coverage.hours;
  const head = pageHead({
    title: c.navDashboards,
    note: c.dashboardsNote,
    actions: `${seg(c.period, [{ label: c.days7 }, { label: c.days30 }, { label: c.allTime }], 1)}${select({ name: c.city, value: k.city.name[lang], icon: icons.pin })}`,
  });
  if (is === 'loading' || is === 'empty') {
    return frame(ctx, {
      at: 'dashboards',
      crumbs: [c.navDashboards],
      body: `${head}${split(
        [
          is === 'loading'
            ? pane({ is: 'flush', body: skeleton(14) })
            : empty({
                icon: icons.bars,
                title: c.noNumbers,
                text: c.noNumbersNote,
                actions: button(c.startPreparation, { icon: icons.download }),
              }),
        ],
        'minmax(0, 1fr)',
      )}`,
      path: 'dashboards',
    });
  }

  const coverage = pane({
    title: c.coverage,
    note: c.coverageNote,
    body: `${figures([
      {
        value: String(key.verified),
        unit: c.of(key.total),
        label: c.keyVerified,
        note: percent(key.verified / key.total, lang),
      },
      {
        value: percent(shareOf(hours.venues.share), lang, 1),
        label: c.venuesHours,
        note: c.outOf(count(hours.venues.with_hours, lang), count(hours.venues.places, lang)),
      },
    ])}${block(
      '',
      meter({
        name: c.keyVerified,
        share: key.verified / key.total,
        lead: c.keyPlaces,
        rest: c.keySplit(key.verified, key.draft, key.none),
        parts: [
          { share: key.verified / key.total, is: 'ok' },
          { share: key.draft / key.total, is: 'quiet' },
        ],
      }),
    )}${block(
      c.hoursKnown2,
      bars({
        name: c.hoursKnown2,
        items: ['venues', 'museums', 'theatres', 'worship', 'parks'].map((id) => ({
          label: c.hourGroups[id],
          value: percent(shareOf(hours[id].share), lang, 1),
          share: shareOf(hours[id].share),
        })),
      }),
    )}`,
  });

  const parts = d.cost.components;
  const used = d.cost.per_place / d.cost.budget;
  const cost = pane({
    title: c.costTitle,
    note: c.costTitleNote,
    body: `${figures([
      {
        value: money(d.cost.per_place, lang, 3),
        unit: c.ofBudget(money(d.cost.budget, lang)),
        label: c.costPerPlace,
        is: 'ok',
        note: c.withinBudget,
      },
      {
        value: money(d.cost.month_spent, lang),
        unit: c.ofBudget(money(d.cost.month_budget, lang, 0)),
        label: c.thisMonth,
      },
    ])}${block(
      '',
      meter({
        name: c.perPlaceOfBudget,
        share: used,
        lead: c.perPlaceOfBudget,
        rest: percent(used, lang),
        parts: [{ share: used, is: 'ok' }],
      }),
    )}${block(
      c.costByPart,
      bars({
        name: c.costByPart,
        items: Object.entries(parts).map(([id, value]) => ({
          label: c.costParts[id],
          value: money(/** @type {number} */ (value), lang, 3),
          share: /** @type {number} */ (value) / d.cost.per_place,
        })),
      }),
    )}`,
  });

  const liked = d.ratings.stories_liked / (d.ratings.stories_liked + d.ratings.stories_disliked);
  const ratings = pane({
    title: c.ratings,
    note: c.ratingsNote,
    body: `${figures([
      { value: decimal(d.ratings.mean, lang), unit: c.of(5), label: c.meanRating },
      { value: String(d.ratings.outings), label: c.outingsRated },
    ])}${block(
      c.byStar,
      columns({
        name: c.byStar,
        items: d.ratings.by_star.map((/** @type {number} */ n, /** @type {number} */ i) => ({
          label: c.stars(i + 1),
          value: String(n),
          share: n / Math.max(...d.ratings.by_star),
        })),
      }),
    )}${block(
      '',
      meter({
        name: c.storiesLiked,
        share: liked,
        lead: c.storiesLiked,
        rest: c.likedOf(d.ratings.stories_liked, d.ratings.stories_disliked),
        parts: [{ share: liked, is: 'ok' }],
      }),
    )}`,
  });

  const t = d.triggers;
  const triggers = pane({
    title: c.triggers,
    note: c.triggersNote,
    body: `${figures([{ value: percent(t.auto, lang), label: c.startedAlone }])}${block(
      '',
      bars({
        name: c.triggers,
        items: [
          { label: c.triggerAuto, value: percent(t.auto, lang), share: t.auto, is: 'ok' },
          { label: c.triggerPrompt, value: percent(t.prompt, lang), share: t.prompt },
          { label: c.triggerManual, value: percent(t.manual, lang), share: t.manual },
        ],
      }),
    )}${block(
      c.worstPlaces,
      bars({
        name: c.worstPlaces,
        items: t.worst.map((/** @type {any} */ w) => ({
          label: data.stops[w.stop_order - 1].name[lang],
          value: percent(w.auto, lang),
          share: w.auto,
          is: 'warn',
        })),
      }),
      { note: c.worstNote },
    )}`,
  });

  const steps = d.failures.by_step;
  const failures = pane({
    title: c.failuresTitle,
    note: c.failuresNote,
    body: `${figures([
      {
        value: String(d.failures.last_30_days),
        label: c.failures30,
        is: 'stop',
        note: c.othersGoOn,
      },
    ])}${block(
      '',
      bars({
        name: c.failuresTitle,
        items: Object.entries(steps).map(([id, n]) => ({
          label: c.steps[id],
          value: String(n),
          share: /** @type {number} */ (n) / Math.max(...Object.values(steps)),
          is: /** @type {number} */ (n) ? 'stop' : undefined,
        })),
      }),
    )}`,
  });

  const cr = d.corrections;
  const feedback = pane({
    title: c.navCorrections,
    note: c.feedbackNote,
    body: `${figures([
      { value: String(cr.open), label: c.correctionIs.new, is: 'warn', note: c.waitCurator },
      { value: String(cr.accepted), label: c.correctionIs.accepted },
      { value: String(cr.declined), label: c.correctionIs.declined },
    ])}${block(
      c.navChanges,
      figures([
        {
          value: count(k.changes.last_30_days.material_changes, lang),
          label: c.material30,
          note: c.wholeCountry,
        },
        {
          value: String(k.changes.last_30_days.per_week_median),
          unit: c.perWeek,
          label: c.medianWeek,
        },
      ]),
    )}`,
  });

  return frame(ctx, {
    at: 'dashboards',
    crumbs: [c.navDashboards],
    body: `${head}${split(
      [
        `${stack(
          [coverage, cost, ratings],
          'repeat(3, minmax(0, 1fr))',
          'columns',
        )}${stack([triggers, failures, feedback], 'repeat(3, minmax(0, 1fr))', 'columns')}`,
      ],
      'minmax(0, 1fr)',
      'minmax(0, 1.12fr) minmax(0, 1fr)',
    )}`,
    path: 'dashboards',
  });
}

// ── Administration ──────────────────────────────────────────────────────────

/** @param {Ctx} ctx */
function admin(ctx) {
  const { lang, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console;
  const a = k.admin;
  const over = is === 'over';
  const ROLES = ['curator', 'moderator', 'administrator'];

  const roles = pane({
    title: c.rolesTitle,
    note: c.rolesNote,
    tools: button(c.invite, { icon: icons.plus }),
    is: 'flush',
    body: table({
      name: c.rolesTitle,
      is: 'tall',
      columns: [
        { label: c.personWord },
        ...ROLES.map((r) => ({ label: c.roles[r], width: '104px' })),
        { label: c.lastSeen, width: '104px' },
      ],
      rows: k.people.list.map((/** @type {any} */ p) => ({
        cells: [
          person({ name: p.name[lang], note: p.email }),
          ...ROLES.map((r) => check(`${p.name[lang]}: ${c.roles[r]}`, p.roles.includes(r))),
          day(p.last_seen, lang),
        ],
      })),
    }),
  });

  /** @param {any} entry */
  const what = (entry) => {
    const stop = entry.stop_order ? data.stops[entry.stop_order - 1].name[lang] : '';
    const venue = entry.venue
      ? k.venues.items.find((/** @type {any} */ v) => v.osm === entry.venue)
      : null;
    const whom = entry.person ? who(data, lang, entry.person).name : '';
    return (
      {
        dossier: stop,
        word: entry.word,
        area: k.city.area[lang],
        speech: c.costParts.speech,
        venue: venue ? (venue.name[lang] ?? venue.name.local) : '',
        console: '—',
        person: whom,
      }[/** @type {string} */ (entry.on)] ?? ''
    );
  };
  const log = pane({
    title: c.auditTitle,
    note: c.auditNote,
    tools: button(c.wholeLog, { kind: 'quiet', icon: icons.arrowRight }),
    is: 'flush',
    body: table({
      name: c.auditTitle,
      columns: [
        { label: c.when, sort: 'descending', width: '88px' },
        { label: c.whoWord, width: '76px' },
        { label: c.role, width: '140px' },
        { label: c.action },
        { label: c.onWhat, width: '172px' },
      ],
      rows: a.audit.slice(0, 8).map((/** @type {any} */ e) => ({
        cells: [
          e.at,
          who(data, lang, e.who).name,
          tag(c.roles[e.role]),
          c.auditActions[e.action],
          what(e),
        ],
      })),
    }),
  });

  const grants = ['narration', 'packs', 'ask', 'preparation'];
  const plans = pane({
    title: c.plansTitle,
    note: c.plansNote,
    is: 'flush',
    body: `${padded(
      notice({
        is: 'ok',
        icon: icons.info,
        lead: c.openAccessLead,
        rest: c.openAccessRest,
        tools: check(c.openAccess, a.open_access, { label: c.openAccess }),
      }),
    )}${table({
      name: c.plansTitle,
      columns: [
        { label: c.capability },
        { label: 'Free', width: '148px' },
        { label: 'Plus', width: '148px' },
      ],
      rows: [
        ...grants.map((g) => ({
          cells: [
            nameCell({ name: c.grants[g], go: false }),
            check(`Free: ${c.grants[g]}`, a.plans.free[g]),
            check(`Plus: ${c.grants[g]}`, a.plans.plus[g]),
          ],
        })),
        {
          cells: [
            nameCell({ name: c.narrationsADay, go: false }),
            stepper({
              name: `Free: ${c.narrationsADay}`,
              value: String(a.plans.free.narrations_a_day),
              less: c.less,
              more: c.more,
            }),
            quiet(c.noLimit),
          ],
        },
        {
          cells: [
            nameCell({ name: c.preparationQuota, go: false }),
            quiet(c.notGranted),
            stepper({
              name: `Plus: ${c.preparationQuota}`,
              value: String(a.plans.plus.preparation_quota),
              less: c.less,
              more: c.more,
            }),
          ],
        },
      ],
    })}`,
  });

  const budgets = pane({
    title: c.limitsTitle,
    note: c.limitsNote,
    body: `${
      over
        ? notice({
            is: 'stop',
            lead: c.overLead,
            rest: c.overRest,
            tools: button(c.raiseBudget, { kind: 'second' }),
          })
        : ''
    }${block(
      '',
      stack(
        [
          `${column(
            a.budgets
              .map((/** @type {any} */ b) => {
                const spent = over && b.id === 'speech' ? b.money_budget : b.money;
                const share = spent / b.money_budget;
                return `${block(
                  '',
                  meter({
                    name: c.costParts[b.id],
                    share,
                    lead: c.costParts[b.id],
                    rest: `${c.costOfBudget(money(spent, lang), money(b.money_budget, lang))}${share >= 1 ? ` · ${c.budgetReached}` : ''}`,
                    is: share >= 1 ? 'stop' : 'ok',
                    parts: [{ share, is: share >= 1 ? 'stop' : 'info' }],
                  }),
                )}`;
              })
              .join(''),
          )}`,
          form(
            [
              [c.placesARun, String(a.limits.places_a_run)],
              [c.runsAtOnce, String(a.limits.runs_at_once)],
              [c.budgetPerPlace, money(a.limits.per_place_budget, lang)],
            ].map(([label, value]) =>
              formRow({
                label,
                control: stepper({ name: label, value, less: c.less, more: c.more }),
              }),
            ),
          ),
        ],
        'minmax(0, 1fr) 272px',
        'columns',
      ),
    )}`,
  });

  return frame(ctx, {
    at: 'admin',
    crumbs: [c.navAdmin],
    body: `${pageHead({
      title: c.navAdmin,
      note: c.adminNote,
      actions: mark(true, c.audited, c.audited) + quiet(c.audited),
    })}${split(
      [stack([roles, log], 'auto minmax(0, 1fr)'), stack([plans, budgets], 'auto minmax(0, 1fr)')],
      'minmax(0, 1.14fr) minmax(0, 1fr)',
    )}`,
    path: 'administration',
  });
}

export const oversight = { dashboards, admin };
