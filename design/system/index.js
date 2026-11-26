/**
 * The page of the design system: every token and every component, in light,
 * dark and bright sunlight, in Russian and English, for iOS and Android
 * wherever they differ, with the mark, the icons and the motion studies.
 *
 * Nothing on it is written twice: colours, type and measures are read from
 * tokens.json, components are the specimens of specimens.js, contrast is
 * computed by the same code as `pnpm lint:design`.
 */
import { directions } from '../directions/registry.js';
import { SIZES, fitDevices, frame } from '../directions/shared/frames.js';
import { ready, renderScreen } from '../directions/viewer.js';
import { measure } from './colour.js';
import { ICON_NAMES, icons } from './icons.js';
import { appIcon, lockup, sign, wordmark } from './mark.js';
import { springCurve } from './motion.js';
import {
  fitView,
  layersOf,
  mapSvg,
  planMap,
  routeLine,
  routePoints,
  walkMap,
} from './parts/map.js';
import { settle } from './parts/story.js';
import { GROUPS, faceOf, specimens, stage, wideWidth } from './specimens.js';
import { T } from './strings.js';
import { accessibilityRules, platformDifferences, reach } from './words.js';

const THEMES = /** @type {const} */ (['light', 'dark', 'sun']);
const OPTIONS = {
  theme: { label: 'Theme', values: { light: 'Light', dark: 'Dark', sun: 'Bright sun' } },
  lang: { label: 'Language', values: { ru: 'Русский', en: 'English' } },
  // Written as words so that the order holds: numbers as keys would be sorted.
  text: { label: 'Text size', values: { normal: '100 %', large: '130 %', largest: '200 %' } },
};
const TEXT_SCALE = { normal: 1, large: 1.3, largest: 2 };

/** @type {Record<string, string>} */
const state = { theme: 'light', lang: 'ru', text: 'normal' };
for (const [key, value] of new URLSearchParams(location.hash.slice(1))) {
  if (key in OPTIONS && value in OPTIONS[/** @type {keyof typeof OPTIONS} */ (key)].values)
    state[key] = value;
}

const textScale = () => TEXT_SCALE[/** @type {keyof typeof TEXT_SCALE} */ (state.text)];

const main = /** @type {HTMLElement} */ (document.getElementById('system'));
const switches = /** @type {HTMLFormElement} */ (document.getElementById('switches'));
const links = /** @type {HTMLElement} */ (document.getElementById('links'));

const SECTIONS = [
  ['colour', 'Colour'],
  ['type', 'Type'],
  ['measure', 'Measure and material'],
  ['map', 'Map'],
  ['components', 'Components'],
  ['platforms', 'iOS and Android'],
  ['icons', 'Icons'],
  ['mark', 'Mark'],
  ['motion', 'Motion'],
  ['access', 'Accessibility'],
];

links.innerHTML = SECTIONS.map(([id, name]) => `<a href="#${id}">${name}</a>`).join('');
switches.innerHTML = Object.entries(OPTIONS)
  .map(
    ([key, option]) =>
      `<fieldset class="sys-switch"><legend>${option.label}</legend>${Object.entries(option.values)
        .map(
          ([value, label]) =>
            `<label><input type="radio" name="${key}" value="${value}"${state[key] === value ? ' checked' : ''}><span>${label}</span></label>`,
        )
        .join('')}</fieldset>`,
  )
  .join('');

/** @param {string} id @param {number} n @param {string} title @param {string} lead @param {string} body */
const section = (id, n, title, lead, body) =>
  `<section class="sys-sheet" id="${id}"><header><span class="sys-number">${String(n).padStart(2, '0')}</span><h2>${title}</h2><p>${lead}</p></header>${body}</section>`;

const ctx = (/** @type {any} */ data, /** @type {'ios' | 'android'} */ os) => ({
  os,
  theme: /** @type {'light' | 'dark' | 'sun'} */ (state.theme),
  lang: /** @type {'ru' | 'en'} */ (state.lang),
  text: textScale(),
  data,
  width: SIZES[os].width,
});

// ── Colour ──────────────────────────────────────────────────────────────────

/** @param {any} tokens */
function colourSection(tokens) {
  const groups = [
    [
      'The page and its ink',
      ['surface', 'surface-2', 'ink', 'ink-2', 'ink-3', 'rule', 'focus', 'scrim'],
    ],
    [
      'The accent and the verdicts',
      [
        'accent',
        'on-accent',
        'accent-ink',
        'line',
        'line-case',
        'ok-tint',
        'warn',
        'warn-fill',
        'on-warn',
        'warn-tint',
        'stop',
        'stop-fill',
        'on-stop',
        'stop-tint',
      ],
    ],
    [
      'The map and what stands on it',
      [
        'm-ground',
        'm-street',
        'm-street-edge',
        'm-building',
        'm-roof',
        'm-wall',
        'm-green',
        'm-water',
        'm-rail',
        'm-place',
        'haze',
        'marker',
        'on-marker',
        'mark',
      ],
    ],
    [
      'Materials and photographs',
      [
        'lg-fill',
        'lg-fill-clear',
        'lg-edge',
        'lg-edge-low',
        'lg-inner',
        'md-surface',
        'md-surface-high',
        'photo-scrim',
        'on-photo',
      ],
    ],
  ];
  const swatch = (/** @type {string} */ value) =>
    `<span class="sys-chip"><i style="--c:${value}"></i>${value}</span>`;
  const tables = groups
    .map(
      ([title, names]) => `<h4>${title}</h4>
      <div class="sys-scroll"><table class="sys-table">
        <thead><tr><th>Token</th><th>Light</th><th>Dark</th><th>Bright sun</th><th>What it is for</th></tr></thead>
        <tbody>${
          /** @type {string[]} */ (names)
            .map(
              (name) =>
                `<tr><td><code>${name}</code></td>${THEMES.map((theme) => `<td>${swatch(tokens.color[theme][name])}</td>`).join('')}<td class="is-use">${tokens.color.roles[name]}</td></tr>`,
            )
            .join('')
        }</tbody>
      </table></div><div class="tt-gap"></div>`,
    )
    .join('');

  const measured = Object.fromEntries(THEMES.map((theme) => [theme, measure(tokens, theme)]));
  const rows = measured.light
    .map((/** @type {any} */ pair, /** @type {number} */ i) => {
      const cells = THEMES.map((theme) => {
        const r = measured[theme][i];
        return `<td><span class="sys-sample" style="background:${r.groundHex};color:${r.textHex}">${r.level === 'graphic' ? '●—' : 'Аa 14:00'}</span></td><td class="sys-pass${r.passes ? '' : ' is-fail'}">${r.ratio.toFixed(2)} : 1<small>${r.passes ? 'passes' : 'FAILS'} ${r.need} : 1</small></td>`;
      }).join('');
      return `<tr><td>${pair.use}<br /><code>${pair.text}</code> on <code>${pair.on}</code></td>${cells}</tr>`;
    })
    .join('');
  const total = THEMES.reduce((n, theme) => n + measured[theme].length, 0);
  const failing = THEMES.reduce(
    (n, theme) => n + measured[theme].filter((/** @type {any} */ r) => !r.passes).length,
    0,
  );

  return section(
    'colour',
    1,
    'Colour',
    'Glass has no colour of its own: it takes it from the map beneath, so the map carries the palette and the photographs carry the rest. One colour is ours — green, the verdict “on time”, and therefore the line, the person, “now”, the mark beside the sentence being spoken and the one prominent action. A name is a role, never a hue. There are three themes: light is the daytime default, dark is a choice, and the third is for bright sunlight.',
    `${tables}
    <h3>Contrast, checked</h3>
    <p class="sys-note">Every pair of a text or a graphic and the ground it stands on, in the three themes: ${total} measurements, ${failing === 0 ? 'all of which pass' : `${failing} of which FAIL`}. Text is held to 4.5 : 1 and graphics to 3 : 1, level AA of WCAG 2.2; in the sun theme text is held to 7 : 1, which is this system’s own rule. Text on glass is measured over every area the map can put under a pane, and the worst is shown. The same arithmetic runs in <code>pnpm lint</code> and fails the build on a pair that falls short.</p>
    <div class="sys-scroll"><table class="sys-table">
      <thead><tr><th>Pair</th><th colspan="2">Light</th><th colspan="2">Dark</th><th colspan="2">Bright sun</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`,
  );
}

// ── Type ────────────────────────────────────────────────────────────────────

/** @param {any} tokens @param {any} data */
function typeSection(tokens, data) {
  const place = data.outingNow.stop;
  const story = data.outingNow.story;
  /** @type {Record<string, { ru: string, en: string }>} */
  const sample = {
    'clock-xl': { ru: `${data.route.start} — ${data.route.finish}`, en: '' },
    'clock-l': { ru: `${data.route.start} — ${data.route.finish}`, en: '' },
    'clock-m': { ru: place.arrive, en: '' },
    numeral: { ru: '1 2 3 4 5 6 7 8 9 10 11', en: '' },
    wordmark: { ru: 'Promenade', en: '' },
    'title-l': { ru: T.ru.title, en: T.en.title },
    title: { ru: T.ru.title, en: T.en.title },
    action: { ru: T.ru.start, en: T.en.start },
    row: { ru: data.stops[0].name.ru, en: data.stops[0].name.en },
    body: { ru: T.ru.emptyNote, en: T.en.emptyNote },
    'body-strong': {
      ru: `${place.arrive} · ${T.ru.packName}`,
      en: `${place.arrive} · ${T.en.packName}`,
    },
    label: {
      ru: `${T.ru.fits(data.route.budgetMinutes)} · ${T.ru.reserve(data.route.reserveMinutes)}`,
      en: `${T.en.fits(data.route.budgetMinutes)} · ${T.en.reserve(data.route.reserveMinutes)}`,
    },
    'label-strong': { ru: T.ru.onTime, en: T.en.onTime },
    caption: { ru: `${T.ru.out} · ${T.ru.back}`, en: `${T.en.out} · ${T.en.back}` },
    micro: {
      ru: `${T.ru.photo}: ${place.photo.author} · ${place.photo.licence}`,
      en: '© OpenStreetMap',
    },
    tab: { ru: T.ru.tabs.join(' · '), en: T.en.tabs.join(' · ') },
    'guide-title-l': { ru: place.name.ru, en: place.name.en },
    'guide-title': { ru: place.name.ru, en: place.name.en },
    'guide-body-l': { ru: story.ru.sentences[5].text, en: story.en.sentences[2].text },
    'guide-body': { ru: story.ru.sentences[3].text, en: story.en.sentences[1].text },
    'guide-aside': { ru: data.stops[0].why.ru, en: data.stops[0].why.en },
    'guide-note': {
      ru: T.ru.source(story.ru.source, '14.11.2026'),
      en: T.en.source(story.en.source, '26 October 2026'),
    },
  };
  const faces = ['num', 'text', 'serif']
    .map(
      (name) =>
        `<div class="sys-face"><b style="font-family:var(--font-${name});font-weight:${name === 'serif' ? 600 : 700}">Яя Ўў Ŭŭ</b><p><strong>${tokens.font[name].family}</strong>${tokens.font[name].use}</p></div>`,
    )
    .join('');
  const roles = Object.entries(tokens.type)
    .filter(([name]) => name !== 'about')
    .map(([name, t]) => {
      // A role added to the tokens is shown at once, with words that fit any role.
      const s = sample[name] ?? { ru: T.ru.onTime, en: T.en.onTime };
      const style = `font:var(--type-${name});letter-spacing:var(--type-${name}-tracking)`;
      return `<div class="sys-type">
        <dt><b>${name}</b>${tokens.font[t.font].family} ${t.weight}${t.style ? ` ${t.style}` : ''} · ${t.size}/${t.line}${t.tracking ? ` · ${t.tracking} em` : ''}<br />${t.use}<br />grows: ${t.scales === 'full' ? 'to 200 %' : t.scales === 'capped' ? 'to 130 %' : 'no, it is part of a graphic'}</dt>
        <dd><p lang="ru" style="${style}">${s.ru}</p>${s.en ? `<p lang="en" style="${style}">${s.en}</p>` : ''}</dd>
      </div>`;
    })
    .join('');
  return section(
    'type',
    2,
    'Type',
    'Three faces, one for each kind of saying. Unbounded, wide and round, sets what is a number. Onest sets what the timetable says in words. Source Serif 4 sets what the guide says: the name of a Place, the Story, the “why” in italic, the footnote. All three carry Cyrillic and the Belarusian letters ў and ŭ, without which the product’s own names cannot be set. Numerals keep one width everywhere, as in a timetable.',
    `<div class="sys-faces">${faces}</div>
    <p class="sys-note">The scale, with the text size of the system applied by the switch above. A role that is read grows to 200 %; one that is already large stops at 130 %; a numeral inside a disc does not grow, and has its text beside it or in its name.</p>
    <dl class="screen sys-specimens" style="--text-scale:${textScale()}">${roles}</dl>`,
  );
}

// ── Measure and material ────────────────────────────────────────────────────

/** @param {any} tokens */
function measureSection(tokens) {
  const space = Object.entries(tokens.space)
    .filter(([name]) => name !== 'about')
    .map(
      ([name, value]) =>
        `<div class="sys-measure sys-space"><i style="width:${value}px"></i><span><b>space-${name}</b></span></div>`,
    )
    .join('');
  const radius = (/** @type {'ios' | 'android'} */ os) =>
    Object.entries(tokens.radius)
      .filter(([name]) => name !== 'about')
      .map(([name, r]) => {
        const value = r[os] ?? r.value;
        return `<div class="sys-measure sys-radius"><i style="border-radius:${Math.min(value, 32)}px"></i><span><b>${name}</b> ${value}</span></div>`;
      })
      .join('');
  const sizes = Object.entries(tokens.size)
    .filter(([name]) => name !== 'about')
    .map(
      ([name, s]) =>
        `<tr><td><code>${name}</code></td><td>${s.ios ?? s.value}</td><td>${s.android ?? s.value}</td><td>${s.web ?? s.value}</td><td class="is-use">${s.use}</td></tr>`,
    )
    .join('');
  const durations = Object.entries(tokens.motion.duration)
    .map(
      ([name, d]) =>
        `<tr><td><code>${name}</code></td><td>${d.value} ms</td><td style="min-width:150px"><div class="sys-track" data-duration="${d.value}"><i></i></div></td><td class="is-use">${d.use}</td></tr>`,
    )
    .join('');
  const curve = (/** @type {number[]} */ ys) => {
    const points = ys.map(
      (y, i) => `${((i / (ys.length - 1)) * 100).toFixed(1)} ${(100 - y * 100).toFixed(1)}`,
    );
    return `<svg class="sys-curve" viewBox="-4 -14 108 124"><line x1="0" y1="100" x2="100" y2="100"/><line x1="0" y1="0" x2="100" y2="0"/><path d="M${points.join('L')}"/></svg>`;
  };
  /** @param {number[]} bezier @param {number} t */
  const bezierY = ([x1, y1, x2, y2], t) => {
    // Solve the curve for x = t by halving, then take its y.
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      const x = 3 * (1 - mid) ** 2 * mid * x1 + 3 * (1 - mid) * mid ** 2 * x2 + mid ** 3;
      if (x < t) lo = mid;
      else hi = mid;
    }
    const s = (lo + hi) / 2;
    return 3 * (1 - s) ** 2 * s * y1 + 3 * (1 - s) * s ** 2 * y2 + s ** 3;
  };
  const steps = Array.from({ length: 33 }, (_, i) => i / 32);
  const easings = Object.entries(tokens.motion.easing)
    .map(
      ([name, e]) =>
        `<div class="sys-measure">${curve(steps.map((t) => bezierY(e.value, t)))}<span><b>${name}</b> ${e.value.join(', ')}<br />${e.use}</span></div>`,
    )
    .join('');
  const springs = Object.entries(tokens.motion.spring)
    .map(([name, s]) => {
      const c = springCurve(s, 40);
      return `<div class="sys-measure">${curve(c.values)}<span><b>spring ${name}</b> ${s.stiffness} / ${s.damping} / ${s.mass} · ${c.duration} ms<br />${s.use}</span></div>`;
    })
    .join('');

  return section(
    'measure',
    3,
    'Measure and material',
    'Distances, corners, sizes held by rule, the two materials, and how long a thing takes. iOS follows the concentric capsules of Liquid Glass; Android follows the shape scale of Material 3 Expressive. A length is a number of points: px on the web, pt on iOS, dp on Android.',
    `<h3>Space</h3><div class="sys-row">${space}</div>
    <h3>Corners</h3>
    <div class="sys-two"><div><h4>iOS and the web</h4><div class="sys-row">${radius('ios')}</div></div><div><h4>Android</h4><div class="sys-row">${radius('android')}</div></div></div>
    <h3>Sizes held by rule</h3>
    <div class="sys-scroll"><table class="sys-table"><thead><tr><th>Token</th><th>iOS</th><th>Android</th><th>Web</th><th>What it is for</th></tr></thead><tbody>${sizes}</tbody></table></div>
    <h3>Materials and elevation</h3>
    <p class="sys-note">Glass is the layer of controls and navigation over the content; text that is read sits on a solid page. A pane becomes solid — the same shape, an opaque surface — on Android, in bright sunlight, in the saver mode and with “reduce transparency”. Switch the theme above to “Bright sun” to see every pane lose its transparency and gain an edge.</p>
    <div data-specimen="materials"></div>
    <h3>Motion</h3>
    <p class="sys-note">How long a thing takes and how it moves. A spring is given as the application drives it — stiffness, damping, mass — and the curve a style sheet needs is computed from the same three numbers. With “reduce motion” set, movement becomes a cross-fade of ${tokens.motion.duration.fade.value} ms and nothing loops.</p>
    <p><button class="sys-button is-quiet" id="play-durations">Play the durations</button></p>
    <div class="sys-scroll"><table class="sys-table"><thead><tr><th>Token</th><th>Time</th><th></th><th>What it is for</th></tr></thead><tbody>${durations}</tbody></table></div>
    <div class="tt-gap"></div>
    <div class="sys-row">${easings}${springs}</div>`,
  );
}

// ── The map ─────────────────────────────────────────────────────────────────

/** @param {any} data */
function mapSection(data) {
  const theme = /** @type {'light' | 'dark' | 'sun'} */ (state.theme);
  const lang = /** @type {'ru' | 'en'} */ (state.lang);
  const now = data.outingNow;
  const walk = (/** @type {boolean} */ saver) =>
    walkMap(data, {
      lang,
      theme,
      width: 360,
      height: 300,
      minute: now.stop.arriveMin - 0.6,
      walkedLegs: now.stop.order - 1,
      pins: [now.stop, now.next],
      saver,
    });
  const box = (/** @type {string} */ inner, /** @type {string} */ extra = '') =>
    `<div class="screen stage" data-os="ios" data-theme="${theme}" lang="${lang}" style="width:360px;height:300px"${extra}><div class="tt-under">${inner}</div><span class="tt-osm" style="bottom:8px">© OpenStreetMap</span></div>`;
  return section(
    'map',
    4,
    'The map',
    'The map is the content, and it fills the screen. It is quiet — cool ground, streets of their true width, buildings as one tone — so that two things read at a glance: the line of the Route, green with a casing and a glow, and the person on it. It is drawn for the tiles of the Protomaps basemap, version 4, and uses only what MapLibre draws on every platform.',
    `<div class="sys-maps">
      <figure><div class="sys-fit">${box(planMap(data, { lang, theme, width: 360, height: 300, padding: { top: 30, right: 30, bottom: 30, left: 30 }, labels: 4 }))}</div><figcaption><b>The plan</b>Before the start: from above, north up. Stops as numbered discs, the clock on the line at the half-hours, the footprints of the Places tinted.</figcaption></figure>
      <figure><div class="sys-fit">${box(walk(false))}</div><figcaption><b>The way</b>During the Outing: at an angle of ${data.tokens.map.camera.walk.pitch}°, the direction of travel up, buildings standing but lower than life, the Place ahead under the icon of its kind.</figcaption></figure>
      <figure><div class="sys-fit">${box(walk(true), ' data-glass="solid" data-motion="still"')}</div><figcaption><b>The saver mode</b>The fallback for the heaviest thing the application draws: flat, heading up, nothing standing, no blur, nothing in motion. Offered when the charge will not last the Outing (OUT-17).</figcaption></figure>
    </div>
    <h3>The style itself, running</h3>
    <p class="sys-note">The three maps above are drawings. Below is the real thing: the generated style of the current theme, drawn by MapLibre from a tile archive of the area of the reference Outing — the same renderer, the same tile schema and the same file format the application will use (ADR-0008). Drag to move, and hold Ctrl or use two fingers to turn and tilt.</p>
    <div class="sys-live" id="live-map">
      <div class="sys-live-bar sys-glass">
        <button class="sys-button" id="live-start">Draw the live map</button>
        <button class="sys-button is-quiet" id="live-view" hidden>The way, at an angle</button>
      </div>
      <span class="sys-live-note">© OpenStreetMap</span>
    </div>
    <p class="sys-note" style="margin-top:14px">The styles are generated from the tokens: <a href="map/style.light.json"><code>map/style.light.json</code></a>, <a href="map/style.dark.json"><code>style.dark.json</code></a>, <a href="map/style.sun.json"><code>style.sun.json</code></a>. The three have the same layers, so the application changes theme by changing paint. Names on the map are set in Noto Sans, the face whose glyph ranges ship with the map; the haze at the horizon is drawn by the application, because MapLibre Native has no sky.</p>`,
  );
}

// ── Components ──────────────────────────────────────────────────────────────

/** The place of one stage; it is drawn when it comes into view. @param {any} specimen @param {'ios' | 'android'} os @param {string} variant @param {string} label */
const slot = (specimen, os, variant, label) =>
  `<div class="sys-slot"><p class="sys-slot-label"><b>${os === 'ios' ? 'iOS' : 'Android'}</b>${label}</p><div class="sys-fit" data-stage="${specimen.id}" data-os="${os}" data-variant="${variant}" style="min-height:${specimen.device ? 0 : specimen.height}px"></div></div>`;

/** @param {any} specimen */
function specimenBlock(specimen) {
  const variants = specimen.variants ?? [{ id: '', label: '' }];
  if (specimen.wide) {
    // A component of the web or of the console: once, at the width of a desk.
    return `<h3>${specimen.title}</h3><p class="sys-note">${specimen.note}</p>
    ${variants
      .map(
        (/** @type {any} */ v) =>
          `<div class="sys-slot"><p class="sys-slot-label"><b>${faceOf(specimen) === 'console' ? 'Console' : 'Web'}</b>${v.label}</p><div class="sys-fit" data-stage="${specimen.id}" data-os="wide" data-variant="${v.id}" style="min-height:${Math.round(specimen.height / 2)}px"></div></div>`,
      )
      .join('')}`;
  }
  if (specimen.device) {
    return `<h3>${specimen.title}</h3><p class="sys-note">${specimen.note}</p>
    <div class="sys-devices">${['ios', 'android']
      .flatMap((os) =>
        variants.map(
          (/** @type {any} */ v) =>
            `<figure><div data-stage="${specimen.id}" data-os="${os}" data-variant="${v.id}" style="width:${Math.round(SIZES[/** @type {'ios'} */ (os)].width * 0.66)}px"></div><figcaption>${os === 'ios' ? 'iOS' : 'Android'}${v.label ? ` · ${v.label}` : ''}</figcaption></figure>`,
        ),
      )
      .join('')}</div>`;
  }
  return `<h3>${specimen.title}</h3><p class="sys-note">${specimen.note}</p>
    <div class="sys-pair">${['ios', 'android']
      .map(
        (os) =>
          `<div class="sys-column">${variants.map((/** @type {any} */ v) => slot(specimen, /** @type {'ios'} */ (os), v.id, v.label)).join('')}</div>`,
      )
      .join('')}</div>`;
}

function componentsSection() {
  const shown = (/** @type {string} */ group) =>
    specimens
      .filter((s) => s.group === group)
      .map(specimenBlock)
      .join('');
  const groups = GROUPS.filter((g) => g !== 'Navigation' && g !== 'Materials');
  return section(
    'components',
    5,
    'Components',
    'Each component stands in a piece of a screen, on real content, with the map or the solid page behind it — for iOS on the left and Android on the right. The components of the public web and of the console are drawn once, at the width of a desk. Use the switches above for the theme, the language and the text size; the check page draws every one of them in every combination and measures it.',
    groups.map((group) => `<h2 class="sys-group">${group}</h2>${shown(group)}`).join(''),
  );
}

function platformsSection() {
  const rows = platformDifferences
    .map(
      (d) =>
        `<tr><td>${d.what}</td><td>${d.ios}</td><td>${d.android}</td><td class="is-use">${d.why}</td></tr>`,
    )
    .join('');
  return section(
    'platforms',
    6,
    'iOS and Android',
    'The same idea on each system, and native to each: navigation, “back”, sheets, the system’s own controls and the lock screen follow the platform; the character is in type, colour, the map and the way content is set. By the owner’s decision Android gets solid Material 3 surfaces and no imitation of glass.',
    `<div class="sys-scroll"><table class="sys-table"><thead><tr><th></th><th>iOS</th><th>Android</th><th>Why</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="tt-gap"></div>
    ${specimens
      .filter((s) => s.group === 'Navigation')
      .map(specimenBlock)
      .join('')}`,
  );
}

// ── Icons ───────────────────────────────────────────────────────────────────

function iconsSection() {
  const lang = /** @type {'ru' | 'en'} */ (state.lang);
  const grid = Object.entries(icons)
    .map(
      ([name, svg]) =>
        `<li>${svg}<b>${name}</b>${ICON_NAMES[/** @type {keyof typeof ICON_NAMES} */ (name)][lang]}</li>`,
    )
    .join('');
  const sized = [16, 20, 24, 32, 44]
    .map((size) =>
      icons.church.replace('class="icon"', `class="icon" style="width:${size}px;height:${size}px"`),
    )
    .join('');
  return section(
    'icons',
    7,
    'Icons',
    `The product’s own set, drawn for it: ${Object.keys(icons).length} icons in one hand. A 24-unit grid, a round line whose weight is a token — heavier in bright sunlight — open shapes, and a fill only where a thing is solid by nature. Pictographic characters are never used as icons. Three signs follow the platform, because each system has taught its own: back, share and “more”. An icon that stands alone in a control has a name in both languages, which is what a screen reader says.`,
    `<div class="sys-icon-sizes">${sized}</div>
    <ul class="sys-icons">${grid}</ul>`,
  );
}

// ── The mark ────────────────────────────────────────────────────────────────

/** @param {any} tokens @param {any} outline */
function markSection(tokens, outline) {
  const { light, dark } = tokens.color;
  const app = (
    /** @type {'dark' | 'light' | 'mono'} */ variant,
    /** @type {'ios' | 'android'} */ os,
    /** @type {number} */ size,
    /** @type {string} */ caption,
  ) =>
    `<figure><span class="sys-app is-${os}" style="width:${size}px;height:${size}px">${appIcon(variant, tokens.color)}</span>${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
  return section(
    'mark',
    8,
    'The mark',
    'The sign is the product’s own line. It leaves the square of the start, goes out, turns at a stop and comes back to the way it left by — an Outing is a closed walk — and drawn that way it is also the first letter of the name. It is made of the three things the map is made of: the line, the disc of a stop, the square of the start. “Promenade” is the working name; the sign does not depend on it staying.',
    `<h3>The application’s icon</h3>
    <p class="sys-note">The product seen small: a line on a map. The streets are at the angle of no city in particular. Each system cuts the square to its own shape; the sign keeps to the middle, inside the part every mask leaves.</p>
    <div class="sys-marks">
      ${app('dark', 'ios', 152, 'iOS · the icon')}
      ${app('light', 'ios', 152, 'iOS · light appearance')}
      ${app('mono', 'ios', 152, 'iOS · tinted, and Android themed')}
      ${app('dark', 'android', 152, 'Android · adaptive, round mask')}
      ${app('dark', 'ios', 60, '60 pt')}
      ${app('dark', 'ios', 40, '40')}
      ${app('dark', 'ios', 29, '29')}
    </div>
    <h3>The sign and the wordmark</h3>
    <p class="sys-note">The name is set in Unbounded 700 from the outlines of its letters, so it needs no font where it is shown. Beside the name the sign stands a capital and a half high, two widths of its own line away. Around the mark stays a clear space of the height of the square of the start; the sign is not drawn smaller than 16 points.</p>
    <div class="sys-two">
      <div class="sys-plate" style="background:${light.surface};box-shadow:inset 0 0 0 1px ${light.rule}">${lockup(outline, { line: light.accent, paper: light.ink, ink: light.ink }, { height: 30 })}</div>
      <div class="sys-plate" style="background:${dark['m-ground']}">${lockup(outline, { line: dark.accent, paper: dark.ink, ink: dark.ink }, { height: 30 })}</div>
      <div class="sys-plate" style="background:${light.accent}">${lockup(outline, { line: light['on-accent'], paper: light['on-accent'], ink: light['on-accent'], dot: light.accent }, { height: 30 })}</div>
      <div class="sys-plate" style="background:${light['surface-2']};gap:34px;display:flex;justify-content:center;flex-wrap:wrap">${sign({ line: light.accent, paper: light.ink }, { size: 96 })}${sign({ line: light.ink, paper: light.ink, dot: light['surface-2'] }, { size: 64 })}${sign({ line: light.accent, paper: light.ink }, { size: 32 })}${sign({ line: light.accent, paper: light.ink }, { size: 16 })}<span style="color:${light.ink}">${wordmark(outline, { height: 20 })}</span></div>
    </div>
    <p class="sys-note" style="margin-top:18px">As files: <a href="mark/app-icon-dark.svg"><code>mark/app-icon-dark.svg</code></a>, <a href="mark/app-icon-light.svg"><code>app-icon-light.svg</code></a>, <a href="mark/app-icon-mono.svg"><code>app-icon-mono.svg</code></a>, <a href="mark/sign.svg"><code>sign.svg</code></a>, <a href="mark/wordmark.svg"><code>wordmark.svg</code></a>, <a href="mark/lockup.svg"><code>lockup.svg</code></a>. All are generated from the tokens.</p>`,
  );
}

// ── Motion ──────────────────────────────────────────────────────────────────

function motionSection() {
  const studies = [
    [
      'arrival',
      'Arriving at a Place',
      'The Place lights up on the map, a ring leaves it, the stop on the strip turns green, and the guide’s page rises with the photograph.',
    ],
    [
      'story',
      'A Story starting by itself',
      'A breath before the first word: the voice draws itself in, the key turns to “pause”, the rule comes to the first sentence and the words light as they are said.',
    ],
    [
      'recalculation',
      'The Route recalculating',
      'A Place is skipped: its disc is struck out, the line is drawn along its new course in one stroke, the chart closes the gap and the time of the finish rolls to its new value.',
    ],
  ];
  return section(
    'motion',
    9,
    'Motion',
    'Three moments carry the product, and each is kept as a short animated page. Motion here says that something happened and where to look; it never decorates. Each study runs on the tokens of this page, can be slowed and replayed, has its sound, and shows what remains of it with “reduce motion” set.',
    `<div class="sys-studies">${studies
      .map(
        ([id, title, text]) =>
          `<div class="sys-study"><iframe src="motion/${id}.html#embed" title="${title}" loading="lazy"></iframe><h3>${title}</h3><p>${text}</p><a href="motion/${id}.html">Open the study</a></div>`,
      )
      .join('')}</div>`,
  );
}

// ── Accessibility ───────────────────────────────────────────────────────────

/** @param {any} tokens */
function accessSection(tokens) {
  const rules = accessibilityRules(tokens)
    .map((r) => `<li><b>${r.rule}</b><p>${r.text}</p><small>${r.checked}</small></li>`)
    .join('');
  return section(
    'access',
    10,
    'Accessibility',
    'The product is used on the move — one hand, bright sunlight, headphones, the screen locked — and by people who cannot see the screen or cannot hear the voice (NFR-24, NFR-25, NFR-27). The rules are few, each is checked, and each says by what.',
    `<ul class="sys-rules">${rules}</ul>
    <div class="sys-reach">${reach(tokens)}<ol>
      <li><b>Within reach of a thumb</b> — the lower ${Math.round(tokens.size.reach.value * 100)} % of the screen: the prominent action, the keys of the player, the answer to “Are you at this place?”, the grabber of a sheet.</li>
      <li><b>Glanced at, not touched on the move</b> — the board at the top: whether one is on time, and the strip.</li>
      <li><b>Touched when one has stopped</b> — “back” and “more” at the top corners. Nothing that has to be done while walking lives there.</li>
    </ol></div>
    <p class="sys-note" style="margin-top:22px"><a href="check.html">The check page</a> draws every component for both systems, in the three themes, both languages and three text sizes, and reports a control smaller than its platform’s target, a control without a name, and a line that is cut or leaves its screen.</p>`,
  );
}

// ── Drawing ─────────────────────────────────────────────────────────────────

/** @type {IntersectionObserver | undefined} */
let observer;

/** @param {any} data */
function fill(data) {
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const place = /** @type {HTMLElement} */ (entry.target);
        observer?.unobserve(place);
        const specimen = specimens.find((s) => s.id === place.dataset.stage);
        if (!specimen) continue;
        const os = /** @type {'ios' | 'android'} */ (place.dataset.os);
        const c = specimen.wide
          ? {
              ...ctx(data, 'ios'),
              os: /** @type {any} */ (faceOf(specimen)),
              text: 1,
              width: wideWidth(specimen),
            }
          : ctx(data, os);
        const variant = place.dataset.variant || undefined;
        place.innerHTML = specimen.device
          ? frame({
              os,
              theme: /** @type {any} */ (c.theme),
              lang: c.lang,
              direction: 'timetable',
              clock: data.outingNow.clock,
              inner: specimen.render(c, variant ?? ''),
            })
          : stage(specimen, c, variant);
        place.style.minHeight = '';
        fit(place);
        fitDevices(place);
        settle(place);
      }
    },
    { rootMargin: '500px' },
  );
  for (const place of main.querySelectorAll('[data-stage]')) observer.observe(place);
}

/** Scales a stage down to the room it has. @param {Element} root */
function fit(root) {
  const places = root.matches('.sys-fit') ? [root] : [...root.querySelectorAll('.sys-fit')];
  for (const place of places) {
    if (!(place instanceof HTMLElement)) continue;
    const inner = place.firstElementChild;
    if (!(inner instanceof HTMLElement)) continue;
    const natural = parseFloat(inner.style.width);
    const room = place.parentElement?.clientWidth ?? natural;
    place.style.setProperty('--z', String(Math.min(1, room / natural)));
  }
}

async function draw() {
  const data = await ready();
  const tokens = data.tokens;
  const outline = await fetch(new URL('./mark/outline.json', import.meta.url)).then((r) =>
    r.json(),
  );
  document.documentElement.dataset.theme = state.theme;

  const theme = /** @type {'light' | 'dark' | 'sun'} */ (state.theme);
  const c = tokens.color[theme];
  const lockupPlace = /** @type {HTMLElement} */ (document.getElementById('lockup'));
  lockupPlace.innerHTML = lockup(
    outline,
    { line: c.accent, paper: c.ink, ink: c.ink },
    { height: 26 },
  );

  const pairs = THEMES.reduce((n, t) => n + measure(tokens, t).length, 0);
  /** @type {HTMLElement} */ (document.getElementById('figures')).innerHTML = [
    [Object.keys(tokens.color.roles).length * 3, 'colours in three themes'],
    [pairs, 'pairs pass level AA'],
    [Object.keys(tokens.type).length - 1, 'roles of type'],
    [specimens.length, 'components'],
    [Object.keys(icons).length, 'icons'],
    [3, 'motion studies'],
  ]
    .map(([n, what]) => `<li><b>${n}</b>${what}</li>`)
    .join('');

  const ground = /** @type {HTMLElement} */ (document.getElementById('ground'));
  // The ground of the page: the map alone, with the line and nothing standing on it.
  ground.innerHTML = `<div class="screen" data-theme="${theme}" style="height:100%">${mapSvg(data, { view: fitView(routePoints(data), innerWidth, innerHeight, { top: 80, right: 80, bottom: 80, left: 80 }), lang: /** @type {any} */ (state.lang), layers: layersOf(theme), over: () => routeLine(data), label: '' })}</div>`;

  const hero = /** @type {HTMLElement} */ (document.getElementById('hero'));
  const direction = directions[0];
  hero.innerHTML = `${renderScreen(direction, { screen: 'route', os: 'ios', theme: /** @type {any} */ (theme), lang: /** @type {any} */ (state.lang), data })}${renderScreen(direction, { screen: 'outing', os: 'android', theme: theme === 'sun' ? 'sun' : 'dark', lang: /** @type {any} */ (state.lang), data })}`;
  for (const device of hero.querySelectorAll('.device')) {
    /** @type {HTMLElement} */ (device).dataset.maxScale = '0.62';
  }

  main.innerHTML = [
    colourSection(tokens),
    typeSection(tokens, data),
    measureSection(tokens),
    mapSection(data),
    componentsSection(),
    platformsSection(),
    iconsSection(),
    markSection(tokens, outline),
    motionSection(),
    accessSection(tokens),
  ].join('');

  // The materials are a specimen like any other; it stands in the section on measure.
  const materials = specimens.find((s) => s.id === 'materials');
  const place = main.querySelector('[data-specimen="materials"]');
  if (materials && place)
    place.innerHTML = `<div class="sys-pair">${['ios', 'android'].map((os) => `<div class="sys-column">${slot(materials, /** @type {'ios'} */ (os), '', '')}</div>`).join('')}</div>`;

  fitHero();
  fit(main);
  fill(data);
  settle(hero);
  wire(data);
  document.body.dataset.ready = 'true';
}

function fitHero() {
  const hero = /** @type {HTMLElement} */ (document.getElementById('hero'));
  for (const device of hero.querySelectorAll('.device')) {
    if (!(device instanceof HTMLElement)) continue;
    const natural = Number(device.style.getPropertyValue('--w'));
    device.style.setProperty('--z', String(Math.min(0.62, (hero.clientWidth * 0.56) / natural)));
  }
}

/** @param {any} data */
function wire(data) {
  document.getElementById('play-durations')?.addEventListener('click', () => {
    for (const track of main.querySelectorAll('.sys-track')) {
      const dot = track.firstElementChild;
      if (!(track instanceof HTMLElement) || !(dot instanceof HTMLElement)) continue;
      const distance = track.clientWidth - 26;
      dot.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${distance}px)` }], {
        duration: Number(track.dataset.duration),
        easing: 'cubic-bezier(0.3, 0.1, 0.2, 1)',
        fill: 'forwards',
      });
    }
  });
  const start = document.getElementById('live-start');
  start?.addEventListener('click', async () => {
    const place = /** @type {HTMLElement} */ (document.getElementById('live-map'));
    start.textContent = 'Loading…';
    try {
      const { liveMap } = await import('./live-map.js');
      await liveMap(place, {
        data,
        theme: /** @type {any} */ (state.theme),
        lang: /** @type {any} */ (state.lang),
      });
      start.remove();
    } catch (error) {
      // MapLibre draws with WebGL 2; a browser without it gets the reason, not an empty box.
      start.remove();
      place.insertAdjacentHTML(
        'beforeend',
        `<p class="sys-live-failed">The live map could not be drawn here: ${error instanceof Error ? error.message.split('.')[0] : 'unknown reason'}. MapLibre needs WebGL 2 — open this page in a current Chrome, Safari or Firefox. The three drawings above show the same style.</p>`,
      );
    }
  });
}

switches.addEventListener('change', (event) => {
  const input = /** @type {HTMLInputElement} */ (event.target);
  state[input.name] = input.value;
  history.replaceState(null, '', `#${new URLSearchParams(state)}`);
  const at = scrollY;
  void draw().then(() => scrollTo(0, at));
});
addEventListener('resize', () => {
  fitHero();
  fit(main);
  fitDevices(main);
});

void draw();
