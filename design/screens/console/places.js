/**
 * The console's screens of the base of Places: the Place editor with its
 * map, the Proposed Changes with the history of a Place, the Sources with
 * their doubtful matches and the Freshness Checks, and Venue selection.
 */
import { icons } from '../../system/icons.js';
import {
  bars,
  block,
  button,
  check,
  details,
  diff,
  disc,
  figures,
  filters,
  form,
  formRow,
  iconButton,
  input,
  kindTile,
  list,
  listItem,
  mapPane,
  mapTools,
  nameCell,
  notice,
  num,
  pageHead,
  pair,
  pane,
  seg,
  select,
  fortnight,
  shareCell,
  statement,
  split,
  stack,
  stepper,
  table,
  tabs,
  tag,
  timeline,
  tree,
  workMap,
  strip,
  padded,
  fixed,
  group,
  text,
  quiet,
  strong,
} from '../../system/parts/console.js';
import { count, day, decimal, empty, frame, nameOf, percent, shareOf, who, words } from './kit.js';

/** @typedef {import('./kit.js').Ctx} Ctx */

// ── The Place editor ────────────────────────────────────────────────────────

/** @param {Ctx} ctx */
function place(ctx) {
  const { lang, theme, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console;
  const t = k.territory;
  const me = who(data, lang);
  const merge = is === 'merge';
  const hidden = is === 'hidden';
  const osm = c.fromSource(c.sourceNames.osm, day(t.editor.checked, lang));
  const checked = day(t.editor.checked, lang);
  if (is === 'split') return placeSplit(ctx);
  if (is === 'access') return placeAccess(ctx);
  /** The parts of the editor of a Place. @param {number} chosen */
  const sections = (chosen) =>
    tabs(c.place, [{ label: c.placeTab }, { label: c.accessRules }, { label: c.history }], chosen);

  if (merge) {
    const d = t.duplicate;
    const [a, b] = d.records;
    const metres = Math.round(Math.hypot(a.x - b.x, a.y - b.y) / data.map.units_per_metre);
    const title = d.label[lang] ?? d.label.local;
    const side = (/** @type {any} */ r, /** @type {string} */ kicker) => ({
      kicker,
      title: r.name,
      rows: [
        { label: c.object, value: r.osm },
        { label: c.kind, value: c.subkinds[r.subkind] },
        { label: 'Wikidata', value: d.wikidata },
        { label: c.checkedOn, value: checked },
      ],
    });
    const body = `${pageHead({
      lead: kindTile('monument'),
      kicker: `${c.mergeKicker} · Wikidata ${d.wikidata}`,
      title,
      tags: tag(c.possibleDuplicate, { is: 'warn' }),
      actions: `${button(c.differentPlaces, { kind: 'second' })}${button(c.mergeInto, { kind: 'main', icon: icons.merge })}`,
    })}${split(
      [
        mapPane({
          map: workMap(data, {
            lang,
            theme,
            width: 520,
            height: 740,
            label: title,
            places: [
              { x: a.x, y: a.y, n: 'A', is: 'chosen' },
              { x: b.x, y: b.y, n: 'B' },
            ],
            fit: [
              { x: a.x - 100, y: a.y - 142 },
              { x: b.x + 100, y: b.y + 142 },
            ],
            margin: 0,
            labels: 4,
          }),
          tools: mapTools([
            [
              { icon: icons.plus, name: c.zoomIn },
              { icon: icons.minus, name: c.zoomOut },
            ],
          ]),
          legend: [
            { mark: 'chosen', label: c.recordKept },
            { mark: 'place', label: c.recordJoined },
          ],
          credit: c.osm,
        }),
        pane({
          title: c.twoRecords,
          note: c.twoRecordsNote,
          is: 'top',
          body: `${pair({
            sides: [side(a, c.recordA), side(b, c.recordB)],
            between: c.apart(metres),
          })}${block(
            c.whatIsKept,
            form([
              formRow({
                label: c.name,
                control: input({ name: c.name, value: a.name }),
                from: c.sameInBoth,
              }),
              formRow({
                label: c.kind,
                control: seg(
                  c.kind,
                  [{ label: c.subkinds[a.subkind] }, { label: c.subkinds[b.subkind] }],
                  1,
                ),
                from: c.differs,
              }),
              formRow({
                label: c.position,
                control: seg(c.position, [{ label: c.recordA }, { label: c.recordB }], 0),
                from: c.apart(metres),
              }),
            ]),
          )}${block(
            c.whatMoves,
            details([
              { label: c.dossier, value: c.movesDossier },
              { label: c.routesAndVisits, value: c.movesRoutes },
              { label: c.oldIdentifier, value: c.movesMarker },
            ]),
          )}${block('', notice({ is: 'info', lead: c.mergeUndo, rest: c.mergeUndoRest }))}`,
        }),
      ],
      '520px minmax(0, 1fr)',
    )}`;
    return frame(ctx, {
      at: 'places',
      crumbs: [c.navPlacesList, title, c.merging],
      body,
      path: `places/${d.wikidata}/merge`,
    });
  }

  const name = nameOf(t.name, lang);
  const head = pageHead({
    lead: kindTile(t.kind),
    kicker: `${c.place} · ${t.osm} · Wikidata ${t.wikidata}`,
    title: name,
    tags: `${tag(c.territory, { is: 'quiet', icon: icons.boundary })}${tag(c.keyPlace, { is: 'quiet', icon: icons.key })}${hidden ? tag(c.hiddenTag, { is: 'stop', icon: icons.eyeOff }) : ''}`,
    actions: `${button(c.history, { kind: 'quiet', icon: icons.history })}${button(c.mergeWith, { kind: 'quiet', icon: icons.merge })}${button(c.splitPlace, { kind: 'quiet', icon: icons.split })}${
      hidden
        ? button(c.showAgain, { kind: 'main', icon: icons.eye })
        : `${button(c.hide, { kind: 'danger', icon: icons.eyeOff })}${button(c.save, { kind: 'main' })}`
    }`,
  });

  const map = mapPane({
    map: workMap(data, {
      lang,
      theme,
      width: 580,
      height: 740,
      label: name,
      boundary: t.boundary,
      entrances: t.entrances,
      places: t.nested.map((/** @type {any} */ n, /** @type {number} */ i) => ({
        x: n.x,
        y: n.y,
        n: i + 1,
        is: n.sensitive ? 'warn' : undefined,
      })),
      radius: { x: t.centre[0], y: t.centre[1], metres: t.editor.trigger_radius_m },
      parking: [
        { x: t.parking.car.x, y: t.parking.car.y, kind: 'car' },
        { x: t.parking.bicycle.x, y: t.parking.bicycle.y, kind: 'bicycle' },
      ],
      fit: t.boundary.map((/** @type {[number, number]} */ [x, y]) => ({ x, y })),
      margin: 96,
      labels: 5,
    }),
    tools: mapTools([
      [
        { icon: icons.boundary, name: c.toolBoundary, on: true },
        { icon: icons.door, name: c.toolEntrance, on: false },
        { icon: icons.radius, name: c.toolRadius, on: false },
        { icon: icons.pin, name: c.toolPlace, on: false },
      ],
      [
        { icon: icons.plus, name: c.zoomIn },
        { icon: icons.minus, name: c.zoomOut },
      ],
    ]),
    legend: [
      { mark: 'edge', label: c.legendBoundary(t.boundary.length) },
      { mark: 'entrance', label: c.legendEntrances(t.entrances.length) },
      { mark: 'place', label: c.legendNested(t.nested.length) },
      { mark: 'radius', label: c.legendRadius(t.editor.trigger_radius_m) },
      { mark: 'parking', label: c.legendParking },
    ],
    note: hidden ? `${c.hiddenLead} ${c.hiddenRest(me.name, day(k.today, lang))}` : '',
    credit: c.osm,
  });

  const editor = pane({
    is: 'flush',
    body: `${sections(0)}${padded(
      `${block(
        c.basics,
        form([
          formRow({
            label: c.name,
            note: c.nameMarks.source,
            control: `${input({ name: `${c.name}, ${c.languageCodes.ru}`, value: t.name.ru })}${input({ name: `${c.name}, ${c.languageCodes.en}`, value: t.name.en })}`,
            from: osm,
          }),
          formRow({
            label: c.kind,
            control: `${select({ name: c.kind, value: c.subkinds.park, icon: icons.park })}${seg(c.experienced, [{ label: c.outside }, { label: c.inside }], 0)}`,
            from: osm,
          }),
          formRow({
            label: c.status,
            control: select({ name: c.status, value: c.placeStatus.open }),
            from: osm,
          }),
        ]),
      )}${block(
        c.trigger,
        form([
          formRow({
            label: c.triggerRadius,
            control: `${stepper({
              name: c.triggerRadius,
              value: c.metres(t.editor.trigger_radius_m),
              less: c.less,
              more: c.more,
            })}${check(c.manual, t.editor.manual, { label: c.manual })}`,
            from: c.setBy(me.name, day(k.today, lang)),
          }),
          formRow({
            label: c.entrances,
            control: `${strong(t.entrances.length)}${button(c.addEntrance, { kind: 'quiet', icon: icons.plus })}`,
            from: c.fromTag('barrier=entrance'),
          }),
        ]),
      )}${block(
        c.parking,
        form([
          formRow({
            label: c.parkingCar,
            control: `${strong(c.metres(t.parking.car.metres))}${quiet(t.parking.car.osm)}${button(c.moveOnMap, { kind: 'quiet', icon: icons.pin })}`,
            from: osm,
          }),
          formRow({
            label: c.parkingBicycle,
            control: `${strong(c.metres(t.parking.bicycle.metres))}${quiet(c.bicyclePlaces(t.parking.bicycle.tags.capacity))}${button(c.moveOnMap, { kind: 'quiet', icon: icons.pin })}`,
            from: osm,
          }),
        ]),
        { note: c.parkingNote },
      )}${block(
        `${c.nested} · ${t.nested.length}`,
        tree(
          { lead: kindTile(t.kind), name, note: c.territoryNote(t.hectares) },
          t.nested.map((/** @type {any} */ n, /** @type {number} */ i) => ({
            lead: disc(i + 1, 'off'),
            name: nameOf(n.name, lang),
            note: `${c.subkinds[n.subkind]}${n.opening_hours ? ` · ${n.opening_hours}` : ''}`,
            tags: `${n.name[lang] ? '' : tag(c.noNameIn(c.languageCodes[lang]))}${n.sensitive ? tag(c.sensitive[n.sensitive], { is: 'warn' }) : ''}`,
          })),
        ),
      )}`,
    )}`,
  });

  return frame(ctx, {
    at: 'places',
    crumbs: [c.navPlacesList, name],
    body: `${head}${split([map, editor], '580px minmax(0, 1fr)')}`,
    path: `places/${t.wikidata}`,
  });
}

/**
 * Splitting a Place that is really two: which record keeps what.
 * @param {Ctx} ctx
 */
function placeSplit(ctx) {
  const { lang, theme, data } = ctx;
  const c = words(lang);
  const t = data.console.territory;
  const d = t.split;
  const [a, b] = d.records;
  const metres = Math.round(Math.hypot(a.x - b.x, a.y - b.y) / data.map.units_per_metre);
  const title = d.label[lang] ?? d.label.local;
  const side = (/** @type {any} */ r, /** @type {string} */ kicker) => ({
    kicker,
    title: nameOf(r.name, lang),
    rows: [
      { label: c.object, value: r.osm },
      { label: c.kind, value: c.subkinds[r.amenity] ?? c.subkinds[r.subkind] },
      { label: 'Wikidata', value: d.wikidata },
    ],
  });
  const body = `${pageHead({
    lead: kindTile('theatre'),
    kicker: `${c.splitKicker} · Wikidata ${d.wikidata}`,
    title,
    tags: tag(c.oneItemTwoObjects, { is: 'warn' }),
    actions: `${button(c.keepAsOne, { kind: 'second' })}${button(c.splitInTwo, { kind: 'main', icon: icons.split })}`,
  })}${split(
    [
      mapPane({
        map: workMap(data, {
          lang,
          theme,
          width: 520,
          height: 740,
          label: title,
          places: [
            { x: a.x, y: a.y, n: 'A', is: 'chosen' },
            { x: b.x, y: b.y, n: 'B' },
          ],
          fit: [
            { x: Math.min(a.x, b.x) - 150, y: Math.min(a.y, b.y) - 220 },
            { x: Math.max(a.x, b.x) + 150, y: Math.max(a.y, b.y) + 220 },
          ],
          margin: 0,
          labels: 4,
        }),
        tools: mapTools([
          [
            { icon: icons.plus, name: c.zoomIn },
            { icon: icons.minus, name: c.zoomOut },
          ],
        ]),
        legend: [
          { mark: 'chosen', label: c.keepsIdentifier },
          { mark: 'place', label: c.newPlace },
        ],
        credit: c.osm,
      }),
      pane({
        title: c.twoPlaces,
        note: c.twoPlacesNote,
        is: 'top',
        body: `${pair({
          sides: [side(a, c.recordA), side(b, c.recordB)],
          between: c.apart(metres),
        })}${block(
          c.whatGoesWhere,
          form([
            formRow({
              label: c.dossier,
              control: seg(c.dossier, [{ label: c.recordA }, { label: c.recordB }], 0),
              from: c.oneDossier,
            }),
            formRow({
              label: 'Wikidata',
              control: seg('Wikidata', [{ label: c.recordA }, { label: c.recordB }], 0),
              from: d.wikidata,
            }),
            formRow({
              label: c.routesAndVisits,
              control: seg(c.routesAndVisits, [{ label: c.recordA }, { label: c.recordB }], 0),
              from: c.stayWithA,
            }),
          ]),
        )}${block(
          c.afterSplit,
          details([
            { label: c.recordA, value: c.afterSplitA },
            { label: c.recordB, value: c.afterSplitB },
            { label: c.history, value: c.afterSplitHistory },
          ]),
        )}${block('', notice({ is: 'warn', lead: c.splitConfirm, rest: c.splitConfirmRest }))}`,
      }),
    ],
    '520px minmax(0, 1fr)',
  )}`;
  return frame(ctx, {
    at: 'places',
    crumbs: [c.navPlacesList, title, c.splitting],
    body,
    path: `places/${d.wikidata}/split`,
  });
}

/**
 * The Access Rules of a nested Place: its names with their marks, its hours
 * as the map has them, and the intervals they resolve to for two weeks.
 * @param {Ctx} ctx
 */
function placeAccess(ctx) {
  const { lang, theme, data } = ctx;
  const c = words(lang);
  const k = data.console;
  const t = k.territory;
  const a = t.access;
  const me = who(data, lang);
  const nested = t.nested.find((/** @type {any} */ n) => n.osm === a.osm);
  const name = a.names[lang].value;
  const osm = c.fromSource(c.sourceNames.osm, day(t.editor.checked, lang));
  const clock = (/** @type {number} */ m) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const start = new Date(`${a.from}T00:00:00Z`);
  const days = Array.from({ length: a.days }, (_, i) => {
    const date = new Date(start.getTime() + i * 86_400_000);
    const iso = date.toISOString().slice(0, 10);
    return {
      label: `${c.weekdays[date.getUTCDay()]} ${date.getUTCDate()}`,
      open: /** @type {[number, number][]} */ ([a.open]),
      note: `${clock(a.open[0])}–${clock(a.open[1])}`,
      is: /** @type {'today' | undefined} */ (iso === k.today ? 'today' : undefined),
    };
  });
  /** @type {Record<string, { is: 'ok' | 'warn' | 'info' | 'quiet', icon?: string }>} */
  const tone = {
    source: { is: 'quiet', icon: icons.book },
    generated: { is: 'warn' },
    transliterated: { is: 'info' },
  };
  const row = (/** @type {string} */ id, /** @type {string} */ label) =>
    formRow({
      label,
      control: `${input({ name: `${c.name}, ${label}`, value: a.names[id].value })}${tag(c.nameMarks[a.names[id].mark], tone[a.names[id].mark])}`,
      from: a.names[id].mark === 'source' ? osm : c.setBy(c.navPreparation, day(k.today, lang)),
    });

  const body = `${pageHead({
    lead: kindTile(nested.kind),
    kicker: `${c.place} · ${a.osm} · ${c.inTerritory(nameOf(t.name, lang))}`,
    title: name,
    tags: tag(c.nestedPlace, { icon: icons.boundary }),
    actions: `${button(c.history, { kind: 'quiet', icon: icons.history })}${button(c.save, { kind: 'main' })}`,
  })}${split(
    [
      mapPane({
        map: workMap(data, {
          lang,
          theme,
          width: 580,
          height: 740,
          label: name,
          boundary: t.boundary,
          handles: false,
          entrances: t.entrances,
          places: t.nested.map((/** @type {any} */ n, /** @type {number} */ i) => ({
            x: n.x,
            y: n.y,
            n: i + 1,
            is: n.osm === a.osm ? 'chosen' : 'off',
          })),
          radius: { x: nested.x, y: nested.y, metres: a.trigger_radius_m },
          margin: 96,
          labels: 5,
        }),
        tools: mapTools([
          [
            { icon: icons.pin, name: c.toolPlace, on: true },
            { icon: icons.radius, name: c.toolRadius, on: false },
          ],
          [
            { icon: icons.plus, name: c.zoomIn },
            { icon: icons.minus, name: c.zoomOut },
          ],
        ]),
        legend: [
          { mark: 'chosen', label: name },
          { mark: 'edge', label: nameOf(t.name, lang) },
          { mark: 'radius', label: c.legendRadius(a.trigger_radius_m) },
        ],
        credit: c.osm,
      }),
      pane({
        is: 'flush',
        body: `${tabs(
          c.place,
          [{ label: c.placeTab }, { label: c.accessRules }, { label: c.history }],
          1,
        )}${padded(
          `${block(
            c.names,
            form([row('ru', c.languages.ru), row('en', c.languages.en), row('latin', c.latin)]),
            { note: c.namesMarksNote },
          )}${block(
            c.openingHours,
            form([
              formRow({
                label: c.asOnMap,
                control: `${input({ name: c.openingHours, value: a.raw })}${tag(c.hoursKnownTag, { is: 'ok' })}`,
                from: osm,
              }),
              formRow({
                label: c.price,
                control: `${select({ name: c.price, value: c.priceUnknown })}${check(c.ticketNeeded, false, { label: c.ticketNeeded })}`,
                from: c.notInSources,
              }),
            ]),
          )}${block(c.resolved, fortnight({ name: c.resolved, days }), {
            note: c.resolvedNote(day(a.from, lang), a.days),
          })}${block(
            c.inherited,
            details([
              {
                label: c.territory,
                value: `${nameOf(t.name, lang)} · ${c.hoursUnknown.toLowerCase()}`,
              },
              { label: c.result, value: c.inheritResult },
            ]),
            { note: c.inherit },
          )}${block('', notice({ is: 'info', lead: c.savedAsRecord, rest: c.savedAsRecordRest(me.name) }))}`,
        )}`,
      }),
    ],
    '580px minmax(0, 1fr)',
  )}`;
  return frame(ctx, {
    at: 'places',
    crumbs: [c.navPlacesList, nameOf(t.name, lang), name],
    body,
    path: `places/${a.osm.replace('/', '-')}/access`,
  });
}

// ── Proposed Changes and the history of a Place ─────────────────────────────

/** @param {Ctx} ctx */
function changes(ctx) {
  const { lang, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console.changes;
  const me = who(data, lang, k.history.accepted_by);
  const refused = is === 'refused';
  const held = is === 'held';
  const history = is === 'history' || refused;
  const waiting = k.items.filter(
    (/** @type {any} */ i) => i.group === 'waiting' && !(history && i.osm === k.history.of),
  );
  const applied = k.items.filter((/** @type {any} */ i) => i.group === 'applied');
  const chosen = history
    ? k.items.find((/** @type {any} */ i) => i.osm === k.history.of)
    : waiting[0];
  /** What a value is, in words. @param {any} item @param {string | null} value */
  const say = (item, value) =>
    item.attribute === 'status' ? c.placeStatus[value ?? 'open'] : (value ?? c.notSet);
  /** @param {any} item */
  const summary = (item) =>
    `${c.attributes[item.attribute]}: ${say(item, item.old)} → ${say(item, item.new)}`;
  /** @param {any} item */
  const row = (item) =>
    listItem({
      lead: kindTile(item.kind),
      title: item.name,
      note: summary(item),
      at: day(item.day, lang),
      tags: `${tag(c.sourceNames.osm, { icon: icons.book })}${tag(c.changeRules[item.rule], { is: item.group === 'waiting' ? 'warn' : 'quiet', icon: item.group === 'waiting' ? icons.clock : icons.check })}`,
      chosen: item === chosen && !held,
    });
  const closures = waiting.filter((/** @type {any} */ i) => i.attribute === 'status');
  const lowRisk = waiting.filter((/** @type {any} */ i) => i.attribute !== 'status');

  const figureBand = strip(
    figures([
      { value: String(is === 'empty' ? 0 : waiting.length), label: c.waitCurator },
      ...(held
        ? [
            {
              value: '1',
              label: c.heldRuns,
              is: /** @type {const} */ ('stop'),
              note: c.nothingApplied,
            },
          ]
        : []),
      { value: String(applied.length), label: c.appliedAlone, note: c.notReviewed },
      {
        value: count(k.last_30_days.material_changes, lang),
        label: c.material30,
        note: c.wholeCountry,
      },
      {
        value: String(k.last_30_days.per_week_median),
        unit: c.perWeek,
        label: c.medianWeek,
        note: c.worstWeek(k.last_30_days.per_week_worst),
      },
    ]),
  );

  const narrow = filters({
    name: c.filter,
    chips: [
      { label: c.all, on: true },
      { label: c.origins.source, on: false },
      { label: c.origins.check, on: false },
      { label: c.origins.correction, on: false },
    ],
    selects: [
      { name: c.area, value: data.console.city.area[lang] },
      { name: c.kind, value: c.anyKind },
      { name: c.order, value: c.orderKeyFirst },
    ],
    summary: c.groupedBy,
  });
  const run = k.held;
  const queue = pane({
    is: 'flush',
    body: `${
      held
        ? list(
            c.heldRuns,
            [
              listItem({
                lead: kindTile('book'),
                title: c.runOf(c.checkNames.osm, day(run.run, lang)),
                note: c.wouldClose(run.would_close, run.limit_close),
                at: day(run.run, lang),
                tags: tag(c.heldTag, { is: 'stop', icon: icons.pause }),
                chosen: true,
              }),
            ],
            `${c.heldRuns} · 1`,
          )
        : ''
    }${
      is === 'empty'
        ? ''
        : `${list(c.closuresGroup, closures.map(row), `${c.closuresGroup} · ${closures.length}`)}${
            lowRisk.length
              ? list(
                  c.lowRiskGroup,
                  lowRisk.map(row),
                  `${c.lowRiskGroup} · ${lowRisk.length}`,
                  held
                    ? ''
                    : button(c.acceptGroup(lowRisk.length), { kind: 'second', icon: icons.check }),
                )
              : ''
          }`
    }${
      held
        ? ''
        : list(
            c.appliedAlone,
            applied.map(row),
            `${c.appliedAlone} · ${c.notReviewed.toLowerCase()} · ${applied.length}`,
          )
    }`,
  });

  const head = pageHead({ title: c.navChanges, note: c.changesNote });
  if (is === 'empty') {
    return frame(ctx, {
      at: 'changes',
      crumbs: [c.navChanges],
      body: `${head}${figureBand}${narrow}${split(
        [
          queue,
          empty({
            icon: icons.check,
            title: c.noChanges,
            text: c.noChangesNote,
          }),
        ],
        '368px minmax(0, 1fr)',
      )}`,
      path: 'changes',
      counts: { changes: 0 },
    });
  }

  if (held) {
    const top = Math.max(...Object.values(run.changes));
    const ledger = data.console.freshness_checks.runs.items;
    return frame(ctx, {
      at: 'changes',
      crumbs: [c.navChanges, c.heldRuns],
      body: `${head}${figureBand}${narrow}${split(
        [
          queue,
          pane({
            title: c.runOf(c.checkNames.osm, day(run.run, lang)),
            note: c.heldNote,
            tools: tag(c.heldTag, { is: 'stop', icon: icons.pause }),
            body: `${notice({ is: 'stop', lead: c.nothingAppliedLead, rest: c.nothingAppliedRest })}${block(
              '',
              figures([
                {
                  value: String(run.would_close),
                  label: c.wouldCloseLabel,
                  is: 'stop',
                  note: c.limitIs(String(run.limit_close)),
                },
                {
                  value: percent(run.would_change_share, lang, 1),
                  label: c.wouldChangeLabel,
                  is: 'stop',
                  note: c.limitIs(percent(run.limit_share, lang)),
                },
              ]),
            )}${block(
              c.whatRunHolds,
              bars({
                name: c.whatRunHolds,
                items: Object.entries(run.changes).map(([id, n]) => ({
                  label: c.runChanges[id],
                  value: count(/** @type {number} */ (n), lang),
                  share: /** @type {number} */ (n) / top,
                  is: id === 'closed' ? 'stop' : undefined,
                })),
              }),
            )}${block('', notice({ is: 'info', lead: c.massEdit, rest: c.massEditRest(run.real_share.replace('.', lang === 'ru' ? ',' : '.')) }))}`,
            foot: `${button(c.discardRun, { kind: 'danger' })}${text('')}${button(c.releaseRun, { kind: 'main', icon: icons.check })}`,
          }),
          pane({
            title: c.runsOf(c.checkNames.osm),
            note: c.runsLedgerNote,
            is: 'quiet',
            body: timeline([
              {
                at: day(run.run, lang),
                title: c.heldTag,
                by: c.checkNames.osm,
                note: c.wouldClose(run.would_close, run.limit_close),
                is: /** @type {const} */ ('now'),
              },
              ...ledger.slice(0, 3).map((/** @type {any} */ r) => ({
                at: day(r.at, lang),
                title: c.runStates[r.state],
                by: c.readObjects(count(r.read, lang)),
                note: c.proposedApplied(r.proposed, r.applied),
              })),
            ]),
          }),
        ],
        '368px minmax(0, 1fr) 408px',
      )}`,
      path: 'changes/held',
      counts: { changes: waiting.length },
    });
  }

  const later = k.later_edit;
  const status = chosen.attribute === 'status';
  const evidence = details([
    { label: c.origin, value: `${c.sourceNames.osm} · ODbL 1.0` },
    { label: c.object, value: chosen.osm },
    {
      label: c.inExtract(day(k.source.base_extract, lang)),
      value: status ? chosen.tag_old : `opening_hours=${chosen.old ?? '—'}`,
    },
    {
      label: c.inExtract(day(k.source.extract, lang)),
      value: status ? chosen.tag_new : `opening_hours=${chosen.new}`,
    },
    { label: c.changedOn, value: day(chosen.day, lang) },
    ...(chosen.check_date ? [{ label: c.checkDate, value: day(chosen.check_date, lang) }] : []),
  ]);
  const detail = pane({
    title: chosen.name,
    note: `${c.subkinds[chosen.subkind] ?? c.kinds[chosen.kind]} · ${chosen.osm}`,
    tools: history
      ? tag(c.accepted, { is: 'ok' })
      : tag(c.waitsTag, { is: 'warn', icon: icons.clock }),
    body: `${block(
      c.attributes[chosen.attribute],
      diff({
        old: say(chosen, chosen.old),
        next: say(chosen, chosen.new),
        oldNote: c.inBase,
        nextNote: c.sourceNames.osm,
        say: { old: c.was, next: history ? c.now : c.proposed },
      }),
    )}${block(c.evidence, evidence, { note: c.evidenceNote })}${block(
      c.rule,
      text(status ? c.ruleStatus(chosen.tag_new.split('=')[0]) : c.ruleHours),
    )}${
      refused
        ? `${block('', notice({ is: 'stop', lead: c.cannotUndo, rest: c.cannotUndoRest(day(later.on, lang)) }))}`
        : history
          ? `${block('', notice({ is: 'info', lead: c.canUndo, rest: c.canUndoRest }))}`
          : `${block('', notice({ is: 'warn', icon: icons.clock, lead: c.whyWaits, rest: c.changeWhy[chosen.rule] }))}`
    }`,
    foot: refused
      ? `${text('')}${button(c.undoChange, { icon: icons.undo, disabled: true })}${button(c.fixByEdit, { kind: 'main', icon: icons.edit })}`
      : history
        ? `${text(c.acceptedBy(me.name, day(k.history.accepted_on, lang)))}${button(c.undoChange, { kind: 'main', icon: icons.undo })}`
        : `${button(c.reject, { kind: 'danger' })}${text('')}${button(c.editAndAccept, { kind: 'second', icon: icons.edit })}${button(c.accept, { kind: 'main', icon: icons.check })}`,
  });

  const past = pane({
    title: c.placeHistory,
    note: c.placeHistoryNote,
    is: 'quiet',
    body: timeline([
      ...(refused
        ? [
            {
              at: day(later.on, lang),
              title: c.curatorEdit,
              by: `${who(data, lang, later.by).name} · ${c.roles.curator.toLowerCase()}`,
              note: `${c.attributes.opening_hours}: ${chosen.new} → ${later.value}`,
              is: /** @type {const} */ ('ok'),
              tools: button(c.undoChange, { kind: 'second', icon: icons.undo }),
            },
          ]
        : []),
      ...(history
        ? [
            {
              at: day(k.history.accepted_on, lang),
              title: c.accepted,
              by: `${me.name} · ${c.roles.curator.toLowerCase()}`,
              note: refused
                ? `${summary(chosen)} · ${c.undoRefused(day(later.on, lang))}`
                : summary(chosen),
              is: /** @type {const} */ (refused ? 'quiet' : 'ok'),
              tools: refused ? '' : button(c.undoChange, { kind: 'second', icon: icons.undo }),
            },
          ]
        : []),
      {
        at: day(chosen.day, lang),
        title: c.proposedChange,
        by: c.sourceNames.osm,
        note: history ? c.waitedFor : c.waitCurator,
        is: /** @type {const} */ (history ? 'quiet' : 'now'),
        body: diff({
          old: say(chosen, chosen.old),
          next: say(chosen, chosen.new),
          say: { old: c.was, next: c.proposed },
        }),
      },
      {
        at: day(k.source.base_extract, lang),
        title: c.placeCreated,
        by: c.firstGathering,
        note: c.snapshotOf(day(k.source.base_extract, lang)),
      },
    ]),
  });

  return frame(ctx, {
    at: 'changes',
    crumbs: [c.navChanges, chosen.name],
    body: `${head}${figureBand}${narrow}${split([queue, detail, past], '368px minmax(0, 1fr) 408px')}`,
    path: `changes/${chosen.osm.replace('/', '-')}`,
    counts: { changes: waiting.length },
  });
}

// ── Sources, doubtful matches, Freshness Checks ─────────────────────────────

/** @param {Ctx} ctx */
function sources(ctx) {
  const { lang, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console;
  const checks = is === 'checks';
  const sitesTab = is === 'sites';
  const head = `${pageHead({ title: c.sourcesTitle, note: c.sourcesNote })}${tabs(
    c.sourcesTitle,
    [
      { label: c.sourcesAndMatches, count: k.matches.items.length },
      { label: c.freshnessChecks, count: k.freshness_checks.items.length },
      { label: c.sitesAndInPerson, count: k.fragments.items.length + k.in_person.items.length },
    ],
    checks ? 1 : sitesTab ? 2 : 0,
  )}`;

  if (sitesTab) {
    const sites = k.freshness_checks.websites;
    const local = (/** @type {string} */ value) => percent(shareOf(value), lang, 1);
    const chosen = k.fragments.items[0];
    const fragments = pane({
      title: c.fragmentsTitle,
      note: c.fragmentsNote,
      is: 'flush',
      body: list(
        c.fragmentsTitle,
        k.fragments.items.map((/** @type {any} */ f) =>
          listItem({
            lead: kindTile(
              f.subkind === 'place_of_worship' ? 'church' : f.subkind === 'cafe' ? 'cup' : 'museum',
            ),
            title: nameOf(f.name, lang),
            note: f.host,
            at: day(f.read, lang),
            tags: `${tag(c.hoursInText, { icon: icons.lines })}${
              f.current === null
                ? tag(c.noHoursInBase, { is: 'warn' })
                : f.current_resolves
                  ? ''
                  : tag(c.baseUnreadable, { is: 'stop' })
            }`,
            chosen: f === chosen,
          }),
        ),
      ),
    });
    const fragment = pane({
      title: nameOf(chosen.name, lang),
      note: `${c.subkinds[chosen.subkind]} · ${chosen.osm}`,
      tools: tag(c.sampleFragment, { is: 'info' }),
      body: `${block(
        c.fragment,
        statement({
          quote: `… ${chosen.current} …`,
          rows: [
            { label: c.address, value: chosen.host },
            { label: c.readOn, value: day(chosen.read, lang) },
            { label: c.pageHash, value: k.fragments.fragment.hash },
            { label: c.inMarkup, value: chosen.in_markup ? c.yes : c.no },
          ],
        }),
        { note: c.fragmentNote },
      )}${block(
        c.nowInBase,
        `${text(chosen.current)}${block('', notice({ is: 'stop', lead: c.baseUnreadableLead, rest: c.baseUnreadableRest }))}`,
        { note: c.fromSource(c.sourceNames.osm, day(k.territory.editor.checked, lang)) },
      )}${block(
        c.enterHours,
        input({ name: c.openingHours, hint: c.enterHoursHint, is: 'active' }),
        { note: c.enterHoursNote },
      )}`,
      foot: `${button(c.dismiss, { kind: 'danger' })}${text(c.noPageKept)}${button(c.enterHours, { kind: 'main', icon: icons.check })}`,
    });
    const inPerson = pane({
      title: c.inPersonTitle,
      note: c.inPersonNote,
      is: 'flush',
      body: table({
        name: c.inPersonTitle,
        is: 'tall',
        columns: [
          { label: c.place },
          { label: c.confirmed, sort: 'ascending', width: '116px' },
          { label: '', say: c.decision, width: '200px', end: true },
        ],
        rows: k.in_person.items.map((/** @type {any} */ p) => ({
          cells: [
            nameCell({
              name: nameOf(p.name, lang),
              note: `${c.subkinds[p.subkind]} · ${c.inPersonWhy[p.why]}`,
            }),
            p.check_date ? day(p.check_date, lang) : quiet(c.never),
            group(
              `${button(c.confirm, { kind: 'second', icon: icons.check })}${iconButton(icons.edit, `${c.correct}: ${nameOf(p.name, lang)}`)}`,
            ),
          ],
        })),
      }),
    });
    return frame(ctx, {
      at: 'sources',
      crumbs: [c.navSources, c.sitesAndInPerson],
      body: `${head}${strip(
        figures([
          { value: local(sites.reachable), label: c.sitesReachable },
          { value: local(sites.dead), label: c.sitesDead, is: 'stop', note: c.sitesDeadNote },
          { value: local(sites.hours_in_markup), label: c.sitesMarkup },
          { value: local(sites.hours_in_text), label: c.sitesText },
        ]),
      )}${split([fragments, fragment, inPerson], '312px minmax(0, 1fr) 500px')}`,
      path: 'sources/websites',
    });
  }

  if (checks) {
    const f = k.freshness_checks;
    const board = table({
      name: c.freshnessChecks,
      is: 'tall',
      columns: [
        { label: c.freshnessCheck },
        { label: c.howOften, width: '172px' },
        { label: c.lastRun, sort: 'none', width: '164px' },
        { label: c.nextRun, sort: 'ascending', width: '132px' },
        { label: c.found, width: '196px' },
        { label: c.cost, width: '96px' },
        { label: c.on, width: '100px' },
        { label: '', say: c.runNow, width: '136px', end: true },
      ],
      rows: f.items.map((/** @type {any} */ item, /** @type {number} */ i) => ({
        is: /** @type {'chosen' | undefined} */ (i === 0 ? 'chosen' : undefined),
        cells: [
          nameCell({
            lead: kindTile(item.id === 'websites' ? 'globe' : 'book'),
            name: c.checkNames[item.id],
            note: c.checkWhat[item.id],
            go: false,
          }),
          select({ name: `${c.howOften}: ${c.checkNames[item.id]}`, value: c.every[item.every] }),
          day(item.last_run, lang),
          item.on ? day(item.next_run, lang) : quiet(c.switchedOff),
          item.found
            ? c.foundChanges(count(item.found, lang))
            : quiet(
                item.id === 'websites'
                  ? c.foundSites(percent(shareOf(f.websites.reachable), lang, 1))
                  : c.foundNothingNew,
              ),
          c.free,
          check(`${c.checkNames[item.id]}: ${c.on}`, item.on),
          button(c.runNow, { kind: 'quiet', icon: icons.play }),
        ],
      })),
    });
    const byKind = table({
      name: c.freshByKind,
      columns: [
        { label: c.kindOfPlace },
        { label: c.objects, end: true, width: '80px' },
        { label: c.editedYear, width: '132px' },
        { label: c.withCheckDate, end: true, width: '124px' },
        { label: c.checkedYear, width: '132px' },
        { label: c.material30short, end: true, width: '100px' },
      ],
      rows: f.by_kind.items.map((/** @type {any} */ g) => ({
        cells: [
          nameCell({ name: c.groups[g.kind], go: false }),
          num(count(g.objects, lang)),
          shareCell(
            g.edited_in_the_last_year / g.objects,
            percent(g.edited_in_the_last_year / g.objects, lang),
          ),
          num(count(g.with_a_check_date, lang)),
          g.with_a_check_date > 20
            ? shareCell(
                g.check_date_within_a_year / g.with_a_check_date,
                percent(g.check_date_within_a_year / g.with_a_check_date, lang),
              )
            : quiet(c.tooFew),
          num(count(g.material_changes_30_days, lang)),
        ],
      })),
    });
    const ledger = table({
      name: c.runsOf(c.checkNames.osm),
      columns: [
        { label: c.when, sort: 'descending' },
        { label: c.readCount, end: true, width: '84px' },
        { label: c.proposedCount, end: true, width: '96px' },
        { label: c.appliedCount, end: true, width: '92px' },
        { label: c.result, width: '112px' },
      ],
      rows: f.runs.items.map((/** @type {any} */ r) => ({
        is: /** @type {'stop' | undefined} */ (r.state === 'held' ? 'stop' : undefined),
        cells: [
          day(r.at, lang),
          num(count(r.read, lang)),
          num(count(r.proposed, lang)),
          r.applied === null ? quiet(c.no) : num(count(r.applied, lang)),
          r.state === 'held'
            ? tag(c.heldTag, { is: 'stop', icon: icons.pause })
            : tag(c.okTag, { is: 'ok' }),
        ],
      })),
    });
    return frame(ctx, {
      at: 'sources',
      crumbs: [c.navSources, c.freshnessChecks],
      body: `${head}${split(
        [
          `${pane({ is: 'flush', body: board })}${stack(
            [
              pane({ title: c.freshByKind, note: c.freshByKindNote, is: 'flush', body: byKind }),
              pane({
                title: c.runsOf(c.checkNames.osm),
                note: c.runsLedgerNote,
                is: 'flush quiet',
                body: ledger,
              }),
            ],
            'minmax(0, 1fr) 500px',
            'columns',
          )}`,
        ],
        'minmax(0, 1fr)',
        'auto minmax(0, 1fr)',
      )}`,
      path: 'sources/freshness',
    });
  }

  const supply = table({
    name: c.navSources,
    columns: [
      { label: c.source },
      { label: c.licence, width: '132px' },
      { label: c.lastRun, sort: 'descending', width: '164px' },
      { label: c.records, end: true, width: '160px' },
      { label: c.matched, width: '176px' },
      { label: c.errors, width: '132px' },
      { label: '', say: c.runNow, width: '136px', end: true },
    ],
    rows: k.sources.items.map((/** @type {any} */ s) => ({
      cells: [
        nameCell({
          lead: kindTile(s.id === 'websites' ? 'globe' : 'book'),
          name: c.sourceNames[s.id],
          note: c.sourceGives[s.id],
          go: false,
        }),
        s.licence ?? quiet(c.licenceNone),
        day(s.last_run, lang),
        num(count(s.records, lang), c.recordsOf[s.records_of]),
        s.matched && s.id !== 'wikipedia' && s.id !== 'pageviews'
          ? shareCell(s.matched / 100, percent(s.matched / 100, lang))
          : quiet(s.id === 'osm' ? c.isTheBase : s.id === 'websites' ? c.byAddress : c.byLink),
        s.errors ? tag(c.failedRequests(s.errors), { is: 'warn' }) : tag(c.noErrors, { is: 'ok' }),
        button(c.runNow, { kind: 'quiet', icon: icons.play }),
      ],
    })),
  });
  const doubtful = table({
    name: c.doubtful,
    is: 'tall',
    columns: [
      { label: 'Wikidata' },
      { label: 'OpenStreetMap' },
      { label: c.distance, sort: 'none', end: true, width: '104px' },
      { label: c.basis, sort: 'ascending', width: '168px' },
      { label: c.decision, width: '324px' },
    ],
    rows: k.matches.items.slice(0, 6).map((/** @type {any} */ m, /** @type {number} */ i) => ({
      is: /** @type {'chosen' | undefined} */ (i === 0 ? 'chosen' : undefined),
      cells: [
        nameCell({
          name: m.wikidata_name,
          note: `${c.classes[m.wikidata_class] ?? m.wikidata_class} · ${m.qid}`,
          go: false,
        }),
        nameCell({
          name: m.osm_name,
          note: `${c.subkinds[m.osm_what] ?? m.osm_what} · ${m.osm}`,
          go: false,
        }),
        num(c.metres(m.distance_m)),
        m.by === 'name'
          ? tag(c.byName(decimal(m.score, lang, 2)), {
              is: m.score < 0.8 ? 'warn' : 'quiet',
            })
          : tag(c.byAddressOnly, { is: 'warn' }),
        group(
          `${button(c.samePlace, { kind: 'second', icon: icons.merge })}${button(c.differentPlace, { kind: 'second' })}${button(c.later, { kind: 'quiet' })}`,
        ),
      ],
    })),
  });
  return frame(ctx, {
    at: 'sources',
    crumbs: [c.navSources],
    body: `${head}${split(
      [
        `${pane({ is: 'flush', body: supply })}${pane({
          title: c.doubtful,
          note: c.doubtfulNote(
            count(k.matches.unlinked_items, lang),
            k.matches.matched_strict,
            k.matches.items.length,
          ),
          tools: tag(c.doubtfulRule, { is: 'info' }),
          is: 'flush',
          body: doubtful,
        })}`,
      ],
      'minmax(0, 1fr)',
      'auto minmax(0, 1fr)',
    )}`,
    path: 'sources',
  });
}

// ── Venue selection ─────────────────────────────────────────────────────────

/** @param {Ctx} ctx */
function venues(ctx) {
  const { lang, theme, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console.venues;
  const none = is === 'none';
  const near = data.stops[k.source.near_stop_order - 1];
  const items = k.items
    .filter((/** @type {any} */ v) => v.shown)
    .map((/** @type {any} */ v) => ({ ...v, selected: none ? false : v.selected }));
  const chosen = items.find((/** @type {any} */ v) => v.selected) ?? items[0];
  const picked = items.filter((/** @type {any} */ v) => v.selected).length;
  const city = k.city.venues;

  const figureBand = strip(
    figures([
      {
        value: String(picked),
        label: c.venuesChosen,
        note: none ? c.breakInstead : '',
        is: none ? 'warn' : undefined,
      },
      { value: String(k.items.length), label: c.venuesNear(215), note: near.name[lang] },
      {
        value: percent(shareOf(city.share), lang, 1),
        label: c.venuesHours,
        note: c.outOf(count(city.with_hours, lang), count(city.places, lang)),
      },
    ]),
  );

  const board = table({
    name: c.navVenues,
    columns: [
      { label: c.selectedTag, width: '92px' },
      { label: c.numberSign, width: '52px' },
      { label: c.venue, sort: 'none' },
      { label: c.openingHours, width: '236px' },
      { label: c.toPlace, sort: 'ascending', end: true, width: '92px' },
      { label: c.checkedOn, width: '112px' },
    ],
    rows: items.map((/** @type {any} */ v, /** @type {number} */ i) => ({
      is: /** @type {'chosen' | undefined} */ (v === chosen ? 'chosen' : undefined),
      cells: [
        check(`${c.inRoutes}: ${nameOf(v.name, lang)}`, v.selected),
        disc(i + 1, v.selected ? 'accent' : 'off'),
        nameCell({
          name: nameOf(v.name, lang),
          note: `${c.subkinds[v.subkind]}${v.has_website ? ` · ${c.hasSite}` : ''}`,
        }),
        v.opening_hours ?? tag(c.hoursUnknown, { is: 'warn' }),
        num(c.metres(v.straight_m)),
        v.check_date ? day(v.check_date, lang) : quiet(c.never),
      ],
    })),
  });

  const side = pane({
    is: 'flush quiet',
    body: `${fixed(
      mapPane({
        map: workMap(data, {
          lang,
          theme,
          width: 420,
          height: 312,
          label: c.navVenues,
          places: items.map((/** @type {any} */ v, /** @type {number} */ i) => ({
            x: v.x,
            y: v.y,
            n: i + 1,
            is: v.selected ? 'chosen' : 'off',
          })),
          anchor: { x: near.x, y: near.y, n: near.order },
          margin: 28,
          labels: 3,
        }),
        legend: [
          { mark: 'chosen', label: c.legendChosen },
          { mark: 'off', label: c.legendCandidate },
        ],
        credit: c.osm,
      }),
      312,
    )}${padded(
      `${
        none ? `${block('', notice({ is: 'warn', lead: c.noVenueLead, rest: c.noVenueRest }))}` : ''
      }${block(
        `${c.practical} · ${nameOf(chosen.name, lang)}`,
        details([
          { label: c.whatItIs, value: c.subkinds[chosen.subkind] },
          {
            label: c.openingHours,
            value: chosen.opening_hours
              ? `${chosen.opening_hours} · ${c.hoursKnown}`
              : c.hoursUnknown,
          },
          { label: c.priceLevel, value: c.priceUnknown },
          { label: c.origin, value: `${c.sourceNames.osm} · ${chosen.osm}` },
        ]),
        {
          tools: tag(
            chosen.selected ? c.selectedTag : c.candidateTag,
            chosen.selected ? { is: 'ok' } : {},
          ),
        },
      )}${block(c.whyHere, input({ name: c.whyHere, hint: c.whyHereHint }), {
        note: c.whyHereNote,
      })}${block('', notice({ is: 'info', lead: c.noVenueStory, rest: '' }))}`,
    )}`,
  });

  return frame(ctx, {
    at: 'venues',
    crumbs: [c.navVenues, near.name[lang]],
    body: `${pageHead({
      title: c.venuesTitle,
      note: c.venuesNote,
      actions: `${select({ name: c.nearPlace, value: `${near.order} · ${near.name[lang]}`, icon: icons.pin })}${button(c.save, { kind: 'main' })}`,
    })}${figureBand}${split([pane({ is: 'flush', body: board }), side], 'minmax(0, 1fr) 420px')}`,
    path: 'venues',
  });
}

export const places = { place, changes, sources, venues };
