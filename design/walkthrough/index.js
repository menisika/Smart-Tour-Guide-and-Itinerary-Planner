/**
 * The six scenarios as walks: choose the phone, the theme and the language,
 * then walk one through by tapping what leads on. With hints off the page
 * shows no ring, and every tap that led nowhere is kept — for someone who
 * has never seen the product.
 */
import { clearStumbles, stumbles, walks } from './walks.js';

const CHOICES = {
  os: { label: 'Phone', values: { ios: 'iOS', android: 'Android' } },
  theme: { label: 'Theme', values: { light: 'Light', dark: 'Dark', sun: 'Bright sunlight' } },
  lang: { label: 'Language', values: { ru: 'Русский', en: 'English' } },
  hints: { label: 'Hints', values: { on: 'On', off: 'Off: a first-time walk' } },
};

/** Which phone this is, so that a walk on a phone starts as that phone. */
const here = /Android/i.test(navigator.userAgent) ? 'android' : 'ios';
/** @type {Record<string, string>} */
const view = { os: here, theme: 'light', lang: 'ru', hints: 'on' };
const done = new Set(
  (sessionStorage.getItem('promenade-walks-done') ?? '').split(',').filter(Boolean),
);
const finished = new URLSearchParams(location.hash.slice(1)).get('done');
if (finished) {
  done.add(finished);
  sessionStorage.setItem('promenade-walks-done', [...done].join(','));
  history.replaceState(null, '', location.pathname);
}

const byId = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));

byId('lead').textContent =
  'The scenarios of the specification, each from its first screen to its last. A screen leads on by its own control: the marked one, or — where the next step comes by itself — a tap anywhere. On a phone the screen fills the width. Scenarios SC-5 and the end of SC-6 are at the Curator’s desk: walk them on a desktop.';

byId('choices').innerHTML = Object.entries(CHOICES)
  .map(
    ([key, choice]) =>
      `<fieldset><legend>${choice.label}</legend><div>${Object.entries(choice.values)
        .map(
          ([value, name]) =>
            `<label><input type="radio" name="${key}" value="${value}"${view[key] === value ? ' checked' : ''}><span>${name}</span></label>`,
        )
        .join('')}</div></fieldset>`,
  )
  .join('');

function list() {
  byId('walks').innerHTML = walks
    .map(
      (walk) =>
        `<li><a${done.has(walk.id) ? ' class="is-done"' : ''} href="walk.html#walk=${walk.id}&step=1&${new URLSearchParams(view)}"><b>${walk.id}</b><span>${walk.title}<small>${walk.steps.length} steps</small></span><i>${done.has(walk.id) ? 'walked' : 'start →'}</i></a></li>`,
    )
    .join('');
}

function notes() {
  const kept = stumbles();
  const lines = kept.map((s) => `${s.walk} · step ${s.step} · ${s.screen} — tapped “${s.tapped}”`);
  byId('notes').innerHTML = `<h2>Stumbles</h2>
    <p>${kept.length === 0 ? 'None kept on this device. A tap that leads nowhere is kept here with the name of what was tapped.' : `${kept.length} taps that led nowhere, kept on this device:`}</p>
    ${kept.length ? `<pre id="kept">${lines.join('\n')}</pre><button type="button" id="copy">Copy</button> <button type="button" id="clear">Clear</button>` : ''}`;
  document.getElementById('copy')?.addEventListener('click', () => {
    void navigator.clipboard?.writeText(lines.join('\n'));
  });
  document.getElementById('clear')?.addEventListener('click', () => {
    clearStumbles();
    notes();
  });
}

byId('choices').addEventListener('change', (event) => {
  const input = /** @type {HTMLInputElement} */ (event.target);
  view[input.name] = input.value;
  list();
});

list();
notes();
document.body.dataset.ready = 'true';
