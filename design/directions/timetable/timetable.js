/**
 * The chosen direction: Timetable, with the guide of Guidebook.
 *
 * The owner's decision after the second round: Timetable is the base, and
 * the way the guide speaks comes from Guidebook. So two voices share a screen
 * and are told apart by type. What the timetable says — times, the verdict,
 * the line, the controls — is set in a sans and in numerals, on glass over a
 * map that fills the screen. What the guide says — why a Place is here, the
 * Story, its source — is set in a serif, on a solid page under a photograph
 * of the Place.
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
    photo: 'Фото',
    source: (/** @type {any} */ s, /** @type {string} */ date) =>
      `${s.work}, статья «${s.article}», версия от ${date}. ${s.licence}.`,
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
    photo: 'Photo',
    source: (/** @type {any} */ s, /** @type {string} */ date) =>
      `${s.work}, “${s.article}”, revision of ${date}. ${s.licence}.`,
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
  // From Guidebook: the map shows the very walls a Story is about.
  const feet = data.stops
    .map((/** @type {any} */ s) => `<use href="#m-foot-${s.order}" class="tt-foot"/>`)
    .join('');
  return `${feet}${line(data, 0)}${ticks}${start}${stations}`;
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

/**
 * The text of a Story as the guide's page has it: continuous prose, the
 * sentence being spoken marked, and inside it the words already said.
 * @param {any} story
 * @param {number} from the first sentence shown: what was spoken before it has scrolled away
 */
function storyText(story, from = 0) {
  return story.sentences
    .map((/** @type {any} */ s, /** @type {number} */ i) => {
      if (i < from) return '';
      if (i !== story.current) return `<span class="tt-sentence">${s.text}</span>`;
      const next = story.sentences[i + 1];
      const end = next ? next.startsAt : story.total;
      const share = Math.min(1, Math.max(0, (story.elapsed - s.startsAt) / (end - s.startsAt)));
      const words = s.text.split(' ');
      const spoken = Math.round(words.length * share);
      const rest = spoken < words.length ? ` ${words.slice(spoken).join(' ')}` : '';
      return `<span class="tt-sentence is-current"><b>${words.slice(0, spoken).join(' ')}</b>${rest}<sup>1</sup></span>`;
    })
    .join(' ');
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

/**
 * The page of the guide: the photograph of the Place with its author, the
 * name, the Story as prose, its source in a footnote. A solid page: it is read.
 * @param {any} data @param {'ru' | 'en'} lang @param {number} from
 */
function guide(data, lang, from) {
  const t = T[lang];
  const now = data.outingNow;
  const story = now.story[lang];
  const date = format.date(story.source.revision_date, lang);
  return `<article class="tt-guide">
    <figure class="tt-guide-photo">
      <img src="${now.stop.photo.src}" alt="" />
      <span class="tt-guide-chip lg lg-clear"><i>${now.stop.order}</i><b>${now.stop.arrive}</b>${t.stay(now.stop.leave)}</span>
      <figcaption>${t.photo}: ${now.stop.photo.author} · ${now.stop.photo.licence}</figcaption>
    </figure>
    <div class="tt-guide-body">
      <p class="tt-guide-kind">${kindIcon(now.stop.kind)}${now.stop.built[lang]} · ${t.seenOutside}</p>
      <h1>${now.stop.name[lang]}</h1>
      <div class="tt-reading">
        <p class="tt-text">${storyText(story, from)}</p>
        <i class="tt-rule" aria-hidden="true"></i>
      </div>
      <p class="tt-footnote"><sup>1</sup> ${t.source(story.source, date)}</p>
      <p class="tt-made">${icons.shield}${t.made}</p>
    </div>
  </article>`;
}

/** The controls, in a capsule of glass over the page. @param {any} data @param {'ru' | 'en'} lang */
function player(data, lang) {
  const t = T[lang];
  const now = data.outingNow;
  return `<section class="tt-player lg">
    ${voice(now.story[lang])}
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

/**
 * Whether one is on time, and under it the whole Outing as a strip to scale:
 * stations as dots, "now" as a light.
 * @param {any} data @param {'ru' | 'en'} lang @param {number} minute
 */
function board(data, lang, minute) {
  const t = T[lang];
  const x = (/** @type {number} */ m) => `${((m / data.route.totalMinutes) * 100).toFixed(2)}%`;
  const dots = data.stops
    .map((/** @type {any} */ s) => {
      const state = s.leaveMin <= minute ? 'is-done' : s.arriveMin <= minute ? 'is-current' : '';
      return `<i class="tt-strip-dot ${state}" style="left:${x(s.arriveMin + 4)}"></i>`;
    })
    .join('');
  return `<div class="tt-board lg">
    <p class="tt-status"><i class="tt-lamp"></i><b>${t.onTime}</b><span>${t.backAt(data.route.finish)}</span></p>
    <div class="tt-strip" aria-label="${data.route.start} – ${data.route.finish}">
      <span>${data.route.start}</span>
      <div class="tt-strip-line"><i class="tt-strip-done" style="width:${x(minute)}"></i>${dots}<i class="tt-strip-now" style="left:${x(minute)}"></i></div>
      <span>${data.route.finish}</span>
    </div>
  </div>`;
}

/** @param {{ os: import('../shared/frames.js').Os, lang: 'ru' | 'en', data: any }} ctx */
function outing({ os, lang, data }) {
  const t = T[lang];
  const { width } = SIZES[os];
  const android = os === 'android';
  const now = data.outingNow;
  const story = now.story[lang];
  // A few steps before the Place: the Story has begun on the approach.
  const minute = now.stop.arriveMin - 0.6;
  const here = positionAt(data, minute);
  const mapHeight = 304;
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
    near: 150,
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
        ${board(data, lang, now.stop.arriveMin + 1)}
        <button class="tt-round lg lg-clear" aria-label="More">${android ? icons.moreAndroid : icons.moreIos}</button>
      </header>
      <span class="tt-osm tt-osm-outing">© OpenStreetMap</span>
      ${guide(data, lang, story.current - 1)}
      ${player(data, lang)}
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
    { top: 110, right: 340, bottom: 250, left: 550 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: FLAT,
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
      ${guide(data, lang, 0)}
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
 * Puts the rule beside the sentence being spoken, and keeps the reading
 * window to whole lines.
 * @param {Element} root
 */
function settle(root) {
  for (const reading of root.querySelectorAll('.tt-reading')) {
    const text = reading.querySelector('.tt-text');
    const current = reading.querySelector('.is-current');
    const rule = reading.querySelector('.tt-rule');
    if (
      !(reading instanceof HTMLElement) ||
      !(text instanceof HTMLElement) ||
      !(current instanceof HTMLElement) ||
      !(rule instanceof HTMLElement)
    ) {
      continue;
    }
    const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
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

/**
 * Moves the reading to another sentence, as the text does when it follows the voice.
 * @param {Element} root @param {any} story @param {number} index
 */
function follow(root, story, index) {
  const text = root.querySelector('.tt-text');
  if (!text) return;
  const next = story.sentences[index + 1];
  const startsAt = story.sentences[index].startsAt;
  const moved = {
    ...story,
    current: index,
    elapsed: startsAt + ((next ? next.startsAt : story.total) - startsAt) * 0.5,
  };
  text.innerHTML = storyText(moved, Math.max(0, index - 1));
  const old = root.querySelector('.tt-voice');
  if (old) old.outerHTML = voice(moved);
  settle(root);
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
