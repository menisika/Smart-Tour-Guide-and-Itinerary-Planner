/**
 * Motion study: a Story starting by itself.
 *
 * The product speaks without being asked, so it says that it is about to: a
 * breath of sound, and a ring that closes round the key for one second, in
 * which a touch holds the Story back. Then the voice draws itself in, the key
 * turns to "pause", the rule comes to the first sentence and the words light
 * as they are said.
 */
import { format } from '../../directions/shared/data.js';
import { SIZES } from '../../directions/shared/frames.js';
import { icons, platformIcon } from '../icons.js';
import { back, round } from '../parts/controls.js';
import { walkMap } from '../parts/map.js';
import { board } from '../parts/route.js';
import { guide, player } from '../parts/story.js';
import { T } from '../strings.js';
import { study } from './study.js';

/** How much of the Story the study plays, in seconds of speech. */
const SPOKEN = 6;

void study({
  title: 'A Story starting by itself',
  lead: 'After “Start”, an Outing needs no touch: a Story begins on arrival (NFR-25). A voice that starts unasked should say so first, and leave a second in which one touch holds it back. The text then follows the voice, for those who read rather than hear (OUT-7, NFR-27).',
  steps: [
    {
      at: '400 ms',
      what: 'A breath of sound, and a ring begins to close round the key. A touch now holds the Story.',
      token: 'sound story · 1000 ms, linear',
    },
    {
      at: '1400',
      what: 'The ring closes. The key turns to “pause” and settles; the bars of the voice rise from a line, left to right.',
      token: 'spring glass',
    },
    {
      at: '1400',
      what: 'The rule comes to the first sentence, and its words light one by one at the pace of speech.',
      token: 'duration follow · duration press',
    },
    {
      at: 'then',
      what: 'At each new sentence the rule glides down to it; the bars behind the playhead take the colour of the line.',
      token: 'duration follow · ease standard',
    },
  ],
  reduced:
    'The ring still closes: it is information, not ornament, and it is the second of grace. The bars appear at their height, the rule moves to each sentence at once, and the words still light as they are said.',
  scene({ data, theme, lang, os }) {
    const t = T[lang];
    const now = data.outingNow;
    const width = SIZES[os].width;
    const idle = { ...now.story[lang], current: -1, elapsed: 0 };
    return {
      clock: now.stop.arrive,
      inner: `<div class="tt tt-outing">
        <div class="tt-under">${walkMap(data, { lang, theme, width, height: 304, minute: now.stop.arriveMin - 0.1, walkedLegs: now.stop.order - 1, pins: [now.stop, now.next] })}</div>
        <header class="tt-top">${back(os, t.say.back)}${board(data, lang, now.stop.arriveMin)}${round(platformIcon('more', os), t.say.more)}</header>
        ${guide(data, lang, { theme, width, story: idle, from: 0 })}
        ${player(data, lang, { state: 'paused', story: idle })}
      </div>`,
    };
  },
  play(root, t, { data, lang }) {
    const BREATH = 400;
    const START = 1400;
    const story = data.outingNow.story[lang];
    const style = getComputedStyle(root);
    const ink = style.getPropertyValue('--ink').trim();
    const ink2 = style.getPropertyValue('--ink-2').trim();
    const line = style.getPropertyValue('--line').trim();
    const accent = style.getPropertyValue('--accent').trim();
    const key = /** @type {HTMLElement} */ (root.querySelector('.tt-key-main'));
    const say = T[lang].say;

    // The second of grace.
    t.sound('story', BREATH);
    key.insertAdjacentHTML(
      'beforeend',
      '<svg class="st-count" viewBox="0 0 66 66" aria-hidden="true"><circle cx="33" cy="33" r="31" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>',
    );
    const circle = key.querySelector('.st-count circle');
    // The ring is information: it is kept as it is with "reduce motion".
    const ring = circle?.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], {
      delay: BREATH,
      duration: START - BREATH,
      fill: 'both',
    });
    if (ring) t.adopt(ring);
    t.then(START, () => {
      key.querySelector('.st-count')?.remove();
      key.querySelector('.icon')?.remove();
      key.insertAdjacentHTML('afterbegin', icons.pause);
      key.setAttribute('aria-label', say.pause);
      root.querySelector('.tt-player')?.classList.remove('is-paused');
    });
    const settle = t.spring('glass');
    t.move(
      key,
      [{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }],
      { at: START, duration: settle.duration, easing: settle.easing, keep: false },
    );

    // The voice draws itself in.
    const bars = [...root.querySelectorAll('.tt-bars i')];
    bars.forEach((bar, i) => {
      t.move(bar, [{ transform: 'scaleY(0.12)' }, { transform: 'scaleY(1)' }], {
        at: START + i * 9,
        duration: 320,
        easing: settle.easing,
      });
    });
    const perBar = (story.total / bars.length) * 1000;
    const clock = /** @type {HTMLElement} */ (root.querySelector('.tt-voice span'));
    for (let i = 0; i * perBar < SPOKEN * 1000; i++) {
      t.move(bars[i], [{ background: accent }, { background: accent }], {
        at: START + i * perBar,
        duration: perBar,
      });
      t.move(bars[i], [{ background: line }, { background: line }], {
        at: START + (i + 1) * perBar,
        duration: 1,
      });
    }
    for (let second = 1; second <= SPOKEN; second++) {
      t.then(START + second * 1000, () => {
        clock.textContent = format.playback(second);
      });
    }

    // The text follows the voice.
    const text = /** @type {HTMLElement} */ (root.querySelector('.tt-text'));
    const rule = /** @type {HTMLElement} */ (root.querySelector('.tt-rule'));
    const sentences = [...text.querySelectorAll('.tt-sentence')];
    const zoom = text.getBoundingClientRect().width / text.offsetWidth || 1;
    /** Where the rule stands beside a sentence. @param {Element} sentence */
    const beside = (sentence) => {
      const rects = sentence.getClientRects();
      const top = text.getBoundingClientRect().top;
      return {
        top: `${(rects[0].top - top) / zoom + 4}px`,
        height: `${(rects[rects.length - 1].bottom - rects[0].top) / zoom - 8}px`,
      };
    };
    let previous;
    for (let i = 0; i < sentences.length; i++) {
      const starts = story.sentences[i].startsAt;
      if (starts >= SPOKEN) break;
      const ends = story.sentences[i + 1]?.startsAt ?? story.total;
      const words = story.sentences[i].text.split(' ');
      sentences[i].innerHTML = words
        .map((/** @type {string} */ w) => `<span>${w}</span>`)
        .join(' ');
      const place = beside(sentences[i]);
      if (previous) {
        t.move(
          rule,
          [
            { ...previous, opacity: 1 },
            { ...place, opacity: 1 },
          ],
          { at: START + starts * 1000, duration: t.dur('follow') },
        );
      } else {
        t.move(
          rule,
          [
            { top: place.top, height: '0px', opacity: 0 },
            { ...place, opacity: 1 },
          ],
          { at: START, duration: t.dur('follow') },
        );
      }
      previous = place;
      let said = 0;
      [...sentences[i].children].forEach((word, n) => {
        const at = starts + ((ends - starts) * said) / story.sentences[i].text.length;
        said += words[n].length + 1;
        if (at >= SPOKEN) return;
        // A word lighting is the text following the voice, and stays with "reduce motion".
        const lit = word.animate([{ color: ink2 }, { color: ink }], {
          delay: START + at * 1000,
          duration: t.dur('press'),
          fill: 'both',
        });
        t.adopt(lit);
      });
    }
    return START + SPOKEN * 1000 + 400;
  },
});
