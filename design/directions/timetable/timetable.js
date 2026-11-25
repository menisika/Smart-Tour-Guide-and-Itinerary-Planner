/**
 * Direction 2 — Timetable.
 *
 * The promise of the product is time: "you will be back for your train".
 * Railways solved trust in time with a timetable and a line; so does this.
 * The Route is a chart drawn to time, and colour is kept for the verdict.
 */
import { format } from '../shared/data.js';
import { INSETS, SIZES, icons } from '../shared/frames.js';
import {
  fitView,
  mapSvg,
  pinned,
  positionAt,
  routePath,
  routeSamples,
  spread,
} from '../shared/map.js';

const T = {
  ru: {
    route: 'Маршрут',
    option: 'вариант 1 из 3',
    title: 'Архитектура начала XX века, без музеев',
    out: 'Выход',
    back: 'У вокзала',
    fits: (/** @type {any} */ r) => `Укладывается в ${format.duration(r.budgetMinutes, 'ru')}`,
    reserve: (/** @type {any} */ r) => `запас ${format.duration(r.reserveMinutes, 'ru')}`,
    checked: (/** @type {string} */ at) => `проверено в ${at}`,
    places: (/** @type {number} */ n) => `${n} мест`,
    outside: 'все снаружи',
    colTime: 'Время',
    colPlace: 'Место',
    station: 'Вокзал',
    departure: 'выход',
    arrival: 'возвращение',
    start: 'Начать прогулку',
    pack: 'Пакет',
    packNote: (/** @type {number} */ mb) => `${mb} МБ · без сети`,
    onTime: 'По графику',
    backAt: (/** @type {string} */ at) => `у вокзала в ${at}`,
    stay: (/** @type {string} */ until) => `стоянка до ${until}`,
    seenOutside: 'снаружи',
    source: 'Источник',
    made: 'Создано автоматически · проверено куратором',
    next: 'Далее',
    pause: 'Пауза',
    map: 'Карта',
    more: 'Ещё',
    open: 'Открыть в приложении',
    webNote:
      'В браузере рассказ включают вручную. По прибытии сам и без сети он звучит в приложении.',
    now: 'сейчас',
    revision: (/** @type {string} */ date) => `версия от ${date}`,
    theLine: 'Линия прогулки',
  },
  en: {
    route: 'Route',
    option: 'option 1 of 3',
    title: 'Early <span class="tt-nowrap">20th-century</span> architecture, no museums',
    out: 'Leave',
    back: 'At the station',
    fits: (/** @type {any} */ r) => `Fits your ${format.duration(r.budgetMinutes, 'en')}`,
    reserve: (/** @type {any} */ r) => `${format.duration(r.reserveMinutes, 'en')} to spare`,
    checked: (/** @type {string} */ at) => `checked at ${at}`,
    places: (/** @type {number} */ n) => `${n} places`,
    outside: 'all seen from outside',
    colTime: 'Time',
    colPlace: 'Place',
    station: 'Station',
    departure: 'leave',
    arrival: 'back',
    start: 'Start the outing',
    pack: 'Pack',
    packNote: (/** @type {number} */ mb) => `${mb} MB · offline`,
    onTime: 'On time',
    backAt: (/** @type {string} */ at) => `at the station by ${at}`,
    stay: (/** @type {string} */ until) => `here until ${until}`,
    seenOutside: 'outside',
    source: 'Source',
    made: 'Written automatically · verified by a curator',
    next: 'Next',
    pause: 'Pause',
    map: 'Map',
    more: 'More',
    open: 'Open in the app',
    webNote:
      'In a browser you start a story yourself. In the app it begins as you arrive, and plays without a network.',
    now: 'now',
    revision: (/** @type {string} */ date) => `revision of ${date}`,
    theLine: 'The line of the outing',
  },
};

const LAYERS = ['green', 'water', 'roads_minor', 'roads_mid', 'roads_major', 'rail', 'rail:ties'];

/** @param {string} clock @param {number} minutes */
const clockPlus = (clock, minutes) => {
  const [h, m] = clock.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * The line on the map: the walked part thin, the part ahead heavy, stations as
 * rings, and a mark on the line for every ten minutes of the plan.
 * @param {any} data @param {'ru' | 'en'} lang @param {{ u: number }} ctx
 * @param {{ current?: number, walkedLegs?: number, minute?: number, marks?: boolean }} state
 */
function overlay(data, lang, { u }, state = {}) {
  const { current = 0, walkedLegs = 0, minute, marks = true } = state;
  const walked =
    walkedLegs > 0 ? `<path class="tt-line-walked" d="${routePath(data, 0, walkedLegs)}"/>` : '';
  const ahead = `<path class="tt-line-case" d="${routePath(data, walkedLegs)}"/><path class="tt-line" d="${routePath(data, walkedLegs)}"/>`;
  const at = spread(
    data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
    21 * u,
  );
  let ticks = '';
  if (marks) {
    for (let m = 10; m < data.route.totalMinutes; m += 10) {
      const p = positionAt(data, m);
      if ('atStop' in p) continue;
      // A mark that would sit under a station is left out.
      if (at.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 20 * u)) continue;
      const half = m % 30 === 0;
      ticks += pinned(
        p.x,
        p.y,
        u,
        `<path d="M0 -${half ? 7 : 5}V${half ? 7 : 5}" transform="rotate(${p.angle})"/>${half ? `<text x="9" y="-7">${clockPlus(data.route.start, m)}</text>` : ''}`,
        `tt-mark${half ? ' is-half' : ''}`,
      );
    }
  }
  const stations = data.stops
    .map((/** @type {any} */ s, /** @type {number} */ i) =>
      pinned(
        at[i].x,
        at[i].y,
        u,
        `<circle r="9.5"/><text y="4.2" text-anchor="middle">${s.order}</text>`,
        `tt-station${s.order === current ? ' is-current' : ''}${s.order < current ? ' is-done' : ''}`,
      ),
    )
    .join('');
  const start = pinned(
    data.map.start.street_x,
    data.map.start.street_y,
    u,
    `<rect x="-6.5" y="-6.5" width="13" height="13"/><text x="12" y="4.5">${T[lang].station.toUpperCase()}</text>`,
    'tt-terminus',
  );
  let me = '';
  if (minute !== undefined) {
    const p = positionAt(data, minute);
    me = pinned(
      p.x,
      p.y,
      u,
      '<circle class="tt-me-ring" r="12"/><circle class="tt-me" r="6.5"/>',
      'tt-position',
    );
  }
  return `${walked}${ahead}${ticks}${start}${stations}${me}`;
}

/**
 * The chart: every minute of the Outing takes the same height, so a long leg
 * looks long and "now" is a place on the page.
 * @param {any} data @param {'ru' | 'en'} lang
 * @param {{ scale: number, minute?: number, compact?: boolean, until?: number, selected?: number }} options
 *   `minute` puts "now" on the chart; `selected` marks a Place without saying where anyone is
 */
function chart(
  data,
  lang,
  { scale, minute, compact = false, until = data.route.totalMinutes, selected },
) {
  const t = T[lang];
  const y = (/** @type {number} */ m) => Math.round(m * scale);
  const total = data.route.totalMinutes;
  const head = 20;
  let html = '';
  // Quarter-hours, as faint rules across the chart.
  for (let m = 15; m < Math.min(until, total); m += 15) {
    const busy = data.stops.some((/** @type {any} */ s) => Math.abs(s.arriveMin - m) * scale < 15);
    html += `<i class="tt-grid" style="top:${y(m) + head}px">${busy ? '' : `<span>${clockPlus(data.route.start, m)}</span>`}</i>`;
  }
  const done = minute === undefined ? 0 : y(Math.min(minute, total));
  html += `<i class="tt-spine" style="top:${head}px;height:${y(Math.min(until, total))}px"></i>`;
  if (minute !== undefined)
    html += `<i class="tt-spine is-done" style="top:${head}px;height:${done}px"></i>`;
  // The two ends sit outside the line, so that they never meet the first and the last leg.
  html += `<div class="tt-row tt-row-end" style="top:${head - 17}px"><b>${data.route.start}</b><i class="tt-square"></i><span class="tt-row-name">${data.route.startName[lang]}<small>${t.departure}</small></span></div>`;
  let leave = 0;
  for (const s of data.stops) {
    if (s.arriveMin > until) break;
    const legTop = y(leave) + head;
    const legHeight = y(s.arriveMin) - y(leave);
    if (legHeight >= (compact ? 24 : 13)) {
      html += `<span class="tt-leg${legHeight < 22 ? ' is-short' : ''}" style="top:${legTop}px;height:${legHeight}px">${format.duration(s.legMinutes, lang)}${compact ? '' : ` · ${format.distance(s.legMetres, lang)}`}</span>`;
    }
    const state =
      minute === undefined
        ? s.order === selected
          ? ' is-current'
          : ''
        : s.leaveMin <= minute
          ? ' is-done'
          : s.arriveMin <= minute
            ? ' is-current'
            : '';
    html += `<div class="tt-row tt-stop${state}" style="top:${y(s.arriveMin) + head}px;height:${y(s.leaveMin) - y(s.arriveMin)}px">
      <b>${s.arrive}</b>
      <i class="tt-dwell"><span>${s.order}</span></i>
      <span class="tt-row-body"><span class="tt-row-name">${s.name[lang]}</span>${compact ? '' : `<span class="tt-row-why">${s.why[lang]}</span>`}</span>
    </div>`;
    leave = s.leaveMin;
  }
  if (until >= total) {
    const legHeight = y(total) - y(leave);
    if (legHeight >= (compact ? 24 : 13)) {
      html += `<span class="tt-leg${legHeight < 22 ? ' is-short' : ''}" style="top:${y(leave) + head}px;height:${legHeight}px">${format.duration(data.route.backMinutes, lang)}${compact ? '' : ` · ${format.distance(data.route.backMetres, lang)}`}</span>`;
    }
    html += `<div class="tt-row tt-row-end" style="top:${y(total) + head - 1}px"><b>${data.route.finish}</b><i class="tt-square"></i><span class="tt-row-name">${data.route.startName[lang]}<small>${t.arrival}</small></span></div>`;
  }
  if (minute !== undefined) {
    html += `<div class="tt-now" style="top:${y(minute) + head}px"><b>${clockPlus(data.route.start, minute)}</b><i></i></div>`;
  }
  const height = y(Math.min(until, total)) + head + 24;
  return `<div class="tt-chart${compact ? ' is-compact' : ''}" style="height:${height}px" role="list" aria-label="${t.theLine}">${html}</div>`;
}

/** @param {any} data @param {'ru' | 'en'} lang */
const hero = (data, lang) => {
  const t = T[lang];
  const r = data.route;
  return `<div class="tt-hero">
    <div class="tt-times">
      <p><span class="tt-cap">${t.out}</span><b>${r.start}</b></p>
      <p class="tt-span"><span>${format.duration(r.totalMinutes, lang)}</span><i></i></p>
      <p><span class="tt-cap">${t.back}</span><b>${r.finish}</b></p>
    </div>
    <h1>${t.title}</h1>
    <p class="tt-verdict"><i class="tt-lamp"></i><b>${t.fits(r)}</b><span>${t.reserve(r)}</span><small>${t.checked(r.checkedAt)}</small></p>
    <p class="tt-facts">${t.places(r.stopCount)} · ${format.distance(r.walkingMetres, lang)} · ${t.outside}</p>
  </div>`;
};

/** @param {{ os: import('../shared/frames.js').Os, lang: 'ru' | 'en', data: any }} ctx */
function route({ os, lang, data }) {
  const t = T[lang];
  const { width } = SIZES[os];
  const android = os === 'android';
  const mapHeight = android ? 208 : 196;
  const view = fitView(
    [
      ...data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
      { x: data.map.start.street_x, y: data.map.start.street_y },
    ],
    width,
    mapHeight,
    { top: 20, right: 34, bottom: 20, left: 34 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: LAYERS,
    labels: { max: 4, size: 9, upper: true, ranks: [1, 2], clearOf: routeSamples(data) },
    over: (ctx) => overlay(data, lang, ctx),
    label: t.theLine,
  });
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="tt tt-route">
      <header class="tt-bar">
        <button class="tt-icon" aria-label="Back">${android ? icons.backAndroid : icons.backIos}</button>
        <p><b>${t.route}</b> · ${t.option}</p>
        <button class="tt-icon">${icons.edit}</button>
        <button class="tt-icon">${android ? icons.shareAndroid : icons.shareIos}</button>
      </header>
      ${hero(data, lang)}
      <div class="tt-map" style="height:${mapHeight}px">${map}<span class="tt-osm">© OpenStreetMap</span></div>
      <div class="tt-table">
        <p class="tt-colhead"><span>${t.colTime}</span><span>${t.colPlace}</span></p>
        ${chart(data, lang, { scale: 7, until: 60 })}
      </div>
      <div class="tt-actions">
        <button class="tt-pack">${icons.download}<span><b>${t.pack}</b><small>${t.packNote(data.route.packMegabytes)}</small></span></button>
        <button class="tt-go">${t.start}${icons.arrowRight}</button>
      </div>
    </div>`,
  };
}

/** @param {any} story */
const transcript = (story, from = 0) =>
  story.sentences
    .map((/** @type {any} */ s, /** @type {number} */ i) => {
      if (i < from) return '';
      const state =
        i < story.current ? 'is-spoken' : i === story.current ? 'is-current' : 'is-ahead';
      return `<li class="${state}"><time>${format.playback(s.startsAt)}</time><span>${s.text}${i === story.current ? '<sup>1</sup>' : ''}</span></li>`;
    })
    .join('');

/** @param {any} story @param {'ru' | 'en'} lang */
const sourceLine = (story, lang) =>
  `<p class="tt-source"><b>${T[lang].source} 1</b> ${story.source.work} · ${lang === 'ru' ? '«' : '“'}${story.source.article}${lang === 'ru' ? '»' : '”'} · ${T[lang].revision(format.date(story.source.revision_date, lang))} · ${story.source.licence}</p>`;

/** @param {any} data @param {'ru' | 'en'} lang */
function player(data, lang) {
  const t = T[lang];
  const story = data.outingNow.story[lang];
  const next = data.outingNow.next;
  return `<div class="tt-player">
    <div class="tt-progress"><span>${format.playback(story.elapsed)}</span><i style="--played:${(story.elapsed / story.total) * 100}%"></i><span>${format.playback(story.total)}</span></div>
    <div class="tt-controls">
      <button class="tt-key" aria-label="Speed">1×</button>
      <button class="tt-key" aria-label="Back 10 seconds">${icons.back10}</button>
      <button class="tt-key tt-key-main">${icons.pause}<span>${t.pause}</span></button>
      <button class="tt-key" aria-label="Next">${icons.next}</button>
      <button class="tt-key" aria-label="${t.map}">${icons.map}</button>
    </div>
    <p class="tt-next"><span class="tt-cap">${t.next}</span><b>${next.arrive}</b><i>${next.order}</i><span class="tt-next-name">${next.name[lang]}</span><span class="tt-next-far">${format.distance(next.legMetres, lang)} · ${format.duration(next.legMinutes, lang)}</span></p>
  </div>`;
}

/** @param {any} data @param {'ru' | 'en'} lang */
const status = (data, lang) =>
  `<p class="tt-status"><i class="tt-lamp"></i><b>${T[lang].onTime}</b><span>${T[lang].backAt(data.route.finish)}</span></p>`;

/** @param {any} data @param {'ru' | 'en'} lang */
const station = (data, lang) => {
  const now = data.outingNow;
  return `<div class="tt-station-head">
    <p class="tt-station-meta"><i>${now.stop.order}</i><b>${now.stop.arrive}</b><span>${T[lang].stay(now.stop.leave)} · ${now.stop.built[lang]} · ${T[lang].seenOutside}</span></p>
    <h1>${now.stop.name[lang]}</h1>
  </div>`;
};

/** @param {{ os: import('../shared/frames.js').Os, lang: 'ru' | 'en', data: any }} ctx */
function outing({ os, lang, data }) {
  const t = T[lang];
  const android = os === 'android';
  const now = data.outingNow;
  const story = now.story[lang];
  const { height } = SIZES[os];
  const inset = INSETS[os];
  // The whole Outing on the rail, top to bottom, to one scale.
  const railHeight = height - inset.top - 48 - 40;
  const railScale = (railHeight - 50) / data.route.totalMinutes;
  return {
    clock: now.clock,
    inner: `<div class="tt tt-outing">
      <header class="tt-bar">
        <button class="tt-icon" aria-label="Back">${android ? icons.backAndroid : icons.backIos}</button>
        ${status(data, lang)}
        <button class="tt-icon" aria-label="${t.more}">${android ? icons.moreAndroid : icons.moreIos}</button>
      </header>
      <div class="tt-split">
        <aside class="tt-rail">${chart(data, lang, { scale: railScale, minute: now.stop.arriveMin + 1, compact: true })}</aside>
        <div class="tt-main">
          ${station(data, lang)}
          <ol class="tt-transcript">${transcript(story, Math.max(0, story.current - 1))}</ol>
          <div class="tt-foot">
            ${sourceLine(story, lang)}
            <p class="tt-made">${t.made}</p>
          </div>
          ${player(data, lang)}
        </div>
      </div>
    </div>`,
  };
}

// ── The web ─────────────────────────────────────────────────────────────────

/** @param {'ru' | 'en'} lang */
const webHead = (lang) => `
  <header class="tt-webhead">
    <span class="tt-wordmark">PROMENADE</span>
    <nav><span class="tt-langs"><b>${lang === 'ru' ? 'РУС' : 'ENG'}</b>${lang === 'ru' ? 'ENG' : 'РУС'}</span><button class="tt-outline">${T[lang].open}</button></nav>
  </header>`;

const WEB_MAP = { width: 520, height: 700 };

/** @param {{ lang: 'ru' | 'en', data: any }} ctx */
function webRoute({ lang, data }) {
  const t = T[lang];
  const view = fitView(
    [
      ...data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
      { x: data.map.start.street_x, y: data.map.start.street_y },
    ],
    WEB_MAP.width,
    WEB_MAP.height,
    { top: 60, right: 50, bottom: 60, left: 50 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: LAYERS,
    labels: { max: 9, size: 9.5, upper: true, clearOf: routeSamples(data) },
    over: (ctx) => overlay(data, lang, ctx),
    label: t.theLine,
  });
  return {
    clock: data.route.nowBeforeStart,
    address: 'promenade.example/r/early-20th-century',
    inner: `<div class="tt tt-web tt-web-route">
      ${webHead(lang)}
      <div class="tt-cols">
        <section class="tt-col-info">
          <p class="tt-cap">${t.route} · ${t.option}</p>
          ${hero(data, lang)}
          <div class="tt-actions">
            <button class="tt-go">${t.open}${icons.arrowRight}</button>
            <p class="tt-webnote">${t.webNote}</p>
          </div>
        </section>
        <section class="tt-col-chart">
          <p class="tt-colhead"><span>${t.colTime}</span><span>${t.colPlace}</span></p>
          ${chart(data, lang, { scale: 3.8 })}
        </section>
        <section class="tt-col-map">${map}<span class="tt-osm">© OpenStreetMap</span></section>
      </div>
    </div>`,
  };
}

/** @param {{ lang: 'ru' | 'en', data: any }} ctx */
function webOuting({ lang, data }) {
  const t = T[lang];
  const now = data.outingNow;
  const story = now.story[lang];
  const around = data.stops.filter((/** @type {any} */ s) => s.order <= 6);
  const view = fitView(
    around.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
    WEB_MAP.width,
    WEB_MAP.height,
    { top: 110, right: 70, bottom: 110, left: 70 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: LAYERS,
    labels: { max: 8, size: 9.5, upper: true, clearOf: routeSamples(data) },
    over: (ctx) => overlay(data, lang, ctx, { current: now.stop.order }),
    label: now.stop.name[lang],
  });
  return {
    clock: now.clock,
    address: 'promenade.example/r/early-20th-century/2',
    inner: `<div class="tt tt-web tt-web-outing">
      ${webHead(lang)}
      <div class="tt-cols">
        <section class="tt-col-chart">
          <p class="tt-colhead"><span>${t.colTime}</span><span>${t.colPlace}</span></p>
          ${chart(data, lang, { scale: 3.8, compact: true, selected: now.stop.order })}
        </section>
        <section class="tt-col-story">
          ${station(data, lang)}
          <ol class="tt-transcript">${transcript(story)}</ol>
          <div class="tt-foot">
            ${sourceLine(story, lang)}
            <p class="tt-made">${t.made}</p>
          </div>
          ${player(data, lang)}
          <p class="tt-webnote">${t.webNote}</p>
        </section>
        <section class="tt-col-map">${map}<span class="tt-osm">© OpenStreetMap</span></section>
      </div>
    </div>`,
  };
}

/** A piece of the map around the first Places, for the sheet of the direction. */
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
    labels: { max: 6, size: 9.5, upper: true, clearOf: routeSamples(data) },
    over: (ctx) => overlay(data, lang, ctx),
    label: 'The line of the Outing',
  });
}

/**
 * Steps the transcript to another sentence.
 * @param {Element} root @param {any} story @param {number} index
 */
function follow(root, story, index) {
  const list = root.querySelector('.tt-transcript');
  const bar = root.querySelector('.tt-progress i');
  const elapsed = root.querySelector('.tt-progress span');
  if (!list || !(bar instanceof HTMLElement) || !elapsed) return;
  list.innerHTML = transcript({ ...story, current: index }, Math.max(0, index - 1));
  const at = story.sentences[index].startsAt + 1;
  bar.style.setProperty('--played', `${(at / story.total) * 100}%`);
  elapsed.textContent = format.playback(at);
}

const sheet = {
  reason: [
    'The first thing a person asks of this product is a question about time: will I be back for my train, will the place still be open. The product’s first promise is that the answer has been checked (PRODUCT-SPEC §1.3, RTE-6). Railways built the visual language of time one can trust — the timetable, and the line with its stations — and this direction speaks it.',
    'So the Route is not a list of cards but a chart drawn to time: every minute takes the same height. The long leg looks long, the short stops crowd together, and during the Outing “now” is a place on the page — one glance says how far along you are and whether you are late.',
    'Colour is kept for one thing, the verdict: green for on time, amber for a warning, red for what is broken. Everything else is black and white, which is also what reads best in the sun.',
  ],
  roots: [
    {
      what: 'The timetable chart.',
      lesson:
        'In the 1840s the railway engineer Charles Ibry drew a chart of time against stations to plan the trains of the Paris–Le Havre line. This direction puts one walk on the same kind of paper.',
      source: 'Wikipedia, “Charles Ibry”',
      url: 'https://en.wikipedia.org/w/index.php?oldid=1384277910',
    },
    {
      what: 'The road as a strip.',
      lesson:
        'Ogilby’s Britannia was the first road atlas of England and Wales based on surveys and drawn to scale; a strip map lays a road out in the order it is travelled. A walk is a sequence before it is a shape.',
      source: 'Wikipedia, “John Ogilby”',
      url: 'https://en.wikipedia.org/w/index.php?oldid=1365488229',
    },
    {
      what: 'One system on every surface.',
      lesson:
        'Legible London gave London one walking map across stations, shelters, street signs and print, worked out with the people who walk it. Taken from there: the same chart on the phone, on the lock screen and on the web.',
      source: 'Applied, “Legible London”',
      url: 'https://applied.group/projects/legible-london',
    },
    {
      what: 'A face drawn for a city.',
      lesson:
        'Sofia Sans was designed as the typeface of the city of Sofia, after the technical sans serifs of the early twentieth century: four widths, Cyrillic beside Latin, several styles of figures.',
      source: 'Sofia Sans, project page',
      url: 'https://github.com/lettersoup/Sofia-Sans',
    },
  ],
  typeNote:
    'Sofia Sans in three widths. The normal width carries text; Condensed carries names and labels, so that a long name of a Place fits beside its time; Extra Condensed carries the two times that frame the whole Outing. Every figure is tabular: times stand under times. SIL Open Font License 1.1.',
  type: [
    {
      role: 'The frame of the Outing',
      face: 'Sofia Sans Extra Condensed 700',
      css: "font: 700 72px/1 'Sofia Sans Extra Condensed'; font-variant-numeric: tabular-nums",
      ru: '14:00 — 16:45',
      en: '14:00 — 16:45',
    },
    {
      role: 'Names',
      face: 'Sofia Sans Condensed 700',
      css: "font: 700 30px/1.08 'Sofia Sans Condensed'",
      ru: 'Национальный академический театр имени Янки Купалы',
      en: 'Yanka Kupala National Academic Theatre',
    },
    {
      role: 'Text',
      face: 'Sofia Sans 400 and 600',
      css: "font: 400 17px/1.4 'Sofia Sans'",
      ru: 'Храм был целиком построен из красного кирпича, что принесло ему народное прозвище «Красный костёл».',
      en: 'The bricks for its walls were sourced from Częstochowa, while the roof tiles came from Włocławek.',
    },
    {
      role: 'Labels',
      face: 'Sofia Sans Condensed 800, capitals, tracked',
      css: "font: 800 13px/1.3 'Sofia Sans Condensed'; letter-spacing: 0.09em; text-transform: uppercase",
      ru: 'Укладывается в 3 ч · запас 15 мин · по графику',
      en: 'Fits your 3 h · 15 min to spare · on time',
    },
  ],
  colourNote:
    'Black and white, and three colours that each mean one thing. Green says “on time”, and is therefore also the colour of the person’s own position on the map and of “now” on the chart; amber will say a warning — hours unknown, running late; red will say a broken constraint. A colour never stands without the words that say the same.',
  colours: [
    { token: '--bg', role: 'Ground' },
    { token: '--panel', role: 'Panel' },
    { token: '--ink', role: 'Ink' },
    { token: '--ink-2', role: 'Second ink' },
    { token: '--line', role: 'Rule' },
    { token: '--go', role: 'Verdict: on time' },
    { token: '--warn', role: 'Verdict: warning' },
    { token: '--stop', role: 'Verdict: broken' },
    { token: '--m-road', role: 'Map: street' },
    { token: '--m-water', role: 'Map: water' },
  ],
  pairs: [
    { text: '--ink', on: '--bg', what: 'Ink on the ground' },
    { text: '--ink-2', on: '--bg', what: 'Second ink on the ground' },
    { text: '--ink-2', on: '--panel', what: 'Second ink on a panel' },
    { text: '--go', on: '--bg', what: '“On time”' },
    { text: '--on-go', on: '--go', what: 'The clock on “now”' },
    { text: '--warn', on: '--bg', what: 'A warning' },
    { text: '--stop', on: '--bg', what: 'A broken constraint' },
    { text: '--ink', on: '--m-road', what: 'The line on a street', large: true },
  ],
  mapNote:
    'A diagram laid over the streets. Buildings are left out; streets are grey bands of their true width, water and green barely tinted, the railway a ticked line. Over them runs the one heavy line of the Route with its stations as rings, and — the mark of this direction — a tick across the line for every ten minutes of the plan, with the clock written at the half-hours. The map answers “where will I be at four o’clock”. Fills, lines, symbols and text along a line: all within a MapLibre style (ADR-0008).',
  storyNote:
    'A transcript with a timetable of its own. Each sentence is a row that begins with the second it starts at; the row being spoken is large and carries a black bar at its edge. The rail on the left is the whole Outing to scale, with “now” on it. The controls are keys with square corners, labelled with a word where a word fits. On the phone this screen has no map: the rail is the map, and the map itself is one key away.',
  motion: [
    {
      moment: 'The text follows the voice.',
      how: 'Rows step. The next sentence takes the large size at once, as a line on a departure board changes; only the bar at the edge travels, 160 ms. Nothing slides or fades.',
    },
    {
      moment: 'Now.',
      how: 'The green mark creeps down the rail in real time; the minutes to the next Place roll over digit by digit, 120 ms a digit.',
    },
    {
      moment: 'Arriving.',
      how: 'The capsule of the station fills with black from the top in 240 ms and its time turns bold.',
    },
    {
      moment: 'The Route recalculated.',
      how: 'The chart closes or opens the gap where the change is, 300 ms; the two frame times roll to their new values, and the verdict line says in words what changed.',
    },
  ],
  platforms: [
    {
      system: 'iOS.',
      how: 'Bars and keys of 44 points and more; the chart scrolls under a fixed bar of actions.',
    },
    {
      system: 'Android.',
      how: 'The same chart; the arrow back and a 56 dp bar; keys of 48 dp and more.',
    },
    {
      system: 'Web.',
      how: 'Three columns: the frame of the Outing with its verdict, the whole chart from the first minute to the last on one screen, and the map. Listening puts the transcript in the middle.',
    },
  ],
  risks: [
    'It is the most austere of the three. To some it will read as a tool rather than as an afternoon out.',
    'A chart drawn to time is long on a phone: three Places fit under the map before scrolling. The rail of the Outing screen answers this; the Route screen does not.',
    'Colour that only ever means a verdict depends on the verdicts being right: a green that proves wrong costs more here than anywhere.',
  ],
};

export const timetable = {
  id: 'timetable',
  name: { en: 'Timetable', ru: 'Расписание' },
  idea: 'The walk as a line drawn to time: every minute takes the same height, the long leg looks long, and colour is kept for one thing — whether you are on time.',
  screens: { route, outing },
  web: { route: webRoute, outing: webOuting },
  sample,
  follow,
  sheet,
};
