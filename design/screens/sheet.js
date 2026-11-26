/**
 * A sheet of screens side by side, with nothing around them: for looking at
 * many drawings at once, and for comparing one screen across systems, themes
 * and languages. Chosen by the address:
 *
 *     sheet.html#screens=route,edit&os=ios,android&theme=light,dark&lang=ru&width=300
 *
 * `screens` takes ids of screens or of packages (`D-03`); what is left out
 * means "every state, iOS, light, Russian".
 */
import { SIZES } from '../directions/shared/frames.js';
import { screens } from './registry.js';
import { draw, ready, settle } from './render.js';

const sheet = /** @type {HTMLElement} */ (document.getElementById('sheet'));

async function show() {
  const query = new URLSearchParams(location.hash.slice(1));
  const list = (/** @type {string} */ key, /** @type {string} */ otherwise) =>
    (query.get(key) ?? otherwise).split(',').filter(Boolean);
  const ids = list('screens', '');
  const chosen = ids.length
    ? screens.filter((s) => ids.includes(s.id) || ids.includes(s.pkg))
    : screens;
  const states = list('state', '');
  const width = Number(query.get('width') ?? 300);
  const data = await ready();
  sheet.innerHTML = chosen
    .flatMap((screen) =>
      Object.keys(screen.states)
        .filter((state) => states.length === 0 || states.includes(state))
        .flatMap((state) =>
          screen.on
            .filter((os) => !['ios', 'android'].includes(os) || list('os', 'ios').includes(os))
            .flatMap((os) =>
              list('theme', 'light').flatMap((theme) =>
                list('lang', 'ru').map((lang) => {
                  const size = SIZES[/** @type {keyof typeof SIZES} */ (os)];
                  const wide = size.width > 500 ? width * 2.6 : width;
                  return `<figure style="width:${wide}px"><div style="aspect-ratio:${size.width} / ${size.height}">${draw(screen, { os, theme, lang: /** @type {'ru' | 'en'} */ (lang), state, data })}</div><figcaption>${screen.id} · ${state} · ${os} ${theme} ${lang}</figcaption></figure>`;
                }),
              ),
            ),
        ),
    )
    .join('');
  await settle(sheet);
  document.body.dataset.ready = 'true';
}

addEventListener('hashchange', () => void show());
void show();
