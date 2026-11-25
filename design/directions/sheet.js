/**
 * The whole sheet of one direction: the idea and where it comes from, type,
 * colour, the map, the Story being played with its motion, and every variant
 * of the two screens — three systems, two themes, two languages.
 */
import { directions } from './registry.js';
import { fitDevices } from './shared/frames.js';
import { ready, renderScreen, settle } from './viewer.js';

const id = document.documentElement.dataset.direction;
const direction = directions.find((d) => d.id === id) ?? directions[0];
const sheet = direction.sheet;
const main = /** @type {HTMLElement} */ (document.getElementById('sheet'));
const nav = /** @type {HTMLElement} */ (document.getElementById('nav'));

nav.innerHTML =
  `<a href="./">All three, side by side</a>` +
  directions
    .map(
      (d) =>
        `<a href="${d.id}.html"${d.id === direction.id ? ' aria-current="page"' : ''}>${d.name.en}</a>`,
    )
    .join('');

/** @param {string} css a colour as the browser reports it @returns {[number, number, number]} */
function rgb(css) {
  const context = /** @type {CanvasRenderingContext2D} */ (
    document.createElement('canvas').getContext('2d')
  );
  context.fillStyle = css;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** Relative luminance, as WCAG 2.2 defines it. @param {[number, number, number]} colour */
function luminance(colour) {
  const [r, g, b] = colour.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** @param {[number, number, number]} a @param {[number, number, number]} b */
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const hex = (/** @type {[number, number, number]} */ c) =>
  `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** The colours of a theme, read from the style sheet of the direction itself. @param {'light' | 'dark'} theme */
function palette(theme) {
  const probe = document.createElement('div');
  probe.className = `screen d-${direction.id}`;
  probe.dataset.theme = theme;
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  document.body.append(probe);
  const style = getComputedStyle(probe);
  /** @type {Record<string, [number, number, number]>} */
  const colours = {};
  const tokens = new Set([
    ...sheet.colours.map((/** @type {any} */ c) => c.token),
    ...sheet.pairs.flatMap((/** @type {any} */ pair) => [pair.text, pair.on]),
  ]);
  for (const token of tokens) colours[token] = rgb(style.getPropertyValue(token).trim());
  probe.remove();
  const swatches = sheet.colours
    .map(
      (/** @type {any} */ c) =>
        `<li><i style="background:${hex(colours[c.token])}"></i><b>${c.role}</b><code>${hex(colours[c.token])}</code></li>`,
    )
    .join('');
  const pairs = sheet.pairs
    .map((/** @type {any} */ pair) => {
      const ratio = contrast(colours[pair.text], colours[pair.on]);
      const need = pair.large ? 3 : 4.5;
      return `<li><span style="background:${hex(colours[pair.on])};color:${hex(colours[pair.text])}">${pair.what}</span><b>${ratio.toFixed(1)} : 1</b><small>${ratio >= need ? 'passes' : 'FAILS'} ${pair.large ? '3 : 1, graphics and large text' : '4.5 : 1, text'}</small></li>`;
    })
    .join('');
  return `<div class="sheet-palette"><h4>${theme === 'light' ? 'Light' : 'Dark'}</h4><ul class="sheet-swatches">${swatches}</ul><ul class="sheet-pairs">${pairs}</ul></div>`;
}

const SYSTEMS = /** @type {const} */ (['ios', 'android', 'web']);
const SCREENS = /** @type {const} */ ({
  route: 'The Route with its map',
  outing: 'The Outing while a Story plays',
});
const VARIANTS = /** @type {const} */ ([
  ['light', 'ru'],
  ['light', 'en'],
  ['dark', 'ru'],
  ['dark', 'en'],
]);
const SYSTEM_NAMES = { ios: 'iOS', android: 'Android', web: 'Web' };

async function draw() {
  const data = await ready();
  const hero = (
    /** @type {'route' | 'outing'} */ screen,
    /** @type {'ios' | 'android' | 'web'} */ os,
    /** @type {'light' | 'dark'} */ theme = 'light',
  ) =>
    `<div class="device-slot">${renderScreen(direction, { screen, os, theme, lang: 'ru', data })}</div>`;

  const board = Object.entries(SCREENS)
    .map(([screen, title]) =>
      SYSTEMS.map(
        (os) => `<section class="board-row" data-os="${os}">
          <h4>${title} · ${SYSTEM_NAMES[os]}</h4>
          <div class="board-cells">${VARIANTS.map(
            ([theme, lang]) =>
              `<figure class="board-cell" data-screen="${screen}" data-os="${os}" data-theme="${theme}" data-lang="${lang}"><div class="device-slot"></div><figcaption>${theme} · ${lang === 'ru' ? 'Russian' : 'English'}</figcaption></figure>`,
          ).join('')}</div>
        </section>`,
      ).join(''),
    )
    .join('');

  main.innerHTML = `
    <section class="sheet-lead">
      <p class="sheet-kicker">Direction ${directions.indexOf(direction) + 1} of ${directions.length}</p>
      <h2>${direction.name.en} <small>${direction.name.ru}</small></h2>
      <p class="sheet-idea">${direction.idea}</p>
    </section>

    <section class="sheet-pair">
      <figure>${hero('route', 'ios')}<figcaption>The Route with its map · iOS, light</figcaption></figure>
      <figure>${hero('outing', 'ios')}<figcaption>The Outing while a Story plays · iOS, light</figcaption></figure>
      <figure>${hero('outing', 'android', 'dark')}<figcaption>The same on Android, dark</figcaption></figure>
    </section>

    <section class="sheet-text">
      <h3>Why this, for this product</h3>
      ${sheet.reason.map((/** @type {string} */ p) => `<p>${p}</p>`).join('')}
      <h4>Where it comes from</h4>
      <ul class="sheet-roots">${sheet.roots.map((/** @type {any} */ r) => `<li><b>${r.what}</b> ${r.lesson} <a href="${r.url}">${r.source}</a></li>`).join('')}</ul>
    </section>

    <section class="sheet-text">
      <h3>Type, Latin and Cyrillic</h3>
      <p>${sheet.typeNote}</p>
      <div class="sheet-specimen screen d-${direction.id}" data-theme="light">
        ${sheet.type.map((/** @type {any} */ t) => `<div class="sheet-face"><p class="sheet-face-role">${t.role} — ${t.face}</p><p style="${t.css}" lang="ru">${t.ru}</p><p style="${t.css}" lang="en">${t.en}</p></div>`).join('')}
      </div>
    </section>

    <section class="sheet-text">
      <h3>Colour, light and dark</h3>
      <p>${sheet.colourNote}</p>
      <div class="sheet-palettes">${palette('light')}${palette('dark')}</div>
    </section>

    <section class="sheet-text">
      <h3>The map</h3>
      <p>${sheet.mapNote}</p>
      <div class="sheet-maps">
        ${['light', 'dark'].map((theme) => `<figure><div class="sheet-map screen d-${direction.id}" data-theme="${theme}" lang="ru">${direction.sample(data, 'ru', { width: 560, height: 380 })}</div><figcaption>${theme}</figcaption></figure>`).join('')}
      </div>
    </section>

    <section class="sheet-text sheet-motion">
      <div>
        <h3>The Story being played, and motion</h3>
        <p>${sheet.storyNote}</p>
        <ul class="sheet-moves">${sheet.motion.map((/** @type {any} */ m) => `<li><b>${m.moment}</b> ${m.how}</li>`).join('')}</ul>
        <p><button class="sheet-button" id="live" aria-pressed="false">Play the text following the voice</button></p>
        <p class="sheet-small">The button moves the text sentence by sentence on the screen beside it, at the pace of speech. With “reduce motion” set in the system the changes are instant.</p>
      </div>
      <figure id="live-figure">${hero('outing', 'ios')}</figure>
    </section>

    <section class="sheet-text">
      <h3>The same idea on each system</h3>
      <ul class="sheet-roots">${sheet.platforms.map((/** @type {any} */ p) => `<li><b>${p.system}</b> ${p.how}</li>`).join('')}</ul>
      <h4>Where it is weak</h4>
      <ul class="sheet-roots">${sheet.risks.map((/** @type {string} */ r) => `<li>${r}</li>`).join('')}</ul>
    </section>

    <section class="sheet-board">
      <h3>Every variant</h3>
      <p>Both screens on the three systems, in light and dark, in Russian and English: twenty-four drawings of one Outing. Each opens alone, at its real size, by its caption.</p>
      ${board}
    </section>`;

  await settle(main, directions);

  // The board is drawn as it comes into view: twenty-four maps at once would stall the page.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const cell = /** @type {HTMLElement} */ (entry.target);
        observer.unobserve(cell);
        const { screen, os, theme, lang } = /** @type {any} */ (cell.dataset);
        const slot = /** @type {HTMLElement} */ (cell.querySelector('.device-slot'));
        slot.innerHTML = renderScreen(direction, { screen, os, theme, lang, data });
        const caption = /** @type {HTMLElement} */ (cell.querySelector('figcaption'));
        caption.innerHTML = `<a href="one.html#d=${direction.id}&screen=${screen}&os=${os}&theme=${theme}&lang=${lang}">${caption.textContent}</a>`;
        void settle(cell, directions);
      }
    },
    { rootMargin: '600px' },
  );
  for (const cell of main.querySelectorAll('.board-cell')) observer.observe(cell);

  const button = /** @type {HTMLButtonElement} */ (document.getElementById('live'));
  const figure = /** @type {HTMLElement} */ (document.getElementById('live-figure'));
  /** @type {number | undefined} */
  let timer;
  let index = data.outingNow.story.ru.current;
  button.addEventListener('click', () => {
    const playing = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!playing));
    button.textContent = playing ? 'Play the text following the voice' : 'Stop';
    clearInterval(timer);
    if (playing) return;
    const story = data.outingNow.story.ru;
    timer = setInterval(() => {
      index = (index + 1) % story.sentences.length;
      direction.follow(figure, story, index);
    }, 2600);
  });

  document.body.dataset.ready = 'true';
}

addEventListener('resize', () => {
  fitDevices(main);
  void settle(main, directions);
});
void draw();
