/**
 * Direction 3 — Playbill.
 *
 * An Outing is an event: a time, a place to meet, company. Cities announce
 * events on bills, so the Route is set as one — lines of capitals fitted to
 * the measure, flat colour, a programme — and when a Story begins the whole
 * screen takes the colour, so that arriving can be seen from arm's length.
 */
import { format } from '../shared/data.js';
import { INSETS, SIZES, icons } from '../shared/frames.js';
import { fitView, mapSvg, pinned, positionAt, routePath, spread } from '../shared/map.js';

const T = {
  ru: {
    option: 'Вариант 1 из 3',
    onFoot: 'Пешком',
    noMuseums: 'Без музеев',
    title: 'Архитектура начала XX века',
    places: 'мест',
    checked: (/** @type {string} */ at) => `Проверено в ${at}`,
    fits: (/** @type {any} */ r) =>
      `Укладывается в ${format.duration(r.budgetMinutes, 'ru')}, запас ${format.duration(r.reserveMinutes, 'ru')}`,
    fromTo: 'от вокзала и обратно',
    programme: 'Программа',
    walk: 'идти',
    start: 'Начать прогулку',
    pack: 'Пакет',
    station: 'Вокзал',
    onTime: 'По графику',
    backAt: (/** @type {string} */ at) => `у вокзала в ${at}`,
    outside: 'снаружи',
    source: 'Источник',
    revision: (/** @type {string} */ date) => `версия от ${date}`,
    made: 'Создано автоматически · проверено куратором',
    next: 'Далее',
    open: 'Открыть в приложении',
    webNote:
      'В браузере рассказ включают вручную. По прибытии сам и без сети он звучит в приложении.',
    map: 'Карта',
    guided: 'С гидом',
    today: 'Сегодня',
  },
  en: {
    option: 'Option 1 of 3',
    onFoot: 'On foot',
    noMuseums: 'No museums',
    title: 'Early 20th-century architecture',
    places: 'places',
    checked: (/** @type {string} */ at) => `Checked at ${at}`,
    fits: (/** @type {any} */ r) =>
      `Fits your ${format.duration(r.budgetMinutes, 'en')}, ${format.duration(r.reserveMinutes, 'en')} to spare`,
    fromTo: 'from the station and back',
    programme: 'Programme',
    walk: 'walk',
    start: 'Start the outing',
    pack: 'Pack',
    station: 'Station',
    onTime: 'On time',
    backAt: (/** @type {string} */ at) => `at the station by ${at}`,
    outside: 'outside',
    source: 'Source',
    revision: (/** @type {string} */ date) => `revision of ${date}`,
    made: 'Written automatically · verified by a curator',
    next: 'Next',
    open: 'Open in the app',
    webNote:
      'In a browser you start a story yourself. In the app it begins as you arrive, and plays without a network.',
    map: 'Map',
    guided: 'Guided',
    today: 'Today',
  },
};

const LAYERS = ['green', 'water', 'roads_mid', 'roads_major', 'rail', 'rail:ties'];

/**
 * @param {any} data @param {'ru' | 'en'} lang @param {{ u: number }} ctx
 * @param {{ current?: number, walkedLegs?: number, minute?: number }} state
 */
function overlay(data, lang, { u }, state = {}) {
  const { current = 0, walkedLegs = 0, minute } = state;
  const feet = data.stops
    .map((/** @type {any} */ s) => `<use href="#m-foot-${s.order}" class="pb-foot"/>`)
    .join('');
  const walked =
    walkedLegs > 0 ? `<path class="pb-way-walked" d="${routePath(data, 0, walkedLegs)}"/>` : '';
  const ahead = `<path class="pb-way-case" d="${routePath(data, walkedLegs)}"/><path class="pb-way" d="${routePath(data, walkedLegs)}"/>`;
  const at = spread(
    data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
    25 * u,
  );
  const stops = data.stops
    .map((/** @type {any} */ s, /** @type {number} */ i) =>
      pinned(
        at[i].x,
        at[i].y,
        u,
        `${s.order === current ? '<circle class="pb-ring" r="16"/>' : ''}<circle r="11.5"/><text y="5" text-anchor="middle">${s.order}</text>`,
        `pb-stop${s.order === current ? ' is-current' : ''}${s.order < current ? ' is-done' : ''}`,
      ),
    )
    .join('');
  const label = T[lang].station.toUpperCase();
  const start = pinned(
    data.map.start.street_x,
    data.map.start.street_y,
    u,
    `<rect class="pb-start-mark" x="-7" y="-7" width="14" height="14"/><rect class="pb-start-tag" x="11" y="-9" width="${label.length * 7.4 + 12}" height="18"/><text x="17" y="4.5">${label}</text>`,
    'pb-start',
  );
  let me = '';
  if (minute !== undefined) {
    const p = positionAt(data, minute);
    me = pinned(
      p.x,
      p.y,
      u,
      '<rect class="pb-ring" x="-12" y="-12" width="24" height="24" transform="rotate(45)"/><rect x="-8" y="-8" width="16" height="16" transform="rotate(45)"/>',
      'pb-me',
    );
  }
  return `${feet}${walked}${ahead}${start}${stops}${me}`;
}

/** A block of capitals to be fitted, line by line, to its measure. */
const fitted = (
  /** @type {string} */ text,
  /** @type {number} */ height,
  /** @type {number} */ maxLines,
  /** @type {number} */ maxSize,
  tag = 'h1',
) =>
  `<${tag} class="pb-fit" data-text="${text.replace(/"/g, '&quot;')}" data-height="${height}" data-lines="${maxLines}" data-max="${maxSize}" aria-label="${text.replace(/"/g, '&quot;')}">${text}</${tag}>`;

/** @param {any} data @param {'ru' | 'en'} lang @param {number} limit */
const programme = (data, lang, limit) =>
  data.stops
    .slice(0, limit)
    .map(
      (/** @type {any} */ s) => `<li>
        <b class="pb-no">${s.order}</b>
        <span class="pb-item"><span class="pb-item-name">${s.name[lang]}</span><span class="pb-item-why">${s.why[lang]}</span></span>
        <span class="pb-item-time"><b>${s.arrive}</b><small>${T[lang].walk} ${format.duration(s.legMinutes, lang)}</small></span>
      </li>`,
    )
    .join('');

/** @param {any} data @param {'ru' | 'en'} lang */
const verdictBar = (data, lang) =>
  `<p class="pb-verdict"><i>${icons.check}</i><span><b>${T[lang].fits(data.route)}</b><small>${T[lang].checked(data.route.checkedAt)} · ${T[lang].fromTo}</small></span></p>`;

/** @param {any} data @param {'ru' | 'en'} lang */
const numbers = (data, lang) => {
  const r = data.route;
  const km = format.distance(r.walkingMetres, lang).split(format.NBSP);
  return `<div class="pb-numbers">
    <p class="pb-when"><small>${T[lang].today}</small><b>${r.start}—${r.finish}</b></p>
    <p><b>${r.stopCount}</b><small>${T[lang].places}</small></p>
    <p><b>${km[0]}</b><small>${km[1]}</small></p>
  </div>`;
};

/** @param {{ os: import('../shared/frames.js').Os, lang: 'ru' | 'en', data: any }} ctx */
function route({ os, lang, data }) {
  const t = T[lang];
  const { width } = SIZES[os];
  const inset = INSETS[os];
  const android = os === 'android';
  const mapHeight = android ? 286 : 290;
  const view = fitView(
    [
      ...data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
      { x: data.map.start.street_x, y: data.map.start.street_y },
    ],
    width,
    mapHeight,
    { top: inset.top + 54, right: 34, bottom: 26, left: 34 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: LAYERS,
    over: (ctx) => overlay(data, lang, ctx),
    label: t.title,
  });
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="pb pb-route">
      <div class="pb-map" style="height:${mapHeight}px">
        ${map}
        <div class="pb-float">
          <button class="pb-square" aria-label="Back">${android ? icons.backAndroid : icons.backIos}</button><span></span>
          <button class="pb-square">${icons.edit}</button><button class="pb-square">${android ? icons.shareAndroid : icons.shareIos}</button>
        </div>
        <span class="pb-osm">© OpenStreetMap</span>
      </div>
      <div class="pb-sheet">
        <p class="pb-tags"><span>${t.option}</span><span>${t.onFoot}</span><span>${t.noMuseums}</span></p>
        ${fitted(t.title, 118, 2, 78)}
        ${numbers(data, lang)}
        ${verdictBar(data, lang)}
        <ol class="pb-programme">${programme(data, lang, 3)}</ol>
      </div>
      <div class="pb-actions">
        <button class="pb-pack" aria-label="${t.pack}">${icons.download}<small>${data.route.packMegabytes}${format.NBSP}${lang === 'ru' ? 'МБ' : 'MB'}</small></button>
        <button class="pb-go"><span>${t.start}</span>${icons.arrowRight}</button>
      </div>
    </div>`,
  };
}

/** @param {any} story */
const lines = (story) => {
  const at = (/** @type {number} */ i) => story.sentences[i];
  const before = at(story.current - 1);
  const after = at(story.current + 1);
  return `<div class="pb-said">
    ${before ? `<p class="pb-said-dim pb-said-before">${before.text}</p>` : ''}
    <p class="pb-said-now">${at(story.current).text}<sup>1</sup></p>
    ${after ? `<p class="pb-said-dim pb-said-after">${after.text}</p>` : ''}
  </div>`;
};

/** @param {any} data */
const squares = (data) =>
  `<span class="pb-squares">${data.stops.map((/** @type {any} */ s) => `<i class="${s.order < data.outingNow.stop.order ? 'is-done' : s.order === data.outingNow.stop.order ? 'is-current' : ''}"></i>`).join('')}</span>`;

/** @param {any} data @param {'ru' | 'en'} lang */
function controls(data, lang) {
  const story = data.outingNow.story[lang];
  return `<div class="pb-progress"><span>${format.playback(story.elapsed)}</span><i style="--played:${(story.elapsed / story.total) * 100}%"></i><span>${format.playback(story.total)}</span></div>
    <div class="pb-controls">
      <button class="pb-key" aria-label="Speed">1×</button>
      <button class="pb-key" aria-label="Back 10 seconds">${icons.back10}</button>
      <button class="pb-key pb-key-main" aria-label="Pause">${icons.pause}</button>
      <button class="pb-key" aria-label="Next">${icons.next}</button>
      <button class="pb-key" aria-label="${T[lang].map}">${icons.map}</button>
    </div>`;
}

/** @param {any} data @param {'ru' | 'en'} lang */
const nextBar = (data, lang) => {
  const next = data.outingNow.next;
  return `<p class="pb-next"><span class="pb-next-word">${T[lang].next}</span><b>${next.order}</b><span class="pb-next-name">${next.name[lang]}</span><span class="pb-next-far">${format.distance(next.legMetres, lang)} · ${format.duration(next.legMinutes, lang)}</span></p>`;
};

/** @param {any} story @param {'ru' | 'en'} lang */
const credit = (story, lang) =>
  `<p class="pb-credit"><b>${T[lang].source} <sup>1</sup></b> ${story.source.work}, ${lang === 'ru' ? '«' : '“'}${story.source.article}${lang === 'ru' ? '»' : '”'}, ${T[lang].revision(format.date(story.source.revision_date, lang))}, ${story.source.licence}<br><span>${T[lang].made}</span></p>`;

/** @param {{ os: import('../shared/frames.js').Os, lang: 'ru' | 'en', data: any }} ctx */
function outing({ os, lang, data }) {
  const t = T[lang];
  const android = os === 'android';
  const now = data.outingNow;
  const story = now.story[lang];
  return {
    clock: now.clock,
    inner: `<div class="pb pb-outing">
      <header class="pb-top">
        <button class="pb-square" aria-label="Back">${android ? icons.backAndroid : icons.backIos}</button>
        <p><b>${now.stop.order}<small>/${data.route.stopCount}</small></b>${squares(data)}</p>
        <button class="pb-square" aria-label="${t.map}">${icons.list}</button>
      </header>
      <p class="pb-state"><b>${t.onTime}</b> · ${t.backAt(data.route.finish)}</p>
      ${fitted(now.stop.name[lang], android ? 186 : 170, 3, 86)}
      <p class="pb-tags pb-tags-flood"><span>${now.stop.arrive}</span><span>${now.stop.built[lang]}</span><span>${t.outside}</span></p>
      ${lines(story)}
      ${credit(story, lang)}
      <div class="pb-deck">${controls(data, lang)}</div>
      ${nextBar(data, lang)}
    </div>`,
  };
}

// ── The web ─────────────────────────────────────────────────────────────────

/** @param {'ru' | 'en'} lang */
const webHead = (lang) => `
  <header class="pb-webhead">
    <span class="pb-wordmark">Promenade</span>
    <nav><span class="pb-langs"><b>${lang === 'ru' ? 'Рус' : 'Eng'}</b>${lang === 'ru' ? 'Eng' : 'Рус'}</span><button class="pb-open">${T[lang].open}</button></nav>
  </header>`;

/** @param {{ lang: 'ru' | 'en', data: any }} ctx */
function webRoute({ lang, data }) {
  const t = T[lang];
  const size = { width: 660, height: 700 };
  const view = fitView(
    [
      ...data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
      { x: data.map.start.street_x, y: data.map.start.street_y },
    ],
    size.width,
    size.height,
    { top: 70, right: 70, bottom: 70, left: 70 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: LAYERS,
    over: (ctx) => overlay(data, lang, ctx),
    label: t.title,
  });
  return {
    clock: data.route.nowBeforeStart,
    address: 'promenade.example/r/early-20th-century',
    inner: `<div class="pb pb-web pb-web-route">
      ${webHead(lang)}
      <div class="pb-halves">
        <div class="pb-map">${map}<span class="pb-osm">© OpenStreetMap</span></div>
        <div class="pb-sheet">
          <p class="pb-tags"><span>${t.option}</span><span>${t.onFoot}</span><span>${t.noMuseums}</span></p>
          ${fitted(t.title, 150, 2, 110)}
          ${numbers(data, lang)}
          ${verdictBar(data, lang)}
          <ol class="pb-programme">${programme(data, lang, 5)}</ol>
        </div>
      </div>
    </div>`,
  };
}

/** @param {{ lang: 'ru' | 'en', data: any }} ctx */
function webOuting({ lang, data }) {
  const t = T[lang];
  const now = data.outingNow;
  const story = now.story[lang];
  const size = { width: 640, height: 700 };
  const around = data.stops.filter((/** @type {any} */ s) => s.order <= 6);
  const view = fitView(
    around.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
    size.width,
    size.height,
    { top: 120, right: 90, bottom: 120, left: 90 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: LAYERS,
    over: (ctx) => overlay(data, lang, ctx, { current: now.stop.order }),
    label: now.stop.name[lang],
  });
  return {
    clock: now.clock,
    address: 'promenade.example/r/early-20th-century/2',
    inner: `<div class="pb pb-web pb-web-outing">
      ${webHead(lang)}
      <div class="pb-halves">
        <div class="pb-flood">
          <p class="pb-state"><b>${now.stop.order}<small>/${data.route.stopCount}</small></b>${squares(data)}</p>
          ${fitted(now.stop.name[lang], 190, 3, 96)}
          <p class="pb-tags pb-tags-flood"><span>${now.stop.arrive}</span><span>${now.stop.built[lang]}</span><span>${t.outside}</span></p>
          ${lines(story)}
          ${credit(story, lang)}
          <div class="pb-deck">${controls(data, lang)}</div>
          <p class="pb-webnote">${t.webNote}</p>
        </div>
        <div class="pb-map">${map}<span class="pb-osm">© OpenStreetMap</span>${nextBar(data, lang)}</div>
      </div>
    </div>`,
  };
}

// ── Fitting the lines ───────────────────────────────────────────────────────

/** Every way to break the words into `count` lines, as lists of lines. @param {string[]} words @param {number} count */
function* breaks(words, count) {
  if (count === 1) {
    yield [words.join(' ')];
    return;
  }
  for (let i = 1; i <= words.length - (count - 1); i++) {
    for (const rest of breaks(words.slice(i), count - 1))
      yield [words.slice(0, i).join(' '), ...rest];
  }
}

/**
 * Sets a block of capitals the way a bill is set: each line is given the size
 * at which it fills the measure, and the breaks are the ones that leave the
 * lines most alike, among those that fit the height.
 * @param {HTMLElement} block
 */
function fit(block) {
  const text = block.dataset.text ?? '';
  const height = Number(block.dataset.height);
  const maxLines = Number(block.dataset.lines);
  const maxSize = Number(block.dataset.max);
  const measure = block.clientWidth;
  if (measure === 0) return;
  const probe = document.createElement('span');
  probe.className = 'pb-line pb-probe';
  block.append(probe);
  /** @type {Map<string, number>} */
  const widths = new Map();
  /** Width of a line at a size of 100 pixels. @param {string} line */
  const widthOf = (line) => {
    let width = widths.get(line);
    if (width === undefined) {
      probe.textContent = line;
      width =
        probe.getBoundingClientRect().width /
        (block.getBoundingClientRect().width / block.offsetWidth || 1);
      widths.set(line, width);
    }
    return width;
  };
  const leading = 0.9;
  const words = text.split(' ');
  /** @type {{ lines: string[], sizes: number[], total: number, spread: number }[]} */
  const fitting = [];
  for (let count = 1; count <= Math.min(maxLines, words.length); count++) {
    for (const candidate of breaks(words, count)) {
      const sizes = candidate.map((line) => Math.min(maxSize, (measure / widthOf(line)) * 100));
      const total = sizes.reduce((sum, size) => sum + size * leading, 0);
      if (total > height) continue;
      fitting.push({
        lines: candidate,
        sizes,
        total,
        spread: Math.max(...sizes) / Math.min(...sizes),
      });
    }
  }
  // Among the settings that use most of the height, the one whose lines are most alike.
  const tallest = Math.max(0, ...fitting.map((f) => f.total));
  const best = fitting
    .filter((f) => f.total >= tallest * 0.74)
    .sort((a, b) => a.spread - b.spread || b.total - a.total)[0];
  probe.remove();
  if (!best) return;
  block.innerHTML = best.lines
    .map(
      (line, i) =>
        `<span class="pb-line" style="font-size:${best.sizes[i].toFixed(2)}px">${line}</span>`,
    )
    .join('');
}

/** @param {Element} root */
function settle(root) {
  for (const block of root.querySelectorAll('.pb-fit')) {
    if (block instanceof HTMLElement) fit(block);
  }
}

/** A piece of the map around the Route, for the sheet of the direction. */
function sample(
  /** @type {any} */ data,
  /** @type {'ru' | 'en'} */ lang,
  /** @type {{ width: number, height: number }} */ { width, height },
) {
  const view = fitView(
    [
      ...data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
      { x: data.map.start.street_x, y: data.map.start.street_y },
    ],
    width,
    height,
    { top: 44, right: 60, bottom: 44, left: 60 },
  );
  return mapSvg(data, {
    view,
    lang,
    layers: LAYERS,
    over: (ctx) => overlay(data, lang, ctx, { current: 2 }),
    label: 'The map',
  });
}

/**
 * Puts another sentence on the flood; the new one is wiped in by the style sheet.
 * @param {Element} root @param {any} story @param {number} index
 */
function follow(root, story, index) {
  const said = root.querySelector('.pb-said');
  const bar = root.querySelector('.pb-progress i');
  const elapsed = root.querySelector('.pb-progress span');
  if (!said || !(bar instanceof HTMLElement) || !elapsed) return;
  said.outerHTML = lines({ ...story, current: index });
  const at = story.sentences[index].startsAt + 1;
  bar.style.setProperty('--played', `${(at / story.total) * 100}%`);
  elapsed.textContent = format.playback(at);
}

const sheet = {
  reason: [
    'An Outing is an event: a day, an hour, a place to meet, and company. Cities have always announced events on bills pasted to their walls, and a bill is set to be read from across a street — which is how a phone is read on a walk: at arm’s length, in the sun, in a second.',
    'So the Route is a programme, and its title is set as a bill is set: capitals fitted line by line to the full measure. The names are real and some are long; the fitting follows one rule for every name in both languages.',
    'And the voice is given the whole screen. When a Story begins, the screen takes the colour and the sentence being spoken stands on it at headline size. Arrival can be seen without reading a word — from a pocket half open, or on a friend’s phone across the table.',
  ],
  roots: [
    {
      what: 'The letterpress bill.',
      lesson:
        'Wood type made large display letters cheap in the nineteenth century and became the material of posters. A bill set from it fills its measure line by line; the fitted title follows that rule.',
      source: 'Wikipedia, “Wood type”',
      url: 'https://en.wikipedia.org/w/index.php?oldid=1371445092',
    },
    {
      what: 'Vitebsk, 1919.',
      lesson:
        'UNOVIS, the group Kazimir Malevich led at the Vitebsk art school, developed Suprematism. The flat blue ground, the black line, and the square, the disc and the diamond of this map are of that family — a root that belongs to this country.',
      source: 'Wikipedia, “UNOVIS”',
      url: 'https://en.wikipedia.org/w/index.php?oldid=1383579875',
    },
    {
      what: 'Three widths of one face.',
      lesson:
        'Fira Sans is published under the Open Font License by the Mozilla Foundation and Telefónica, with Condensed and Extra Condensed widths in heavy weights and Cyrillic throughout: enough widths to fit a line without distorting a letter.',
      source: 'Fira, licence',
      url: 'https://github.com/mozilla/Fira/blob/master/LICENSE',
    },
  ],
  typeNote:
    'Fira Sans in three widths. Extra Condensed in a heavy weight sets the fitted lines and the numbers of the programme; Condensed sets names, labels and times; the normal width sets what is read at length — above all the sentence being spoken. Capitals are for names and labels only: a Story is never set in capitals. SIL Open Font License 1.1.',
  type: [
    {
      role: 'Fitted lines',
      face: 'Fira Sans Extra Condensed 800, capitals',
      css: "font: 800 64px/0.92 'Fira Sans Extra Condensed'; text-transform: uppercase",
      ru: 'Костёл Святого Симеона и Святой Елены',
      en: 'Church of Saints Simon and Helena',
    },
    {
      role: 'Names and times',
      face: 'Fira Sans Condensed 700 and 900',
      css: "font: 700 24px/1.1 'Fira Sans Condensed'; text-transform: uppercase; letter-spacing: 0.01em",
      ru: 'Национальный академический театр имени Янки Купалы · 15:47',
      en: 'Yanka Kupala National Academic Theatre · 15:47',
    },
    {
      role: 'The sentence being spoken',
      face: 'Fira Sans 500',
      css: "font: 500 25px/1.2 'Fira Sans'",
      ru: 'Храм был целиком построен из красного кирпича, что принесло ему народное прозвище «Красный костёл».',
      en: 'The bricks for its walls were sourced from Częstochowa, while the roof tiles came from Włocławek.',
    },
    {
      role: 'Text',
      face: 'Fira Sans 400',
      css: "font: 400 15px/1.35 'Fira Sans'",
      ru: '1910 год — эпоха из вашего пожелания · охраняется как наследие',
      en: '1910 — the period you asked for · heritage-listed',
    },
  ],
  colourNote:
    'Poster stock, black, and one blue that is used as a flood, not as an accent: it is the ground of the map and the whole screen while a Story plays. A spot of vermilion marks the single thing that is “now” — the Place one stands at, the person. In the dark theme the stock is black and the blue is deepened, so that a full screen of it does not glare at night.',
  colours: [
    { token: '--stock', role: 'Stock' },
    { token: '--ink', role: 'Ink' },
    { token: '--ink-2', role: 'Second ink' },
    { token: '--blue', role: 'The flood' },
    { token: '--blue-deep', role: 'Flood, deepened' },
    { token: '--on-blue', role: 'On the flood' },
    { token: '--dim-on-blue', role: 'On the flood, quiet' },
    { token: '--blue-text', role: 'Blue as text' },
    { token: '--hot', role: 'Now' },
  ],
  pairs: [
    { text: '--ink', on: '--stock', what: 'Ink on stock' },
    { text: '--ink-2', on: '--stock', what: 'Second ink on stock' },
    { text: '--on-blue', on: '--blue', what: 'The spoken sentence' },
    { text: '--dim-on-blue', on: '--blue', what: 'The sentences around it' },
    { text: '--blue-text', on: '--stock', what: 'Numbers of the programme' },
    { text: '--on-hot', on: '--hot', what: 'Number on the Place one stands at' },
    { text: '--hot', on: '--ring', what: '“Now” against its ring', large: true },
  ],
  mapNote:
    'The city as a flat composition. The ground is the blue; main streets are bands of the stock colour and lesser streets the same bands half seen; water is black. Buildings are left out — except the Places of the Route, whose own footprints are vermilion. The Route is a heavy black line with square ends on a light casing; Places are discs, the start is a square, the person is a diamond. Street names are left off: this map tells the shape of the walk at a glance, and the programme tells the rest. All of it is fills, lines and symbols (ADR-0008).',
  storyNote:
    'The voice gets the whole screen. The name of the Place is fitted across the top as on a bill; under it stands the one sentence being spoken, at headline size, with the sentence before it and the sentence after it in a quieter tint. The source is a line under the text, the controls are large squares, and the next Place waits in a black bar at the foot. On this screen the map is a key, not a panel.',
  motion: [
    {
      moment: 'Arriving.',
      how: 'The colour floods the screen from the bottom edge in 320 ms, in six hard steps, like a shutter; the fitted name is set line by line, 60 ms apart.',
    },
    {
      moment: 'The text follows the voice.',
      how: 'The spoken sentence is wiped in from the top in 280 ms while the one before drops to the quiet tint. No cross-fade.',
    },
    {
      moment: 'A Story ending.',
      how: 'The flood withdraws upward to show the map, and the next Place rises out of the black bar.',
    },
    {
      moment: 'The Route recalculated.',
      how: 'The black line is redrawn in one stroke along its new course, 400 ms; rows of the programme that leave are struck through before they go.',
    },
  ],
  platforms: [
    {
      system: 'iOS.',
      how: 'The map runs under the status bar; controls are squares of 44 points and more; the action is a slab across the foot of the screen.',
    },
    { system: 'Android.', how: 'The same slabs, the arrow back, squares of 48 dp and more.' },
    {
      system: 'Web.',
      how: 'Two halves, the map and the bill. While listening, the flood takes the left half and the map the right.',
    },
  ],
  risks: [
    'It is the loudest of the three. A person who wants a quiet companion may tire of it, and Quiet Mode will need a calmer face of its own.',
    'Capitals read slower than lower case. They are kept to names and labels, and a long name of a Place can take three or four lines.',
    'The map shows less than the other two: no buildings and no street names. It tells the shape of a walk well and the way through a courtyard badly.',
    'A full screen of saturated blue has to be tried outdoors and at night on real phones before it is trusted.',
  ],
};

export const playbill = {
  id: 'playbill',
  name: { en: 'Playbill', ru: 'Афиша' },
  idea: 'An Outing is an event, so it is set as a bill: capitals fitted to the measure, flat colour, a programme. When a Story begins the whole screen takes the colour — arriving is seen at arm’s length.',
  screens: { route, outing },
  web: { route: webRoute, outing: webOuting },
  settle,
  sample,
  follow,
  sheet,
};
