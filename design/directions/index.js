/**
 * The three directions side by side: the same screen, system, theme and
 * language in each, chosen with the switches. The choice is kept in the
 * address, so that a view can be sent as a link.
 */
import { directions } from './registry.js';
import { ready, renderScreen, settle } from './viewer.js';

const OPTIONS = {
  screen: {
    label: 'Screen',
    values: { route: 'Route and map', outing: 'Outing, a Story playing' },
  },
  os: { label: 'System', values: { ios: 'iOS', android: 'Android', web: 'Web' } },
  theme: { label: 'Theme', values: { light: 'Light', dark: 'Dark' } },
  lang: { label: 'Language', values: { ru: 'Русский', en: 'English' } },
};

/** @type {Record<string, string>} */
const state = { screen: 'route', os: 'ios', theme: 'light', lang: 'ru' };
for (const [key, value] of new URLSearchParams(location.hash.slice(1))) {
  if (key in OPTIONS && value in OPTIONS[/** @type {keyof typeof OPTIONS} */ (key)].values)
    state[key] = value;
}

const switches = /** @type {HTMLFormElement} */ (document.getElementById('switches'));
const trio = /** @type {HTMLElement} */ (document.getElementById('trio'));
const nav = /** @type {HTMLElement} */ (document.getElementById('nav'));
const note = /** @type {HTMLElement} */ (document.getElementById('note'));

switches.innerHTML = Object.entries(OPTIONS)
  .map(
    ([key, option]) =>
      `<fieldset class="switch"><legend>${option.label}</legend><div class="switch-options">${Object.entries(
        option.values,
      )
        .map(
          ([value, label]) =>
            `<label><input type="radio" name="${key}" value="${value}"${state[key] === value ? ' checked' : ''}><span>${label}</span></label>`,
        )
        .join('')}</div></fieldset>`,
  )
  .join('');

nav.innerHTML = directions
  .map((d) => `<a href="${d.id}.html">${d.name.en} — the whole sheet</a>`)
  .join('');

note.textContent =
  'The Outing is the reference Outing of scenario SC-1, measured on OpenStreetMap data: its names, times and distances are real. The text under “a Story playing” is a passage quoted from Wikipedia and cited on the screen; it stands in for a Story. Map data © OpenStreetMap contributors.';

async function draw() {
  const data = await ready();
  trio.dataset.os = state.os;
  trio.innerHTML = directions
    .map(
      (direction, i) => `<section class="trio-item">
        <header><h2>${i + 1}. ${direction.name.en}<small>${direction.name.ru}</small></h2><a href="${direction.id}.html">sheet</a></header>
        <div class="device-slot">${renderScreen(direction, { .../** @type {any} */ (state), data })}</div>
        <p class="idea">${direction.idea}</p>
      </section>`,
    )
    .join('');
  await settle(trio, directions);
}

switches.addEventListener('change', (event) => {
  const input = /** @type {HTMLInputElement} */ (event.target);
  state[input.name] = input.value;
  history.replaceState(null, '', `#${new URLSearchParams(state)}`);
  void draw();
});
addEventListener('resize', () => void settle(trio, directions));

void draw();
