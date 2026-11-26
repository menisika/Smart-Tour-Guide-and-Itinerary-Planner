/**
 * Motion study: the Route recalculating.
 *
 * A Place is skipped (OUT-9) and the rest is worked out again on the device.
 * The change is shown where it happened and in the order it matters: the
 * Place is struck out, the line is drawn along its new course in one stroke,
 * the chart closes the gap, and the time of the finish rolls to its new value.
 *
 * Every number is real: the way round the skipped Place was found on the same
 * pedestrian graph as the Route itself (design/tools/build-map.mjs).
 */
import { format } from '../../directions/shared/data.js';
import { SIZES } from '../../directions/shared/frames.js';
import { icons, platformIcon } from '../icons.js';
import { back, round } from '../parts/controls.js';
import {
  fitView,
  layersOf,
  mapSvg,
  meDot,
  pathThrough,
  pinned,
  positionAt,
  routePath,
} from '../parts/map.js';
import { chart, verdict } from '../parts/route.js';
import { toast } from '../parts/sheets.js';
import { settle } from '../parts/story.js';
import { T } from '../strings.js';
import { study } from './study.js';

/** Height of a minute in the chart, in points. */
const SCALE = 6;
const SHEET_TOP = 402;

void study({
  title: 'The Route recalculating',
  lead: 'A Place can be skipped, the Outing shortened or a Break put in, and the rest of the Route is worked out again on the device (OUT-9…11). A plan that changes under a person has to show what changed and what it means for the one question they have: when will I be back.',
  steps: [
    {
      at: '300 ms',
      what: 'The skipped Place is struck out on the map and leaves the chart; it stays named, in the leg that goes round it.',
      token: 'duration fade',
    },
    {
      at: '500',
      what: 'The old way fades to the grey of what is not walked; the new way is drawn along its course in one stroke.',
      token: 'duration redraw · ease standard',
    },
    {
      at: '900',
      what: 'The chart closes the gap: every later Place moves up by the minutes saved, and its time changes.',
      token: 'duration move · ease standard',
    },
    {
      at: '900',
      what: 'The time of the finish rolls to its new value; the verdict says the new reserve.',
      token: 'duration roll · ease standard',
    },
    {
      at: '1700',
      what: 'A note says it in words and offers to take it back.',
      token: 'spring glass',
    },
  ],
  reduced:
    'The new way and the new times replace the old at once, with a short fade; nothing is drawn and nothing slides. The note says the same words.',
  scene({ data, theme, lang, os }) {
    const t = T[lang];
    const again = data.recalculated;
    const skip = again.skipped.order;
    const { width, height } = SIZES[os];
    const around = [skip - 1, skip, skip + 1].map((order) => data.stops[order - 1]);
    const view = fitView(
      [
        ...around.map((s) => ({ x: s.streetX, y: s.streetY })),
        ...again.leg.points.map((/** @type {number[]} */ p) => ({ x: p[0], y: p[1] })),
      ],
      width,
      height,
      { top: 132, right: 44, bottom: height - SHEET_TOP + 40, left: 44 },
    );
    // The person has just left the Place before the skipped one.
    const minute = around[0].leaveMin + 0.6;
    const here = positionAt(data, minute);
    const oldWay = routePath(data, skip - 1, skip + 1);
    const newWay = pathThrough(again.leg.points);
    const map = mapSvg(data, {
      view,
      lang,
      layers: layersOf(theme),
      labels: { max: 4, size: 10 },
      over: ({ u }) => {
        const disc = (/** @type {any} */ s, /** @type {string} */ is) =>
          pinned(
            s.streetX,
            s.streetY,
            u,
            `<circle class="tt-station-shade" r="12" cy="1.5"/><circle r="11.5"/><text y="3.6" text-anchor="middle">${s.order}</text>`,
            `tt-station${is}`,
          );
        return `${data.stops.map((/** @type {any} */ s) => `<use href="#m-foot-${s.order}" class="tt-foot"/>`).join('')}
          <path class="tt-line-walked" d="${routePath(data, 0, skip - 1)}"/>
          <path class="tt-line-case" d="${routePath(data, skip + 1)}"/><path class="tt-line" d="${routePath(data, skip + 1)}"/>
          <g class="st-old"><path class="tt-line-glow" d="${oldWay}"/><path class="tt-line-case" d="${oldWay}"/><path class="tt-line" d="${oldWay}"/></g>
          <g class="st-new"><path class="tt-line-glow" d="${newWay}" pathLength="100"/><path class="tt-line-case" d="${newWay}" pathLength="100"/><path class="tt-line" d="${newWay}" pathLength="100"/></g>
          ${data.stops.map((/** @type {any} */ s) => disc(s, s.order < skip ? ' is-done' : s.order === skip ? ' st-skipped' : '')).join('')}
          ${pinned(here.x, here.y, u, `<foreignObject x="-12" y="-12" width="24" height="24" style="overflow:visible"><div xmlns="http://www.w3.org/1999/xhtml" class="tt-me">${meDot()}</div></foreignObject>`)}`;
      },
      label: t.theLine,
    });

    // The chart is a window on the Places around the change, in both plans.
    const first = around[0].arriveMin - 2;
    const windowOf = (/** @type {any[]} */ stops) =>
      stops
        .filter((s) => s.order >= skip - 1)
        .map((s) => ({ ...s, arriveMin: s.arriveMin - first, leaveMin: s.leaveMin - first }));
    const before = chart(data, lang, {
      scale: SCALE,
      stops: windowOf(data.stops),
      minute: minute - first,
      until: 60,
      ends: false,
    });
    const after = chart(data, lang, {
      scale: SCALE,
      stops: windowOf(again.stops),
      minute: minute - first,
      until: 60,
      ends: false,
      skipped: again.skipped,
    });
    return {
      clock: format.clockPlus(data.route.start, Math.floor(minute)),
      inner: `<div class="tt st-recalc" data-saved="${again.savedMinutes}">
        <div class="tt-under">${map}<span class="tt-osm" style="top:${SHEET_TOP - 22}px">© OpenStreetMap</span></div>
        <header class="tt-top">${back(os, t.say.back)}<span class="tt-fill"></span>${round(platformIcon('more', os), t.say.more)}</header>
        <section class="tt-sheet lg" style="top:${SHEET_TOP}px">
          <button class="tt-grab" aria-label="${t.say.expand}"></button>
          <div class="tt-frame">
            <p><span>${t.out}</span><b>${data.route.start}</b></p>
            <p class="tt-span"><span class="st-total" data-new="${format.duration(again.route.totalMinutes, lang)}">${format.duration(data.route.totalMinutes, lang)}</span><i></i></p>
            <p><span>${t.back}</span><b><span class="st-roll"><span>${data.route.finish}</span><span>${again.route.finish}</span></span></b></p>
          </div>
          <div class="st-verdict">${verdict(lang, data.route)}</div>
          <template id="verdict-after">${verdict(lang, again.route)}</template>
          <div class="tt-chart-window" style="height:330px;margin-top:10px"><div class="st-before">${before}</div><template id="chart-after">${after}</template></div>
        </section>
        ${toast({ icon: icons.route, lead: t.recalculated, rest: `${t.finishAt(again.route.finish)} · ${t.reserve(again.route.reserveMinutes)}`, undo: t.undo, style: 'top:118px' })}
      </div>`,
    };
  },
  play(root, t) {
    const scene = /** @type {HTMLElement} */ (root.querySelector('.st-recalc'));
    const saved = Number(scene.dataset.saved);
    const SKIP = 300;
    const DRAW = 500;
    const CLOSE = 900;
    const SAY = 1700;
    const fade = t.dur('fade');

    // The note waits above the screen.
    const note = root.querySelector('.tt-toast');
    t.move(
      note,
      [
        { transform: 'translateY(-200px)', opacity: 0 },
        { transform: 'translateY(-200px)', opacity: 0 },
      ],
      { at: 0, duration: SAY },
    );

    // The Place is struck out.
    const disc = root.querySelector('.st-skipped');
    t.then(SKIP, () => disc?.classList.add('is-skipped'));
    t.move(disc, [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], {
      at: SKIP,
      duration: fade * 2,
      keep: false,
    });

    // The old way goes; the new one is drawn in one stroke.
    t.move(root.querySelector('.st-old'), [{ opacity: 1 }, { opacity: 0 }], {
      at: DRAW,
      duration: t.dur('move'),
    });
    for (const path of root.querySelectorAll('.st-new path')) {
      t.move(
        path,
        [
          { strokeDasharray: '100 100', strokeDashoffset: 100 },
          { strokeDasharray: '100 100', strokeDashoffset: 0 },
        ],
        { at: DRAW, duration: t.dur('redraw') },
      );
    }

    // The chart closes the gap, and the times of the later Places change.
    const before = /** @type {HTMLElement} */ (root.querySelector('.st-before'));
    const after = /** @type {HTMLTemplateElement} */ (root.querySelector('#chart-after')).content;
    const skippedOrder = Number(disc?.querySelector('text')?.textContent);
    const shift = `translateY(${-saved * SCALE}px)`;
    for (const row of before.querySelectorAll('.tt-stop, .tt-leg')) {
      const order = Number(row.querySelector('.tt-dwell span')?.textContent ?? NaN);
      if (order === skippedOrder) {
        t.move(row, [{ opacity: 1 }, { opacity: 0 }], { at: SKIP, duration: fade });
      } else if (order > skippedOrder) {
        t.move(row, [{ transform: 'translateY(0)' }, { transform: shift }], {
          at: CLOSE,
          duration: t.dur('move'),
        });
      } else if (
        row.matches('.tt-leg') &&
        parseFloat(/** @type {HTMLElement} */ (row).style.top) > 60
      ) {
        // The legs to and from the skipped Place go with it.
        t.move(row, [{ opacity: 1 }, { opacity: 0 }], { at: SKIP, duration: fade });
      }
    }
    // Once it has closed, the chart is the one of the new Route: the same rows, their new times.
    t.then(CLOSE + t.dur('move') + 40, () => {
      before.replaceChildren(after.cloneNode(true));
      settle(before);
    });
    t.move(before, [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], {
      at: CLOSE + t.dur('move'),
      duration: fade * 2,
      keep: false,
    });

    // The finish rolls to its new value; the length and the verdict follow.
    const roll = root.querySelector('.st-roll > span');
    t.move(roll, [{ marginTop: '0' }, { marginTop: '-1em' }], {
      at: CLOSE,
      duration: t.dur('roll'),
    });
    const total = /** @type {HTMLElement} */ (root.querySelector('.st-total'));
    const say = /** @type {HTMLElement} */ (root.querySelector('.st-verdict'));
    const newVerdict = /** @type {HTMLTemplateElement} */ (root.querySelector('#verdict-after'))
      .content;
    t.then(CLOSE + t.dur('roll') / 2, () => {
      total.textContent = total.dataset.new ?? '';
      say.replaceChildren(newVerdict.cloneNode(true));
    });
    t.move(say, [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], {
      at: CLOSE + t.dur('roll') / 2 - fade,
      duration: fade * 2,
      keep: false,
    });

    // And it is said in words.
    const down = t.spring('glass');
    t.move(
      note,
      [
        { transform: 'translateY(-200px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      { at: SAY, duration: down.duration, easing: down.easing },
    );
    return SAY + down.duration + 1400;
  },
});
