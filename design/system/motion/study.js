/**
 * What the three motion studies share: the page around the phone, a timeline
 * that can be replayed and slowed, the two sounds, and what remains of the
 * motion with "reduce motion" set.
 *
 * A study gives its scene and its timeline; this module plays it. Every
 * duration and curve comes from the tokens, so a study is the tokens in use,
 * not a drawing beside them.
 */
import { fitDevices, frame } from '../../directions/shared/frames.js';
import { ready } from '../../directions/viewer.js';
import { settle } from '../parts/story.js';

const embedded = location.hash.includes('embed');

/**
 * The timeline of one run: animations placed at their times.
 * @param {any} tokens @param {{ rate: number, reduce: boolean, sound: boolean }} mode
 */
function timeline(tokens, mode) {
  /** @type {Animation[]} */
  const running = [];
  /** @type {number[]} */
  const timers = [];
  /** @type {AudioContext | undefined} */
  let audio;
  const fade = tokens.motion.duration.fade.value;
  const bezier = (/** @type {string} */ name) =>
    `cubic-bezier(${tokens.motion.easing[name].value.join(', ')})`;
  const style = getComputedStyle(document.documentElement);

  return {
    tokens,
    reduce: mode.reduce,
    /** A duration of the tokens, in milliseconds. @param {string} name */
    dur: (name) => tokens.motion.duration[name].value,
    /** A curve of the tokens. @param {string} name */
    ease: bezier,
    /** A spring of the tokens, as the style sheet has it. @param {string} name @returns {{ easing: string, duration: number }} */
    spring: (name) => ({
      easing: style.getPropertyValue(`--spring-${name}`).trim(),
      duration: parseFloat(style.getPropertyValue(`--spring-${name}-dur`)),
    }),
    /**
     * Moves an element. With "reduce motion" the change is not travelled: the
     * element is at its last state at once and only fades in.
     * @param {Element | null | undefined} element
     * @param {Keyframe[]} frames
     * @param {{ at: number, duration: number, easing?: string, loops?: boolean, keep?: boolean }} options
     */
    move(
      element,
      frames,
      { at, duration, easing = bezier('standard'), loops = false, keep = true },
    ) {
      if (!element) return;
      if (mode.reduce) {
        if (loops) return;
        const last = frames[frames.length - 1];
        running.push(
          element.animate([last, last], {
            delay: at,
            duration: 1,
            fill: keep ? 'forwards' : 'none',
          }),
        );
        if (!('opacity' in last)) {
          running.push(
            element.animate([{ opacity: 0.35 }, { opacity: 1 }], { delay: at, duration: fade }),
          );
        }
        return;
      }
      running.push(
        element.animate(frames, {
          delay: at,
          duration,
          easing,
          fill: keep ? 'both' : 'none',
          iterations: loops ? Infinity : 1,
        }),
      );
    },
    /** An animation made elsewhere, to be played and stopped with the rest. @param {Animation} animation */
    adopt(animation) {
      running.push(animation);
    },
    /** Something that is not an animation: a word changed, a class set. @param {number} at @param {() => void} act */
    then(at, act) {
      timers.push(window.setTimeout(act, at / mode.rate));
    },
    /** One of the two sounds of the tokens. @param {'arrival' | 'story'} name @param {number} at */
    sound(name, at) {
      if (!mode.sound) return;
      audio ??= new AudioContext();
      const cue = tokens.sound[name];
      const start = audio.currentTime + at / 1000 / mode.rate;
      for (const note of cue.notes) {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const from = start + note.at / 1000;
        oscillator.frequency.value = note.hz;
        gain.gain.setValueAtTime(0, from);
        gain.gain.linearRampToValueAtTime(cue.gain, from + cue.attack / 1000);
        gain.gain.exponentialRampToValueAtTime(0.0001, from + note.ms / 1000);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start(from);
        oscillator.stop(from + note.ms / 1000 + 0.05);
      }
    },
    start() {
      for (const animation of running) animation.playbackRate = mode.rate;
    },
    stop() {
      for (const animation of running) animation.cancel();
      for (const timer of timers) clearTimeout(timer);
      void audio?.close();
    },
  };
}

/** @typedef {ReturnType<typeof timeline>} Timeline */

/**
 * @param {object} study
 * @param {string} study.title
 * @param {string} study.lead
 * @param {{ at: string, what: string, token: string }[]} study.steps what happens, in order, and the token behind it
 * @param {string} study.reduced what remains with "reduce motion"
 * @param {(ctx: { data: any, theme: 'light' | 'dark' | 'sun', lang: 'ru' | 'en', os: 'ios' | 'android' }) => { inner: string, clock: string }} study.scene
 * @param {(root: HTMLElement, t: Timeline, ctx: { data: any, lang: 'ru' | 'en' }) => number} study.play places the animations and returns how long the run takes
 */
export async function study({ title, lead, steps, reduced, scene, play }) {
  const data = await ready();
  /** @type {Record<string, string>} */
  const state = { theme: 'light', lang: 'ru', os: 'ios', rate: '1', sound: 'off', reduce: 'off' };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) state.reduce = 'on';
  for (const [key, value] of new URLSearchParams(location.hash.slice(1))) {
    if (key in state) state[key] = value;
  }

  document.body.classList.toggle('is-embedded', embedded);
  // The shared geometry of the map is already in the body: the page is added
  // beside it, never in its place.
  document.body.insertAdjacentHTML(
    'beforeend',
    `
    <div class="study-stage"><div id="phone"></div></div>
    <aside class="study-panel">
      <p class="study-back"><a href="../#motion">Design system · Motion</a></p>
      <h1>${title}</h1>
      <p class="study-lead">${lead}</p>
      <div class="study-keys">
        <button class="sys-button" id="replay">Play again</button>
        <button class="sys-button is-quiet" id="rate" aria-pressed="false">Slow, a quarter of the speed</button>
        <button class="sys-button is-quiet" id="sound" aria-pressed="false">With sound</button>
        <button class="sys-button is-quiet" id="reduce" aria-pressed="false">Reduce motion</button>
        <button class="sys-button is-quiet" id="theme">Dark</button>
        <button class="sys-button is-quiet" id="lang">English</button>
      </div>
      <h2>What happens</h2>
      <ol class="study-steps">${steps.map((s) => `<li><b>${s.at}</b><span>${s.what}<small>${s.token}</small></span></li>`).join('')}</ol>
      <h2>With “reduce motion”</h2>
      <p class="study-lead">${reduced}</p>
    </aside>`,
  );

  const phone = /** @type {HTMLElement} */ (document.getElementById('phone'));
  /** @type {Timeline | undefined} */
  let current;
  /** @type {number | undefined} */
  let again;

  function run() {
    current?.stop();
    clearTimeout(again);
    const ctx = {
      data,
      theme: /** @type {'light' | 'dark' | 'sun'} */ (state.theme),
      lang: /** @type {'ru' | 'en'} */ (state.lang),
      os: /** @type {'ios' | 'android'} */ (state.os),
    };
    document.documentElement.dataset.theme = ctx.theme;
    const { inner, clock } = scene(ctx);
    phone.innerHTML = frame({ ...ctx, direction: 'timetable', clock, inner });
    fitDevices(phone);
    settle(phone);
    const t = timeline(data.tokens, {
      rate: Number(state.rate),
      reduce: state.reduce === 'on',
      sound: state.sound === 'on',
    });
    current = t;
    const length = play(/** @type {HTMLElement} */ (phone.querySelector('.screen')), t, ctx);
    t.start();
    // Shown inside the system's page, a study plays again by itself.
    if (embedded) again = window.setTimeout(run, (length + 2600) / Number(state.rate));
  }

  /** @param {string} id @param {string} key @param {[string, string]} values off and on @param {[string, string]} [labels] */
  const toggle = (id, key, values, labels) => {
    const button = /** @type {HTMLButtonElement} */ (document.getElementById(id));
    const show = () => {
      const on = state[key] === values[1];
      button.setAttribute('aria-pressed', String(on));
      if (labels) button.textContent = labels[on ? 1 : 0];
    };
    show();
    button.addEventListener('click', () => {
      state[key] = state[key] === values[1] ? values[0] : values[1];
      show();
      run();
    });
  };
  toggle('rate', 'rate', ['1', '0.25']);
  toggle('sound', 'sound', ['off', 'on']);
  toggle('reduce', 'reduce', ['off', 'on']);
  toggle('theme', 'theme', ['light', 'dark'], ['Dark', 'Light']);
  toggle('lang', 'lang', ['ru', 'en'], ['English', 'Русский']);
  document.getElementById('replay')?.addEventListener('click', run);
  addEventListener('resize', () => fitDevices(phone));

  // Inside the system's page a study waits until it is seen.
  if (embedded && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) run();
      else {
        current?.stop();
        clearTimeout(again);
      }
    }).observe(document.body);
  } else {
    run();
  }
  document.body.dataset.ready = 'true';
}
