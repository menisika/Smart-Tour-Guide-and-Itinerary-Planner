/**
 * Loads the data the mockups show and derives what a screen needs from it:
 * clock times, legs, formatted distances. Nothing here is specific to one
 * direction, and nothing here knows which city the data describes.
 */

const dataUrl = (/** @type {string} */ name) => new URL(`../../data/${name}.json`, import.meta.url);

/** @param {string} name */
async function read(name) {
  const response = await fetch(dataUrl(name));
  if (!response.ok) throw new Error(`design/data/${name}.json: ${response.status}`);
  return response.json();
}

const NBSP = ' ';
const NNBSP = ' ';

/** @typedef {'ru' | 'en'} Lang */

export const format = {
  /** @param {number} metres @param {Lang} lang */
  distance(metres, lang) {
    if (metres < 1000) return `${metres}${NBSP}${lang === 'ru' ? 'м' : 'm'}`;
    const km = (metres / 1000).toFixed(1);
    return lang === 'ru' ? `${km.replace('.', ',')}${NBSP}км` : `${km}${NBSP}km`;
  },
  /** @param {number} minutes @param {Lang} lang */
  duration(minutes, lang) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hour = lang === 'ru' ? 'ч' : 'h';
    const min = lang === 'ru' ? 'мин' : 'min';
    if (h === 0) return `${m}${NBSP}${min}`;
    if (m === 0) return `${h}${NBSP}${hour}`;
    return `${h}${NBSP}${hour} ${m}${NBSP}${min}`;
  },
  /** Seconds as m:ss. @param {number} seconds */
  playback(seconds) {
    const s = Math.round(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  },
  /** An ISO date as the language writes it. @param {string} iso @param {Lang} lang */
  date(iso, lang) {
    const [y, m, d] = iso.split('-').map(Number);
    if (lang === 'ru') return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${d}${NBSP}${months[m - 1]} ${y}`;
  },
  NBSP,
  NNBSP,
};

/** @param {string} clock "14:00" @param {number} minutes */
function addMinutes(clock, minutes) {
  const [h, m] = clock.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * The line of RTE-9, "why it is here", for the reference Outing. The planner
 * that will write these lines does not exist yet; each one below restates a
 * value of the data (the dating OpenStreetMap gives, the heritage designation
 * in Wikidata, the position on the way back) and adds nothing to it.
 * @param {any} stop @param {Lang} lang @param {number} count
 */
function whyHere(stop, lang, count) {
  const ru = lang === 'ru';
  const heritage = stop.heritage ? (ru ? ' · охраняется как наследие' : ' · heritage-listed') : '';
  const year = Number(stop.built);
  if (Number.isFinite(year)) {
    if (year >= 1900)
      return (
        (ru ? `${year} год — эпоха из вашего пожелания` : `${year} — the period you asked for`) +
        heritage
      );
    return (
      (ru
        ? `${year} год — чуть раньше вашей эпохи, по пути`
        : `${year} — a little before your period, on the way`) + heritage
    );
  }
  if (stop.built === 'early 20th century')
    return (
      (ru ? 'Начало XX века — как в пожелании' : 'Early 20th century — as you asked') + heritage
    );
  if (stop.built.startsWith('late 19th'))
    return (
      (ru
        ? 'Рубеж XIX–XX веков — близко к пожеланию'
        : 'Turn of the 20th century — close to what you asked') + heritage
    );
  if (stop.order === count)
    return ru
      ? 'По пути к вокзалу; не из вашей эпохи'
      : 'On the way back to the station; not from your period';
  return '';
}

/** @param {any} stop @param {Lang} lang */
function builtLabel(stop, lang) {
  const year = Number(stop.built);
  if (Number.isFinite(year)) return String(year);
  if (stop.built === 'early 20th century')
    return lang === 'ru' ? 'начало XX века' : 'early 20th century';
  if (stop.built.startsWith('late 19th'))
    return lang === 'ru' ? 'рубеж XIX–XX веков' : 'turn of the 20th century';
  return '';
}

/**
 * A photograph of a Place with what has to be said beside it: who made it and
 * under which licence.
 * @param {any} photos @param {number} order
 */
function photoOf(photos, order) {
  const photo = photos.photos.find((/** @type {any} */ p) => p.order === order);
  if (!photo) return undefined;
  return {
    src: new URL(`../../${photo.file}`, import.meta.url).pathname,
    ratio: photo.width / photo.height,
    author: photo.author.replace(/\s*\(.*$/, ''),
    licence: photo.licence,
    source: photo.source,
  };
}

export async function loadData() {
  const [outing, story, map, photos] = await Promise.all([
    read('outing'),
    read('story'),
    read('map'),
    read('photos'),
  ]);
  const start = outing.request.start_clock;
  const visit = outing.assumptions.visit_minutes;
  const count = outing.stops.length;

  const stops = outing.stops.map((/** @type {any} */ s, /** @type {number} */ i) => {
    const previousLeave = i === 0 ? 0 : outing.stops[i - 1].arrive_min + visit;
    const geometry = map.stops[i];
    return {
      order: s.order,
      name: s.name,
      arriveMin: s.arrive_min,
      leaveMin: s.arrive_min + visit,
      arrive: addMinutes(start, s.arrive_min),
      leave: addMinutes(start, s.arrive_min + visit),
      legMetres: s.leg_m,
      legMinutes: s.arrive_min - previousLeave,
      built: { ru: builtLabel(s, 'ru'), en: builtLabel(s, 'en') },
      why: { ru: whyHere(s, 'ru', count), en: whyHere(s, 'en', count) },
      heritage: s.heritage,
      kind: s.kind,
      photo: photoOf(photos, s.order),
      x: geometry.x,
      y: geometry.y,
      streetX: geometry.street_x,
      streetY: geometry.street_y,
      footprint: geometry.footprint,
    };
  });

  const total = outing.totals.total_min;
  const last = stops[count - 1];
  const route = {
    wish: outing.request.wish,
    startName: outing.start_finish.name,
    start,
    finish: addMinutes(start, total),
    deadline: addMinutes(start, outing.request.budget_min),
    budgetMinutes: outing.request.budget_min,
    reserveMinutes: outing.request.budget_min - total,
    totalMinutes: total,
    walkingMetres: outing.totals.walking_m,
    walkingMinutes: outing.totals.walking_min,
    visitMinutes: visit,
    backMetres: outing.totals.back_to_start_m,
    backMinutes: total - last.leaveMin,
    stopCount: count,
    // The moment the Route screen shows: checked, not yet started.
    checkedAt: addMinutes(start, -9),
    nowBeforeStart: addMinutes(start, -8),
    // An estimate, said to be one in the brief: 5.6 MB measured without audio
    // and photos, plus about twenty minutes of speech and eleven photos.
    packMegabytes: 18,
  };

  /** @param {Lang} lang */
  const passage = (lang) => {
    const p = story.passages[lang];
    const rate = story.speech_rate_chars_per_second[lang];
    let at = 0;
    const sentences = p.sentences.map((/** @type {string} */ text) => {
      const startsAt = at;
      at += text.length / rate;
      return { text, startsAt };
    });
    const current = story.playing.sentence[lang];
    const next = sentences[current + 1];
    // Stopped two thirds of the way through the sentence being spoken.
    const elapsed =
      sentences[current].startsAt +
      ((next ? next.startsAt : at) - sentences[current].startsAt) * 0.66;
    return { sentences, current, total: at, elapsed, source: p.source };
  };

  const playingStop = stops[story.stop_order - 1];
  const nextStop = stops[story.stop_order];
  const outingNow = {
    stop: playingStop,
    next: nextStop,
    // Arrival was on time; the Story began a few seconds after it.
    clock: addMinutes(start, playingStop.arriveMin + 1),
    story: { ru: passage('ru'), en: passage('en') },
  };

  return { route, stops, outingNow, map };
}
