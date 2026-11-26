/**
 * The index of the screens: the scenarios of the specification as walks,
 * step by step, and then every screen in each of its states. One system,
 * theme and language at a time, chosen with the switches; the choice is kept
 * in the address, so that a view can be sent as a link.
 */
import { SIZES } from '../directions/shared/frames.js';
import { scenarios, screenOf, screens } from './registry.js';
import { draw, ready, settle } from './render.js';

const OPTIONS = {
  os: { label: 'Phone', values: { ios: 'iOS', android: 'Android' } },
  theme: { label: 'Theme', values: { light: 'Light', dark: 'Dark', sun: 'Bright sunlight' } },
  lang: { label: 'Language', values: { ru: 'Русский', en: 'English' } },
  rows: { label: 'Rows', values: { line: 'In a line', grid: 'All in sight' } },
};

/** What each package drew, in the order of the work plan. */
const PACKAGES = {
  'D-03': 'The solo Outing on iOS and Android',
  'D-04': 'The web and the console',
  'D-09': 'The Party and the Catalog',
};

/** @type {Record<string, string>} */
const view = { os: 'ios', theme: 'light', lang: 'ru', rows: 'line' };
for (const [key, value] of new URLSearchParams(location.hash.slice(1))) {
  if (key in OPTIONS && value in OPTIONS[/** @type {keyof typeof OPTIONS} */ (key)].values)
    view[key] = value;
}

const byId = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));

byId('lead').textContent =
  'Every screen of the mockups, assembled from the components of the design system. First the scenarios of the specification, each as a walk from its first screen to its last; then every screen in each of its states, with the requirements it shows. A screen opens alone, at its real size, by a click.';
byId('nav').innerHTML =
  `${scenarios.map((s) => `<a href="#${s.id}">${s.id}</a>`).join('')}<a href="#every">Every screen and its states</a><a href="check.html">The check</a><a href="../system/">The design system</a>`;

byId('switches').innerHTML = Object.entries(OPTIONS)
  .map(
    ([key, option]) =>
      `<fieldset class="pg-switch"><legend>${option.label}</legend><div>${Object.entries(
        option.values,
      )
        .map(
          ([value, name]) =>
            `<label><input type="radio" name="${key}" value="${value}"${view[key] === value ? ' checked' : ''}><span>${name}</span></label>`,
        )
        .join('')}</div></fieldset>`,
  )
  .join('');

/** The system a screen is drawn for, given the phone that is chosen. @param {import('./registry.js').Screen} screen @param {string} [on] */
const systemOf = (screen, on) => on ?? (screen.on.includes(view.os) ? view.os : screen.on[0]);

/** @param {string[]} reqs */
const reqsOf = (reqs) => `<p class="pg-reqs">${reqs.map((r) => `<code>${r}</code>`).join('')}</p>`;

/**
 * The place of one drawing: it is drawn when it comes near the window.
 * @param {import('./registry.js').Screen} screen @param {string} state @param {string} query what the link adds @param {string} [on]
 */
function slot(screen, state, query, on) {
  const os = systemOf(screen, on);
  const size = SIZES[/** @type {keyof typeof SIZES} */ (os)];
  return `<a class="pg-slot" style="--ratio:${size.width} / ${size.height}" data-screen="${screen.id}" data-state="${state}" data-os="${os}" href="one.html#${query}&os=${os}&theme=${view.theme}&lang=${view.lang}" aria-label="${screen.title}, alone at its real size"></a>`;
}

/** How wide a drawing is on the page. @param {string} os */
const slotWidth = (os) => (SIZES[/** @type {keyof typeof SIZES} */ (os)].width > 500 ? 640 : 262);

function build() {
  byId('walks').innerHTML = scenarios
    .map(
      (scenario) => `<section id="${scenario.id}">
        <h2>${scenario.id} · ${scenario.title}</h2>
        <p>${scenario.steps.length} steps. A step opens alone and can be followed from there with “next”.</p>
        <div class="pg-row">${scenario.steps
          .map(([id, state, what, on], i) => {
            const screen = screenOf(id);
            return `<div class="pg-step" style="--slot:${slotWidth(systemOf(screen, on))}px">
              <p class="pg-step-n"><b>${i + 1}</b><span>${what}</span></p>
              ${slot(screen, state, `walk=${scenario.id}&step=${i + 1}`, on)}
              <div class="pg-cap"><b>${screen.title}</b>${screen.states[state]}${reqsOf(screen.reqs)}</div>
            </div>`;
          })
          .join('')}</div>
      </section>`,
    )
    .join('');

  byId('all').innerHTML = `<section id="every">${Object.entries(PACKAGES)
    .filter(([pkg]) => screens.some((s) => s.pkg === pkg))
    .map(
      ([pkg, name]) => `<h2>${pkg} · ${name}</h2>
        <p>Every screen of the package in each state it can be in. Where one of the five states — usual, loading, empty, no network, error — cannot occur, the reason is given.</p>
        ${screens
          .filter((s) => s.pkg === pkg)
          .map(
            (screen) => `<article class="pg-screen" id="screen-${screen.id}">
              <header>
                <h3>${screen.group} · ${screen.title}</h3>
                ${reqsOf(screen.reqs)}
                <p>${screen.note}</p>
                ${Object.entries(screen.absent ?? {})
                  .map(
                    ([state, why]) => `<p class="pg-absent"><b>No “${state}” state.</b> ${why}</p>`,
                  )
                  .join('')}
              </header>
              <div class="pg-row">${screen.on
                .filter((os) => !['ios', 'android'].includes(os) || os === view.os)
                .flatMap((os) =>
                  Object.entries(screen.states).map(
                    ([state, name]) => `<div class="pg-step" style="--slot:${slotWidth(os)}px">
                      ${slot(screen, state, `screen=${screen.id}&state=${state}`, os)}
                      <div class="pg-cap"><b>${name}</b></div>
                    </div>`,
                  ),
                )
                .join('')}</div>
            </article>`,
          )
          .join('')}`,
    )
    .join('')}</section>`;
}

const data = await ready();

const watcher = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const place = /** @type {HTMLElement} */ (entry.target);
      watcher.unobserve(place);
      place.innerHTML = draw(screenOf(place.dataset.screen ?? ''), {
        os: place.dataset.os ?? view.os,
        theme: view.theme,
        lang: /** @type {'ru' | 'en'} */ (view.lang),
        state: place.dataset.state ?? 'usual',
        data,
      });
      void settle(place);
    }
  },
  { rootMargin: '500px' },
);

function show() {
  document.body.classList.toggle('pg-grid', view.rows === 'grid');
  watcher.disconnect();
  build();
  for (const place of document.querySelectorAll('.pg-slot')) watcher.observe(place);
}

byId('switches').addEventListener('change', (event) => {
  const input = /** @type {HTMLInputElement} */ (event.target);
  view[input.name] = input.value;
  history.replaceState(null, '', `#${new URLSearchParams(view)}`);
  show();
});
addEventListener('resize', () => void settle(document));

show();
document.body.dataset.ready = 'true';
