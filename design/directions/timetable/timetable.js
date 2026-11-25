/**
 * Direction "Timetable", second round.
 *
 * The idea is the first round's: the promise of the product is time, so the
 * Route is a line drawn to time and colour says whether one is on time. The
 * owner asked for depth, effects, icons and Liquid Glass after Apple. So the
 * map now fills the screen and is the content; everything else is a layer of
 * glass over it; and while one walks, the map is seen at an angle with the way
 * ahead up.
 */
import { format } from '../shared/data.js';
import { SIZES, icons } from '../shared/frames.js';
import {
  bearingAt,
  fitView,
  mapSvg,
  pinned,
  pitchedMap,
  positionAt,
  routePath,
  routeSamples,
  spread,
} from '../shared/map.js';

const T = {
  ru: {
    kicker: 'Вариант 1 из 3',
    title: 'Архитектура начала XX века, без музеев',
    out: 'Выход',
    back: 'У вокзала',
    fits: (/** @type {any} */ r) => `Укладывается в ${format.duration(r.budgetMinutes, 'ru')}`,
    reserve: (/** @type {any} */ r) => `запас ${format.duration(r.reserveMinutes, 'ru')}`,
    checked: (/** @type {string} */ at) => `проверен в ${at}`,
    places: (/** @type {number} */ n) => `${n} мест`,
    outside: 'все снаружи',
    station: 'Вокзал',
    departure: 'выход',
    arrival: 'возвращение',
    start: 'Начать прогулку',
    pack: 'Пакет',
    onTime: 'По графику',
    backAt: (/** @type {string} */ at) => `у вокзала в ${at}`,
    stay: (/** @type {string} */ until) => `здесь до ${until}`,
    seenOutside: 'снаружи',
    made: 'Создано автоматически · проверено куратором',
    next: 'Далее',
    open: 'Открыть в приложении',
    webNote:
      'В браузере рассказ включают вручную. По прибытии сам и без сети он звучит в приложении.',
    revision: (/** @type {string} */ date) => `версия от ${date}`,
    theLine: 'Линия прогулки',
  },
  en: {
    kicker: 'Option 1 of 3',
    title: 'Early <span class="tt-nowrap">20th-century</span> architecture, no museums',
    out: 'Leave',
    back: 'At the station',
    fits: (/** @type {any} */ r) => `Fits your ${format.duration(r.budgetMinutes, 'en')}`,
    reserve: (/** @type {any} */ r) => `${format.duration(r.reserveMinutes, 'en')} to spare`,
    checked: (/** @type {string} */ at) => `checked at ${at}`,
    places: (/** @type {number} */ n) => `${n} places`,
    outside: 'all from outside',
    station: 'Station',
    departure: 'leave',
    arrival: 'back',
    start: 'Start the outing',
    pack: 'Pack',
    onTime: 'On time',
    backAt: (/** @type {string} */ at) => `station by ${at}`,
    stay: (/** @type {string} */ until) => `here until ${until}`,
    seenOutside: 'outside',
    made: 'Written automatically · verified by a curator',
    next: 'Next',
    open: 'Open in the app',
    webNote:
      'In a browser you start a story yourself. In the app it begins as you arrive, and plays without a network.',
    revision: (/** @type {string} */ date) => `revision of ${date}`,
    theLine: 'The line of the outing',
  },
};

const FLAT = [
  'green',
  'water',
  'roads_minor',
  'roads_mid',
  'roads_major',
  'buildings',
  'rail',
  'rail:ties',
];
const GROUND = ['green', 'water', 'roads_minor', 'roads_mid', 'roads_major', 'rail', 'rail:ties'];

/** @param {string} clock @param {number} minutes */
const clockPlus = (clock, minutes) => {
  const [h, m] = clock.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** The icon of a kind of Place. @param {string} kind */
const kindIcon = (kind) => icons[/** @type {keyof typeof icons} */ (kind)] ?? icons.building;

/** The line as it lies on the ground: a glow, a casing, the line, and the part ahead in motion. */
const line = (/** @type {any} */ data, /** @type {number} */ walkedLegs) => {
  const ahead = routePath(data, walkedLegs);
  const walked =
    walkedLegs > 0 ? `<path class="tt-line-walked" d="${routePath(data, 0, walkedLegs)}"/>` : '';
  return `${walked}<path class="tt-line-glow" d="${ahead}"/><path class="tt-line-case" d="${ahead}"/><path class="tt-line" d="${ahead}"/><path class="tt-line-march" d="${ahead}"/>`;
};

/**
 * @param {any} data @param {'ru' | 'en'} lang @param {{ u: number }} ctx
 * @param {{ current?: number, marks?: boolean }} state
 */
function overlay(data, lang, { u }, state = {}) {
  const { current = 0, marks = true } = state;
  const at = spread(
    data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
    25 * u,
  );
  let ticks = '';
  if (marks) {
    for (let m = 30; m < data.route.totalMinutes; m += 30) {
      const p = positionAt(data, m);
      if ('atStop' in p) continue;
      if (at.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 30 * u)) continue;
      const label = clockPlus(data.route.start, m);
      ticks += pinned(
        p.x,
        p.y,
        u,
        `<rect x="-19" y="-10" width="38" height="20" rx="10"/><text y="4" text-anchor="middle">${label}</text>`,
        'tt-mark',
      );
    }
  }
  const stations = data.stops
    .map((/** @type {any} */ s, /** @type {number} */ i) =>
      pinned(
        at[i].x,
        at[i].y,
        u,
        `<circle class="tt-station-shade" r="12" cy="1.5"/><circle r="11.5"/><text y="4" text-anchor="middle">${s.order}</text>`,
        `tt-station${s.order === current ? ' is-current' : ''}`,
      ),
    )
    .join('');
  const start = pinned(
    data.map.start.street_x,
    data.map.start.street_y,
    u,
    `<rect class="tt-terminus-mark" x="-8" y="-8" width="16" height="16" rx="4"/><text x="15" y="4.5">${T[lang].station}</text>`,
    'tt-terminus',
  );
  return `${line(data, 0)}${ticks}${start}${stations}`;
}

/**
 * The chart: every minute of the Outing takes the same height.
 * @param {any} data @param {'ru' | 'en'} lang
 * @param {{ scale: number, minute?: number, compact?: boolean, until?: number, selected?: number }} options
 */
function chart(
  data,
  lang,
  { scale, minute, compact = false, until = data.route.totalMinutes, selected },
) {
  const t = T[lang];
  const y = (/** @type {number} */ m) => Math.round(m * scale);
  const total = data.route.totalMinutes;
  const head = 22;
  let html = '';
  html += `<i class="tt-spine" style="top:${head}px;height:${y(Math.min(until, total))}px"></i>`;
  if (minute !== undefined) {
    html += `<i class="tt-spine is-done" style="top:${head}px;height:${y(Math.min(minute, total))}px"></i>`;
  }
  html += `<div class="tt-row tt-row-end" style="top:${head - 19}px"><b>${data.route.start}</b><i class="tt-square">${icons.station}</i><span class="tt-row-name">${data.route.startName[lang]}<small>${t.departure}</small></span></div>`;
  let leave = 0;
  for (const s of data.stops) {
    if (s.arriveMin > until) break;
    const legTop = y(leave) + head;
    const legHeight = y(s.arriveMin) - y(leave);
    if (legHeight >= (compact ? 22 : 14)) {
      html += `<span class="tt-leg" style="top:${legTop}px;height:${legHeight}px">${icons.walk}${format.duration(s.legMinutes, lang)}${compact ? '' : ` · ${format.distance(s.legMetres, lang)}`}</span>`;
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
      ${compact ? '' : `<img class="tt-row-photo" src="${s.photo.src}" alt="" loading="lazy" />`}
    </div>`;
    leave = s.leaveMin;
  }
  if (until >= total) {
    const legHeight = y(total) - y(leave);
    if (legHeight >= (compact ? 22 : 14)) {
      html += `<span class="tt-leg" style="top:${y(leave) + head}px;height:${legHeight}px">${icons.walk}${format.duration(data.route.backMinutes, lang)}</span>`;
    }
    html += `<div class="tt-row tt-row-end" style="top:${y(total) + head + 1}px"><b>${data.route.finish}</b><i class="tt-square">${icons.station}</i><span class="tt-row-name">${data.route.startName[lang]}<small>${t.arrival}</small></span></div>`;
  }
  const height = y(Math.min(until, total)) + head + 26;
  return `<div class="tt-chart${compact ? ' is-compact' : ''}" style="height:${height}px" role="list" aria-label="${t.theLine}">${html}</div>`;
}

/** The head of the Route: its two times, its verdict, its measures. @param {any} data @param {'ru' | 'en'} lang */
const head = (data, lang) => {
  const t = T[lang];
  const r = data.route;
  return `<h1>${t.title}</h1>
    <div class="tt-frame">
      <p><span>${t.out}</span><b>${r.start}</b></p>
      <p class="tt-span"><span>${format.duration(r.totalMinutes, lang)}</span><i></i></p>
      <p><span>${t.back}</span><b>${r.finish}</b></p>
    </div>
    <p class="tt-verdict"><i>${icons.check}</i><b>${t.fits(r)}</b><span>${t.reserve(r)}</span></p>
    <ul class="tt-facts">
      <li>${icons.pin}${t.places(r.stopCount)}</li>
      <li>${icons.walk}${format.distance(r.walkingMetres, lang)}</li>
      <li>${icons.eye}${t.outside}</li>
    </ul>`;
};

/** The two actions that float over everything. @param {any} data @param {'ru' | 'en'} lang */
const dock = (data, lang) => `<div class="tt-dock">
    <button class="tt-pack lg">${icons.download}<span><b>${T[lang].pack}</b><small>${data.route.packMegabytes}${format.NBSP}${lang === 'ru' ? 'МБ' : 'MB'}</small></span></button>
    <button class="tt-go lg lg-tint">${icons.play}<span>${T[lang].start}</span></button>
  </div>`;

/** @param {{ os: import('../shared/frames.js').Os, lang: 'ru' | 'en', data: any }} ctx */
function route({ os, lang, data }) {
  const t = T[lang];
  const { width, height } = SIZES[os];
  const android = os === 'android';
  const sheetTop = android ? 352 : 362;
  const view = fitView(
    [
      ...data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
      { x: data.map.start.street_x, y: data.map.start.street_y },
    ],
    width,
    height,
    { top: 116, right: 34, bottom: height - sheetTop + 30, left: 34 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: FLAT,
    labels: { max: 5, size: 10, clearOf: routeSamples(data) },
    over: (ctx) => overlay(data, lang, ctx),
    label: t.theLine,
  });
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="tt tt-route">
      <div class="tt-under">${map}<span class="tt-osm" style="top:${sheetTop - 22}px">© OpenStreetMap</span></div>
      <header class="tt-top">
        <button class="tt-round lg lg-clear" aria-label="Back">${android ? icons.backAndroid : icons.backIos}</button>
        <p class="tt-title lg lg-clear"><b>${t.kicker}</b><span>${t.checked(data.route.checkedAt)}</span></p>
        <span class="tt-group lg lg-clear"><button aria-label="Edit">${icons.edit}</button><button aria-label="Share">${android ? icons.shareAndroid : icons.shareIos}</button></span>
      </header>
      <section class="tt-sheet lg" style="top:${sheetTop}px">
        <i class="tt-grab"></i>
        ${head(data, lang)}
        ${chart(data, lang, { scale: 6, until: 44 })}
      </section>
      ${dock(data, lang)}
    </div>`,
  };
}

/** The sentence being spoken, word by word, with the ones before and after it. @param {any} story */
function said(story) {
  const at = (/** @type {number} */ i) => story.sentences[i];
  const now = at(story.current);
  const next = at(story.current + 1);
  const end = next ? next.startsAt : story.total;
  const share = (story.elapsed - now.startsAt) / (end - now.startsAt);
  const words = now.text.split(' ');
  const spoken = Math.round(words.length * Math.min(1, Math.max(0, share)));
  const marked = words
    .map((/** @type {string} */ w, /** @type {number} */ i) => (i < spoken ? `<b>${w}</b>` : w))
    .join(' ');
  const before = at(story.current - 1);
  return `${before ? `<p class="tt-said-dim tt-said-before">${before.text}</p>` : ''}
    <p class="tt-said-now">${marked}<sup>1</sup></p>
    ${next ? `<p class="tt-said-dim">${next.text}</p>` : ''}`;
}

/** The voice as bars: the played part in the accent, one bar alive. @param {any} story */
function voice(story) {
  const bars = 44;
  const played = Math.round((story.elapsed / story.total) * bars);
  let html = '';
  for (let i = 0; i < bars; i++) {
    // A fixed, uneven outline: speech, not a pattern redrawn on every load.
    const level = 0.28 + 0.72 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.61 + 1));
    html += `<i class="${i < played ? 'is-played' : ''}${i === played ? ' is-live' : ''}" style="height:${Math.round(level * 100)}%"></i>`;
  }
  return `<div class="tt-voice"><span>${format.playback(story.elapsed)}</span><div class="tt-bars">${html}</div><span>${format.playback(story.total)}</span></div>`;
}

/** @param {any} data @param {'ru' | 'en'} lang */
function nowCard(data, lang) {
  const t = T[lang];
  const now = data.outingNow;
  const story = now.story[lang];
  const quote = lang === 'ru' ? ['«', '»'] : ['“', '”'];
  return `<section class="tt-now lg">
    <div class="tt-now-head">
      <img src="${now.stop.photo.src}" alt="" />
      <div>
        <p class="tt-now-meta"><i>${now.stop.order}</i><b>${now.stop.arrive}</b><span>${t.stay(now.stop.leave)}</span></p>
        <h1>${now.stop.name[lang]}</h1>
        <p class="tt-now-kind">${kindIcon(now.stop.kind)}${now.stop.built[lang]} · ${t.seenOutside}</p>
      </div>
    </div>
    <div class="tt-said">${said(story)}</div>
    <p class="tt-cite">${icons.book}<span><b>1</b> ${story.source.work}, ${quote[0]}${story.source.article}${quote[1]}, ${t.revision(format.date(story.source.revision_date, lang))}, ${story.source.licence}</span></p>
    <p class="tt-cite tt-made">${icons.shield}<span>${t.made}</span></p>
    ${voice(story)}
    <div class="tt-keys">
      <button aria-label="Speed">1×</button>
      <button aria-label="Back 10 seconds">${icons.back10}</button>
      <button class="tt-key-main lg lg-tint" aria-label="Pause">${icons.pause}</button>
      <button aria-label="Next">${icons.next}</button>
      <button aria-label="Text">${icons.lines}</button>
    </div>
    <p class="tt-next"><i>${now.next.order}</i><span class="tt-next-body"><small>${t.next} · ${now.next.arrive}</small><span>${now.next.name[lang]}</span></span><span class="tt-next-far">${format.distance(now.next.legMetres, lang)} · ${format.duration(now.next.legMinutes, lang)}</span>${icons.chevronRight}</p>
  </section>`;
}

/** @param {any} data @param {'ru' | 'en'} lang */
const statusPill = (data, lang) =>
  `<p class="tt-status lg"><i class="tt-lamp"></i><b>${T[lang].onTime}</b><span>${T[lang].backAt(data.route.finish)}</span></p>`;

/**
 * The whole Outing as a rail of glass: stations as dots, "now" as a light.
 * @param {any} data @param {number} minute @param {number} height
 */
function rail(data, minute, height) {
  const inner = height - 48;
  const y = (/** @type {number} */ m) => 24 + (m / data.route.totalMinutes) * inner;
  const dots = data.stops
    .map((/** @type {any} */ s) => {
      const state = s.leaveMin <= minute ? 'is-done' : s.arriveMin <= minute ? 'is-current' : '';
      return `<i class="tt-rail-dot ${state}" style="top:${y(s.arriveMin + 4)}px"></i>`;
    })
    .join('');
  return `<aside class="tt-rail lg lg-clear" style="height:${height}px" aria-label="${data.route.start} – ${data.route.finish}">
    <span class="tt-rail-end" style="top:6px">${data.route.start}</span>
    <i class="tt-rail-line" style="top:24px;height:${inner}px"></i>
    <i class="tt-rail-line is-done" style="top:24px;height:${y(minute) - 24}px"></i>
    ${dots}
    <i class="tt-rail-now" style="top:${y(minute)}px"></i>
    <span class="tt-rail-end" style="bottom:6px">${data.route.finish}</span>
  </aside>`;
}

/** @param {{ os: import('../shared/frames.js').Os, lang: 'ru' | 'en', data: any }} ctx */
function outing({ os, lang, data }) {
  const t = T[lang];
  const { width } = SIZES[os];
  const android = os === 'android';
  const now = data.outingNow;
  // A few steps before the Place: the Story has begun on the approach.
  const minute = now.stop.arriveMin - 0.6;
  const here = positionAt(data, minute);
  const mapHeight = android ? 452 : 436;
  const pin = (/** @type {any} */ s, extra = '') => ({
    x: s.x,
    y: s.y,
    className: `tt-pin${extra}`,
    html: `<span class="tt-pin-badge">${kindIcon(s.kind)}<b>${s.order}</b></span>`,
  });
  const map = pitchedMap(data, {
    width,
    height: mapHeight,
    lang,
    layers: GROUND,
    at: here,
    bearing: bearingAt(data, minute),
    u: 1.25,
    near: 285,
    pitch: 52,
    walls: [3, 6, 9, 12, 15],
    over: () =>
      `${line(data, now.stop.order - 1)}<use href="#m-foot-${now.stop.order}" class="tt-foot"/>`,
    standing: [
      pin(now.stop, ' is-current'),
      pin(now.next),
      {
        x: here.x,
        y: here.y,
        className: 'tt-me',
        html: '<span class="tt-me-pulse"></span><span class="tt-me-dot"></span>',
      },
    ],
    label: t.theLine,
  });
  return {
    clock: now.clock,
    inner: `<div class="tt tt-outing">
      <div class="tt-under">${map}</div>
      <header class="tt-top">
        <button class="tt-round lg lg-clear" aria-label="Back">${android ? icons.backAndroid : icons.backIos}</button>
        ${statusPill(data, lang)}
        <button class="tt-round lg lg-clear" aria-label="More">${android ? icons.moreAndroid : icons.moreIos}</button>
      </header>
      ${rail(data, now.stop.arriveMin + 1, 196)}
      <span class="tt-osm tt-osm-outing">© OpenStreetMap</span>
      ${nowCard(data, lang)}
    </div>`,
  };
}

// ── The web ─────────────────────────────────────────────────────────────────

/** @param {'ru' | 'en'} lang */
const webNav = (lang) => `<nav class="tt-webnav lg">
    <span class="tt-wordmark">Promenade</span>
    <span class="tt-langs"><b>${lang === 'ru' ? 'Рус' : 'Eng'}</b>${lang === 'ru' ? 'Eng' : 'Рус'}</span>
    <button class="tt-open lg lg-tint">${T[lang].open}</button>
  </nav>`;

/** @param {{ lang: 'ru' | 'en', data: any }} ctx */
function webRoute({ lang, data }) {
  const t = T[lang];
  const size = SIZES.web;
  const view = fitView(
    [
      ...data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
      { x: data.map.start.street_x, y: data.map.start.street_y },
    ],
    size.width,
    size.height - 44,
    { top: 96, right: 90, bottom: 70, left: 530 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: FLAT,
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

/** @param {{ lang: 'ru' | 'en', data: any }} ctx */
function webOuting({ lang, data }) {
  const t = T[lang];
  const size = SIZES.web;
  const now = data.outingNow;
  const around = data.stops.filter((/** @type {any} */ s) => s.order <= 6);
  const view = fitView(
    around.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
    size.width,
    size.height - 44,
    { top: 130, right: 330, bottom: 120, left: 520 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: FLAT,
    labels: { max: 8, size: 11, clearOf: routeSamples(data) },
    over: (ctx) =>
      `<use href="#m-foot-${now.stop.order}" class="tt-foot"/>${overlay(data, lang, ctx, { current: now.stop.order })}`,
    label: now.stop.name[lang],
  });
  return {
    clock: now.clock,
    address: 'promenade.example/r/early-20th-century/2',
    inner: `<div class="tt tt-web tt-web-outing">
      <div class="tt-under">${map}<span class="tt-osm">© OpenStreetMap</span></div>
      ${webNav(lang)}
      ${nowCard(data, lang)}
      <section class="tt-webchart lg">${chart(data, lang, { scale: 3.5, compact: true, selected: now.stop.order })}</section>
      <p class="tt-webnote lg">${t.webNote}</p>
    </div>`,
  };
}

/** A piece of the map, for the sheet of the direction. */
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
    layers: FLAT,
    labels: { max: 6, size: 10, clearOf: routeSamples(data) },
    over: (ctx) => overlay(data, lang, ctx),
    label: 'The line of the Outing',
  });
}

/**
 * Moves the spoken sentence on, as it follows the voice.
 * @param {Element} root @param {any} story @param {number} index
 */
function follow(root, story, index) {
  const block = root.querySelector('.tt-said');
  if (!block) return;
  const next = story.sentences[index + 1];
  const startsAt = story.sentences[index].startsAt;
  const moved = {
    ...story,
    current: index,
    elapsed: startsAt + ((next ? next.startsAt : story.total) - startsAt) * 0.5,
  };
  block.innerHTML = said(moved);
  const old = root.querySelector('.tt-voice');
  if (old) old.outerHTML = voice(moved);
}

const sheet = {
  reason: [
    'The first thing a person asks of this product is a question about time: will I be back for my train, will the place still be open. The product’s first promise is that the answer has been checked (PRODUCT-SPEC §1.3, RTE-6). Railways built the visual language of time one can trust — the timetable, and the line with its stations — and this direction speaks it.',
    'So the Route is a chart drawn to time: every minute takes the same height. The long leg looks long, the short stops crowd together, and during the Outing “now” is a light on a rail of glass at the edge of the screen.',
    'Round two, at the owner’s request, gives the idea a body. The map is no longer a panel: it fills the screen and is the content. Controls and sheets are Liquid Glass floating over it, as Apple’s guidance has it. While one walks the map is seen at an angle with the way ahead up and the buildings standing; the line glows and moves in the direction of travel; the voice is drawn as bars; every Place has its photograph and the icon of its kind. Green is still the verdict “on time” — and now also the colour of the line itself.',
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
      what: 'Glass where Apple puts it.',
      lesson:
        'Apple describes Liquid Glass as the layer of controls and navigation that floats above content, to be used sparingly on custom controls and not for content itself. Here the content is the map; the sheet, the bars and the keys are the glass.',
      source: 'Apple, Human Interface Guidelines: Materials',
      url: 'https://developer.apple.com/design/human-interface-guidelines/materials',
    },
    {
      what: 'A sheet over a map.',
      lesson:
        'Apple’s guidance keeps the map usable behind a sheet that rests at detents and carries a grabber. The sheet of the Route rests at half height and opens to the whole chart.',
      source: 'Apple, Human Interface Guidelines: Sheets',
      url: 'https://developer.apple.com/design/human-interface-guidelines/sheets',
    },
    {
      what: 'The material exists in the chosen stack.',
      lesson:
        'In Expo SDK 58 the package expo-glass-effect draws the system’s glass on iOS 26 and later and falls back to a plain view everywhere else — which is the decision taken for Android in this round.',
      source: 'Expo, expo-glass-effect',
      url: 'https://github.com/expo/expo/blob/main/packages/expo-glass-effect/README.md',
    },
  ],
  typeNote:
    'Two faces. Unbounded, wide and round, sets what is a number: the two times that frame the Outing, the number of a Place. Onest sets everything that is read — names, sentences, labels — and carries Cyrillic and the Belarusian Latin letters alike. On an iPhone the system’s own face may take the place of Onest; the mockups keep Onest so that they look the same in every browser. Both are under the SIL Open Font License 1.1.',
  type: [
    {
      role: 'Times and numbers',
      face: 'Unbounded 600–700',
      css: "font: 700 54px/1.05 'Unbounded'; font-variant-numeric: tabular-nums; letter-spacing: -0.02em",
      ru: '14:00 — 16:45',
      en: '14:00 — 16:45',
    },
    {
      role: 'Names',
      face: 'Onest 650–700',
      css: "font: 700 28px/1.12 'Onest'; letter-spacing: -0.015em",
      ru: 'Национальный академический театр имени Янки Купалы',
      en: 'Yanka Kupala National Academic Theatre',
    },
    {
      role: 'The sentence being spoken',
      face: 'Onest 600, lit word by word',
      css: "font: 600 22px/1.25 'Onest'; letter-spacing: -0.01em",
      ru: 'Храм был целиком построен из красного кирпича, что принесло ему народное прозвище «Красный костёл».',
      en: 'The bricks for its walls were sourced from Częstochowa, while the roof tiles came from Włocławek.',
    },
    {
      role: 'Text and labels',
      face: 'Onest 400–600',
      css: "font: 500 15px/1.4 'Onest'",
      ru: 'Укладывается в 3 ч · запас 15 мин · проверено в 13:51 · Poliakaŭ',
      en: 'Fits your 3 h · 15 min to spare · checked at 13:51 · Poliakaŭ',
    },
  ],
  colourNote:
    'Glass has no colour of its own: it takes it from the map beneath, so the map carries the palette — cool ground, white streets, soft green and blue. One colour is ours: green, the verdict “on time”, which is therefore the colour of the line, of the person, of “now” and of the one prominent action. Amber will say a warning and red a broken constraint. The contrast of text on glass is measured here against the glass as a solid; over a busy map it is the blur that keeps it, and with “reduce transparency” the glass turns solid.',
  colours: [
    { token: '--surface', role: 'Glass, as a solid' },
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
    { text: '--ink', on: '--surface', what: 'Ink on glass' },
    { text: '--ink-2', on: '--surface', what: 'Second ink on glass' },
    { text: '--accent-ink', on: '--surface', what: '“On time” as text' },
    { text: '--on-accent', on: '--accent', what: 'Label on the green action' },
    { text: '--warn', on: '--surface', what: 'A warning' },
    { text: '--stop', on: '--surface', what: 'A broken constraint' },
    { text: '--line', on: '--m-ground', what: 'The line on the map', large: true },
  ],
  mapNote:
    'The map is the content, and it fills the screen. On the Route it is seen from above: cool ground, white streets of their true width, buildings as a quiet tone, and over them the line — green, with a white casing and a soft glow — its stations as discs and the clock written on it at the half-hours. During the Outing it is seen at an angle, with the direction of travel up: buildings stand, the Place one walks to carries the icon of its kind, the line ahead moves. Pitch, bearing and extruded buildings are things a MapLibre style does (ADR-0008).',
  storyNote:
    'A card of glass over the tilted map. At its head, the photograph of the Place, its number and time; then the sentence being spoken, large, lit word by word as the voice says it, with the sentence before and the one after dimmed; the source and the “written automatically” note as two quiet lines with icons; the voice drawn as bars; five keys, the middle one green. At the left edge a rail of glass holds the whole Outing to scale, with “now” as a light on it.',
  motion: [
    {
      moment: 'The text follows the voice.',
      how: 'Words light one by one at the pace of speech; when a sentence ends the next rises into its place in 300 ms, as lines do in a music player’s lyrics.',
    },
    {
      moment: 'Now.',
      how: 'The mark of the person breathes — a ring grows and fades every two seconds; the line ahead moves towards the next Place; the bar of the voice under the playhead beats.',
    },
    {
      moment: 'Arriving.',
      how: 'The map tilts from above to its walking angle in 600 ms while the card of glass rises from the bottom edge; the station on the rail lights green.',
    },
    {
      moment: 'The Route recalculated.',
      how: 'The line is redrawn along its new course in one stroke; the chart closes or opens the gap, and the two times of the frame roll to their new values.',
    },
  ],
  platforms: [
    {
      system: 'iOS.',
      how: 'Liquid Glass, the system’s own: the sheet, the card, the round controls and the grouped toolbar float over the map; the sheet has a grabber and detents; controls are 44 points and more.',
    },
    {
      system: 'Android.',
      how: 'The same layout on solid Material 3 surfaces with their own elevation; no blur is imitated. The sheet is attached to the edges, corners are 28 dp, controls are 48 dp and more.',
    },
    {
      system: 'Web.',
      how: 'The map fills the window; a panel of glass at the left holds the Route, a capsule at the top right the name, the language and the way into the application. Listening shows the card and the compact chart.',
    },
  ],
  risks: [
    'Glass over a busy map costs legibility in direct sun. The sheets use the regular, more opaque glass; a “bright sunlight” setting that makes them solid belongs in the design system (D-02) and has to be tried outdoors (D-05).',
    'A tilted map with standing buildings under a backdrop blur is the heaviest thing the application will draw. It has to be measured against the battery budget of NFR-7 on a mid-range Android phone before it is promised.',
    'On Android the look is deliberately plainer: solid surfaces. Side by side, the iPhone will look richer.',
    'A chart drawn to time is long on a phone; the sheet shows its beginning and opens to the rest.',
  ],
};

export const timetable = {
  id: 'timetable',
  name: { en: 'Timetable', ru: 'Расписание' },
  idea: 'The walk as a line drawn to time, over a map that fills the screen: glass sheets and keys float above it, the line glows green while you are on time, and on the way the city is seen at an angle with the road ahead up.',
  screens: { route, outing },
  web: { route: webRoute, outing: webOuting },
  sample,
  follow,
  sheet,
};
