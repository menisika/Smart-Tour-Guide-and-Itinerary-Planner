/**
 * Motion study: arriving at a Place.
 *
 * The person walks the last metres; the Place lights up on the map and a ring
 * leaves it; its stop on the strip turns green; the guide's page rises from
 * the bottom edge with the photograph, and the map lifts to keep the Place in
 * sight above it. With the phone in a pocket the same moment is two notes and
 * a touch.
 */
import { format } from '../../directions/shared/data.js';
import { SIZES } from '../../directions/shared/frames.js';
import { platformIcon } from '../icons.js';
import { back, round } from '../parts/controls.js';
import { bearingAt, positionAt, walkMap } from '../parts/map.js';
import { board } from '../parts/route.js';
import { guide, player } from '../parts/story.js';
import { T } from '../strings.js';
import { study } from './study.js';

/** How far before the Place the study begins, in minutes of the plan. */
const BEFORE = 0.72;
/** While walking the map takes most of the screen and is seen from higher up. */
const WALKING = { height: 620, pitch: 40 };
/** At a Place it is what stays above the page, at the walking camera of the tokens. */
const ARRIVED = { height: 304 };
/** Map units to a point of the walking map (`walkMap`). */
const UNITS = 1.25;

void study({
  title: 'Arriving at a Place',
  lead: 'Arrival is found on the device from the stream of positions (OUT-3), and it is the moment the product exists for. So it is said three ways at once: the map shows it, the page of the guide rises to meet it, and — with the phone in a pocket — two notes and a touch.',
  steps: [
    {
      at: '0 ms',
      what: 'The last metres: the ground moves under the person, the distance to the Place counts down.',
      token: 'ease linear',
    },
    {
      at: '1500',
      what: 'Arrival. The Place takes the accent, a ring leaves it, its stop on the strip turns green. Two notes, a touch.',
      token: 'duration press · sound arrival',
    },
    {
      at: '1600',
      what: 'The guide’s page rises from the bottom edge with the photograph; the map lifts with it, so the Place stays in sight.',
      token: 'spring page · duration arrive',
    },
    {
      at: '1600',
      what: 'The row that named the Place ahead fades: the page now says it.',
      token: 'duration fade',
    },
    { at: '2100', what: 'The player comes up over the page, ready.', token: 'spring glass' },
  ],
  reduced:
    'Nothing travels. The Place takes the accent at once, and the page and the player fade in where they belong, over 180 ms. The two notes and the touch are unchanged: they are the arrival for anyone not looking.',
  scene({ data, theme, lang, os }) {
    const t = T[lang];
    const now = data.outingNow;
    const width = SIZES[os].width;
    const from = now.stop.arriveMin - BEFORE;
    const to = now.stop.arriveMin - 0.1;
    // The direction that is up does not change over these few metres.
    const bearing = bearingAt(data, from);
    const map = (
      /** @type {number} */ minute,
      /** @type {('current' | '')[]} */ pinStates,
      /** @type {{ height: number, pitch?: number }} */ camera,
    ) =>
      walkMap(data, {
        lang,
        theme,
        width,
        minute,
        walkedLegs: now.stop.order - 1,
        pins: [now.stop, now.next],
        bearing,
        pinStates,
        ...camera,
      });
    // How the ground has to move for the person to have walked from one point to the other.
    const a = positionAt(data, from);
    const b = positionAt(data, to);
    const angle = (-bearing * Math.PI) / 180;
    const dx = ((b.x - a.x) * Math.cos(angle) - (b.y - a.y) * Math.sin(angle)) / UNITS;
    const dy = ((b.x - a.x) * Math.sin(angle) + (b.y - a.y) * Math.cos(angle)) / UNITS;
    const idle = { ...now.story[lang], current: -1, elapsed: 0 };
    return {
      clock: format.clockPlus(data.route.start, Math.floor(from)),
      inner: `<div class="tt tt-outing" data-dx="${(-dx).toFixed(1)}" data-dy="${(-dy).toFixed(1)}" data-metres="${Math.round(BEFORE * 75)}">
        <div class="tt-under" id="ground">${map(from, ['', ''], WALKING)}</div>
        <template id="walked">${map(to, ['current', ''], WALKING)}</template>
        <div class="tt-under" id="arrived">${map(to, ['current', ''], ARRIVED)}</div>
        <header class="tt-top">${back(os, t.say.back)}${board(data, lang, from)}${round(platformIcon('more', os), t.say.more)}</header>
        <section class="tt-mini lg st-walkcard"><i>${now.stop.order}</i><span class="tt-mini-body"><small>${t.next} · ${now.stop.arrive}</small><span>${now.stop.name[lang]}</span></span><b class="st-far"></b></section>
        ${guide(data, lang, { theme, width, story: idle, from: 0 })}
        ${player(data, lang, { state: 'paused', story: idle })}
      </div>`,
    };
  },
  play(root, t, { lang }) {
    const ARRIVE = 1500;
    const rise = t.spring('page');
    const scene = /** @type {HTMLElement} */ (root.querySelector('.tt-outing'));
    const ground = /** @type {HTMLElement} */ (root.querySelector('#ground .map3d-ground'));
    const box = /** @type {HTMLElement} */ (root.querySelector('#ground .map3d'));
    const walking = root.querySelector('#ground');
    const arrivedMap = root.querySelector('#arrived');
    const page = root.querySelector('.tt-guide');
    const card = root.querySelector('.st-walkcard');
    const far = /** @type {HTMLElement} */ (root.querySelector('.st-far'));
    const height = root.clientHeight;

    // Until arrival there is no page and no player.
    t.move(
      page,
      [{ transform: `translateY(${height}px)` }, { transform: `translateY(${height}px)` }],
      { at: 0, duration: ARRIVE },
    );
    t.move(
      root.querySelector('.tt-player'),
      [{ transform: 'translateY(260px)' }, { transform: 'translateY(260px)' }],
      { at: 0, duration: ARRIVE + 500 },
    );

    // The last metres.
    const flat = ground.style.transform;
    t.move(
      ground,
      [
        { transform: flat },
        { transform: `${flat} translate(${scene.dataset.dx}px, ${scene.dataset.dy}px)` },
      ],
      { at: 0, duration: ARRIVE, easing: t.ease('linear') },
    );
    const walked = /** @type {HTMLTemplateElement} */ (root.querySelector('#walked')).content;
    const there = [...walked.querySelectorAll('.map3d-pin.tt-pin')];
    [...root.querySelectorAll('#ground .map3d-pin.tt-pin')].forEach((pin, i) => {
      const from = /** @type {HTMLElement} */ (pin).style;
      const to = /** @type {HTMLElement} */ (there[i]).style;
      t.move(
        pin,
        [
          { left: from.left, top: from.top },
          { left: to.left, top: to.top },
        ],
        { at: 0, duration: ARRIVE, easing: t.ease('linear') },
      );
    });
    const metres = Number(scene.dataset.metres);
    const unit = lang === 'ru' ? 'м' : 'm';
    far.textContent = `${metres}${format.NBSP}${unit}`;
    for (let step = 1; step <= 5; step++) {
      t.then((ARRIVE * step) / 5, () => {
        far.textContent = `${Math.max(0, Math.round((metres * (5 - step)) / 50) * 10)}${format.NBSP}${unit}`;
      });
    }

    // Arrival.
    const pin = /** @type {HTMLElement} */ (root.querySelector('#ground .map3d-pin.tt-pin'));
    const end = /** @type {HTMLElement} */ (there[0]).style;
    const ring = document.createElement('i');
    ring.className = 'st-ring';
    ring.style.left = end.left;
    ring.style.top = end.top;
    box.append(ring);
    t.then(ARRIVE, () => {
      pin.classList.add('is-current');
      const dots = root.querySelectorAll('.tt-strip-dot');
      dots[Number(root.querySelector('.st-walkcard > i')?.textContent) - 1]?.classList.add(
        'is-current',
      );
    });
    t.sound('arrival', ARRIVE);
    t.move(
      pin.firstElementChild,
      [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
      { at: ARRIVE, duration: 360 },
    );
    t.move(
      ring,
      [
        { transform: 'scale(0.3)', opacity: 0.9 },
        { transform: 'scale(2.6)', opacity: 0 },
      ],
      { at: ARRIVE, duration: 900, easing: t.ease('enter'), keep: false },
    );
    t.move(
      root.querySelector('#ground .tt-foot'),
      [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }],
      { at: ARRIVE, duration: 700, keep: false },
    );

    // The page rises, and the map lifts and tilts to keep the Place above it.
    // The application moves one camera; here two drawings of it change places.
    t.move(page, [{ transform: `translateY(${height}px)` }, { transform: 'translateY(0)' }], {
      at: ARRIVE + 100,
      duration: rise.duration,
      easing: rise.easing,
    });
    t.move(arrivedMap, [{ opacity: 0 }, { opacity: 0 }], { at: 0, duration: ARRIVE + 100 });
    t.move(
      walking,
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: `translateY(${(ARRIVED.height - WALKING.height) / 2}px)` },
      ],
      { at: ARRIVE + 100, duration: t.dur('arrive') },
    );
    t.move(
      arrivedMap,
      [
        { opacity: 0, transform: `translateY(${(WALKING.height - ARRIVED.height) / 3}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { at: ARRIVE + 100, duration: t.dur('arrive') },
    );
    t.move(
      card,
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(24px)' },
      ],
      { at: ARRIVE + 100, duration: t.dur('fade') },
    );

    // The player comes up, ready.
    const up = t.spring('glass');
    t.move(
      root.querySelector('.tt-player'),
      [{ transform: 'translateY(260px)' }, { transform: 'translateY(0)' }],
      { at: ARRIVE + 600, duration: up.duration, easing: up.easing },
    );
    return ARRIVE + 600 + up.duration + 400;
  },
});
