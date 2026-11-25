/**
 * The chosen direction: Timetable, with the guide of Guidebook.
 *
 * Two voices share a screen and are told apart by type and by material. What
 * the timetable says — times, the verdict, the line, the controls — is set in
 * a sans and in numerals, on glass over a map that fills the screen. What the
 * guide says — why a Place is here, the Story, its source — is set in a
 * serif, on a solid page under a photograph of the Place.
 *
 * Since `D-02` these two screens are made of the components of the design
 * system (`design/system/`); this file only arranges them.
 */
import { SIZES } from '../shared/frames.js';
import { icons, platformIcon } from '../../system/icons.js';
import { back, group, round, titlePill } from '../../system/parts/controls.js';
import { layersOf, overlay, planMap, routePoints, walkMap } from '../../system/parts/map.js';
import { fitView, mapSvg, routeSamples } from '../shared/map.js';
import { board, chart, dock, head } from '../../system/parts/route.js';
import { sheet as sheetOf } from '../../system/parts/sheets.js';
import { follow, guide, player, settle } from '../../system/parts/story.js';
import { T } from '../../system/strings.js';

/** @typedef {{ os: import('../shared/frames.js').Os, theme: 'light' | 'dark' | 'sun', lang: 'ru' | 'en', data: any }} Ctx */

/** @param {Ctx} ctx */
function route({ os, theme, lang, data }) {
  const t = T[lang];
  const { width, height } = SIZES[os];
  const sheetTop = os === 'android' ? 352 : 362;
  const map = planMap(data, {
    lang,
    theme,
    width,
    height,
    padding: { top: 116, right: 34, bottom: height - sheetTop + 30, left: 34 },
  });
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="tt tt-route">
      <div class="tt-under">${map}<span class="tt-osm" style="top:${sheetTop - 22}px">© OpenStreetMap</span></div>
      <header class="tt-top">
        ${back(os, t.say.back)}
        ${titlePill(t.kicker, t.checked(data.route.checkedAt))}
        ${group([
          [icons.edit, t.say.edit],
          [platformIcon('share', os), t.say.share],
        ])}
      </header>
      ${sheetOf(`${head(data, lang)}${chart(data, lang, { scale: 6, until: 44 })}`, { lang, top: sheetTop })}
      ${dock(data, lang)}
    </div>`,
  };
}

/** @param {Ctx} ctx */
function outing({ os, theme, lang, data }) {
  const t = T[lang];
  const { width } = SIZES[os];
  const now = data.outingNow;
  const map = walkMap(data, {
    lang,
    theme,
    width,
    height: 304,
    // A few steps before the Place: the Story has begun on the approach.
    minute: now.stop.arriveMin - 0.6,
    walkedLegs: now.stop.order - 1,
    pins: [now.stop, now.next],
  });
  return {
    clock: now.clock,
    inner: `<div class="tt tt-outing">
      <div class="tt-under">${map}</div>
      <header class="tt-top">
        ${back(os, t.say.back)}
        ${board(data, lang, now.stop.arriveMin + 1)}
        ${round(platformIcon('more', os), t.say.more)}
      </header>
      <span class="tt-osm tt-osm-outing">© OpenStreetMap</span>
      ${guide(data, lang, { theme, width })}
      ${player(data, lang)}
    </div>`,
  };
}

// ── The web ─────────────────────────────────────────────────────────────────

/** @param {'ru' | 'en'} lang */
const webNav = (lang) => `<nav class="tt-webnav lg">
    <span class="tt-wordmark">Promenade</span>
    <span class="tt-langs"><b>${lang === 'ru' ? 'Рус' : 'Eng'}</b>${lang === 'ru' ? 'Eng' : 'Рус'}</span>
    <button class="tt-action lg lg-tint">${T[lang].open}</button>
  </nav>`;

/** @param {Ctx} ctx */
function webRoute({ theme, lang, data }) {
  const t = T[lang];
  const size = SIZES.web;
  const view = fitView(routePoints(data), size.width, size.height - 44, {
    top: 96,
    right: 90,
    bottom: 70,
    left: 530,
  });
  const map = mapSvg(data, {
    view,
    lang,
    layers: layersOf(theme),
    labels: { max: 12, size: 11, clearOf: routeSamples(data) },
    over: (ctx) => overlay(data, lang, ctx),
    label: t.theLine,
  });
  return {
    clock: data.route.nowBeforeStart,
    address: 'promenade.example/r/early-20th-century',
    inner: `<div class="tt tt-web tt-web-route">
      <div class="tt-under">${map}<span class="tt-osm">© OpenStreetMap</span></div>
      ${webNav(lang)}
      <section class="tt-sheet lg">
        <p class="tt-kicker">${t.kicker} · ${t.checked(data.route.checkedAt)}</p>
        ${head(data, lang)}
        ${chart(data, lang, { scale: 6, until: 64 })}
      </section>
      <p class="tt-webnote lg">${t.webNote}</p>
    </div>`,
  };
}

/** @param {Ctx} ctx */
function webOuting({ theme, lang, data }) {
  const t = T[lang];
  const size = SIZES.web;
  const now = data.outingNow;
  const around = data.stops.filter((/** @type {any} */ s) => s.order <= 6);
  const view = fitView(
    around.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
    size.width,
    size.height - 44,
    { top: 110, right: 340, bottom: 250, left: 550 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: layersOf(theme),
    labels: { max: 6, size: 11, clearOf: routeSamples(data) },
    over: (ctx) => overlay(data, lang, ctx, { current: now.stop.order }),
    label: now.stop.name[lang],
  });
  return {
    clock: now.clock,
    address: 'promenade.example/r/early-20th-century/2',
    inner: `<div class="tt tt-web tt-web-outing">
      <div class="tt-under">${map}<span class="tt-osm">© OpenStreetMap</span></div>
      ${webNav(lang)}
      ${guide(data, lang, { from: 0, theme, width: 490 })}
      ${player(data, lang)}
      <section class="tt-webchart lg">${chart(data, lang, { scale: 3.5, compact: true, selected: now.stop.order })}</section>
      <p class="tt-webnote lg">${t.webNote}</p>
    </div>`,
  };
}

/** A piece of the map, for the sheet of the direction. */
function sample(
  /** @type {any} */ data,
  /** @type {'ru' | 'en'} */ lang,
  /** @type {{ width: number, height: number, theme?: 'light' | 'dark' | 'sun' }} */ {
    width,
    height,
    theme = 'light',
  },
) {
  return planMap(data, {
    lang,
    theme,
    width,
    height,
    padding: { top: 44, right: 60, bottom: 44, left: 60 },
    labels: 6,
  });
}
const sheet = {
  reason: [
    'The first thing a person asks of this product is a question about time: will I be back for my train, will the place still be open. The product’s first promise is that the answer has been checked (PRODUCT-SPEC §1.3, RTE-6). Railways built the visual language of time one can trust — the timetable, and the line with its stations — and the base of this direction speaks it: the Route is a chart drawn to time, and green means “on time”.',
    'The second promise is a guide whose facts have sources (KNW-16). Guidebook, the other direction of round two, said that best: a photograph of the Place, the Story as a page of prose, the source at its foot. After round two the owner asked for the two together — Timetable as the base, the guide from Guidebook.',
    'So two voices share the screen and are told apart by type. What the timetable says — times, the verdict, the line, the controls — is set in a sans and in numerals, on Liquid Glass over a map that fills the screen. What the guide says — why a Place is on the Route, the Story, where it comes from — is set in a serif, on a solid page under the photograph. A person learns the rule in one screen: glass and sans are the way; paper and serif are the city.',
  ],
  roots: [
    {
      what: 'The timetable chart.',
      lesson:
        'In the 1840s the railway engineer Charles Ibry drew a chart of time against stations to plan the trains of the Paris–Le Havre line. The chart of the Route puts one walk on the same kind of paper.',
      source: 'Wikipedia, “Charles Ibry”',
      url: 'https://en.wikipedia.org/w/index.php?oldid=1384277910',
    },
    {
      what: 'The printed guide.',
      lesson:
        'Baedeker’s guides carried maps, routes and descriptions of noteworthy buildings written by specialists. Taken from there, by way of Guidebook: the Story is a page to read, and it names its source at the foot.',
      source: 'Wikipedia, “Baedeker”',
      url: 'https://en.wikipedia.org/w/index.php?oldid=1386387435',
    },
    {
      what: 'Glass where Apple puts it.',
      lesson:
        'Apple describes Liquid Glass as the layer of controls and navigation that floats above content, and says not to use it for content itself. That is exactly the line between the two voices: the timetable is on glass, the guide’s page is solid.',
      source: 'Apple, Human Interface Guidelines: Materials',
      url: 'https://developer.apple.com/design/human-interface-guidelines/materials',
    },
    {
      what: 'Text that follows the voice.',
      lesson:
        'Apple’s transcripts of podcasts are synchronised with the audio, and a tap on the text plays from there. Here a rule stands beside the sentence being spoken and its words are lit as they are said.',
      source: 'Apple Support, transcripts in Apple Podcasts',
      url: 'https://support.apple.com/en-us/127831',
    },
    {
      what: 'The material exists in the chosen stack.',
      lesson:
        'In Expo SDK 58 the package expo-glass-effect draws the system’s glass on iOS 26 and later and falls back to a plain view everywhere else — which is the decision taken for Android.',
      source: 'Expo, expo-glass-effect',
      url: 'https://github.com/expo/expo/blob/main/packages/expo-glass-effect/README.md',
    },
  ],
  typeNote:
    'Three faces, one for each kind of saying. Unbounded, wide and round, sets what is a number: the two times that frame the Outing, the number of a Place. Onest sets what the timetable says in words: names in the chart, the verdict, labels, controls. Source Serif 4 sets what the guide says: the name of the Place on its page, the Story, the “why” of a Place in italic, the footnote. All three carry Cyrillic and the Belarusian Latin letters, and all are under the SIL Open Font License 1.1.',
  type: [
    {
      role: 'The timetable: numbers',
      face: 'Unbounded 600–700',
      css: "font: 700 54px/1.05 'Unbounded'; font-variant-numeric: tabular-nums; letter-spacing: -0.02em",
      ru: '14:00 — 16:45',
      en: '14:00 — 16:45',
    },
    {
      role: 'The timetable: words',
      face: 'Onest 500–700',
      css: "font: 650 22px/1.2 'Onest'; letter-spacing: -0.012em",
      ru: 'Укладывается в 3 ч · запас 15 мин · по графику · Poliakaŭ',
      en: 'Fits your 3 h · 15 min to spare · on time · Poliakaŭ',
    },
    {
      role: 'The guide: a name',
      face: 'Source Serif 4, 600, drawn for its size',
      css: "font: 600 34px/1.1 'Source Serif 4'; letter-spacing: -0.012em",
      ru: 'Костёл Святого Симеона и Святой Елены',
      en: 'Church of Saints Simon and Helena',
    },
    {
      role: 'The guide: the Story',
      face: 'Source Serif 4, 400, 17.5 on 25',
      css: "font: 400 18px/1.42 'Source Serif 4'",
      ru: 'Храм был целиком построен из красного кирпича, что принесло ему народное прозвище «Красный костёл».',
      en: 'The bricks for its walls were sourced from Częstochowa, while the roof tiles came from Włocławek.',
    },
    {
      role: 'The guide: in passing',
      face: 'Source Serif 4 Italic',
      css: "font: italic 400 15px/1.4 'Source Serif 4'",
      ru: '1910 год — эпоха из вашего пожелания · охраняется как наследие',
      en: '1910 — the period you asked for · heritage-listed',
    },
  ],
  colourNote:
    'Glass has no colour of its own: it takes it from the map beneath, so the map carries the palette — cool ground, white streets, soft green and blue — and the photographs carry the rest. One colour is ours: green, the verdict “on time”, which is therefore the colour of the line, of the person, of “now”, of the mark beside the sentence being spoken, and of the one prominent action. Amber will say a warning and red a broken constraint. The guide’s page is a solid surface, so its contrast is plain arithmetic; the contrast of text on glass is measured against the glass as a solid, and with “reduce transparency” the glass turns solid.',
  colours: [
    { token: '--surface', role: 'Page, and glass as a solid' },
    { token: '--ink', role: 'Ink' },
    { token: '--ink-2', role: 'Second ink' },
    { token: '--accent', role: 'On time' },
    { token: '--accent-ink', role: 'On time, as text' },
    { token: '--warn', role: 'Warning' },
    { token: '--stop', role: 'Broken' },
    { token: '--m-ground', role: 'Map: ground' },
    { token: '--m-building', role: 'Map: built' },
    { token: '--m-green', role: 'Map: green' },
    { token: '--m-water', role: 'Map: water' },
  ],
  pairs: [
    { text: '--ink', on: '--surface', what: 'Ink on the page' },
    { text: '--ink-2', on: '--surface', what: 'Second ink on the page' },
    { text: '--accent-ink', on: '--surface', what: '“On time” as text' },
    { text: '--on-accent', on: '--accent', what: 'Label on the green action' },
    { text: '--warn', on: '--surface', what: 'A warning' },
    { text: '--stop', on: '--surface', what: 'A broken constraint' },
    { text: '--line', on: '--m-ground', what: 'The line on the map', large: true },
  ],
  mapNote:
    'The map is the content, and it fills the screen. On the Route it is seen from above: cool ground, white streets of their true width, buildings as a quiet tone, and over them the line — green, with a white casing and a soft glow — its stations as discs and the clock written on it at the half-hours. From Guidebook it takes one thing: the footprint of every Place of the Route is tinted, so the map shows the very walls a Story is about. During the Outing the map is seen at an angle, with the direction of travel up: buildings stand, the Place one walks to carries the icon of its kind, the line ahead moves. Pitch, bearing and extruded buildings are things a MapLibre style does (ADR-0008).',
  storyNote:
    'The timetable above, the guide below. At the top, on glass: whether one is on time, and the whole Outing as a strip to scale with “now” as a light on it; under it the tilted map. Then the guide’s page, solid: the photograph of the Place with the name of its author, the name of the Place in a serif, and the Story as continuous prose — a green rule beside the sentence being spoken, its words lit as they are said, the rest in the second ink and still readable, because the text is also for those who cannot hear it (NFR-27). A numeral leads to the source at the foot of the page. The controls float over the page in a capsule of glass: the voice as bars, five keys, the next Place.',
  motion: [
    {
      moment: 'The text follows the voice.',
      how: 'The rule glides to the next sentence in 420 ms; inside the sentence, words light one by one at the pace of speech; the page moves by whole lines.',
    },
    {
      moment: 'Now.',
      how: 'The mark of the person breathes — a ring grows and fades every two seconds; the line ahead moves towards the next Place; the light on the strip creeps to the right; the bar of the voice under the playhead beats.',
    },
    {
      moment: 'Arriving.',
      how: 'The map tilts from above to its walking angle in 600 ms while the guide’s page rises from the bottom edge with the photograph of the Place; the station on the strip lights green.',
    },
    {
      moment: 'The Route recalculated.',
      how: 'The line is redrawn along its new course in one stroke; the chart closes or opens the gap, and the two times of the frame roll to their new values.',
    },
  ],
  platforms: [
    {
      system: 'iOS.',
      how: 'Liquid Glass, the system’s own, for what the timetable says: the sheet of the Route, the board at the top, the round controls, the capsule of the player. The guide’s page is a solid sheet. Controls are 44 points and more.',
    },
    {
      system: 'Android.',
      how: 'The same layout on solid Material 3 surfaces with their own elevation; no blur is imitated. Sheets are attached to the edges, corners are 28 dp, controls are 48 dp and more.',
    },
    {
      system: 'Web.',
      how: 'The map fills the window. The Route is a panel of glass at the left; while listening, the guide’s page takes that place as a solid sheet, the player floats beside it and the chart of the whole Outing stands at the right.',
    },
  ],
  risks: [
    'Glass over a busy map costs legibility in direct sun. The sheets use the regular, more opaque glass; a “bright sunlight” setting that makes them solid belongs in the design system (D-02) and has to be tried outdoors (D-05).',
    'A tilted map with standing buildings under a backdrop blur is the heaviest thing the application will draw. It has to be measured against the battery budget of NFR-7 on a mid-range Android phone before it is promised.',
    'The Story screen carries a great deal: a board, a map, a photograph, a page and a player. On a small phone the page shows five lines of text at a time; the sheet has to open to full height for reading, which D-03 draws.',
    'The guide’s page leans on a photograph. A Place without a free one will exist, and D-02 has to draw that state.',
    'On Android the look is deliberately plainer: solid surfaces.',
  ],
};

export const timetable = {
  id: 'timetable',
  name: { en: 'Timetable with a guide', ru: 'Расписание с гидом' },
  idea: 'Two voices on one screen. The timetable — times, the verdict, the line — speaks in a sans and in numerals, on glass over a map that fills the screen. The guide — why a Place is here, the Story, its source — speaks in a serif, on a solid page under a photograph of the Place.',
  screens: { route, outing },
  web: { route: webRoute, outing: webOuting },
  settle,
  sample,
  follow,
  sheet,
};
