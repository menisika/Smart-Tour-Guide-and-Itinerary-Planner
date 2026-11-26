/**
 * The components of the console as specimens: drawn once, at the width of a
 * desk, with no glass.
 *
 * What a specimen shows is the reference Outing — its Places, the cited
 * passage that stands in for a Story, the map — and the words of the
 * console. A number that the reference Outing does not hold is a sample of a
 * state, and the note of the specimen says so.
 */
import { C } from '../../screens/console/words.js';
import { icons } from '../icons.js';
import {
  accented,
  audio,
  bars,
  block,
  button,
  centred,
  check,
  checklist,
  columns,
  details,
  diff,
  disc,
  fact,
  facts,
  figures,
  filters,
  form,
  formRow,
  group,
  iconButton,
  input,
  kindTile,
  list,
  listItem,
  mapPane,
  mapTools,
  mark,
  meter,
  nameCell,
  notice,
  num,
  pageHead,
  pair,
  pane,
  person,
  quiet,
  run,
  sample,
  seg,
  select,
  shell,
  skeleton,
  sourceLine,
  split,
  stepper,
  story,
  stress,
  strip,
  table,
  tabs,
  tag,
  textarea,
  timeline,
  tree,
  workMap,
  fortnight,
  gate,
  statement,
} from '../parts/console.js';
import { state } from '../parts/states.js';

/** @typedef {import('../specimens.js').Specimen} Specimen */
/** @typedef {{ os: string, theme: 'light' | 'dark' | 'sun', lang: 'ru' | 'en', data: any, text: number, width: number }} Ctx */

/** A date as the console writes it in a cell. @param {string} iso @param {'ru' | 'en'} lang */
const day = (iso, lang) => {
  const [y, m, d] = iso.split('-');
  return lang === 'ru' ? `${d}.${m}.${y}` : `${y}-${m}-${d}`;
};

/** The source of the cited passage, as one line. @param {Ctx} ctx */
function cite({ data, lang }) {
  const c = C[lang];
  const from = data.outingNow.story[lang].source;
  return sourceLine({
    work: from.work,
    article: lang === 'ru' ? `«${from.article}»` : `“${from.article}”`,
    revision: `${c.number(from.revision)} · ${day(from.revision_date, lang)}`,
    licence: from.licence,
    name: c.openSource,
  });
}

/** @type {Specimen[]} */
export const consoleSpecimens = [
  {
    id: 'console-shell',
    group: 'Console',
    title: 'The shell of the console',
    note: 'The navigation stays at the side under the product’s lockup and the word “console”; the bar says where one is, in which role, and who one is. Where one is in the navigation is told by a bar at the edge, a ground and a heavier word. Nothing is glass. The person is a role, not a name: a specimen has no people.',
    height: 420,
    wide: true,
    render: ({ theme, lang, data }) => {
      const c = C[lang];
      return shell({
        theme,
        word: c.console,
        navName: c.navName,
        city: { label: c.city, value: c.allCities },
        nav: [
          {
            title: c.navKnowledge,
            items: [
              { icon: icons.dossier, label: c.navDossiers, count: 12, current: true },
              { icon: icons.speaker, label: c.navPronunciation },
              { icon: icons.flag, label: c.navCorrections, count: 2 },
              { icon: icons.download, label: c.navPreparation },
            ],
          },
          {
            title: c.navPlaces,
            items: [
              { icon: icons.pin, label: c.navPlacesList },
              { icon: icons.swap, label: c.navChangesShort, count: 4 },
            ],
          },
        ],
        crumbs: [c.navDossiers, data.stops[1].name[lang]],
        me: { name: c.roles.curator, note: 'curator@promenade.example' },
        role: c.roles.curator,
        say: { search: c.search, hint: c.searchHint, help: c.help },
        body: pageHead({
          lead: kindTile(data.stops[1].kind),
          kicker: c.dossier,
          title: data.stops[1].name[lang],
          tags: `${tag(c.dossierIs.draft, { icon: icons.edit })}${tag(c.keyPlace, { icon: icons.key })}`,
          actions: `${button(c.history, { kind: 'quiet', icon: icons.history })}${button(c.markVerified, { kind: 'main', icon: icons.shield })}`,
        }),
      });
    },
  },
  {
    id: 'console-controls',
    group: 'Console',
    title: 'Controls of the console',
    note: 'At the console’s density: 32 px high, and never under 24 px in either direction. One action of a page is prominent, in the accent; the others are outlined or quiet; one that removes or hides is outlined in red and says what it does. A choice that is on carries a tick; a switch says “on” by the place of its knob and a tick, not by its colour alone.',
    height: 236,
    wide: true,
    render: ({ lang, data }) => {
      const c = C[lang];
      return sample(
        `${block(
          c.action,
          group(
            `${button(c.markVerified, { kind: 'main', icon: icons.shield })}${button(c.addFact, { icon: icons.plus })}${button(c.history, { kind: 'quiet', icon: icons.history })}${button(c.hide, { kind: 'danger', icon: icons.eyeOff })}${button(c.startPreparation, { icon: icons.download, disabled: true })}${button(c.saveAndRedo, { kind: 'main', busy: true })}${iconButton(icons.edit, c.editFact)}${iconButton(icons.boundary, c.toolBoundary, { on: true })}`,
          ),
        )}${block(
          c.filter,
          group(
            `${seg(c.scope, [{ label: c.scopeCity }, { label: c.scopeArea }, { label: c.scopeList }], 1)}${check(c.manual, true, { label: c.manual })}${check(c.ticketNeeded, false, { label: c.ticketNeeded })}${stepper({ name: c.triggerRadius, value: c.metres(35), less: c.less, more: c.more })}${select({ name: c.kind, value: c.subkinds.park, icon: icons.park })}${input({ name: c.findPlace, hint: c.findPlace, icon: icons.search })}${input({ name: c.name, value: data.stops[10].name[lang], is: 'active' })}`,
          ),
        )}${block(
          c.storyForms,
          tabs(
            c.storyForms,
            [{ label: c.formPlace }, { label: c.formMore, count: 2 }, { label: c.formBridge }],
            0,
          ),
        )}`,
      );
    },
  },
  {
    id: 'console-marks',
    group: 'Console',
    title: 'Marks: a state in a word',
    note: 'A state is always a word with a sign of its own — a tick, a triangle, a circle with a stroke — and only then a colour. The number in a disc is the order of a thing, as a stop of a Route has one. A kind of Place is its icon on a tile.',
    height: 132,
    wide: true,
    render: ({ lang, data }) => {
      const c = C[lang];
      return sample(
        `${group(
          `${tag(c.dossierIs.verified, { is: 'ok' })}${tag(c.sensitive.war, { is: 'warn' })}${tag(c.storyWithheld, { is: 'stop', icon: icons.lock })}${tag(c.madeAuto, { is: 'info' })}${tag(c.dossierIs.draft, { icon: icons.edit })}${tag(c.keyPlace, { icon: icons.key })}${mark(true, c.on, c.no)}${mark(false, c.on, c.no)}${disc(1)}${disc(2, 'accent')}${disc(3, 'off')}${kindTile(data.stops[1].kind)}${kindTile(data.stops[4].kind)}${kindTile(data.stops[10].kind)}`,
        )}${block('', group(`${person({ name: c.roles.curator, note: 'curator@promenade.example' })}${person({ name: c.roles.administrator })}`))}`,
      );
    },
  },
  {
    id: 'console-table',
    group: 'Console',
    title: 'A table with its filters',
    note: 'A real table: a head that sorts is a control and says which way; the first cell names its row and opens it. A chosen row has a bar at its edge and a ground; a row that is off is struck through and says why. Numbers stand at the right in one width. A last row sums the others under a full line. The rows are the Places of the reference Outing; “1 correction” is a sample of a state.',
    height: 452,
    wide: true,
    render: ({ lang, data }) => {
      const c = C[lang];
      const stops = data.stops.slice(0, 7);
      return sample(
        `${filters({
          name: c.filter,
          search: { name: c.findPlace, hint: c.findPlace },
          chips: [
            { label: c.all, on: true, count: stops.length },
            { label: c.sensitiveOnly, on: false, count: 1 },
            { label: c.withCorrections, on: false, count: 1 },
          ],
          summary: c.queueOrder,
        })}${table({
          name: c.navPlacesList,
          columns: [
            { label: c.numberSign, sort: 'ascending', width: '72px' },
            { label: c.place, sort: 'none' },
            { label: c.kind, width: '180px' },
            { label: c.sensitivity, width: '160px' },
            { label: c.navCorrections, width: '160px' },
            { label: c.heritageList, width: '120px' },
            { label: c.toPlace, end: true, sort: 'none', width: '120px' },
          ],
          rows: stops.map((/** @type {any} */ stop, /** @type {number} */ i) => ({
            is: /** @type {'chosen' | 'off' | undefined} */ (
              i === 1 ? 'chosen' : i === 5 ? 'off' : undefined
            ),
            cells: [
              disc(stop.order, i === 5 ? 'off' : ''),
              nameCell({
                lead: kindTile(stop.kind),
                name: stop.name[lang],
                note: stop.built[lang],
              }),
              c.kinds[stop.kind] ?? c.kinds.building,
              i === 1 ? tag(c.sensitive.religion, { is: 'warn' }) : quiet(c.no),
              i === 1 ? tag(c.corrections(1), { is: 'warn', icon: icons.flag }) : quiet(c.no),
              mark(stop.heritage, c.listed, c.notListed),
              num(c.metres(stop.legMetres)),
            ],
          })),
          foot: {
            label: `${c.total} · ${stops.length}`,
            span: 6,
            cells: [
              num(
                c.metres(
                  stops.reduce(
                    (/** @type {number} */ a, /** @type {any} */ s) => a + s.legMetres,
                    0,
                  ),
                ),
              ),
            ],
          },
        })}`,
        'flush',
      );
    },
  },
  {
    id: 'console-panes',
    group: 'Console',
    title: 'Panes: a list and what is chosen in it',
    note: 'Panes stand side by side, divided by a hairline and not lifted as cards. A pane has a head that stays, a body, and a foot for what is done with what it shows. The list at the left is chosen from; the pane on the second ground is about what is chosen. Rows not yet there are drawn as their shapes.',
    height: 380,
    wide: true,
    render: ({ lang, data }) => {
      const c = C[lang];
      const stops = data.stops.slice(0, 4);
      return sample(
        split(
          [
            pane({
              is: 'flush',
              body: list(
                c.navPlacesList,
                stops.map((/** @type {any} */ stop, /** @type {number} */ i) =>
                  listItem({
                    lead: kindTile(stop.kind),
                    title: stop.name[lang],
                    note: stop.built[lang],
                    at: stop.arrive,
                    tags:
                      i === 1 ? tag(c.sensitive.religion, { is: 'warn' }) : tag(c.dossierIs.draft),
                    chosen: i === 1,
                  }),
                ),
                c.navPlacesList,
              ),
            }),
            pane({
              title: stops[1].name[lang],
              note: stops[1].built[lang],
              tools: tag(c.dossierIs.draft, { icon: icons.edit }),
              body: `${block(
                c.dossier,
                details([
                  { label: c.kind, value: c.kinds[stops[1].kind] },
                  { label: c.heritageList, value: c.listed },
                  { label: c.story, value: c.storyWithheldLong },
                ]),
              )}${block(c.navPlacesList, skeleton(3))}`,
              foot: `${button(c.openDossier, { kind: 'main', icon: icons.dossier })}`,
            }),
            pane({
              title: c.navCorrections,
              is: 'quiet',
              body: centred(
                state({ icon: icons.flag, title: c.noCorrections, text: c.noCorrectionsNote }),
              ),
            }),
          ],
          '400px minmax(0, 1fr) 420px',
        ),
        'flush',
      );
    },
  },
  {
    id: 'console-facts',
    group: 'Console',
    title: 'A fact with its sources',
    note: 'One statement in the guide’s face, numbered; under it where it comes from — the work, the article, its revision with a date, the licence — with the way to open it; beside it its themes and what can be done to it. A fact with an open Correction stands on a tinted ground with a bar at its edge and says so in words; a removed one is struck through and can be put back. The facts are sentences of the cited passage: no fact is written for a specimen.',
    height: 356,
    wide: true,
    render: (ctx) => {
      const { lang, data } = ctx;
      const c = C[lang];
      const sentences = data.outingNow.story[lang].sentences;
      const keys = (/** @type {number} */ n) =>
        `${iconButton(icons.edit, `${c.editFact} ${n}`)}${iconButton(icons.flag, `${c.markSensitive} ${n}`, { on: false })}${iconButton(icons.trash, `${c.removeFact} ${n}`)}`;
      return sample(
        facts([
          fact({
            n: 1,
            text: sentences[0].text,
            sources: [cite(ctx)],
            tags: tag(c.themes[0]),
            tools: keys(1),
          }),
          fact({
            n: 2,
            text: sentences[1].text,
            sources: [cite(ctx)],
            is: 'flagged',
            note: c.factHasCorrection('C-0412'),
            tags: `${tag(c.themes[0])}${tag(c.themes[1])}`,
            tools: keys(2),
          }),
          fact({
            n: 3,
            text: sentences[2].text,
            sources: [cite(ctx)],
            is: 'removed',
            note: c.factRemoved(c.roles.curator),
            tools: button(c.putBack, { kind: 'quiet', icon: icons.undo }),
          }),
        ]),
        'flush narrow',
      );
    },
  },
  {
    id: 'console-story',
    group: 'Console',
    title: 'A Story as it will be heard, and a fact being edited',
    note: 'The Story is set in the guide’s face; each factual sentence carries the numbers of the facts it rests on. The sentence a listener pointed at is tinted and underlined; one that lost its fact is struck through. A fact is edited in a field of the same face. The text is the cited passage.',
    height: 300,
    wide: true,
    render: ({ lang, data }) => {
      const c = C[lang];
      const passage = data.outingNow.story[lang];
      return sample(
        split(
          [
            pane({
              title: c.storyPreview,
              note: c.storyPreviewNote,
              tools: `${tag(c.madeAuto, { is: 'info' })}${tag(c.storyNotVerified)}`,
              body: story(
                passage.sentences.map((/** @type {any} */ s, /** @type {number} */ i) => ({
                  text: s.text,
                  facts: [i + 1],
                  is:
                    i === passage.current
                      ? 'picked'
                      : i === passage.sentences.length - 1
                        ? 'lost'
                        : '',
                })),
                lang,
              ),
            }),
            pane({
              title: `${c.fact} ${passage.current + 1}`,
              body: textarea({
                name: `${c.fact} ${passage.current + 1}`,
                value: passage.sentences[passage.current].text,
              }),
              foot: `${button(c.cancel, { kind: 'quiet' })}${button(c.saveFact, { kind: 'main' })}`,
            }),
          ],
          'minmax(0, 1fr) 520px',
        ),
        'flush',
      );
    },
  },
  {
    id: 'console-form',
    group: 'Console',
    title: 'Rows of a form, with where a value came from',
    note: 'What is set, the control, and at the right the source of the value and the date it was last checked: every attribute of a Place can be traced. A value that no source holds says so instead of standing empty. The date is that of the map’s extract.',
    height: 252,
    wide: true,
    render: ({ lang, data }) => {
      const c = C[lang];
      const stop = data.stops[10];
      const from = c.fromSource(c.sourceNames.osm, day(data.map.source.extract, lang));
      return sample(
        form([
          formRow({
            label: c.name,
            control: input({ name: c.name, value: stop.name[lang] }),
            from,
          }),
          formRow({
            label: c.kind,
            control: `${select({ name: c.kind, value: c.kinds[stop.kind], icon: icons.ensemble })}${seg(c.experienced, [{ label: c.outside }, { label: c.inside }], 0)}`,
            from,
          }),
          formRow({
            label: c.openingHours,
            control: `${input({ name: c.openingHours, hint: c.hoursNotSet })}${tag(c.hoursUnknown, { is: 'warn' })}`,
            from: c.notInSources,
          }),
          formRow({
            label: c.triggerRadius,
            control: stepper({
              name: c.triggerRadius,
              value: c.metres(35),
              less: c.less,
              more: c.more,
            }),
          }),
          formRow({ label: c.manual, control: check(c.manual, false, { label: c.manualNote }) }),
        ]),
        'narrow',
      );
    },
  },
  {
    id: 'console-figures',
    group: 'Console',
    title: 'Key figures and small charts',
    note: 'A number that matters is set in the face of numbers, with what it counts above it and what follows from it under it; a state beside a number is said in words. Bars read across, columns read up, a meter shows a share used or done. A bar is ink; green is kept for “within” and “done”, red for what failed. The times and distances are those of the reference Outing.',
    height: 300,
    wide: true,
    render: ({ lang, data }) => {
      const c = C[lang];
      const route = data.route;
      const stops = data.stops.slice(0, 6);
      const far = Math.max(...stops.map((/** @type {any} */ s) => s.legMetres));
      return sample(
        `${strip(
          figures([
            { value: String(route.stopCount), label: c.navPlacesList },
            {
              value: String(route.totalMinutes),
              unit: c.of(route.budgetMinutes),
              label: c.progress,
              is: 'ok',
              note: c.withinBudget,
            },
            { value: c.metres(route.walkingMetres), label: c.distance },
          ]),
        )}${split(
          [
            pane({
              title: c.distance,
              body: bars({
                name: c.distance,
                items: stops.map((/** @type {any} */ s) => ({
                  label: s.name[lang],
                  value: c.metres(s.legMetres),
                  share: s.legMetres / far,
                  is: s.legMetres === far ? 'warn' : undefined,
                })),
              }),
            }),
            pane({
              title: c.toPlace,
              body: columns({
                name: c.toPlace,
                items: stops.map((/** @type {any} */ s) => ({
                  label: String(s.order),
                  value: String(s.legMinutes),
                  share: s.legMetres / far,
                })),
              }),
            }),
            pane({
              title: c.progress,
              body: meter({
                name: c.progress,
                share: route.totalMinutes / route.budgetMinutes,
                lead: c.outOf(String(route.totalMinutes), String(route.budgetMinutes)),
                rest: c.withinBudget,
                parts: [{ share: route.totalMinutes / route.budgetMinutes, is: 'ok' }],
              }),
            }),
          ],
          'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)',
        )}`,
        'flush',
      );
    },
  },
  {
    id: 'console-audio',
    group: 'Console',
    title: 'A recording with playback, and a word with its stress',
    note: 'A recording is a key, a name, the voice as bars with the played part in the colour of the line, and its length; what a check found stands under its name. A word is set on a board of letters: each vowel is a key of 38 px, the stressed one is filled and carries the stroke. In a line of text the stress is a stroke over the vowel and a line under it. No Narration exists: the lengths follow from the length of the passage.',
    height: 204,
    wide: true,
    render: ({ lang, data }) => {
      const c = C[lang];
      const passage = data.outingNow.story[lang];
      const word = c.stressSample;
      return sample(
        split(
          [
            pane({
              title: c.narration,
              body: `${audio({
                title: c.narrationIn(c.languages[lang]),
                seconds: passage.total,
                played: 0.4,
                playing: true,
                say: c.pause,
                tags: tag(c.transcriptOk, { is: 'ok' }),
                tools: iconButton(icons.reload, c.regenNarration),
              })}${audio({
                title: c.audioBefore,
                seconds: passage.sentences[1].startsAt,
                say: c.play,
                seed: 4,
                tags: tag(c.transcriptDiffers, { is: 'stop' }),
              })}`,
            }),
            pane({
              title: c.stress,
              note: c.stressHint,
              body: `${stress({ name: c.stress, word, say: (l, n) => c.stressOn(l, n) })}${block('', notice({ is: 'ok', lead: c.stressSet, rest: accented(word) }))}`,
            }),
          ],
          'minmax(0, 1fr) 520px',
        ),
        'flush',
      );
    },
  },
  {
    id: 'console-run',
    group: 'Console',
    title: 'A run through its steps',
    note: 'Each step says how many have passed it; the one under way turns, a finished one is ticked, a failed one is a circle with a stroke, in red, with the reason under it. What is to be checked before something is done is a list of lines, each so or not, with its way out beside it. The counts are samples of a state.',
    height: 252,
    wide: true,
    render: ({ lang }) => {
      const c = C[lang];
      const ids = ['gather', 'facts', 'stories', 'verify', 'narration', 'transcribe'];
      const done = [11, 11, 9, 9, 7, 7];
      return sample(
        `${run(
          ids.map((id, i) => ({
            label: c.steps[id],
            value: `${done[i]} / 11`,
            share: done[i] / 11,
            is: /** @type {'done' | 'now' | 'failed' | 'wait'} */ (
              i < 2 ? 'done' : i === 4 ? 'failed' : i === 5 ? 'wait' : 'now'
            ),
            note: i === 4 ? c.stepFailed(1) : '',
          })),
        )}${block(
          c.beforeVerify,
          checklist([
            { is: 'ok', lead: c.checkSources, rest: c.checkSourcesRest(6) },
            {
              is: 'warn',
              lead: c.checkVoice,
              rest: c.checkVoiceRest,
              tool: button(c.navPronunciation, { kind: 'quiet', icon: icons.speaker }),
            },
            { is: 'info', lead: c.checkSensitive, rest: c.checkSensitiveRest },
          ]),
        )}`,
        'narrow',
      );
    },
  },
  {
    id: 'console-changes',
    group: 'Console',
    title: 'A change: old and new, and what happened by time',
    note: 'An old value is struck through on the second ground; the new one stands in a full outline, heavier: the two are told apart without colour. A timeline reads down from the latest, each entry with who or what made it; the entry that can be undone carries its control. Two records that may be one stand side by side with what lies between them. The values are the two names of a Place of the reference Outing.',
    height: 268,
    wide: true,
    render: ({ lang, data }) => {
      const c = C[lang];
      const stop = data.stops[8];
      const change = diff({
        old: stop.name.ru,
        next: stop.name.en,
        oldNote: c.inBase,
        nextNote: c.sourceNames.wikidata,
        say: { old: c.was, next: c.proposed },
      });
      return sample(
        split(
          [
            pane({
              title: c.name,
              body: `${change}${block('', notice({ is: 'info', lead: c.canUndo, rest: c.canUndoRest }))}`,
            }),
            pane({
              title: c.placeHistory,
              note: c.placeHistoryNote,
              is: 'quiet',
              body: timeline([
                {
                  at: day(data.map.source.extract, lang),
                  title: c.proposedChange,
                  by: c.sourceNames.wikidata,
                  note: c.waitCurator,
                  is: 'now',
                  tools: button(c.undoChange, { kind: 'second', icon: icons.undo }),
                },
                {
                  at: day(data.map.source.extract, lang),
                  title: c.placeCreated,
                  by: c.firstGathering,
                  note: c.snapshotOf(day(data.map.source.extract, lang)),
                },
              ]),
            }),
            pane({
              title: c.twoRecords,
              body: pair({
                sides: [
                  {
                    kicker: c.recordA,
                    title: stop.name.ru,
                    rows: [{ label: c.kind, value: c.kinds[stop.kind] }],
                  },
                  {
                    kicker: c.recordB,
                    title: stop.name.en,
                    rows: [{ label: c.kind, value: c.kinds[stop.kind] }],
                  },
                ],
                between: c.differs,
                tools: `${button(c.samePlace, { kind: 'second', icon: icons.merge })}${button(c.differentPlace, { kind: 'second' })}`,
              }),
            }),
          ],
          'minmax(0, 1fr) 400px 440px',
        ),
        'flush',
      );
    },
  },
  {
    id: 'console-map',
    group: 'Console',
    title: 'The map of the work on a Place',
    note: 'The same map as the product’s, flat and north up, with what the work is about on it: a boundary with the points that shape it, Entrances as dark squares with a door, nested Places as numbered discs, the circle in which a Story starts as a dashed line. The tools are a column of keys on a solid ground; the one in use is filled. The attribution of the map stays in sight. The boundary is the footprint box of a Place of the reference Outing, a sample of a boundary; the Places and the map are real.',
    height: 460,
    wide: true,
    render: ({ lang, theme, data }) => {
      const c = C[lang];
      const stops = data.stops.slice(1, 6);
      const xs = stops.map((/** @type {any} */ s) => s.x);
      const ys = stops.map((/** @type {any} */ s) => s.y);
      /** @type {[number, number][]} */
      const box = [
        [Math.min(...xs) - 60, Math.min(...ys) - 60],
        [Math.max(...xs) + 60, Math.min(...ys) - 60],
        [Math.max(...xs) + 60, Math.max(...ys) + 60],
        [Math.min(...xs) - 60, Math.max(...ys) + 60],
      ];
      return sample(
        split(
          [
            mapPane({
              map: workMap(data, {
                lang,
                theme,
                width: 960,
                height: 460,
                label: c.navPlacesList,
                boundary: box,
                entrances: [{ x: stops[0].streetX, y: stops[0].streetY }],
                places: stops.map((/** @type {any} */ s, /** @type {number} */ i) => ({
                  x: s.x,
                  y: s.y,
                  n: s.order,
                  is: i === 0 ? 'chosen' : i === 4 ? 'off' : undefined,
                })),
                radius: { x: stops[0].x, y: stops[0].y, metres: 35 },
                margin: 64,
              }),
              tools: mapTools([
                [
                  { icon: icons.boundary, name: c.toolBoundary, on: true },
                  { icon: icons.door, name: c.toolEntrance, on: false },
                  { icon: icons.radius, name: c.toolRadius, on: false },
                ],
                [
                  { icon: icons.plus, name: c.zoomIn },
                  { icon: icons.minus, name: c.zoomOut },
                ],
              ]),
              legend: [
                { mark: 'edge', label: c.legendBoundary(box.length) },
                { mark: 'entrance', label: c.legendEntrances(1) },
                { mark: 'place', label: c.legendNested(stops.length) },
                { mark: 'radius', label: c.legendRadius(35) },
              ],
              credit: c.osm,
            }),
            pane({
              title: c.nested,
              is: 'top',
              body: tree(
                {
                  lead: kindTile('park'),
                  name: c.territory,
                  note: c.legendNested(stops.length),
                },
                stops.slice(0, 4).map((/** @type {any} */ s) => ({
                  lead: disc(s.order, 'off'),
                  name: s.name[lang],
                  note: s.built[lang],
                  tags: s.order === 2 ? tag(c.sensitive.religion, { is: 'warn' }) : '',
                })),
              ),
            }),
          ],
          '960px minmax(0, 1fr)',
        ),
        'flush',
      );
    },
  },
  {
    id: 'console-gate',
    group: 'Console',
    title: 'In place of the console: sign-in, a refusal, “update required”',
    note: 'When a person is not let in, or the tab cannot go on, nothing of the console is shown: the lockup with the word “console”, one thing said plainly, what can be done, and under the card what is recorded. A refusal has a red outline, a lock and its own words — never the colour alone. The marks of Apple and Google are not reproduced.',
    height: 520,
    wide: true,
    render: ({ theme, lang }) => {
      const c = C[lang];
      return gate({
        theme,
        word: c.console,
        title: c.signInTitle,
        text: c.signInNote,
        body: `${input({ name: c.email, hint: 'name@promenade.example', icon: icons.mail })}${button(c.getCode, { kind: 'main' })}${button(c.withApple)}${button(c.withGoogle)}`,
        note: c.signInFoot,
      });
    },
  },
  {
    id: 'console-hours',
    group: 'Console',
    title: 'Opening hours as they resolve, and a statement with its source',
    note: 'Two weeks, a day to a line of twenty-four hours: the open part is filled and its times stand under it; today is underlined; a closed day is empty and says “closed”, a day nobody knows is hatched and says so. Beside it a statement of the guide under the accent bar, with its source as pairs of a name and a value. The hours are a sample of the form: the Places of the reference Outing are seen from outside and have none. The statement is the cited passage.',
    height: 236,
    wide: true,
    render: ({ lang, data }) => {
      const c = C[lang];
      const passage = data.outingNow.story[lang];
      const start = new Date(`${data.map.source.extract}T00:00:00Z`);
      const days = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(start.getTime() + i * 86_400_000);
        const label = `${c.weekdays[date.getUTCDay()]} ${date.getUTCDate()}`;
        if (date.getUTCDay() === 1)
          return {
            label,
            note: c.placeStatus.closed_temporarily,
            is: /** @type {const} */ ('off'),
          };
        if (i === 13)
          return { label, note: c.hoursUnknownShort, is: /** @type {const} */ ('unknown') };
        return {
          label,
          open: /** @type {[number, number][]} */ ([[600, 1140]]),
          note: '10:00–19:00',
          is: /** @type {'today' | undefined} */ (i === 3 ? 'today' : undefined),
        };
      });
      return sample(
        split(
          [
            pane({
              title: c.resolved,
              note: c.resolvedNote(day(data.map.source.extract, lang), 14),
              body: fortnight({ name: c.resolved, days }),
            }),
            pane({
              title: c.statement,
              body: statement({
                quote: passage.sentences[0].text,
                rows: [
                  { label: c.source, value: `${passage.source.work}, ${passage.source.article}` },
                  {
                    label: c.revisionWord,
                    value: `${day(passage.source.revision_date, lang)} · ${c.number(passage.source.revision)}`,
                  },
                  { label: c.licence, value: passage.source.licence },
                ],
              }),
            }),
          ],
          'minmax(0, 1fr) 520px',
        ),
        'flush',
      );
    },
  },
];
