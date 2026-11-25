/**
 * The chosen direction: its two screens side by side, for one system, theme
 * and language at a time, chosen with the switches. The choice is kept in the
 * address, so that a view can be sent as a link.
 */
import { directions } from './registry.js';
import { ready, renderScreen, settle } from './viewer.js';

const direction = directions[0];

const OPTIONS = {
  os: { label: 'System', values: { ios: 'iOS', android: 'Android', web: 'Web' } },
  theme: { label: 'Theme', values: { light: 'Light', dark: 'Dark' } },
  lang: { label: 'Language', values: { ru: 'Русский', en: 'English' } },
};

const SCREENS = /** @type {const} */ ({
  route: 'The Route with its map',
  outing: 'The Outing while a Story plays',
});

/** @type {Record<string, string>} */
const state = { os: 'ios', theme: 'light', lang: 'ru' };
for (const [key, value] of new URLSearchParams(location.hash.slice(1))) {
  if (key in OPTIONS && value in OPTIONS[/** @type {keyof typeof OPTIONS} */ (key)].values)
    state[key] = value;
}

const switches = /** @type {HTMLFormElement} */ (document.getElementById('switches'));
const trio = /** @type {HTMLElement} */ (document.getElementById('trio'));
const nav = /** @type {HTMLElement} */ (document.getElementById('nav'));
const note = /** @type {HTMLElement} */ (document.getElementById('note'));
const lead = /** @type {HTMLElement} */ (document.getElementById('lead'));

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

nav.innerHTML = `<a href="${direction.id}.html">The whole sheet: reasons, type, colour, map, motion, every variant</a>`;
lead.textContent = `${direction.name.en} — «${direction.name.ru}». ${direction.idea}`;

note.textContent =
  'The Outing is the reference Outing of scenario SC-1, measured on OpenStreetMap data: its names, times and distances are real. The text under “a Story playing” is a passage quoted from Wikipedia and cited on the screen; it stands in for a Story. The photographs are from Wikimedia Commons, each credited where it is shown. Map data © OpenStreetMap contributors. Liquid Glass is drawn on iOS and on the web; Android has solid Material surfaces, by the owner’s decision.';

async function draw() {
  const data = await ready();
  trio.dataset.os = state.os;
  trio.innerHTML = Object.entries(SCREENS)
    .map(
      ([screen, title]) => `<section class="trio-item">
        <header><h2>${title}</h2><a href="one.html#d=${direction.id}&screen=${screen}&os=${state.os}&theme=${state.theme}&lang=${state.lang}">alone, at its real size</a></header>
        <div class="device-slot">${renderScreen(direction, { .../** @type {any} */ (state), screen, data })}</div>
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
