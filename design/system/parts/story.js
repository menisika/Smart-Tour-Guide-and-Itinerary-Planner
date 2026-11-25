/**
 * What the guide says, and the player of its voice: the page of a Place with
 * the Story as prose, the text following the voice, the source at the foot.
 */
import { format } from '../../directions/shared/data.js';
import { icons, kindIcon } from '../icons.js';
import { T } from '../strings.js';
import { plate } from './map.js';

/** @typedef {'ru' | 'en'} Lang */
/** @typedef {'light' | 'dark' | 'sun'} Theme */

/**
 * The text of a Story as the guide's page has it: continuous prose, the
 * sentence being spoken marked, and inside it the words already said.
 * @param {any} story
 * @param {number} from the first sentence shown: what was spoken before it has scrolled away
 */
export function storyText(story, from = 0) {
  return story.sentences
    .map((/** @type {any} */ s, /** @type {number} */ i) => {
      if (i < from) return '';
      if (i !== story.current) return `<span class="tt-sentence">${s.text}</span>`;
      const next = story.sentences[i + 1];
      const end = next ? next.startsAt : story.total;
      const share = Math.min(1, Math.max(0, (story.elapsed - s.startsAt) / (end - s.startsAt)));
      const words = s.text.split(' ');
      const spoken = Math.round(words.length * share);
      const rest = spoken < words.length ? ` ${words.slice(spoken).join(' ')}` : '';
      return `<span class="tt-sentence is-current"><b>${words.slice(0, spoken).join(' ')}</b>${rest}<sup>1</sup></span>`;
    })
    .join(' ');
}

/** The voice as bars: the played part in the colour of the line, one bar alive. @param {any} story */
export function voice(story) {
  const bars = 44;
  const played = Math.round((story.elapsed / story.total) * bars);
  let html = '';
  for (let i = 0; i < bars; i++) {
    // A fixed, uneven outline: speech, not a pattern redrawn on every load.
    const level = 0.28 + 0.72 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.61 + 1));
    html += `<i class="${i < played ? 'is-played' : ''}${i === played ? ' is-live' : ''}" style="height:${Math.round(level * 100)}%"></i>`;
  }
  return `<div class="tt-voice" role="slider" aria-valuemin="0" aria-valuemax="${Math.round(story.total)}" aria-valuenow="${Math.round(story.elapsed)}" aria-valuetext="${format.playback(story.elapsed)} / ${format.playback(story.total)}"><span>${format.playback(story.elapsed)}</span><div class="tt-bars">${html}</div><span>${format.playback(story.total)}</span></div>`;
}

/**
 * The page of the guide: the photograph of the Place with its author, the
 * name, the Story as prose, its source in a footnote. A solid page: it is read.
 * @param {any} data @param {Lang} lang
 * @param {{ from?: number, full?: boolean, photo?: boolean, theme?: Theme, width?: number, story?: any }} [options]
 *   `photo: false` draws the Place as one that has no free photograph;
 *   `story` is the Story at another moment: with `current: -1` nothing is being spoken yet
 */
export function guide(data, lang, options = {}) {
  const { full = false, photo = true, theme = 'light', width = 393 } = options;
  const t = T[lang];
  const now = data.outingNow;
  const story = options.story ?? now.story[lang];
  const from = options.from ?? Math.max(0, story.current - 1);
  const date = format.date(story.source.revision_date, lang);
  const head =
    photo && now.stop.photo
      ? `<img src="${now.stop.photo.src}" alt="" />
      <figcaption>${t.photo}: ${now.stop.photo.author} · ${now.stop.photo.licence}</figcaption>`
      : `${plate(data, now.stop, { lang, theme, width: width - 32, height: full ? 172 : 112 })}
      <figcaption>${t.noPhoto}</figcaption>`;
  return `<article class="tt-guide${full ? ' is-full' : ''}">
    <figure class="tt-guide-photo">
      ${head}
      <span class="tt-guide-chip lg"><i>${now.stop.order}</i><b>${now.stop.arrive}</b>${t.stay(now.stop.leave)}</span>
      ${full ? `<button class="tt-guide-fold lg" aria-label="${t.say.fold}">${icons.chevronDown}</button>` : ''}
    </figure>
    <div class="tt-guide-body">
      <p class="tt-guide-kind">${kindIcon(now.stop.kind)}${now.stop.built[lang]} · ${t.seenOutside}</p>
      <h1 class="tt-guide-name">${now.stop.name[lang]}</h1>
      <div class="tt-reading">
        <p class="tt-text">${storyText(story, full ? 0 : from)}</p>
        <i class="tt-rule" aria-hidden="true"></i>
      </div>
      <p class="tt-footnote"><sup>1</sup> ${t.source(story.source, date)}</p>
      <p class="tt-made">${icons.shield}${t.made}</p>
    </div>
  </article>`;
}

/** The row that names the Place after this one; it opens it. @param {any} data @param {Lang} lang */
const nextRow = (data, lang) => {
  const next = data.outingNow.next;
  return `<button class="tt-next"><i>${next.order}</i><span class="tt-next-body"><small>${T[lang].next} · ${next.arrive}</small><span>${next.name[lang]}</span></span><span class="tt-next-far">${format.distance(next.legMetres, lang)} · ${format.duration(next.legMinutes, lang)}</span>${icons.chevronRight}</button>`;
};

/**
 * The player: the voice, five keys, the next Place.
 * @param {any} data @param {Lang} lang
 * @param {{ state?: 'playing' | 'paused' | 'ended' | 'preparing' | 'quiet', story?: any }} [options]
 */
export function player(data, lang, { state = 'playing', story: given } = {}) {
  const t = T[lang];
  const story = given ?? data.outingNow.story[lang];
  const ended = { ...story, elapsed: story.total, current: story.sentences.length - 1 };
  const top =
    state === 'preparing'
      ? `<p class="tt-player-note">${icons.clock}<span><b>${t.storyPreparing}</b> · ${t.storyPreparingNote}</span></p>`
      : state === 'quiet'
        ? `<p class="tt-player-note">${icons.quiet}<span><b>${t.quietOn}</b> · ${t.quietNote}</span></p>`
        : voice(state === 'ended' ? ended : story);
  const main =
    state === 'playing'
      ? `<button class="tt-key-main lg lg-tint" aria-label="${t.say.pause}">${icons.pause}</button>`
      : `<button class="tt-key-main lg lg-tint" aria-label="${state === 'ended' ? t.say.nextStory : t.say.play}"${state === 'preparing' ? ' disabled' : ''}>${state === 'ended' ? icons.next : icons.play}</button>`;
  const off = state === 'preparing' ? ' disabled' : '';
  return `<section class="tt-player lg${state === 'playing' ? '' : ' is-paused'}">
    ${top}
    <div class="tt-keys">
      <button aria-label="${t.speed('1×')}"${off}>1×</button>
      <button aria-label="${t.say.back10}"${off}>${icons.back10}</button>
      ${main}
      <button aria-label="${t.say.nextStory}">${icons.next}</button>
      <button aria-label="${t.say.text}"${off}>${icons.lines}</button>
    </div>
    ${nextRow(data, lang)}
  </section>`;
}

/** The player folded to one row, for a screen that is about something else. @param {any} data @param {Lang} lang */
export function mini(data, lang) {
  const t = T[lang];
  const now = data.outingNow;
  const story = now.story[lang];
  return `<section class="tt-mini lg">
    <span class="tt-mini-body"><small>${format.playback(story.elapsed)} / ${format.playback(story.total)}</small><span>${now.stop.name[lang]}</span></span>
    <button aria-label="${t.say.back10}">${icons.back10}</button>
    <button class="lg lg-tint" aria-label="${t.say.pause}">${icons.pause}</button>
    <i class="tt-mini-played" style="width:${((story.elapsed / story.total) * 100).toFixed(1)}%"></i>
  </section>`;
}

/**
 * What can only be done once the text is on the page and has a size: the rule
 * is put beside the sentence being spoken, the reading window is kept to
 * whole lines, and the "why" of a Place in the chart is kept to the whole
 * lines its row has room for — a row is as high as its minutes.
 * @param {Element} root
 */
export function settle(root) {
  for (const why of root.querySelectorAll('.tt-row-why')) {
    const body = why.parentElement;
    const name = body?.querySelector('.tt-row-name');
    if (
      !(why instanceof HTMLElement) ||
      !(body instanceof HTMLElement) ||
      !(name instanceof HTMLElement)
    ) {
      continue;
    }
    why.style.display = '';
    const line = parseFloat(getComputedStyle(why).lineHeight);
    const lines = Math.floor((body.clientHeight - name.offsetHeight - 1) / line);
    if (lines < 1) why.style.display = 'none';
    else why.style.setProperty('-webkit-line-clamp', String(lines));
  }
  for (const reading of root.querySelectorAll('.tt-reading')) {
    const text = reading.querySelector('.tt-text');
    const current = reading.querySelector('.is-current');
    const rule = reading.querySelector('.tt-rule');
    if (
      !(reading instanceof HTMLElement) ||
      !(text instanceof HTMLElement) ||
      !(current instanceof HTMLElement) ||
      !(rule instanceof HTMLElement)
    ) {
      continue;
    }
    const lineHeight = parseFloat(getComputedStyle(text).lineHeight);
    text.style.maxHeight = '';
    text.style.maxHeight = `${Math.floor(reading.clientHeight / lineHeight) * lineHeight}px`;
    const rects = current.getClientRects();
    if (rects.length === 0) continue;
    const zoom = text.getBoundingClientRect().width / text.offsetWidth || 1;
    const textTop = text.getBoundingClientRect().top;
    rule.style.top = `${(rects[0].top - textTop) / zoom + 4}px`;
    rule.style.height = `${(rects[rects.length - 1].bottom - rects[0].top) / zoom - 8}px`;
  }
}

/**
 * Moves the reading to another sentence, as the text does when it follows the voice.
 * @param {Element} root @param {any} story @param {number} index
 * @param {number} [share] how much of the sentence has been spoken
 */
export function follow(root, story, index, share = 0.5) {
  const text = root.querySelector('.tt-text');
  if (!text) return;
  const next = story.sentences[index + 1];
  const startsAt = story.sentences[index].startsAt;
  const moved = {
    ...story,
    current: index,
    elapsed: startsAt + ((next ? next.startsAt : story.total) - startsAt) * share,
  };
  text.innerHTML = storyText(moved, Math.max(0, index - 1));
  const old = root.querySelector('.tt-voice');
  if (old) old.outerHTML = voice(moved);
  settle(root);
}
