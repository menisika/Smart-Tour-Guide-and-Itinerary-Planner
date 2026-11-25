/**
 * Direction "Guidebook", second round.
 *
 * The idea is the first round's: the city as a book one walks through — an
 * engraved plan with a numbered key, a Story set as a page, its source in a
 * footnote. The owner asked for depth, effects, icons and Liquid Glass after
 * Apple. So the plan now fills the screen and the key lies on it as a sheet of
 * frosted glass, like tracing paper over a drawing; every Place has its
 * photograph; and while a Story plays, the page opens under a photograph of
 * the Place, with a loupe of glass that keeps the plan in sight.
 */
import { format } from '../shared/data.js';
import { SIZES, icons } from '../shared/frames.js';
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
    kicker: 'Вариант 1 из 3',
    title: 'Архитектура начала XX века',
    sub: 'без музеев · пешком от вокзала и обратно',
    places: (/** @type {number} */ n) => `${n} мест`,
    checked: (/** @type {string} */ at) => `проверен в ${at}`,
    fits: 'Укладывается в три часа.',
    verdict: (/** @type {any} */ r) =>
      `У вокзала снова в ${r.finish}, за ${r.reserveMinutes} минут до срока; все места осматриваются снаружи.`,
    walk: (/** @type {string} */ min, /** @type {string} */ m) => `${min} пешком · ${m}`,
    start: 'Начать прогулку',
    pack: 'Пакет',
    station: 'Вокзал',
    of: (/** @type {number} */ a, /** @type {number} */ b) => `${a} из ${b}`,
    place: (/** @type {number} */ n) => `Место ${n}`,
    outsideShort: 'снаружи',
    made: 'Создано автоматически · проверено куратором',
    onTime: (/** @type {string} */ at) => `по графику · у вокзала в ${at}`,
    next: 'Далее',
    source: (/** @type {any} */ s, /** @type {string} */ date) =>
      `${s.work}, статья «${s.article}», версия от ${date}. ${s.licence}.`,
    more: 'Ещё',
    open: 'Открыть в приложении',
    webNote:
      'В браузере рассказы включаются вручную. Сами, по мере пути, и без сети они звучат в приложении.',
    photo: 'Фото',
    plan: 'План',
  },
  en: {
    kicker: 'Option 1 of 3',
    title: 'Early <span class="gb-nowrap">20th-century</span> architecture',
    sub: 'no museums · on foot from the station and back',
    places: (/** @type {number} */ n) => `${n} places`,
    checked: (/** @type {string} */ at) => `checked at ${at}`,
    fits: 'It fits your three hours.',
    verdict: (/** @type {any} */ r) =>
      `Back at the station at ${r.finish}, ${r.reserveMinutes} minutes before your limit; every place is seen from outside.`,
    walk: (/** @type {string} */ min, /** @type {string} */ m) => `${min} on foot · ${m}`,
    start: 'Start the outing',
    pack: 'Pack',
    station: 'Station',
    of: (/** @type {number} */ a, /** @type {number} */ b) => `${a} of ${b}`,
    place: (/** @type {number} */ n) => `Place ${n}`,
    outsideShort: 'from outside',
    made: 'Written automatically · verified by a curator',
    onTime: (/** @type {string} */ at) => `on time · at the station by ${at}`,
    next: 'Next',
    source: (/** @type {any} */ s, /** @type {string} */ date) =>
      `${s.work}, “${s.article}”, revision of ${date}. ${s.licence}.`,
    more: 'More',
    open: 'Open in the app',
    webNote:
      'In a browser you start each story yourself. In the app they begin as you arrive, and play without a network.',
    photo: 'Photo',
    plan: 'Plan',
  },
};

const LAYERS = [
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

/** The icon of a kind of Place. @param {string} kind */
const kindIcon = (kind) => icons[/** @type {keyof typeof icons} */ (kind)] ?? icons.building;

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
 * @param {any} data @param {'ru' | 'en'} lang @param {{ u: number }} ctx
 * @param {{ current?: number, walkedLegs?: number, position?: { x: number, y: number }, bare?: boolean }} state
 */
function overlay(data, lang, { u }, state = {}) {
  const { current = 0, walkedLegs = 0, position, bare = false } = state;
  const r = 11.5;
  const footprints = data.stops
    .map(
      (/** @type {any} */ s) =>
        `<use href="#m-foot-${s.order}" class="gb-foot${s.order === current ? ' is-current' : ''}"/>`,
    )
    .join('');
  const walked =
    walkedLegs > 0 ? `<path class="gb-route-walked" d="${routePath(data, 0, walkedLegs)}"/>` : '';
  const ahead = routePath(data, walkedLegs);
  const way = `<path class="gb-route-glow" d="${ahead}"/><path class="gb-route-case" d="${ahead}"/><path class="gb-route" d="${ahead}"/>`;
  const at = spread(
    data.stops.map((/** @type {any} */ s) => ({ x: s.streetX, y: s.streetY })),
    (r * 2 + 2) * u,
  );
  const stops = bare
    ? ''
    : data.stops
        .map((/** @type {any} */ s, /** @type {number} */ i) =>
          pinned(
            at[i].x,
            at[i].y,
            u,
            `<circle class="gb-stop-shade" r="12" cy="1.5"/><circle r="${r}"/><text y="4.3" text-anchor="middle">${s.order}</text>`,
            `gb-stop${s.order === current ? ' is-current' : ''}`,
          ),
        )
        .join('');
  const start = bare
    ? ''
    : pinned(
        data.map.start.street_x,
        data.map.start.street_y,
        u,
        `<rect x="-6" y="-6" width="12" height="12" transform="rotate(45)"/><text class="gb-start-label" x="13" y="4.5">${T[lang].station}</text>`,
        'gb-start',
      );
  const me = position
    ? pinned(
        position.x,
        position.y,
        u,
        '<circle class="gb-me-halo" r="15"/><circle class="gb-me" r="6.5"/>',
        'gb-position',
      )
    : '';
  return `${footprints}${walked}${way}${start}${stops}${me}`;
}

/** @param {any} data @param {'ru' | 'en'} lang @param {number} limit */
function keyList(data, lang, limit) {
  const t = T[lang];
  return data.stops
    .slice(0, limit)
    .map(
      (/** @type {any} */ s) => `
      <li class="gb-leg">${icons.walk}${t.walk(format.duration(s.legMinutes, lang), format.distance(s.legMetres, lang))}</li>
      <li class="gb-entry">
        <span class="gb-num">${s.order}</span>
        <img src="${s.photo.src}" alt="" loading="lazy" />
        <span class="gb-entry-body"><span class="gb-entry-name">${s.name[lang]}</span><span class="gb-entry-why">${s.why[lang]}</span></span>
        <span class="gb-entry-time">${s.arrive}</span>
      </li>`,
    )
    .join('');
}

/** The head of the Route. @param {any} data @param {'ru' | 'en'} lang */
const head = (data, lang) => {
  const t = T[lang];
  const r = data.route;
  return `<h1>${t.title}</h1>
    <p class="gb-sub">${t.sub}</p>
    <ul class="gb-facts">
      <li>${icons.pin}${t.places(r.stopCount)}</li>
      <li>${icons.walk}${format.distance(r.walkingMetres, lang)}</li>
      <li>${icons.clock}${format.duration(r.totalMinutes, lang)}</li>
    </ul>
    <p class="gb-verdict"><i>${icons.shield}</i><span><b>${t.fits}</b> ${t.verdict(r)}</span></p>`;
};

/** @param {any} data @param {'ru' | 'en'} lang */
const dock = (data, lang) => `<div class="gb-dock">
    <button class="gb-pack lg">${icons.download}<span><b>${T[lang].pack}</b><small>${data.route.packMegabytes}${format.NBSP}${lang === 'ru' ? 'МБ' : 'MB'}</small></span></button>
    <button class="gb-go lg lg-tint">${icons.play}<span>${T[lang].start}</span></button>
  </div>`;

/** @param {{ os: import('../shared/frames.js').Os, lang: 'ru' | 'en', data: any }} ctx */
function route({ os, lang, data }) {
  const t = T[lang];
  const { width, height } = SIZES[os];
  const android = os === 'android';
  const sheetTop = android ? 350 : 360;
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
    layers: LAYERS,
    labels: { max: 5, size: 10.5, clearOf: routeSamples(data) },
    defs: patterns,
    under: (ctx) => textures(ctx),
    over: (ctx) => overlay(data, lang, ctx),
    label: t.plan,
  });
  return {
    clock: data.route.nowBeforeStart,
    inner: `<div class="gb gb-route">
      <div class="gb-under">${map}<span class="gb-osm" style="top:${sheetTop - 22}px">© OpenStreetMap</span></div>
      <header class="gb-top">
        <button class="gb-round lg lg-clear" aria-label="Back">${android ? icons.backAndroid : icons.backIos}</button>
        <p class="gb-title lg lg-clear"><b>${t.kicker}</b><span>${t.checked(data.route.checkedAt)}</span></p>
        <span class="gb-group lg lg-clear"><button aria-label="Edit">${icons.edit}</button><button aria-label="Share">${android ? icons.shareAndroid : icons.shareIos}</button></span>
      </header>
      <section class="gb-sheet lg" style="top:${sheetTop}px">
        <i class="gb-grab"></i>
        ${head(data, lang)}
        <ol class="gb-key">${keyList(data, lang, 3)}</ol>
      </section>
      ${dock(data, lang)}
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

/** @param {any} data @param {'ru' | 'en'} lang */
function player(data, lang) {
  const t = T[lang];
  const story = data.outingNow.story[lang];
  const next = data.outingNow.next;
  const ticks = story.sentences
    .slice(1)
    .map((/** @type {any} */ s) => `<i style="left:${(s.startsAt / story.total) * 100}%"></i>`)
    .join('');
  return `<section class="gb-player lg">
    <div class="gb-timeline">
      <span>${format.playback(story.elapsed)}</span>
      <span class="gb-track" style="--played:${(story.elapsed / story.total) * 100}%">${ticks}<b></b></span>
      <span>${format.playback(story.total)}</span>
    </div>
    <div class="gb-controls">
      <button aria-label="Speed">1×</button>
      <button aria-label="Back 10 seconds">${icons.back10}</button>
      <button class="gb-main lg lg-tint" aria-label="Pause">${icons.pause}</button>
      <button aria-label="Next">${icons.next}</button>
      <button aria-label="${t.more}">${t.more}</button>
    </div>
    <p class="gb-next"><span class="gb-num">${next.order}</span><span class="gb-next-body"><small>${t.next} · ${next.arrive}</small><span>${next.name[lang]}</span></span><span class="gb-next-far">${format.distance(next.legMetres, lang)} · ${format.duration(next.legMinutes, lang)}</span>${icons.chevronRight}</p>
  </section>`;
}

/** The page of a Story: where it is, what it says, where that comes from. @param {any} data @param {'ru' | 'en'} lang */
function page(data, lang, from = 0) {
  const t = T[lang];
  const now = data.outingNow;
  const story = now.story[lang];
  const date = format.date(story.source.revision_date, lang);
  return `<p class="gb-kicker">${kindIcon(now.stop.kind)}${t.place(now.stop.order)} · ${now.stop.built[lang]} · ${t.outsideShort}</p>
    <h1>${now.stop.name[lang]}</h1>
    <div class="gb-reading">
      <p class="gb-text">${storyText(story, from)}</p>
      <i class="gb-rule" aria-hidden="true"></i>
    </div>
    <p class="gb-footnote"><sup>1</sup> ${t.source(story.source, date)}</p>
    <p class="gb-made">${icons.shield}${t.made}</p>`;
}

/** The photograph of the Place, credited where it is shown. @param {any} stop @param {'ru' | 'en'} lang */
const hero = (stop, lang) =>
  `<figure class="gb-hero"><img src="${stop.photo.src}" alt="" /><figcaption>${T[lang].photo}: ${stop.photo.author} · ${stop.photo.licence}</figcaption></figure>`;

/** @param {{ os: import('../shared/frames.js').Os, lang: 'ru' | 'en', data: any }} ctx */
function outing({ os, lang, data }) {
  const t = T[lang];
  const android = os === 'android';
  const now = data.outingNow;
  const story = now.story[lang];
  const here = positionAt(data, now.stop.arriveMin + 1);
  // The loupe: the plan around the person, at about a metre to a pixel.
  const size = 104;
  const u = 2.3;
  const view = {
    x: here.x - (size * u) / 2,
    y: now.stop.y - (size * u) / 2 + 20,
    w: size * u,
    h: size * u,
    u,
  };
  const loupe = mapSvg(data, {
    view,
    lang,
    layers: LAYERS,
    defs: patterns,
    under: (ctx) => textures(ctx),
    over: (ctx) =>
      overlay(data, lang, ctx, {
        current: now.stop.order,
        walkedLegs: now.stop.order,
        position: here,
        bare: true,
      }),
    label: t.plan,
  });
  return {
    clock: now.clock,
    inner: `<div class="gb gb-outing">
      ${hero(now.stop, lang)}
      <header class="gb-top">
        <button class="gb-round lg lg-clear" aria-label="Back">${android ? icons.backAndroid : icons.backIos}</button>
        <p class="gb-title lg lg-clear"><b>${t.of(now.stop.order, data.route.stopCount)}</b><span>${t.onTime(data.route.finish)}</span></p>
        <button class="gb-round lg lg-clear" aria-label="${t.plan}">${icons.list}</button>
      </header>
      <button class="gb-loupe lg" aria-label="${t.plan}"><span>${loupe}</span></button>
      <article class="gb-page">${page(data, lang, story.current - 1)}</article>
      ${player(data, lang)}
    </div>`,
  };
}

// ── The web ─────────────────────────────────────────────────────────────────

/** @param {'ru' | 'en'} lang */
const webNav = (lang) => `<nav class="gb-webnav lg">
    <span class="gb-wordmark">Promenade</span>
    <span class="gb-langs"><b>${lang === 'ru' ? 'Рус' : 'Eng'}</b>${lang === 'ru' ? 'Eng' : 'Рус'}</span>
    <button class="gb-open lg lg-tint">${T[lang].open}</button>
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
    { top: 96, right: 90, bottom: 70, left: 540 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: LAYERS,
    labels: { max: 12, size: 11.5, clearOf: routeSamples(data) },
    defs: patterns,
    under: (ctx) => textures(ctx),
    over: (ctx) => overlay(data, lang, ctx),
    label: t.plan,
  });
  return {
    clock: data.route.nowBeforeStart,
    address: 'promenade.example/r/early-20th-century',
    inner: `<div class="gb gb-web gb-web-route">
      <div class="gb-under">${map}<span class="gb-osm">© OpenStreetMap</span></div>
      ${webNav(lang)}
      <section class="gb-sheet lg">
        <p class="gb-kicker">${icons.shield}${t.kicker} · ${t.checked(data.route.checkedAt)}</p>
        ${head(data, lang)}
        <ol class="gb-key">${keyList(data, lang, 5)}</ol>
      </section>
      <p class="gb-webnote lg">${t.webNote}</p>
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
    { top: 130, right: 110, bottom: 120, left: 590 },
  );
  const map = mapSvg(data, {
    view,
    lang,
    layers: LAYERS,
    labels: { max: 8, size: 11.5, clearOf: routeSamples(data) },
    defs: patterns,
    under: (ctx) => textures(ctx),
    over: (ctx) => overlay(data, lang, ctx, { current: now.stop.order }),
    label: now.stop.name[lang],
  });
  return {
    clock: now.clock,
    address: 'promenade.example/r/early-20th-century/2',
    inner: `<div class="gb gb-web gb-web-outing">
      <div class="gb-under">${map}<span class="gb-osm">© OpenStreetMap</span></div>
      ${webNav(lang)}
      <article class="gb-page">
        ${hero(now.stop, lang)}
        <div class="gb-page-body">${page(data, lang, 0)}</div>
      </article>
      ${player(data, lang)}
      <p class="gb-webnote lg">${t.webNote}</p>
    </div>`,
  };
}

/**
 * Puts the marginal rule beside the sentence being spoken, and keeps the
 * reading window to whole lines.
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
    layers: LAYERS,
    labels: { max: 6, size: 11.5, clearOf: routeSamples(data) },
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
    'Before a phone, the companion of a walk was a printed guide. It solved the problem this product has set itself: it took a stranger through a city along a suggested way, and it stood behind what it said. Its forms are still the clearest ones for that job — a plan with numbered buildings and a key, text set to be read, the source at the foot of the page.',
    'The product promises facts with sources (PRODUCT-SPEC §1.3). In this direction the source is where a reader has always looked for it, in a footnote, and the mark that leads to it is the numeral readers already know.',
    'Round two, at the owner’s request, takes the book off the shelf. The beige page and the single serif are gone. The plan fills the screen and the key lies on it as a sheet of frosted glass — tracing paper over a drawing. Every Place has its photograph, credited where it is shown, and the icon of its kind. While a Story plays, the page opens under the photograph of the Place; a loupe of glass keeps the plan and the person in sight; the controls float in a capsule of glass. The text itself stays on a solid page: glass is for what floats, not for what is read.',
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
        'Nolli’s plan of Rome, engraved in 1748, draws a city as built against unbuilt. Here the built is a tone, the streets are white, water is hatched and green is stippled, and the Places of the Route are the only solid red.',
      source: 'Wikipedia, “Giambattista Nolli”',
      url: 'https://en.wikipedia.org/w/index.php?oldid=1385710114',
    },
    {
      what: 'Glass where Apple puts it.',
      lesson:
        'Apple describes Liquid Glass as the layer of controls and navigation that floats above content, and says not to use it for content itself. So the key, the bars, the loupe and the player are glass; the page of a Story is not.',
      source: 'Apple, Human Interface Guidelines: Materials',
      url: 'https://developer.apple.com/design/human-interface-guidelines/materials',
    },
    {
      what: 'Text that follows the voice.',
      lesson:
        'Apple’s transcripts of podcasts are synchronised with the audio, and a tap on the text plays from there. The sentence being spoken is marked in the margin, and every sentence is also a control.',
      source: 'Apple Support, transcripts in Apple Podcasts',
      url: 'https://support.apple.com/en-us/127831',
    },
  ],
  typeNote:
    'Three faces, each with one job. Noto Serif Display, tall and sharp, sets a title and nothing smaller. Source Serif 4 sets what is read at length — the Story, with its optical sizes — and its italic sets what is said in passing. Inter sets the interface: labels, times, controls; on an iPhone the system’s own face may take its place. All three carry Cyrillic and the Belarusian Latin letters, and all are under the SIL Open Font License 1.1.',
  type: [
    {
      role: 'Title',
      face: 'Noto Serif Display 600',
      css: "font: 600 44px/1.06 'Noto Serif Display'; letter-spacing: -0.012em",
      ru: 'Костёл Святого Симеона и Святой Елены',
      en: 'Church of Saints Simon and Helena',
    },
    {
      role: 'Story text',
      face: 'Source Serif 4, 400, 18.5 on 27',
      css: "font: 400 19px/1.45 'Source Serif 4'",
      ru: 'Храм был целиком построен из красного кирпича, что принесло ему народное прозвище «Красный костёл».',
      en: 'The bricks for its walls were sourced from Częstochowa, while the roof tiles came from Włocławek.',
    },
    {
      role: 'Said in passing',
      face: 'Source Serif 4 Italic',
      css: "font: italic 400 16px/1.4 'Source Serif 4'",
      ru: '1910 год — эпоха из вашего пожелания · охраняется как наследие',
      en: '1910 — the period you asked for · heritage-listed',
    },
    {
      role: 'Interface',
      face: 'Inter 500–700, tabular figures',
      css: "font: 600 15px/1.4 'Inter'; font-variant-numeric: tabular-nums",
      ru: '11 мест · 5,7 км · 2 ч 45 мин · 14:28 · Poliakaŭ',
      en: '11 places · 5.7 km · 2 h 45 min · 14:28 · Poliakaŭ',
    },
  ],
  colourNote:
    'White, black, and one red — the second ink of a printed guide, now bright. The red is never decoration: it marks what belongs to the Route — its line, its Places, the sentence being spoken, a footnote mark, the one prominent action. Everything else takes its colour from the photographs and from the plan under the glass. In the dark theme the page is near black and the red is lifted so that it still reads.',
  colours: [
    { token: '--surface', role: 'Page, and glass as a solid' },
    { token: '--ink', role: 'Ink' },
    { token: '--ink-2', role: 'Second ink' },
    { token: '--accent', role: 'Red' },
    { token: '--m-ground', role: 'Plan: ground' },
    { token: '--m-building', role: 'Plan: built' },
    { token: '--m-street', role: 'Plan: street' },
    { token: '--m-green', role: 'Plan: green' },
    { token: '--m-water', role: 'Plan: water' },
  ],
  pairs: [
    { text: '--ink', on: '--surface', what: 'Ink on the page' },
    { text: '--ink-2', on: '--surface', what: 'Second ink on the page' },
    { text: '--accent', on: '--surface', what: 'Red on the page' },
    { text: '--on-accent', on: '--accent', what: 'Label on the red action' },
    { text: '--ink-2', on: '--m-street', what: 'Street name on a street' },
    { text: '--accent', on: '--m-ground', what: 'Route on the plan', large: true },
  ],
  mapNote:
    'An engraved plan that fills the screen. Streets keep their true width and are white; what is built is a flat tone; water is hatched and green is stippled, as a plate would have them; the railway is the ladder line of old plans. Street names run along the streets in italic. The Route is a red line with a soft glow, and every Place on it is drawn twice: as its number, and as its own footprint filled in red. While a Story plays the plan shrinks into a loupe of glass that follows the person. Fills, two fill patterns, lines with casings and dashes, text along a line: all within a MapLibre style (ADR-0008).',
  storyNote:
    'A page that opens under the photograph of the Place. The title is set large in a display serif; the text is continuous prose, with the sentence being spoken in full ink and a red rule beside it in the margin, and the rest in the second ink — still readable, because the text is also for those who cannot hear it (NFR-27). A superscript numeral leads to the source at the foot of the page. The photograph carries the name of its author and its licence. The controls float below in a capsule of glass, and a round loupe of glass at the corner of the photograph shows the plan and where one stands.',
  motion: [
    {
      moment: 'The text follows the voice.',
      how: 'The marginal rule glides to the next sentence in 420 ms and the ink changes with it; the page moves by whole lines, never by pixels.',
    },
    {
      moment: 'Arriving.',
      how: 'The plan closes into the loupe — the glass circle draws in from the full screen in 500 ms — while the photograph of the Place settles under the status bar and the page rises.',
    },
    {
      moment: 'The loupe.',
      how: 'It follows the person on the plan; a touch opens it back to the full plan with the same movement in reverse.',
    },
    {
      moment: 'The Route recalculated.',
      how: 'The red line is redrawn along the streets from where the person stands; a Place that left the Route loses its red and stays on the plan as an ordinary building.',
    },
  ],
  platforms: [
    {
      system: 'iOS.',
      how: 'Liquid Glass, the system’s own: the key as a sheet with a grabber, the round controls, the loupe and the capsule of the player. The page of a Story is a solid surface. Controls are 44 points and more.',
    },
    {
      system: 'Android.',
      how: 'The same layout on solid Material 3 surfaces: no blur is imitated. The sheet and the player are attached to the edges, corners are 28 dp, controls are 48 dp and more.',
    },
    {
      system: 'Web.',
      how: 'The plan fills the window; the key is a panel of glass at the left. Listening puts the page with its photograph at the left as a solid sheet, and the player in a capsule of glass over the plan.',
    },
  ],
  risks: [
    'It asks for the most reading. In bright sun the second ink of the text that is not being spoken is the first thing to try on a real phone.',
    'It leans on photographs. A Place without a good free photograph will look poorer; the design needs a dignified state for that, which D-02 has to draw.',
    'A sheet of glass over a dense plan costs legibility; the key uses the regular, more opaque glass, and a “bright sunlight” setting that makes it solid belongs in the design system.',
    'On Android the look is deliberately plainer: solid surfaces.',
  ],
};

export const guidebook = {
  id: 'guidebook',
  name: { en: 'Guidebook', ru: 'Путеводитель' },
  idea: 'The city as a book you walk through: an engraved plan under a sheet of frosted glass, a photograph for every Place, a Story set as a page with its source in a footnote, and a loupe of glass that keeps the plan in sight.',
  screens: { route, outing },
  web: { route: webRoute, outing: webOuting },
  settle,
  sample,
  follow,
  sheet,
};
