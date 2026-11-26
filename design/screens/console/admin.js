/**
 * The console's screens of oversight: the dashboards, and Administration
 * with roles, Plans, limits, budgets and the audit log.
 */
import { icons } from '../../system/icons.js';
import {
  bars,
  block,
  button,
  accented,
  check,
  checklist,
  columns,
  details,
  diff,
  filters,
  kindTile,
  num,
  shareCell,
  strip,
  tabs,
  text,
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
  const sections = (/** @type {number} */ chosen) =>
    tabs(
      c.navDashboards,
      [{ label: c.overview }, { label: c.coverageAndFreshness }, { label: c.productTab }],
      chosen,
    );
  if (is === 'coverage') {
    const regions = table({
      name: c.coverageByRegion,
      is: 'tall',
      columns: [
        { label: c.cityOrRegion },
        { label: c.objects, end: true, width: '92px' },
        { label: c.keyPlaces, end: true, width: '124px' },
        { label: c.verifiedShare, width: '140px' },
        { label: c.whoLooks, width: '184px' },
      ],
      rows: d.coverage_regions.items.map((/** @type {any} */ r) => {
        const fresh = k.areas.freshness.find((/** @type {any} */ f) => f.id === r.id);
        return {
          is: /** @type {'chosen' | undefined} */ (r.opened ? 'chosen' : undefined),
          cells: [
            nameCell({
              name: r.id === 'city' ? k.city.name[lang] : c.regionNames[r.id],
              note: r.opened ? c.referenceCity : c.notPrepared,
              go: r.opened,
            }),
            num(count(fresh.objects, lang)),
            r.key ? num(String(r.key)) : quiet(c.noList),
            r.key
              ? shareCell(r.verified / r.key, percent(r.verified / r.key, lang), 'ok')
              : quiet(c.no),
            r.opened
              ? tag(c.areaOpened, { is: 'ok' })
              : tag(c.reviewedByNobody, { icon: icons.eyeOff }),
          ],
        };
      }),
    });
    const byArea = table({
      name: c.freshByArea,
      columns: [
        { label: c.area },
        { label: c.objects, end: true, width: '92px' },
        { label: c.editedYear, width: '140px' },
        { label: c.untouched5, width: '156px' },
        { label: c.edited30, end: true, width: '136px' },
      ],
      rows: k.areas.freshness.map((/** @type {any} */ f) => ({
        cells: [
          nameCell({
            name: f.id === 'city' ? k.city.name[lang] : c.regionNames[f.id],
            go: false,
          }),
          num(count(f.objects, lang)),
          shareCell(
            f.edited_in_the_last_year / f.objects,
            percent(f.edited_in_the_last_year / f.objects, lang),
          ),
          shareCell(
            f.not_edited_for_5_years / f.objects,
            percent(f.not_edited_for_5_years / f.objects, lang),
            'warn',
          ),
          num(count(f.edited_in_the_last_30_days, lang)),
        ],
      })),
    });
    const byKind = table({
      name: c.freshByKind,
      columns: [
        { label: c.kindOfPlace },
        { label: c.objects, end: true, width: '88px' },
        { label: c.editedYear, width: '136px' },
        { label: c.material30short, end: true, width: '112px' },
      ],
      rows: k.freshness_checks.by_kind.items.map((/** @type {any} */ g) => ({
        cells: [
          nameCell({ name: c.groups[g.kind], go: false }),
          num(count(g.objects, lang)),
          shareCell(
            g.edited_in_the_last_year / g.objects,
            percent(g.edited_in_the_last_year / g.objects, lang),
          ),
          num(count(g.material_changes_30_days, lang)),
        ],
      })),
    });
    return frame(ctx, {
      at: 'dashboards',
      crumbs: [c.navDashboards, c.coverageAndFreshness],
      body: `${head}${sections(1)}${split(
        [
          stack(
            [
              pane({
                title: c.coverageByRegion,
                note: c.coverageByRegionNote,
                is: 'flush',
                body: regions,
              }),
              pane({ title: c.freshByArea, note: c.freshByAreaNote, is: 'flush', body: byArea }),
            ],
            'auto minmax(0, 1fr)',
          ),
          pane({
            title: c.freshByKind,
            note: c.freshByKindNote,
            is: 'flush quiet',
            body: `${byKind}${padded(block('', notice({ is: 'info', lead: c.nobodyLead, rest: c.nobodyRest })))}`,
          }),
        ],
        'minmax(0, 1fr) 500px',
      )}`,
      path: 'dashboards/coverage',
    });
  }
  if (is === 'product') {
    const pr = d.product;
    /** A value of a measure, as it is written. @param {any} m @param {number} v */
    const shown = (m, v) =>
      m.unit === 'share' ? percent(v, lang) : m.unit === 'money' ? money(v, lang, 3) : c.minutes(v);
    const measure = (/** @type {any} */ m) => {
      const top = Math.max(...m.values);
      const last = m.values[m.values.length - 1];
      return pane({
        title: c.measures[m.id],
        note: c.measureNotes[m.id],
        body: `${figures([{ value: shown(m, last), label: c.lastWeek }])}${block(
          c.byWeek,
          columns({
            name: c.measures[m.id],
            items: m.values.map((/** @type {number} */ v, /** @type {number} */ i) => ({
              label: c.weekN(pr.weeks[i].slice(1)),
              value: shown(m, v),
              share: v / top,
              is: i === m.values.length - 1 ? undefined : 'quiet',
            })),
          }),
        )}`,
      });
    };
    const stories = table({
      name: c.storyRatings,
      columns: [
        { label: c.place },
        { label: c.languages.ru, width: '132px' },
        { label: c.languages.en, width: '132px' },
      ],
      rows: pr.stories.map((/** @type {any} */ row) => {
        const stop = data.stops[row.stop_order - 1];
        const cell = (/** @type {number[]} */ [liked, not]) =>
          shareCell(
            liked / (liked + not),
            c.likedOf(liked, not),
            liked / (liked + not) < 0.8 ? 'warn' : 'ok',
          );
        return {
          cells: [
            nameCell({ lead: kindTile(stop.kind), name: stop.name[lang] }),
            cell(row.ru),
            cell(row.en),
          ],
        };
      }),
    });
    const ages = table({
      name: c.correctionsByAge,
      columns: [
        { label: c.waitsFor },
        { label: c.correctionTabs.new, end: true, width: '104px' },
        { label: c.correctionTabs.in_work, end: true, width: '104px' },
      ],
      rows: pr.corrections.by_age.map((/** @type {any} */ a) => ({
        is: /** @type {'warn' | undefined} */ (a.id === 'week' && a.in_work ? 'warn' : undefined),
        cells: [
          nameCell({ name: c.ages[a.id], go: false }),
          a.new ? num(String(a.new)) : quiet('0'),
          a.in_work ? num(String(a.in_work)) : quiet('0'),
        ],
      })),
      foot: {
        label: c.closedTotal(pr.corrections.by_status.accepted, pr.corrections.by_status.declined),
        span: 1,
        cells: [
          num(String(pr.corrections.by_status.new)),
          num(String(pr.corrections.by_status.in_work)),
        ],
      },
    });
    return frame(ctx, {
      at: 'dashboards',
      crumbs: [c.navDashboards, c.productTab],
      body: `${head}${sections(2)}${strip(
        figures([
          {
            value: String(pr.activations.total),
            label: c.activations,
            note: c.activationsNote(pr.activations.values[pr.activations.values.length - 1]),
          },
          { value: String(d.ratings.outings), label: c.outingsRated },
          { value: decimal(d.ratings.mean, lang), unit: c.of(5), label: c.meanRating },
        ]),
      )}${split(
        [
          stack(
            [
              stack(pr.measures.slice(0, 3).map(measure), 'repeat(3, minmax(0, 1fr))', 'columns'),
              stack(pr.measures.slice(3).map(measure), 'repeat(3, minmax(0, 1fr))', 'columns'),
            ],
            'minmax(0, 1fr) minmax(0, 1fr)',
          ),
          stack(
            [
              pane({ title: c.storyRatings, note: c.storyRatingsNote, is: 'flush', body: stories }),
              pane({
                title: c.correctionsByAge,
                note: c.correctionsByAgeNote,
                is: 'flush',
                body: ages,
              }),
            ],
            'auto minmax(0, 1fr)',
          ),
        ],
        'minmax(0, 1.6fr) minmax(0, 1fr)',
      )}`,
      path: 'dashboards/product',
    });
  }
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
    body: `${head}${sections(0)}${split(
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
      rows: a.audit.slice(0, 7).map((/** @type {any} */ e) => ({
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

  const adminHead = (/** @type {number} */ chosen) =>
    `${pageHead({
      title: c.navAdmin,
      note: c.adminNote,
      actions: mark(true, c.audited, c.audited) + quiet(c.audited),
    })}${tabs(
      c.navAdmin,
      [
        { label: c.rolesAndPlans },
        { label: c.rateLimits, count: a.rate_limits.items.length },
        { label: c.auditTitle },
      ],
      chosen,
    )}`;
  if (is === 'limits') {
    const limits = table({
      name: c.rateLimits,
      is: 'tall',
      columns: [
        { label: c.whatIsLimited },
        { label: c.countedWhere, width: '196px' },
        { label: c.limitKey, width: '176px' },
        { label: c.limit, width: '148px' },
        { label: c.perWindow, width: '148px' },
      ],
      rows: a.rate_limits.items.map((/** @type {any} */ r) => ({
        cells: [
          nameCell({ name: c.limitNames[r.id], note: c.limitWhat[r.id], go: false }),
          tag(c.countedIn[r.where], { icon: r.where === 'database' ? icons.lock : icons.clock }),
          c.limitKeys[r.key],
          stepper({ name: c.limitNames[r.id], value: String(r.limit), less: c.less, more: c.more }),
          select({ name: `${c.perWindow}: ${c.limitNames[r.id]}`, value: c.windows[r.per] }),
        ],
      })),
    });
    return frame(ctx, {
      at: 'admin',
      crumbs: [c.navAdmin, c.rateLimits],
      body: `${adminHead(1)}${split(
        [
          pane({ is: 'flush', body: limits }),
          pane({
            title: c.overLimit,
            note: c.overLimitNote,
            is: 'quiet',
            body: `${figures([{ value: String(a.rate_limits.refused_today), label: c.refusedToday }])}${block(
              c.howItAnswers,
              checklist([
                { is: 'info', lead: c.answerCode, rest: c.answerCodeRest },
                { is: 'info', lead: c.answerRollback, rest: c.answerRollbackRest },
                { is: 'info', lead: c.answerAddress, rest: c.answerAddressRest },
                { is: 'info', lead: c.answerBudget, rest: c.answerBudgetRest },
              ]),
            )}`,
            foot: `${text(c.noRelease)}${button(c.save, { kind: 'main' })}`,
          }),
        ],
        'minmax(0, 1fr) 380px',
      )}`,
      path: 'administration/limits',
    });
  }
  if (is === 'audit') {
    const first = a.audit[1];
    const entries = table({
      name: c.auditTitle,
      columns: [
        { label: c.when, sort: 'descending', width: '164px' },
        { label: c.whoWord, width: '92px' },
        { label: c.role, width: '148px' },
        { label: c.action },
        { label: c.entity, width: '104px' },
        { label: c.onWhat, width: '196px' },
      ],
      rows: a.audit.map((/** @type {any} */ e, /** @type {number} */ i) => ({
        is: /** @type {'chosen' | undefined} */ (i === 1 ? 'chosen' : undefined),
        cells: [
          `${day(k.today, lang)}, ${e.at}`,
          who(data, lang, e.who).name,
          tag(c.roles[e.role], { icon: icons.shield }),
          nameCell({ name: c.auditActions[e.action] }),
          c.entities[e.on],
          what(e),
        ],
      })),
    });
    const word = k.pronunciation.entries[0];
    return frame(ctx, {
      at: 'admin',
      crumbs: [c.navAdmin, c.auditTitle],
      body: `${adminHead(2)}${filters({
        name: c.filter,
        search: { name: c.findInLog, hint: c.findInLog },
        selects: [
          { name: c.personWord, value: c.anyone },
          { name: c.action, value: c.anyAction },
          { name: c.entity, value: c.anyEntity },
          { name: c.period, value: c.today },
        ],
        summary: c.shown(a.audit.length),
      })}${split(
        [
          pane({ is: 'flush', body: entries }),
          pane({
            title: c.auditActions[first.action],
            note: `${day(k.today, lang)}, ${first.at}`,
            is: 'quiet',
            body: `${details([
              { label: c.whoWord, value: who(data, lang, first.who).name },
              { label: c.role, value: c.roles[first.role] },
              { label: c.entity, value: c.entities[first.on] },
              { label: c.onWhat, value: accented(word.stressed) },
            ])}${block(
              c.beforeAfter,
              diff({
                old: accented(word.guess),
                next: accented(word.stressed),
                say: { old: c.was, next: c.now },
              }),
            )}${block('', notice({ is: 'info', lead: c.appendOnly, rest: c.appendOnlyRest }))}`,
          }),
        ],
        'minmax(0, 1fr) 340px',
      )}`,
      path: 'administration/audit',
    });
  }

  return frame(ctx, {
    at: 'admin',
    crumbs: [c.navAdmin],
    body: `${adminHead(0)}${split(
      [stack([roles, log], 'auto minmax(0, 1fr)'), stack([plans, budgets], 'auto minmax(0, 1fr)')],
      'minmax(0, 1.14fr) minmax(0, 1fr)',
    )}`,
    path: 'administration',
  });
}

export const oversight = { dashboards, admin };
