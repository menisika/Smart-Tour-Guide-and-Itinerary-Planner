/**
 * Direction 1 — Guidebook.
 *
 * The city as a book one walks through: an engraved plan with a numbered key,
 * a Story set as a page to read, its source in a footnote.
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
    over: 'Маршрут · вариант 1 из 3',
    title: 'Архитектура начала XX века',
    sub: 'без музеев · пешком от вокзала и обратно',
    places: 'мест',
    onFoot: 'пути',
    whole: 'всего',
    checked: (/** @type {string} */ at) => `Проверено в ${at}.`,
    verdict: (/** @type {any} */ r) =>
      `Укладывается в три часа: у вокзала снова в ${r.finish}, за ${r.reserveMinutes} минут до срока. Все места осматриваются снаружи — часы работы не мешают.`,
    key: 'Ключ к плану',
    walk: (/** @type {string} */ min, /** @type {string} */ m) => `${min} пешком · ${m}`,
    back: 'обратно к вокзалу',
    start: 'Начать прогулку',
    pack: 'Скачать пакет',
    packNote: (/** @type {number} */ mb) => `${mb} МБ · идти без сети`,
    route: 'Маршрут',
    station: 'Вокзал',
    scale: 'м',
    outing: 'Прогулка',
    of: (/** @type {number} */ a, /** @type {number} */ b) => `${a} из ${b}`,
    place: (/** @type {number} */ n) => `Место ${n}`,
    outside: 'осматривается снаружи',
    made: 'Создано автоматически · проверено куратором',
    onTime: (/** @type {string} */ at) => `В графике · у вокзала в ${at}`,
    next: 'Далее',
    source: (/** @type {any} */ s, /** @type {string} */ date) =>
      `${s.work}, статья «${s.article}», версия от ${date}. ${s.licence}.`,
    sources: 'Источники',
    more: 'Ещё',
    guided: 'С гидом',
    open: 'Открыть в приложении',
    listen: 'Слушать в браузере',
    webNote:
      'В браузере рассказы включаются вручную. Сами, по мере пути, и без сети они звучат в приложении.',
    plate: (/** @type {number} */ n, /** @type {string} */ km) =>
      `План. Маршрут в ${n} мест, ${km}`,
    tapHint: 'Нажмите на фразу — увидите её источник или сообщите о неточности.',
  },
  en: {
    over: 'Route · option 1 of 3',
    title: 'Early <span class="gb-nowrap">20th-century</span> architecture',
    sub: 'no museums · on foot from the station and back',
    places: 'places',
    onFoot: 'on foot',
    whole: 'in all',
    checked: (/** @type {string} */ at) => `Checked at ${at}.`,
    verdict: (/** @type {any} */ r) =>
      `It fits your three hours: back at the station at ${r.finish}, ${r.reserveMinutes} minutes before your limit. Every place is seen from outside, so no opening hours stand in the way.`,
    key: 'Key to the plan',
    walk: (/** @type {string} */ min, /** @type {string} */ m) => `${min} on foot · ${m}`,
    back: 'back to the station',
    start: 'Start the outing',
    pack: 'Get the pack',
    packNote: (/** @type {number} */ mb) => `${mb} MB · walk offline`,
    route: 'Route',
    station: 'Station',
    scale: 'm',
    outing: 'Outing',
    of: (/** @type {number} */ a, /** @type {number} */ b) => `${a} of ${b}`,
    place: (/** @type {number} */ n) => `Place ${n}`,
    outside: 'seen from outside',
    made: 'Written automatically · verified by a curator',
    onTime: (/** @type {string} */ at) => `On time · at the station by ${at}`,
    next: 'Next',
    source: (/** @type {any} */ s, /** @type {string} */ date) =>
      `${s.work}, “${s.article}”, revision of ${date}. ${s.licence}.`,
    sources: 'Sources',
    more: 'More',
    guided: 'Guided',
    open: 'Open in the app',
    listen: 'Listen in the browser',
    webNote:
      'In a browser you start each story yourself. In the app they begin as you arrive, and play without a network.',
    plate: (/** @type {number} */ n, /** @type {string} */ km) =>
      `Plan. A route of ${n} places, ${km}`,
    tapHint: 'Tap a sentence to see its source or to report an inaccuracy.',
  },
};

const BASE_LAYERS = [
  'green',
  'water',
  'roads_minor',
  'roads_mid',
  'roads_major',
  'buildings',
  'rail_side',
  'rail',
  'rail:ties',
];

/** Hatching for water and a stipple for green, sized in pixels whatever the view. */
const patterns = (/** @type {{ u: number, id: string }} */ { u, id }) => `
  <pattern id="${id}-hatch" width="${4 * u}" height="${4 * u}" patternUnits="userSpaceOnUse">
    <path class="gb-hatch" d="M0 ${2 * u}H${4 * u}"/>
  </pattern>
  <pattern id="${id}-stipple" width="${7 * u}" height="${7 * u}" patternUnits="userSpaceOnUse">
    <circle class="gb-stipple" cx="${1.75 * u}" cy="${1.75 * u}" r="${0.7 * u}"/>
    <circle class="gb-stipple" cx="${5.25 * u}" cy="${5.25 * u}" r="${0.7 * u}"/>
  </pattern>`;

/** Water and green once more, carrying their engraved texture. */
const textures = (/** @type {{ id: string }} */ { id }) => `
  <use href="#m-water" fill="url(#${id}-hatch)" class="gb-texture"/>
  <use href="#m-green" fill="url(#${id}-stipple)" class="gb-texture"/>`;

/**
 * @param {any} data @param {'ru' | 'en'} lang
 * @param {{ u: number }} ctx
 * @param {{ current?: number, walkedLegs?: number, position?: { x: number, y: number }, small?: boolean }} state
 */
function overlay(data, lang, { u }, state = {}) {
  const { current = 0, walkedLegs = 0, position, small = false } = state;
  const r = small ? 9.5 : 11;
  const footprints = data.stops
    .map(
      (/** @type {any} */ s) =>
        `<use href="#m-foot-${s.order}" class="gb-foot${s.order === current ? ' is-current' : ''}"/>`,
    )
    .join('');
  const walked =
    walkedLegs > 0 ? `<path class="gb-route-walked" d="${routePath(data, 0, walkedLegs)}"/>` : '';
  const ahead = `<path class="gb-route-case" d="${routePath(data, walkedLegs)}"/><path class="gb-route" d="${routePath(data, walkedLegs)}"/>`;
  const at = spread(
    data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
    (r * 2 + 1.5) * u,
  );
  // The Place one stands at carries its number on its own footprint.
  const stops = data.stops
    .map((/** @type {any} */ s, /** @type {number} */ i) =>
      pinned(
        position && s.order === current ? s.x : at[i].x,
        position && s.order === current ? s.y : at[i].y,
        u,
        `<circle r="${r}"/><text y="${small ? 4 : 4.6}" text-anchor="middle">${s.order}</text>`,
        `gb-stop${s.order === current ? ' is-current' : ''}${s.order < current ? ' is-done' : ''}`,
      ),
    )
    .join('');
  const start = pinned(
    data.map.start.street_x,
    data.map.start.street_y,
    u,
    `<rect x="-5.5" y="-5.5" width="11" height="11" transform="rotate(45)"/><text class="gb-start-label" x="12" y="4">${T[lang].station}</text>`,
    'gb-start',
  );
  const me = position
    ? pinned(
        position.x,
        position.y,
        u,
        '<circle class="gb-me-halo" r="13"/><circle class="gb-me" r="6"/>',
        'gb-position',
      )
    : '';
  return `${footprints}${walked}${ahead}${start}${stops}${me}`;
}

/** A scale bar of a round number of metres. @param {number} u map units per pixel @param {string} unit */
function scaleBar(u, unit) {
  const metresPerPx = u / 2;
  const metres = [50, 100, 200, 250, 500, 1000].find((m) => m / metresPerPx >= 64) ?? 1000;
  const px = metres / metresPerPx;
  return `<span class="gb-scale" style="--scale:${px}px"><i></i><span>0</span><span>${metres}${format.NBSP}${unit}</span></span>`;
}

/** @param {any} data @param {'ru' | 'en'} lang */
function keyList(data, lang, limit = data.stops.length) {
  const t = T[lang];
  return data.stops
    .slice(0, limit)
    .map(
      (/** @type {any} */ s) => `
      <li class="gb-leg">${t.walk(format.duration(s.legMinutes, lang), format.distance(s.legMetres, lang))}</li>
      <li class="gb-entry">
        <span class="gb-num">${s.order}</span>
        <span class="gb-entry-body">
          <span class="gb-entry-line"><span class="gb-entry-name">${s.name[lang]}</span><span class="gb-leader"></span><span class="gb-entry-time">${s.arrive}</span></span>
          <span class="gb-entry-why">${s.why[lang]}</span>
        </span>
      </li>`,
    )
    .join('');
}

/** @param {any} data @param {'ru' | 'en'} lang */
const facts = (data, lang) => {
  const t = T[lang];
  const km = format.distance(data.route.walkingMetres, lang).split(format.NBSP);
  const whole = format.duration(data.route.totalMinutes, lang);
  return `<dl class="gb-facts">
    <div><dt>${t.places}</dt><dd>${data.route.stopCount}</dd></div>
    <div><dt>${t.onFoot}</dt><dd>${km[0]}<small>${format.NBSP}${km[1]}</small></dd></div>
    <div><dt>${t.whole}</dt><dd>${whole.replace(/(\D+)/g, '<small>$1</small>')}</dd></div>
  </dl>`;
};

/** @param {any} data @param {'ru' | 'en'} lang */
const verdict = (data, lang) =>
  `<p class="gb-verdict"><span class="gb-runin">${T[lang].checked(data.route.checkedAt)}</span> ${T[lang].verdict(data.route)}</p>`;

/** @param {{ os: import('../shared/frames.js').Os, lang: 'ru' | 'en', data: any }} ctx */
function route({ os, lang, data }) {
  const t = T[lang];
  const { width } = SIZES[os];
  const inset = INSETS[os];
  const android = os === 'android';
  const plateHeight = android ? 286 : 318;
  const view = fitView(
    [
      ...data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
      { x: data.map.start.street_x, y: data.map.start.street_y },
    ],
    width,
    plateHeight,
    { top: android ? 22 : inset.top + 62, right: 30, bottom: 40, left: 30 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: BASE_LAYERS,
    labels: { max: 7, size: 10.5, clearOf: routeSamples(data) },
    defs: patterns,
    under: (ctx) => textures(ctx),
    over: (ctx) => overlay(data, lang, ctx),
    label: t.plate(data.route.stopCount, format.distance(data.route.walkingMetres, lang)),
  });
  const share = android ? icons.shareAndroid : icons.shareIos;
  const more = android ? icons.moreAndroid : icons.moreIos;
  const bar = android
    ? `<header class="gb-appbar"><button class="gb-icon" aria-label="Back">${icons.backAndroid}</button><h2>${t.route}</h2><button class="gb-icon">${icons.edit}</button><button class="gb-icon">${share}</button><button class="gb-icon">${more}</button></header>`
    : `<div class="gb-float"><button class="gb-round" aria-label="Back">${icons.backIos}</button><span></span><button class="gb-round">${icons.edit}</button><button class="gb-round">${share}</button></div>`;
  const actions = android
    ? `<div class="gb-actions"><button class="gb-pack">${icons.download}<span><b>${t.pack}</b><small>${t.packNote(data.route.packMegabytes)}</small></span></button><button class="gb-fab">${icons.walk}<span>${t.start}</span></button></div>`
    : `<div class="gb-actions"><button class="gb-pack">${icons.download}<span><b>${t.pack}</b><small>${t.packNote(data.route.packMegabytes)}</small></span></button><button class="gb-primary">${t.start}</button></div>`;
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="gb gb-route">
      ${android ? bar : ''}
      <div class="gb-plate" style="height:${plateHeight}px">
        ${map}
        ${android ? '' : bar}
        <div class="gb-plate-foot">${scaleBar(view.u, t.scale)}<span class="gb-osm">© OpenStreetMap</span></div>
      </div>
      <div class="gb-page">
        <p class="gb-over">${t.over}</p>
        <h1>${t.title}</h1>
        <p class="gb-sub">${t.sub}</p>
        ${facts(data, lang)}
        ${verdict(data, lang)}
        <h3 class="gb-over gb-key-head">${t.key}</h3>
        <ol class="gb-key">${keyList(data, lang, 4)}</ol>
      </div>
      ${actions}
    </div>`,
  };
}

/**
 * @param {any} story
 * @param {number} from the first sentence shown: what was spoken before it has scrolled away
 */
function storyText(story, from = 0) {
  return story.sentences
    .map((/** @type {any} */ s, /** @type {number} */ i) => {
      if (i < from) return '';
      const state =
        i < story.current ? 'is-spoken' : i === story.current ? 'is-current' : 'is-ahead';
      const mark = i === story.current ? '<sup class="gb-ref">1</sup>' : '';
      return `<span class="gb-sentence ${state}">${s.text}${mark}</span>`;
    })
    .join(' ');
}

/** @param {any} story @param {'ru' | 'en'} lang */
function player(story, lang) {
  const t = T[lang];
  const ticks = story.sentences
    .slice(1)
    .map((/** @type {any} */ s) => `<i style="left:${(s.startsAt / story.total) * 100}%"></i>`)
    .join('');
  return `<div class="gb-timeline">
      <span>${format.playback(story.elapsed)}</span>
      <span class="gb-track" style="--played:${(story.elapsed / story.total) * 100}%">${ticks}<b></b></span>
      <span>${format.playback(story.total)}</span>
    </div>
    <div class="gb-controls">
      <button class="gb-ctl gb-ctl-text" aria-label="Speed">1×</button>
      <button class="gb-ctl" aria-label="Back 10 seconds">${icons.back10}</button>
      <button class="gb-ctl gb-ctl-main" aria-label="Pause">${icons.pause}</button>
      <button class="gb-ctl" aria-label="Next">${icons.next}</button>
      <button class="gb-ctl gb-ctl-text" aria-label="${t.more}">${t.more}</button>
    </div>`;
}

/** @param {any} data @param {'ru' | 'en'} lang */
const nextLine = (data, lang) => {
  const next = data.outingNow.next;
  return `<p class="gb-next"><span class="gb-over">${T[lang].next}</span><span class="gb-num">${next.order}</span><span class="gb-next-name">${next.name[lang]}</span><span class="gb-next-far">${format.distance(next.legMetres, lang)} · ${format.duration(next.legMinutes, lang)}</span></p>`;
};

/** @param {any} data */
const ticksOf = (data) =>
  `<span class="gb-ticks">${data.stops.map((/** @type {any} */ s) => `<i class="${s.order < data.outingNow.stop.order ? 'is-done' : s.order === data.outingNow.stop.order ? 'is-current' : ''}"></i>`).join('')}</span>`;

/** @param {{ os: import('../shared/frames.js').Os, lang: 'ru' | 'en', data: any }} ctx */
function outing({ os, lang, data }) {
  const t = T[lang];
  const { width } = SIZES[os];
  const android = os === 'android';
  const now = data.outingNow;
  const story = now.story[lang];
  const bandHeight = android ? 136 : 124;
  const here = positionAt(data, now.stop.arriveMin + 1);
  // About a metre and a half to a pixel: the Place, the next one and the streets between.
  const u = 3;
  const cx = (now.stop.streetX + now.next.streetX) / 2;
  const cy = (now.stop.y + now.next.streetY) / 2;
  const view = {
    x: cx - (width * u) / 2,
    y: cy - (bandHeight * u) / 2,
    w: width * u,
    h: bandHeight * u,
    u,
  };
  const map = mapSvg(data, {
    view,
    lang,
    layers: BASE_LAYERS,
    labels: { max: 2, size: 10.5, clearOf: routeSamples(data) },
    defs: patterns,
    under: (ctx) => textures(ctx),
    over: (ctx) =>
      overlay(data, lang, ctx, {
        current: now.stop.order,
        walkedLegs: now.stop.order,
        position: here,
        small: true,
      }),
    label: t.onTime(data.route.finish),
  });
  const date = format.date(story.source.revision_date, lang);
  return {
    clock: now.clock,
    inner: `<div class="gb gb-outing">
      <header class="gb-runhead">
        <button class="gb-icon" aria-label="Back">${android ? icons.backAndroid : icons.backIos}</button>
        <p><span class="gb-over">${t.outing} · ${t.of(now.stop.order, data.route.stopCount)}</span>${ticksOf(data)}</p>
        <button class="gb-icon" aria-label="${t.route}">${icons.list}</button>
      </header>
      <div class="gb-band" style="height:${bandHeight}px">
        ${map}
        <span class="gb-band-tag">${t.onTime(data.route.finish)}</span>
      </div>
      <div class="gb-chapter">
        <p class="gb-over">${t.place(now.stop.order)} · ${now.stop.built[lang]} · ${t.outside}</p>
        <h1>${now.stop.name[lang]}</h1>
      </div>
      <div class="gb-reading">
        <p class="gb-text" data-follow>${storyText(story, story.current - 1)}</p>
        <i class="gb-rule" aria-hidden="true"></i>
      </div>
      <div class="gb-under">
        <p class="gb-footnote"><sup>1</sup> ${t.source(story.source, date)}</p>
        <p class="gb-made">${t.made}</p>
      </div>
      <div class="gb-player">
        ${player(story, lang)}
        ${nextLine(data, lang)}
      </div>
    </div>`,
  };
}

// ── The web ─────────────────────────────────────────────────────────────────

/** @param {'ru' | 'en'} lang */
const webHead = (lang) => `
  <header class="gb-webhead">
    <span class="gb-wordmark">Promenade</span>
    <nav><span class="gb-langs"><b>${lang === 'ru' ? 'Рус' : 'Eng'}</b> · ${lang === 'ru' ? 'Eng' : 'Рус'}</span><button class="gb-outline">${T[lang].open}</button></nav>
  </header>`;

const WEB_PLATE = { width: 712, height: 612 };

/** @param {{ lang: 'ru' | 'en', data: any }} ctx */
function webRoute({ lang, data }) {
  const t = T[lang];
  const view = fitView(
    [
      ...data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
      { x: data.map.start.street_x, y: data.map.start.street_y },
    ],
    WEB_PLATE.width,
    WEB_PLATE.height,
    { top: 56, right: 60, bottom: 70, left: 60 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: BASE_LAYERS,
    labels: { max: 14, size: 11, clearOf: routeSamples(data) },
    defs: patterns,
    under: (ctx) => textures(ctx),
    over: (ctx) => overlay(data, lang, ctx),
    label: t.plate(data.route.stopCount, format.distance(data.route.walkingMetres, lang)),
  });
  return {
    clock: data.route.nowBeforeStart,
    address: 'promenade.example/r/early-20th-century',
    inner: `<div class="gb gb-web gb-web-route">
      ${webHead(lang)}
      <div class="gb-spread">
        <figure class="gb-webplate">
          <div class="gb-neat">${map}</div>
          <figcaption><span>${t.plate(data.route.stopCount, format.distance(data.route.walkingMetres, lang))}</span>${scaleBar(view.u, t.scale)}<span class="gb-osm">© OpenStreetMap</span></figcaption>
        </figure>
        <div class="gb-page">
          <p class="gb-over">${t.over}</p>
          <h1>${t.title}</h1>
          <p class="gb-sub">${t.sub}</p>
          ${facts(data, lang)}
          ${verdict(data, lang)}
          <h3 class="gb-over gb-key-head">${t.key}</h3>
          <ol class="gb-key">${keyList(data, lang, 5)}</ol>
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
  const around = data.stops.filter((/** @type {any} */ s) => s.order <= 6);
  const view = fitView(
    around.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
    WEB_PLATE.width,
    WEB_PLATE.height,
    { top: 90, right: 90, bottom: 100, left: 90 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: BASE_LAYERS,
    labels: { max: 10, size: 11, clearOf: routeSamples(data) },
    defs: patterns,
    under: (ctx) => textures(ctx),
    over: (ctx) => overlay(data, lang, ctx, { current: now.stop.order }),
    label: now.stop.name[lang],
  });
  const date = format.date(story.source.revision_date, lang);
  return {
    clock: now.clock,
    address: 'promenade.example/r/early-20th-century/2',
    inner: `<div class="gb gb-web gb-web-outing">
      ${webHead(lang)}
      <div class="gb-spread">
        <figure class="gb-webplate">
          <div class="gb-neat">${map}</div>
          <figcaption><span>${t.over}: ${t.title}</span>${scaleBar(view.u, t.scale)}<span class="gb-osm">© OpenStreetMap</span></figcaption>
        </figure>
        <div class="gb-page">
          <p class="gb-over">${t.place(now.stop.order)} · ${t.of(now.stop.order, data.route.stopCount)} · ${now.stop.built[lang]} · ${t.outside}</p>
          <h1>${now.stop.name[lang]}</h1>
          <div class="gb-reading">
            <p class="gb-text" data-follow>${storyText(story, story.current - 1)}</p>
            <i class="gb-rule" aria-hidden="true"></i>
          </div>
          <p class="gb-footnote"><sup>1</sup> ${t.source(story.source, date)}</p>
          <p class="gb-made">${t.made}</p>
          <div class="gb-player">
            ${player(story, lang)}
            ${nextLine(data, lang)}
          </div>
          <p class="gb-webnote">${t.webNote}</p>
        </div>
      </div>
    </div>`,
  };
}

/**
 * Puts the marginal rule beside the sentence being spoken, and brings that
 * sentence into the reading window, as the text does when it follows the audio.
 * @param {Element} root
 */
function settle(root) {
  for (const reading of root.querySelectorAll('.gb-reading')) {
    const text = reading.querySelector('.gb-text');
    const current = reading.querySelector('.is-current');
    const rule = reading.querySelector('.gb-rule');
    if (
      !(reading instanceof HTMLElement) ||
      !(text instanceof HTMLElement) ||
      !(current instanceof HTMLElement) ||
      !(rule instanceof HTMLElement)
    )
      continue;
    const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
    // The window shows whole lines only.
    text.style.maxHeight = '';
    text.style.maxHeight = `${Math.floor(reading.clientHeight / lineHeight) * lineHeight}px`;
    const rects = current.getClientRects();
    if (rects.length === 0) continue;
    const zoom = text.getBoundingClientRect().width / text.offsetWidth || 1;
    const textTop = text.getBoundingClientRect().top;
    rule.style.top = `${(rects[0].top - textTop) / zoom + 4}px`;
    rule.style.height = `${(rects[rects.length - 1].bottom - rects[0].top) / zoom - 8}px`;
  }
}

/** A piece of the plan around the first Places, for the sheet of the direction. */
function sample(
  /** @type {any} */ data,
  /** @type {'ru' | 'en'} */ lang,
  /** @type {{ width: number, height: number }} */ { width, height },
) {
  const around = data.stops.filter((/** @type {any} */ s) => s.order >= 2 && s.order <= 6);
  const view = fitView(
    around.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
    width,
    height,
    { top: 60, right: 80, bottom: 60, left: 80 },
  );
  return mapSvg(data, {
    view,
    lang,
    layers: BASE_LAYERS,
    labels: { max: 6, size: 11, clearOf: routeSamples(data) },
    defs: patterns,
    under: (ctx) => textures(ctx),
    over: (ctx) => overlay(data, lang, ctx, { current: 2 }),
    label: 'The plan',
  });
}

/**
 * Moves the reading to another sentence, as the text does when it follows the voice.
 * @param {Element} root @param {any} story @param {number} index
 */
function follow(root, story, index) {
  const text = root.querySelector('.gb-text');
  const track = root.querySelector('.gb-track');
  const elapsed = root.querySelector('.gb-timeline span');
  if (!(text instanceof HTMLElement) || !(track instanceof HTMLElement) || !elapsed) return;
  text.innerHTML = storyText({ ...story, current: index }, Math.max(0, index - 1));
  const at = story.sentences[index].startsAt + 1;
  track.style.setProperty('--played', `${(at / story.total) * 100}%`);
  elapsed.textContent = format.playback(at);
  settle(root);
}

const sheet = {
  reason: [
    'Before a phone, the companion of a walk was a printed guide. It solved the problem this product has set itself: it took a stranger through a city along a suggested way, and it stood behind what it said. Its forms are still the clearest ones for that job — a plan with numbered buildings and a key, text set to be read on the move, the source at the foot of the page.',
    'The product promises facts with sources (PRODUCT-SPEC §1.3). In this direction the source is not a control hidden behind an icon: it is where a reader has always looked for it, in a footnote, and the mark that leads to it is the numeral readers already know.',
    'It is the calmest of the three and the one that asks for the most reading. It suits a person who chose Guided Mode because they want to know, not only to arrive.',
  ],
  roots: [
    {
      what: 'The printed guide.',
      lesson:
        'Baedeker’s guides carried maps, routes and descriptions of noteworthy buildings written by specialists. Taken from there: a plan and its text belong together, tied by numbers.',
      source: 'Wikipedia, “Baedeker”',
      url: 'https://en.wikipedia.org/w/index.php?oldid=1386387435',
    },
    {
      what: 'The engraved city plan.',
      lesson:
        'Nolli’s plan of Rome, engraved in 1748, and the figure-ground diagram draw a city as built against unbuilt. Here the built is a tone, the streets are the paper, and the Places of the Route are the only solid red: the plan shows the very walls a Story is about.',
      source: 'Wikipedia, “Giambattista Nolli”',
      url: 'https://en.wikipedia.org/w/index.php?oldid=1385710114',
    },
    {
      what: 'A face made for reading on screens.',
      lesson:
        'Literata was made as the typeface of a book-reading application and redrawn by TypeTogether as a variable family for digital text; its project page lists a Modern Cyrillic 2021 award.',
      source: 'Literata, project page',
      url: 'https://github.com/googlefonts/literata',
    },
  ],
  typeNote:
    'One family for everything: Literata, with its optical sizes — the same letter is drawn finer in a title and sturdier in a caption — and its upright italic, used for whatever is said in passing: the why of a Place, a walking leg, a caption of the plan. Numerals are lining, and tabular wherever times stand in a column. SIL Open Font License 1.1.',
  type: [
    {
      role: 'Title',
      face: 'Literata 480–500, optical size taken from the size',
      css: "font: 480 40px/1.1 'Literata'; letter-spacing: -0.012em",
      ru: 'Костёл Святого Симеона и Святой Елены',
      en: 'Church of Saints Simon and Helena',
    },
    {
      role: 'Story text',
      face: 'Literata 400, 18.5 on 27',
      css: "font: 400 19px/1.45 'Literata'",
      ru: 'Храм был целиком построен из красного кирпича, что принесло ему народное прозвище «Красный костёл».',
      en: 'The bricks for its walls were sourced from Częstochowa, while the roof tiles came from Włocławek.',
    },
    {
      role: 'Said in passing',
      face: 'Literata Italic 400',
      css: "font: italic 400 16px/1.4 'Literata'",
      ru: '1910 год — эпоха из вашего пожелания · охраняется как наследие',
      en: '1910 — the period you asked for · heritage-listed',
    },
    {
      role: 'Label',
      face: 'Literata 650, capitals, tracked',
      css: "font: 650 12px/1.3 'Literata'; letter-spacing: 0.11em; text-transform: uppercase",
      ru: 'Маршрут · вариант 1 из 3 · ключ к плану',
      en: 'Route · option 1 of 3 · key to the plan',
    },
    {
      role: 'Numerals',
      face: 'Literata 500, lining and tabular',
      css: "font: 500 30px/1.2 'Literata'; font-variant-numeric: lining-nums tabular-nums",
      ru: '14:28 · 5,7 км · 2 ч 45 мин',
      en: '14:28 · 5.7 km · 2 h 45 min',
    },
  ],
  colourNote:
    'Paper, ink and one rubric red, as in a book printed in two colours. The red is never decoration: it marks what belongs to the Route — its line, its Places, the sentence being spoken, a footnote mark. In the dark theme the page becomes a night edition: the same inks on dark paper, the red lifted so that it still reads.',
  colours: [
    { token: '--paper', role: 'Paper' },
    { token: '--paper-2', role: 'Paper, shaded' },
    { token: '--ink', role: 'Ink' },
    { token: '--ink-2', role: 'Second ink' },
    { token: '--rule', role: 'Rule' },
    { token: '--rubric', role: 'Rubric' },
    { token: '--m-ground', role: 'Plan: ground' },
    { token: '--m-building', role: 'Plan: built' },
    { token: '--m-street', role: 'Plan: street' },
  ],
  pairs: [
    { text: '--ink', on: '--paper', what: 'Ink on paper' },
    { text: '--ink-2', on: '--paper', what: 'Second ink on paper' },
    { text: '--ink-2', on: '--paper-2', what: 'Second ink on shaded paper' },
    { text: '--rubric', on: '--paper', what: 'Rubric on paper' },
    { text: '--ink-2', on: '--m-street', what: 'Street name on a street' },
    { text: '--rubric', on: '--m-ground', what: 'Route on the plan', large: true },
  ],
  mapNote:
    'An engraved plan. Streets keep their true width and are left as paper; what is built is a flat tone; water is hatched and green is stippled, as a plate would have them; the railway is the ladder line of old plans. Street names run along the streets in italic. The Route is a red line, and every Place on it is drawn twice: as its number, and as its own footprint filled in red. Nothing here is beyond a MapLibre style — fills, two fill patterns, lines with casings and dashes, text along a line (ADR-0008).',
  storyNote:
    'A page to read. The text is continuous prose; the sentence being spoken is in full ink and a red rule stands beside it in the margin, while what was said and what is to come stay in the second ink — still readable, because the text is also for those who cannot hear it (NFR-27). A superscript numeral leads to the source at the foot of the page, as a footnote does. Below, the player is a colophon: one large control, and a line with a tick for every sentence.',
  motion: [
    {
      moment: 'The text follows the voice.',
      how: 'The marginal rule glides to the next sentence in 420 ms and the ink changes with it; the page moves by whole lines, never by pixels.',
    },
    {
      moment: 'Arriving.',
      how: 'The number of the Place is stamped: it appears a little large and settles in 280 ms, once, with no bounce. The plan eases to the Place.',
    },
    {
      moment: 'A Story starting by itself.',
      how: 'The page of the previous Place lifts away upward and the new chapter head is already there — a page turned, 360 ms.',
    },
    {
      moment: 'The Route recalculated.',
      how: 'The red line is redrawn along the streets from where the person stands; a Place that left the Route loses its red and stays on the plan as an ordinary building.',
    },
  ],
  platforms: [
    {
      system: 'iOS.',
      how: 'The plan runs under the status bar and round controls float on it; the actions sit in a bar above the home indicator. Controls are 44 points and more.',
    },
    {
      system: 'Android.',
      how: 'A top app bar with the arrow back, the plan under it; the primary action is an extended floating button. Controls are 48 dp and more.',
    },
    {
      system: 'Web.',
      how: 'A spread: the plan as a plate with a double neat line and a caption on the left, the page on the right. Stories are started by hand, and the page says so.',
    },
  ],
  risks: [
    'It asks for the most reading. In bright sun the second ink of the spoken text is the first thing to try on a real phone.',
    'A serif on warm paper can drift toward nostalgia. The plan and the red have to stay sharp and the layouts spare, or it becomes a period piece.',
    'The plan is the densest map of the three: with a whole Route on a phone, the footprints of the Places are small.',
  ],
};

export const guidebook = {
  id: 'guidebook',
  name: { en: 'Guidebook', ru: 'Путеводитель' },
  idea: 'The city as a book you walk through: an engraved plan with a numbered key, a Story set as a page, its source in a footnote.',
  screens: { route, outing },
  web: { route: webRoute, outing: webOuting },
  settle,
  sample,
  follow,
  sheet,
};
