/**
 * The console's screens of knowledge: the verification queue of Dossiers,
 * the Dossier editor, the pronunciation editor, the Corrections inbox, and
 * Preparation.
 */
import { icons } from '../../system/icons.js';
import {
  accented,
  audio,
  block,
  button,
  checklist,
  details,
  diff,
  disc,
  fact,
  facts,
  figures,
  filters,
  iconButton,
  kindTile,
  list,
  listItem,
  mapPane,
  meter,
  nameCell,
  notice,
  num,
  pageHead,
  pane,
  run,
  seg,
  select,
  skeleton,
  sourceLine,
  split,
  stack,
  story,
  stress,
  table,
  tabs,
  tag,
  textarea,
  workMap,
  formRow,
  form,
  strip,
  padded,
  fixed,
  column,
  text,
  quiet,
  strong,
} from '../../system/parts/console.js';
import { source } from '../../system/parts/story.js';
import { count, day, empty, frame, money, nameOf, percent, who, words } from './kit.js';

/** @typedef {import('./kit.js').Ctx} Ctx */

/** The name of a Place of the queue: of the reference Outing where it is one of its stops. @param {any} item @param {any} data @param {'ru' | 'en'} lang */
const placeName = (item, data, lang) =>
  item.stop_order ? data.stops[item.stop_order - 1].name[lang] : item.name[lang];

// ── The verification queue ──────────────────────────────────────────────────

/** @param {Ctx} ctx */
function queue(ctx) {
  const { lang, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console;
  const verified = is === 'verified';
  const items =
    is === 'empty'
      ? []
      : k.queue.items.filter(
          (/** @type {any} */ i) => !(verified && i.stop_order === k.dossier.stop_order),
        );
  const sensitive = items.filter((/** @type {any} */ i) => i.sensitive).length;
  const open = items.reduce(
    (/** @type {number} */ sum, /** @type {any} */ i) => sum + i.corrections,
    0,
  );
  const stale = items.filter((/** @type {any} */ i) => i.status === 'stale').length;
  const key = k.coverage.key_places;
  const done = is === 'empty' ? key.total : key.verified + (verified ? 1 : 0);

  const figureBand = strip(
    figures([
      { value: String(items.length), label: c.queueWaiting },
      { value: String(sensitive), label: c.queueSensitive, note: c.queueSensitiveNote },
      { value: String(open), label: c.queueOpen },
      {
        value: String(done),
        unit: c.of(key.total),
        label: c.queueKey,
        note: percent(done / key.total, lang),
      },
    ]),
  );
  const narrow = filters({
    name: c.filter,
    search: { name: c.findPlace, hint: c.findPlace },
    chips: [
      { label: c.all, on: true, count: items.length },
      { label: c.sensitiveOnly, on: false, count: sensitive },
      { label: c.withCorrections, on: false, count: open },
      { label: c.staleOnly, on: false, count: stale },
    ],
    summary: c.queueOrder,
  });

  const rows = items.map((/** @type {any} */ item, /** @type {number} */ i) => ({
    is: /** @type {'chosen' | undefined} */ (i === 0 ? 'chosen' : undefined),
    cells: [
      disc(i + 1),
      nameCell({
        lead: kindTile(item.kind),
        name: placeName(item, data, lang),
        note: `${c.kinds[item.kind]} · ${item.articles.join(', ')}${item.heritage ? ` · ${c.heritage}` : ''}`,
      }),
      item.monthly_views === null ? quiet(c.noViews) : num(count(item.monthly_views, lang)),
      item.sensitive ? tag(c.sensitive[item.sensitive], { is: 'warn' }) : quiet(c.no),
      item.corrections
        ? tag(c.corrections(item.corrections), { is: 'warn', icon: icons.flag })
        : quiet(c.no),
      tag(c.dossierIs[item.status], {
        is: item.status === 'stale' ? 'warn' : 'quiet',
        icon: item.status === 'stale' ? icons.reload : icons.edit,
      }),
      item.sensitive
        ? tag(c.storyWithheld, { is: 'stop', icon: icons.lock })
        : tag(c.storyOut, { is: 'quiet' }),
    ],
  }));
  const board = table({
    name: c.queueTitle,
    columns: [
      { label: '№', sort: 'ascending', width: '64px' },
      { label: c.place },
      { label: c.views, sort: 'none', end: true, width: '100px' },
      { label: c.sensitivity, sort: 'none', width: '142px' },
      { label: c.navCorrections, sort: 'none', width: '120px' },
      { label: c.dossier, width: '116px' },
      { label: c.story, width: '176px' },
    ],
    rows,
  });

  const first = items[0];
  const aside = first
    ? pane({
        title: placeName(first, data, lang),
        note: `${c.kinds[first.kind]} · Wikidata ${first.qid}`,
        is: 'quiet',
        body: `${block(
          c.whyFirst,
          checklist([
            ...(first.monthly_views
              ? [
                  {
                    is: /** @type {const} */ ('info'),
                    lead: c.viewsLead(count(first.monthly_views, lang)),
                    rest: c.viewsRest,
                  },
                ]
              : []),
            ...(first.sensitive
              ? [
                  {
                    is: /** @type {const} */ ('warn'),
                    lead: c.sensitiveLead(c.sensitive[first.sensitive]),
                    rest: c.sensitiveRest,
                  },
                ]
              : []),
            {
              is: /** @type {const} */ ('info'),
              lead: c.articlesLead(first.articles.length),
              rest: first.articles.join(', '),
            },
          ]),
        )}${block(
          c.dossier,
          details([
            { label: c.status, value: c.dossierDraft },
            { label: c.heritageList, value: first.heritage ? c.listed : c.notListed },
            {
              label: c.story,
              value: first.sensitive ? c.storyWithheldLong : c.storyOutLong,
            },
          ]),
        )}`,
        foot: button(c.openDossier, { kind: 'main', icon: icons.dossier }),
      })
    : '';

  const body =
    is === 'loading'
      ? `${pageHead({ title: c.queueTitle, note: c.queueNote })}${split([pane({ is: 'flush', body: skeleton(12) })], 'minmax(0, 1fr)')}`
      : is === 'empty'
        ? `${pageHead({ title: c.queueTitle, note: c.queueNote })}${figureBand}${split(
            [
              empty({
                icon: icons.shield,
                title: c.queueEmpty,
                text: c.queueEmptyNote,
                actions: button(c.startPreparation, { icon: icons.download }),
              }),
            ],
            'minmax(0, 1fr)',
          )}`
        : `${pageHead({
            title: c.queueTitle,
            note: c.queueNote,
            actions: verified
              ? notice({
                  is: 'ok',
                  lead: c.verifiedLead,
                  rest: data.stops[k.dossier.stop_order - 1].name[lang],
                  tools: button(c.undo, { kind: 'quiet', icon: icons.undo }),
                })
              : '',
          })}${figureBand}${narrow}${split(
            [pane({ is: 'flush', body: board }), aside],
            'minmax(0, 1fr) 288px',
          )}`;
  return frame(ctx, {
    at: 'queue',
    crumbs: [c.navDossiers],
    body,
    path: 'dossiers',
    counts: { queue: items.length },
  });
}

// ── The Dossier editor ──────────────────────────────────────────────────────

/** @param {Ctx} ctx */
function dossier(ctx) {
  const { lang, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console;
  const me = who(data, lang);
  const nostory = is === 'nostory';
  const stop = data.stops[k.dossier.stop_order - 1];
  const nested = k.territory.nested.find(
    (/** @type {any} */ n) => n.osm === k.dossier.no_facts.osm,
  );
  const passage = data.outingNow.story[lang];
  const from = passage.source;
  const sample = k.dossier.sample;
  const cur = passage.current;
  const doubt = sample.doubtful[lang];
  const removed = ['removed', 'verified'].includes(is);
  const verified = is === 'verified';
  const quoted = lang === 'ru' ? `«${from.article}»` : `“${from.article}”`;
  const cite = sourceLine({
    work: from.work,
    article: quoted,
    revision: `№ ${from.revision} · ${day(from.revision_date, lang)}`,
    licence: from.licence,
    name: c.openSource,
  });

  const items = passage.sentences.map((/** @type {any} */ s, /** @type {number} */ i) => {
    const themes = sample.themes[lang][i]
      .map((/** @type {number} */ t) => tag(c.themes[t]))
      .join('');
    const keys = `${iconButton(icons.edit, `${c.editFact} ${i + 1}`)}${iconButton(icons.flag, `${c.markSensitive} ${i + 1}`, { on: false })}${iconButton(icons.trash, `${c.removeFact} ${i + 1}`)}`;
    if (removed && i === doubt)
      return fact({
        n: i + 1,
        text: s.text,
        sources: [cite],
        is: 'removed',
        note: c.factRemoved(me.name),
        tools: button(c.putBack, { kind: 'quiet', icon: icons.undo }),
      });
    if (is === 'corrected' && i === cur)
      return fact({
        n: i + 1,
        text: s.text,
        sources: [cite],
        is: 'editing',
        editor: textarea({ name: `${c.fact} ${i + 1}`, value: s.text }),
        note: c.factClaim(k.corrections.items[0].id, c.correctionKinds[0]),
        tools: `${button(c.saveFact, { kind: 'main' })}${button(c.cancel, { kind: 'quiet' })}`,
      });
    if (is === 'fixed' && i === cur)
      return fact({
        n: i + 1,
        text: s.text,
        sources: [cite],
        is: 'fixed',
        note: c.factFixed(me.name, k.corrections.items[0].id),
        tags: themes,
        tools: keys,
      });
    return fact({
      n: i + 1,
      text: s.text,
      sources: [cite],
      is: is === 'usual' && i === cur ? 'flagged' : '',
      note: is === 'usual' && i === cur ? c.factHasCorrection(k.corrections.items[0].id) : '',
      tags: themes,
      tools: keys,
    });
  });

  const told = passage.sentences
    .map((/** @type {any} */ s, /** @type {number} */ i) => ({ text: s.text, facts: [i + 1], i }))
    .filter((/** @type {any} */ s) => !(removed && s.i === doubt));
  const seconds = removed
    ? passage.total -
      (passage.sentences[doubt + 1]?.startsAt ?? passage.total) +
      passage.sentences[doubt].startsAt
    : passage.total;
  const listening = is === 'removed';

  const name = nostory ? nameOf(nested.name, lang) : stop.name[lang];
  const head = pageHead({
    lead: kindTile(nostory ? nested.kind : stop.kind),
    kicker: nostory
      ? `${c.dossier} · ${nested.osm} · Wikidata ${nested.wikidata}`
      : `${c.dossier} · ${k.queue.items[1].qid} · ${c.revisionOf(day(k.today, lang))}`,
    title: name,
    tags: `${
      verified
        ? tag(c.verifiedBy(me.name), { is: 'ok', icon: icons.shield })
        : tag(c.dossierIs.draft, { is: 'quiet', icon: icons.edit })
    }${tag(`${c.sensitivity}: ${c.sensitive[nostory ? 'war' : 'religion'].toLowerCase()}`, { is: 'warn' })}${nostory ? '' : tag(c.keyPlace, { is: 'quiet', icon: icons.key })}`,
    actions: `${button(c.history, { kind: 'quiet', icon: icons.history })}${
      verified
        ? button(c.unverify, { kind: 'second' })
        : button(c.markVerified, {
            kind: is === 'corrected' ? 'second' : 'main',
            icon: icons.shield,
            disabled: nostory,
          })
    }`,
  });

  const left = nostory
    ? pane({
        title: c.facts,
        note: c.factsNone,
        body: empty({
          icon: icons.dossier,
          title: c.noFacts,
          text: c.noFactsNote,
          actions: `${button(c.addFact, { icon: icons.plus })}${button(c.prepareAgain, { kind: 'quiet', icon: icons.reload })}`,
        }),
      })
    : pane({
        title: c.facts,
        note: c.factsNote(removed ? items.length - 1 : items.length),
        tools: button(c.addFact, { icon: icons.plus }),
        is: 'flush',
        body: facts(items),
      });

  const checks = checklist([
    { is: 'ok', lead: c.checkSources, rest: c.checkSourcesRest(told.length) },
    {
      is: 'ok',
      lead: c.checkStatements,
      rest: c.checkStatementsRest(
        sample.statements_checked.entailment - (removed ? 1 : 0),
        sample.statements_checked.judge,
      ),
    },
    verified
      ? { is: 'ok', lead: c.checkVoiceDone, rest: c.checkVoiceDoneRest }
      : {
          is: 'warn',
          lead: c.checkVoice,
          rest: c.checkVoiceRest,
          tool: button(c.navPronunciation, { kind: 'quiet', icon: icons.speaker }),
        },
    verified
      ? { is: 'ok', lead: c.checkOpen, rest: c.checkOpenRest }
      : { is: 'info', lead: c.checkSensitive, rest: c.checkSensitiveRest },
  ]);

  const right = nostory
    ? pane({
        title: c.storyPreview,
        note: c.storyPreviewNote,
        body: empty({
          icon: icons.lock,
          title: c.noStory,
          text: c.noStoryNote,
        }),
      })
    : pane({
        title: c.storyPreview,
        note: c.storyPreviewNote,
        tools: `${button(c.regenStory, { kind: 'second', icon: icons.reload, busy: false })}`,
        is: 'flush',
        body: `${tabs(
          c.storyForms,
          [{ label: c.formPlace }, { label: c.formMore, count: 2 }, { label: c.formBridge }],
          0,
        )}${padded(
          `${
            is === 'fixed'
              ? `${block('', notice({ is: 'ok', lead: c.regenDone }))}`
              : listening
                ? `${block('', notice({ is: 'ok', lead: c.regenWithout(doubt + 1), rest: '' }))}`
                : ''
          }${block(c.textIn(c.languages[lang]), story(told, lang), {
            tools: `${tag(c.madeAuto, { is: 'info' })}${
              verified
                ? tag(c.storyVerified, { is: 'ok', icon: icons.shield })
                : tag(c.storyNotVerified, { is: 'quiet' })
            }`,
          })}${block(
            '',
            audio({
              title: c.narrationIn(c.languages[lang]),
              seconds,
              played: listening ? 0.38 : 0,
              playing: listening,
              say: listening ? c.pause : c.play,
              seed: removed ? 3 : 0,
              tags: tag(c.transcriptOk, { is: 'ok' }),
              tools: iconButton(icons.reload, c.regenNarration),
            }),
          )}${block(c.beforeVerify, checks)}`,
        )}`,
      });

  return frame(ctx, {
    at: 'queue',
    crumbs: [c.navDossiers, name],
    body: `${head}${split([left, right], '680px minmax(0, 1fr)')}`,
    path: `dossiers/${nostory ? nested.wikidata : k.queue.items[1].qid}`,
  });
}

// ── The pronunciation editor ────────────────────────────────────────────────

/** @param {Ctx} ctx */
function pronunciation(ctx) {
  const { lang, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console.pronunciation;
  const fixed = is === 'fixed';
  const unknown = is === 'unknown';
  const entries = k.entries.map((/** @type {any} */ e) =>
    fixed && e.status === 'mismatch' ? { ...e, status: 'confirmed' } : e,
  );
  const chosen = unknown
    ? entries.find((/** @type {any} */ e) => e.status === 'unknown')
    : entries[0];
  const attention = entries.filter((/** @type {any} */ e) =>
    ['mismatch', 'unknown', 'listen'].includes(e.status),
  ).length;
  /** @type {Record<string, { is: 'ok' | 'warn' | 'stop' | 'quiet' | 'info', icon?: string }>} */
  const tone = {
    mismatch: { is: 'stop' },
    unknown: { is: 'warn' },
    listen: { is: 'info', icon: icons.headphones },
    source: { is: 'quiet', icon: icons.book },
    confirmed: { is: 'ok' },
  };
  /** The word as it is said: with the stress where one is known. @param {any} e */
  const said = (e) => (e.lang === 'en' ? e.text : accented(e.stressed ?? capital(e.word)));

  const rows = entries.map((/** @type {any} */ e) => ({
    is: /** @type {'chosen' | undefined} */ (e === chosen ? 'chosen' : undefined),
    cells: [
      nameCell({ name: said(e), note: e.lang === 'en' ? c.readingAsWritten : e.text }),
      c.languageCodes[e.lang],
      e.stressed
        ? quiet(c.fromLead(e.lead_title))
        : quiet(e.lang === 'en' ? c.noReading : c.noStressInSources),
      tag(c.wordIs[e.status], tone[e.status]),
      iconButton(icons.play, `${c.play}: ${e.text}`),
    ],
  }));
  const board = table({
    name: c.dictionary,
    columns: [
      { label: c.word, sort: 'none' },
      { label: c.language, width: '72px' },
      { label: c.stressFrom, width: '220px' },
      { label: c.status, sort: 'none', width: '228px' },
      { label: '', say: c.play, width: '52px', end: true },
    ],
    rows,
  });

  const wrong = !fixed && !unknown;
  const word = unknown ? capital(chosen.word) : wrong ? chosen.guess : chosen.stressed;
  const letter = (/** @type {string} */ l, /** @type {number} */ n) => c.stressOn(l, n);
  const seconds = Math.max(1, chosen.text.length / 15);
  const editor = pane({
    title: capital(chosen.word),
    note: `${chosen.text} · ${c.languages[chosen.lang]}`,
    tools: tag(c.wordIs[chosen.status], tone[chosen.status]),
    is: 'quiet',
    body: `${block(
      c.stress,
      `${stress({ name: `${c.stress}: ${chosen.word}`, word, say: letter })}${
        unknown
          ? notice({ is: 'warn', lead: c.stressUnknown, rest: c.stressUnknownRest })
          : wrong
            ? notice({
                is: 'stop',
                lead: c.stressDiffers,
                rest: c.stressDiffersRest(accented(chosen.stressed), chosen.lead_title),
                tools: button(c.takeFromSource, { kind: 'second' }),
              })
            : notice({ is: 'ok', lead: c.stressSet, rest: c.stressSetRest(chosen.lead_title) })
      }`,
      { note: c.stressHint },
    )}${
      unknown
        ? ''
        : block(
            c.change,
            diff({
              old: accented(chosen.guess),
              next: accented(chosen.stressed),
              oldNote: c.voiceGuess,
              nextNote: fixed ? c.setByCurator : c.inSource,
              say: { old: c.was, next: fixed ? c.now : c.proposed },
            }),
          )
    }${block(
      c.listen,
      `${audio({
        title: unknown ? c.audioGuess : c.audioBefore,
        note: chosen.text,
        seconds,
        say: c.play,
        seed: 1,
        tags: unknown ? tag(c.byGuess, { is: 'warn' }) : tag(c.transcriptDiffers, { is: 'stop' }),
      })}${
        fixed
          ? audio({
              title: c.audioAfter,
              note: chosen.text,
              seconds,
              played: 0.6,
              playing: true,
              say: c.pause,
              seed: 5,
              tags: tag(c.transcriptOk, { is: 'ok' }),
            })
          : ''
      }`,
      { note: c.listenNote },
    )}${block(
      c.usedIn,
      fixed
        ? notice({
            is: 'ok',
            lead: c.narrationsRedone(chosen.narrations),
            rest: c.narrationsRedoneRest,
          })
        : text(
            unknown
              ? c.usedInStory(data.stops[data.console.dossier.stop_order - 1].name[lang])
              : c.narrationsWill(chosen.narrations),
          ),
    )}`,
    foot: fixed
      ? `${text(c.savedBy(who(data, lang).name))}${button(c.undo, { kind: 'quiet', icon: icons.undo })}`
      : `${text(c.saveNote)}${button(c.saveAndRedo, { kind: 'main', disabled: unknown })}`,
  });

  const body = `${pageHead({
    title: c.navPronunciation,
    note: c.pronunciationNote,
    actions: button(c.addWord, { icon: icons.plus }),
  })}${filters({
    name: c.filter,
    search: { name: c.findWord, hint: c.findWord },
    chips: [
      { label: c.all, on: true, count: entries.length },
      { label: c.needAttention, on: false, count: attention },
      { label: c.languages.ru, on: false },
      { label: c.languages.en, on: false },
    ],
    summary: c.dictionarySource,
  })}${split([pane({ is: 'flush', body: board }), editor], 'minmax(0, 1fr) 460px')}`;
  return frame(ctx, {
    at: 'pronunciation',
    crumbs: [c.navPronunciation],
    body,
    path: 'pronunciation',
  });
}

/** @param {string} word */
const capital = (word) => word.slice(0, 1).toUpperCase() + word.slice(1);

// ── The Corrections inbox ───────────────────────────────────────────────────

/** @param {Ctx} ctx */
function corrections(ctx) {
  const { lang, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console;
  const fixed = is === 'fixed';
  const passage = data.outingNow.story[lang];
  const stop = data.stops[k.dossier.stop_order - 1];
  const all = k.corrections.items.map((/** @type {any} */ item, /** @type {number} */ i) =>
    fixed && i === 0 ? { ...item, status: 'accepted' } : item,
  );
  /** @param {any} item */
  const sentenceOf = (item) =>
    passage.sentences[item.sentence === 'playing' ? passage.current : item.sentence[lang]];
  /** @param {any} item */
  const change = (item) => k.changes.items.find((/** @type {any} */ x) => x.osm === item.osm);
  /** @type {Record<string, { is: 'ok' | 'warn' | 'stop' | 'quiet' | 'info', icon?: string }>} */
  const tone = {
    new: { is: 'warn', icon: icons.flag },
    in_work: { is: 'info', icon: icons.clock },
    accepted: { is: 'ok' },
    declined: { is: 'quiet', icon: icons.close },
  };
  const openCount = all.filter((/** @type {any} */ i) => i.status === 'new').length;
  const inWork = all.filter((/** @type {any} */ i) => i.status === 'in_work').length;

  const rows = all.map((/** @type {any} */ item, /** @type {number} */ i) =>
    listItem({
      lead: kindTile(item.about_what === 'statement' ? stop.kind : change(item).kind),
      title:
        item.about_what === 'statement' ? c.correctionKinds[item.kind] : c.placeKinds[item.kind],
      note: `${item.about_what === 'statement' ? stop.name[lang] : change(item).name} · ${item.id}`,
      at: `${day(item.sent, lang)}`,
      tags: `${tag(c.correctionIs[item.status], tone[item.status])}${tag(item.about_what === 'statement' ? c.aboutStatement : c.aboutPlace)}`,
      chosen: i === 0,
    }),
  );

  const first = all[0];
  const sentence = sentenceOf(first);
  const n = passage.sentences.indexOf(sentence) + 1;
  const steps = [c.stepFact, c.stepStory, c.stepNarration, c.stepAuthor].map((label, i) => ({
    label,
    value: fixed ? c.done : i === 0 ? c.waitsForYou : '',
    share: fixed ? 1 : 0,
    is: /** @type {'done' | 'now' | 'wait'} */ (fixed ? 'done' : i === 0 ? 'now' : 'wait'),
  }));
  const detail = pane({
    title: `${c.correctionKinds[first.kind]} · ${first.id}`,
    note: `${stop.name[lang]} · ${c.storyIn(c.languages[lang])}`,
    tools: tag(c.correctionIs[first.status], tone[first.status]),
    body: `${stack(
      [
        block(c.statement, source(lang, { quote: sentence.text, source: passage.source })),
        `${column(
          block(
            c.claim,
            details([
              { label: c.claimKind, value: c.correctionKinds[first.kind] },
              { label: c.claimNote, value: '—' },
              { label: c.claimFrom, value: c.fromWhom[first.from] },
              { label: c.claimAt, value: `${day(first.sent, lang)}, ${first.at}` },
              {
                label: c.factBehind,
                value: `${c.factOf(n, passage.sentences.length)}${fixed ? ` · ${c.factFixedShort}` : ''}`,
              },
            ]),
          ),
        )}`,
      ],
      'minmax(0, 1fr) 320px',
      'columns',
    )}${block(
      c.inStory,
      story(
        passage.sentences.map((/** @type {any} */ s) => ({
          text: s.text,
          is: s === sentence ? 'picked' : '',
        })),
        lang,
      ),
      { note: c.inStoryNote },
    )}${block(c.whatFollows, run(steps), { note: c.whatFollowsNote })}${
      fixed ? `${block('', notice({ is: 'ok', lead: c.authorTold, rest: c.authorToldRest }))}` : ''
    }`,
    foot: fixed
      ? `${text(c.closedBy(who(data, lang).name))}${button(c.openDossier, { icon: icons.dossier })}`
      : `${text(c.correctionHint)}${button(c.decline, { kind: 'danger' })}${button(c.openFact, { kind: 'main', icon: icons.dossier })}`,
  });

  const head = pageHead({
    title: c.navCorrections,
    note: c.correctionsNote,
    actions: seg(
      c.status,
      [
        { label: c.correctionTabs.new, count: is === 'empty' ? 0 : openCount },
        { label: c.correctionTabs.in_work, count: is === 'empty' ? 0 : inWork },
        {
          label: c.correctionTabs.closed,
          count: is === 'empty' ? 0 : all.length - openCount - inWork,
        },
        { label: c.all },
      ],
      is === 'empty' ? 0 : 3,
    ),
  });
  const body =
    is === 'empty'
      ? `${head}${split(
          [
            empty({
              icon: icons.flag,
              title: c.noCorrections,
              text: c.noCorrectionsNote,
            }),
          ],
          'minmax(0, 1fr)',
        )}`
      : `${head}${split(
          [pane({ is: 'flush', body: list(c.navCorrections, rows) }), detail],
          '400px minmax(0, 1fr)',
        )}`;
  return frame(ctx, {
    at: 'corrections',
    crumbs: [c.navCorrections],
    body,
    path: 'corrections',
    counts: { corrections: is === 'empty' ? 0 : openCount },
  });
}

// ── Preparation ─────────────────────────────────────────────────────────────

/** @param {Ctx} ctx */
function preparation(ctx) {
  const { lang, theme, data, state: is } = ctx;
  const c = words(lang);
  const k = data.console;
  const p = k.preparation;
  const r = p.run;
  const me = who(data, lang, r.by);
  const start = is === 'start';
  const failed = is === 'failed';
  const budget = is === 'budget';
  const over = failed || budget;

  const starter = pane({
    title: c.newRun,
    note: c.newRunNote,
    is: 'quiet',
    body: `${seg(c.scope, [{ label: c.scopeCity }, { label: c.scopeArea }, { label: c.scopeList }], 1)}${form(
      [
        formRow({ label: c.city, control: select({ name: c.city, value: k.city.name[lang] }) }),
        formRow({ label: c.area, control: select({ name: c.area, value: k.city.area[lang] }) }),
      ],
    )}${block(
      '',
      fixed(
        mapPane({
          map: workMap(data, {
            lang,
            theme,
            width: 348,
            height: 188,
            label: `${c.area}: ${k.city.area[lang]}`,
            boundary: p.area.boundary,
            handles: false,
            margin: 14,
            labels: 0,
          }),
          credit: c.osm,
        }),
        188,
      ),
    )}${block(
      c.estimate,
      details([
        { label: c.placesInArea, value: count(p.area.candidate_places, lang) },
        { label: c.keyPlaces, value: count(r.places_total, lang) },
        { label: c.alreadyPrepared, value: c.notAgain(r.already_prepared) },
        { label: c.toPrepare, value: strong(count(r.to_prepare, lang)) },
        {
          label: c.costEstimate,
          value: c.costOfBudget(money(r.cost.estimate, lang), money(r.cost.budget, lang)),
        },
      ]),
    )}`,
    foot:
      start || failed
        ? `${text(c.runLimit(k.admin.limits.places_a_run))}${button(c.startPreparation, { kind: start ? 'main' : 'second', icon: icons.download })}`
        : `${text(c.runGoing(r.number))}${button(c.startPreparation, { icon: icons.download, disabled: true })}`,
  });

  const done = failed ? r.to_prepare - r.failed : r.done;
  const spent = failed ? r.cost.estimate - 0.08 : r.cost.spent;
  const share = done / r.to_prepare;
  const shown = r.steps.map((/** @type {any} */ s, /** @type {number} */ i) => {
    const n = failed ? r.to_prepare - (i >= 1 ? 1 : 0) - (i >= 4 ? 1 : 0) : s.done;
    const stuck = budget && i === 4;
    return {
      label: c.steps[s.id],
      value: `${n} / ${r.to_prepare}`,
      share: n / r.to_prepare,
      is: /** @type {'done' | 'now' | 'wait' | 'failed'} */ (
        stuck
          ? 'failed'
          : failed
            ? i === 1 || i === 4
              ? 'failed'
              : 'done'
            : n === r.to_prepare
              ? 'done'
              : budget && i > 4
                ? 'wait'
                : 'now'
      ),
      note: stuck
        ? c.stepBudget
        : failed && i === 1
          ? c.stepFailed(1)
          : failed && i === 4
            ? c.stepFailed(1)
            : '',
    };
  });

  /** @type {Record<string, { is: 'ok' | 'warn' | 'stop' | 'quiet' | 'info', icon?: string }>} */
  const tone = {
    done: { is: 'ok' },
    running: { is: 'info', icon: icons.reload },
    waiting: { is: 'quiet', icon: icons.clock },
    failed: { is: 'stop' },
    held: { is: 'warn', icon: icons.pause },
  };
  const ORDER = r.parts_order;
  /** A sum of a table: a dash where nothing was spent. @param {number} value */
  const sum = (value) => (value ? num(money(value, lang, 3)) : quiet('—'));
  const rows = r.rows.map((/** @type {any} */ row) => {
    const stateOf = failed
      ? row.state === 'failed'
        ? 'failed'
        : 'done'
      : budget && row.state !== 'done' && row.state !== 'failed'
        ? 'held'
        : row.state;
    const step = failed && stateOf === 'done' ? 'transcribe' : row.step;
    const place = data.stops[row.stop_order - 1];
    /** @type {number[]} */
    const spentOn = failed && stateOf === 'done' ? (row.final ?? row.parts) : row.parts;
    return {
      is: /** @type {'stop' | undefined} */ (stateOf === 'failed' ? 'stop' : undefined),
      cells: [
        nameCell({
          lead: kindTile(place.kind),
          name: place.name[lang],
          note: stateOf === 'failed' ? c.failReasons[row.reason] : '',
        }),
        c.steps[step],
        tag(c.rowIs[stateOf], tone[stateOf]),
        ...spentOn.map(sum),
        sum(spentOn.reduce((a, b) => a + b, 0)),
        stateOf === 'failed' ? iconButton(icons.reload, `${c.retry}: ${place.name[lang]}`) : '',
      ],
    };
  });
  // Finished, the run has spent in the proportions it was spending in.
  const parts = Object.fromEntries(
    ORDER.map((/** @type {string} */ id) => [id, (r.cost.components[id] * spent) / r.cost.spent]),
  );
  const runPane = pane({
    title: c.runTitle(r.number),
    note: c.runBy(r.started, me.name, k.city.area[lang]),
    tools: failed
      ? button(c.resume, { kind: 'main', icon: icons.reload })
      : budget
        ? button(c.openBudgets, { kind: 'main', icon: icons.coin })
        : button(c.pauseRun, { icon: icons.pause }),
    is: 'flush',
    body: `${padded(
      `${
        failed
          ? notice({ is: 'stop', lead: c.runFailedLead(r.failed), rest: c.runFailedRest })
          : budget
            ? notice({ is: 'stop', lead: c.budgetLead, rest: c.budgetRest })
            : ''
      }${block(
        '',
        figures([
          { value: String(done), unit: c.of(r.to_prepare), label: c.prepared },
          {
            value: String(failed ? 0 : budget ? 0 : r.running),
            label: c.inWork,
            note: budget ? c.onHold : '',
            is: budget ? 'warn' : undefined,
          },
          {
            value: String(r.failed),
            label: c.failures,
            is: 'stop',
            note: c.othersGoOn,
          },
          {
            value: money(spent, lang),
            unit: c.ofBudget(money(r.cost.budget, lang)),
            label: c.cost,
          },
          {
            value: money(r.cost.per_place, lang, 3),
            unit: c.ofBudget(money(r.cost.per_place_budget, lang)),
            label: c.costPerPlace,
            is: 'ok',
            note: c.withinBudget,
          },
        ]),
      )}${block(
        '',
        meter({
          name: c.progress,
          share,
          lead: percent(share, lang),
          rest: failed ? c.runStopped : budget ? c.runWaits : c.runLeft(r.to_prepare - done),
          is: over ? 'stop' : 'ok',
          parts: [
            { share, is: 'ok' },
            { share: r.failed / r.to_prepare, is: 'stop' },
          ],
        }),
      )}${block(c.stepsTitle, run(shown), { note: c.stepsNote })}`,
    )}${table({
      name: c.placesOfRun,
      columns: [
        { label: c.place },
        { label: c.step, width: '112px' },
        { label: c.status, width: '128px' },
        ...ORDER.map((/** @type {string} */ id) => ({
          label: c.costShort[id],
          end: true,
          width: '72px',
        })),
        { label: c.total, end: true, sort: /** @type {const} */ ('none'), width: '84px' },
        { label: '', say: c.retry, width: '56px', end: true },
      ],
      rows: rows.slice(0, failed || budget ? 6 : 7),
      foot: {
        label: c.runTotal(done),
        span: 3,
        cells: [
          ...ORDER.map((/** @type {string} */ id) => num(money(parts[id], lang))),
          num(money(spent, lang)),
          '',
        ],
      },
    })}`,
  });

  const body = `${pageHead({ title: c.navPreparation, note: c.preparationNote })}${split(
    [
      starter,
      start
        ? pane({
            title: c.runs,
            note: c.runsNote,
            body: empty({ icon: icons.download, title: c.noRun, text: c.noRunNote }),
          })
        : runPane,
    ],
    '380px minmax(0, 1fr)',
  )}`;
  return frame(ctx, { at: 'preparation', crumbs: [c.navPreparation], body, path: 'preparation' });
}

export const knowledge = { queue, dossier, pronunciation, corrections, preparation };
