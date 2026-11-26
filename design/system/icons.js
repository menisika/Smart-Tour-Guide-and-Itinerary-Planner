/**
 * The icons of Promenade: the product's own set, drawn for it.
 *
 * One hand throughout: a 24-unit grid, a round line whose weight is the token
 * `size.icon-stroke`, open shapes, no fills except where a shape is a solid
 * thing by nature (play, pause, a dot). An icon takes the colour of the text
 * around it. Pictographic characters are never used as icons.
 *
 * Three pairs follow the platform, because each system has taught its own
 * sign: back, share and "more" (`platformIcon`).
 *
 * An icon that stands alone in a control has no words beside it, so every icon
 * has a name in both languages (`ICON_NAMES`): it is what a screen reader says.
 */

const stroke = (/** @type {string} */ body) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const solid = (/** @type {string} */ body) =>
  `<svg class="icon icon-solid" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">${body}</svg>`;
/** A full stop within a line drawing: the dot of a list, of "i", of a lamp. */
const dot = (/** @type {string} */ at) => `<path d="${at}" stroke-width="2.6"/>`;

export const icons = {
  // ── Getting around the application ──────────────────────────────────────
  backIos: stroke('<path d="M15 4.5 7.5 12l7.5 7.5"/>'),
  backAndroid: stroke('<path d="M20 12H4.5M11 5.5 4.5 12l6.5 6.5"/>'),
  close: stroke('<path d="m6 6 12 12M18 6 6 18"/>'),
  shareIos: stroke(
    '<path d="M12 15V3.5M8 7l4-4 4 4M7.5 11H6a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 18 11h-1.5"/>',
  ),
  shareAndroid: stroke(
    '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/>',
  ),
  moreIos: solid(
    '<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>',
  ),
  moreAndroid: solid(
    '<circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>',
  ),
  chevronRight: stroke('<path d="m9 5 7 7-7 7"/>'),
  chevronLeft: stroke('<path d="m15 5-7 7 7 7"/>'),
  chevronUp: stroke('<path d="m5 15 7-7 7 7"/>'),
  chevronDown: stroke('<path d="m5 9 7 7 7-7"/>'),
  arrowDown: stroke('<path d="M12 4.5v15M6 13.5l6 6 6-6"/>'),
  arrowRight: stroke('<path d="M4.5 12h15M13.5 6l6 6-6 6"/>'),
  external: stroke(
    '<path d="M13.5 5H19v5.5M19 5l-8 8M10 6.5H6.5A1.5 1.5 0 0 0 5 8v9.5A1.5 1.5 0 0 0 6.5 19H16a1.5 1.5 0 0 0 1.5-1.5V14"/>',
  ),
  search: stroke('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  compass: stroke('<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>'),
  bookmark: stroke('<path d="M7 4h10v16.5l-5-4-5 4V4Z"/>'),
  person: stroke('<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
  people: stroke(
    '<circle cx="9" cy="8.5" r="3.2"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.4a6.2 6.2 0 0 1 3.7 5.6"/>',
  ),
  tune: stroke(
    '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  ),
  globe: stroke(
    '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5S9.5 5.8 12 3.5Z"/>',
  ),

  // ── Doing something ─────────────────────────────────────────────────────
  plus: stroke('<path d="M12 5v14M5 12h14"/>'),
  minus: stroke('<path d="M5 12h14"/>'),
  check: stroke('<path d="m5 12.7 4.5 4.5L19 7.5"/>'),
  edit: stroke('<path d="M4 20h4L19.5 8.5l-4-4L4 16v4ZM13.5 6.5l4 4"/>'),
  trash: stroke('<path d="M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7M10.3 10.5v6M13.7 10.5v6"/>'),
  drag: solid(
    '<circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>',
  ),
  download: stroke('<path d="M12 3.5v12M7 10.5l5 5 5-5M5 20.5h14"/>'),
  reload: stroke('<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19.5 4v4.5H15"/>'),
  sync: stroke(
    '<path d="M4.5 11a7.5 7.5 0 0 1 13-4.5l2 2M19.5 4.5v4h-4M19.5 13a7.5 7.5 0 0 1-13 4.5l-2-2M4.5 19.5v-4h4"/>',
  ),
  flag: stroke('<path d="M5.5 21V4h12l-2.5 4 2.5 4h-12"/>'),
  star: stroke(
    '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z"/>',
  ),
  chat: stroke(
    '<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-7l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z"/>',
  ),
  mic: stroke(
    '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
  ),

  // ── The Story and its player ────────────────────────────────────────────
  play: solid(
    '<path d="M7.5 4.3v15.4a.8.8 0 0 0 1.22.68l12.3-7.7a.8.8 0 0 0 0-1.36L8.72 3.62a.8.8 0 0 0-1.22.68Z"/>',
  ),
  pause: solid(
    '<rect x="6" y="4" width="4.5" height="16" rx="1"/><rect x="13.5" y="4" width="4.5" height="16" rx="1"/>',
  ),
  stop: solid('<rect x="6" y="6" width="12" height="12" rx="2.5"/>'),
  next: `<svg class="icon" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 5.5v13l10-6.5-10-6.5Z"/><path d="M19 5v14" fill="none"/></svg>`,
  back10: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.3 8.2A8 8 0 1 1 4 12.5"/><path d="M4.8 3.5v5h5"/><text x="12.3" y="15.3" text-anchor="middle" font-size="6.8" font-weight="700" fill="currentColor" stroke="none" font-family="inherit">10</text></svg>`,
  lines: stroke('<path d="M5 6.5h14M5 11.5h14M5 16.5h9"/>'),
  headphones: stroke(
    '<path d="M4 14.5V12a8 8 0 0 1 16 0v2.5"/><path d="M4 14.5h3V20H5.5A1.5 1.5 0 0 1 4 18.5v-4ZM20 14.5h-3V20h1.5a1.5 1.5 0 0 0 1.5-1.5v-4Z"/>',
  ),
  voice: stroke(
    '<path d="M4 9.5h3l4.5-4v13l-4.5-4H4v-5ZM15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
  ),
  quiet: stroke('<path d="M4 9.5h3l4.5-4v13l-4.5-4H4v-5ZM16 9.5l5 5M21 9.5l-5 5"/>'),
  book: stroke(
    '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5v-15ZM5 20.5A2.5 2.5 0 0 0 7.5 21H19v-3"/>',
  ),
  shield: stroke(
    '<path d="M12 3 5 5.8v5.6c0 4.3 2.9 7.7 7 9.1 4.1-1.4 7-4.8 7-9.1V5.8L12 3Z"/><path d="m8.8 12 2.3 2.3 4.2-4.6"/>',
  ),

  // ── The Route and the way ───────────────────────────────────────────────
  map: stroke('<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4ZM9 4v14M15 6v14"/>'),
  layers: stroke(
    '<path d="m12 4 8.5 4.5L12 13 3.5 8.5 12 4ZM3.5 12.5 12 17l8.5-4.5M3.5 16 12 20.5l8.5-4.5"/>',
  ),
  list: stroke(`<path d="M9 6h11M9 12h11M9 18h11"/>${dot('M4.5 6h.01M4.5 12h.01M4.5 18h.01')}`),
  route: stroke(
    '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
  ),
  locate: stroke(
    '<circle cx="12" cy="12" r="5"/><path d="M12 2.5V7M12 17v4.5M2.5 12H7M17 12h4.5"/>',
  ),
  navigate: solid('<path d="M12 3 19.5 20.5 12 17l-7.5 3.5L12 3Z"/>'),
  pin: stroke(
    '<path d="M12 21s-6.5-5.7-6.5-10.6a6.5 6.5 0 0 1 13 0C18.5 15.3 12 21 12 21Z"/><circle cx="12" cy="10.4" r="2.3"/>',
  ),
  clock: stroke('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  timer: stroke('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 3h5"/>'),
  eye: stroke(
    '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  ),
  pack: stroke('<path d="m4 8 8-4.5L20 8v8l-8 4.5L4 16V8ZM4 8l8 4.5L20 8M12 12.5v8"/>'),
  walk: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13.4" cy="4.3" r="1.7" fill="currentColor" stroke="none"/><path d="M12.6 8.3 10.4 13.6l3.2 2.6V21M10.4 13.6 8 21M12.6 8.3l3 3.2 2.9.7M12.3 8.3 8.9 10.1 8 13.5"/></svg>`,
  bicycle: stroke(
    '<circle cx="5.8" cy="16" r="3.6"/><circle cx="18.2" cy="16" r="3.6"/><path d="M5.8 16 9.4 8.5h5.4l3.4 7.5M9.4 8.5l2.9 7.5H5.8M13.8 6h2.6M7.8 8.5h3.2"/>',
  ),
  car: stroke(
    `<path d="M5 17v-4.7l1.7-4.4a1.5 1.5 0 0 1 1.4-.9h7.8a1.5 1.5 0 0 1 1.4.9l1.7 4.4V17M4 12.3h16M5 17h14M6.5 17v2.5M17.5 17v2.5"/>${dot('M7.8 14.7h.01M16.2 14.7h.01')}`,
  ),
  cup: stroke(
    '<path d="M5 9.5h11V15a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 15V9.5ZM16 11h1.3a2.4 2.4 0 0 1 0 4.8H16M8.3 3.5V6M12 3.5V6"/>',
  ),

  // ── The kinds of Place ──────────────────────────────────────────────────
  building: stroke(
    '<path d="M5 20.5V7l7-3.5L19 7v13.5M3.5 20.5h17M9 10h1.5M13.5 10H15M9 13.5h1.5M13.5 13.5H15M10.5 20.5V17h3v3.5"/>',
  ),
  church: stroke(
    '<path d="M12 2.5v3.5M10.4 4h3.2M9.5 20.5V9.5L12 6l2.5 3.5v11M9.5 12.5l-5 2.5v5.5M14.5 12.5l5 2.5v5.5M3.5 20.5h17M12 20.5v-3.5"/>',
  ),
  theatre: stroke(
    '<path d="M3.5 9.5 12 4l8.5 5.5h-17ZM6 12.5V18M10 12.5V18M14 12.5V18M18 12.5V18M3.5 20.5h17"/>',
  ),
  ensemble: stroke(
    '<path d="M4.5 20.5V8.5L7 5l2.5 3.5v12M14.5 20.5v-12L17 5l2.5 3.5v12M9.5 14h5M3 20.5h18"/>',
  ),
  museum: stroke(
    '<path d="M3.5 20.5h17M5 12.5h14M6.5 12.5a5.5 5.5 0 0 1 11 0M12 7V4.5M6.5 12.5v8M10.2 15v5.5M13.8 15v5.5M17.5 12.5v8"/>',
  ),
  monument: stroke('<path d="M10 20.5 11 6.5l1-3 1 3 1 14M7 20.5h10M9.7 16h4.6"/>'),
  park: stroke(
    '<path d="M12 21v-6.5M12 14.5a5.3 5.3 0 0 1-4.4-8.2A4.7 4.7 0 0 1 12 3a4.7 4.7 0 0 1 4.4 3.3A5.3 5.3 0 0 1 12 14.5ZM12 12.3l-2.2-2.2M12 10l1.9-1.9M8 21h8"/>',
  ),
  bridge: stroke(
    '<path d="M3 9.5c3.4 4.4 14.6 4.4 18 0M3 6.5v11M21 6.5v11M3 15h18M8 12.3V15M12 12.8V15M16 12.3V15"/>',
  ),
  station: stroke(
    `<rect x="6" y="3.5" width="12" height="13" rx="3"/><path d="M6 10.5h12M9.5 16.5 8 20.5M14.5 16.5l1.5 4"/>${dot('M9.5 13.5h.01M14.5 13.5h.01')}`,
  ),

  // ── The state of things ─────────────────────────────────────────────────
  wifi: stroke(
    `<path d="M3.5 9.6a12.4 12.4 0 0 1 17 0M6.6 13a8 8 0 0 1 10.8 0M9.7 16.3a3.5 3.5 0 0 1 4.6 0"/>${dot('M12 19.6h.01')}`,
  ),
  noNetwork: stroke(
    `<path d="M3.5 9.6a12.4 12.4 0 0 1 4.3-2.8M11.2 5.7a12.4 12.4 0 0 1 9.3 3.9M6.6 13a8 8 0 0 1 3.9-2M15 11.6a8 8 0 0 1 2.4 1.4M4 3.5l16 17"/>${dot('M12 19.6h.01')}`,
  ),
  battery: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7.5" width="16" height="9" rx="2.5"/><path d="M21.5 10.5v3"/><rect x="5.6" y="10.1" width="4.2" height="3.8" rx="0.8" fill="currentColor" stroke="none"/></svg>`,
  sun: stroke(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  ),
  moon: stroke('<path d="M20 14.6A8.3 8.3 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6Z"/>'),
  lock: stroke(
    '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  ),
  info: stroke(`<circle cx="12" cy="12" r="8.5"/><path d="M12 11.2v5.3"/>${dot('M12 7.9h.01')}`),
  question: stroke(
    `<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.7a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.3 1-1.3 1.9"/>${dot('M12 16.7h.01')}`,
  ),
  warning: stroke(`<path d="M12 4 2.8 19.5h18.4L12 4ZM12 10v4.3"/>${dot('M12 16.9h.01')}`),
  alert: stroke(`<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.3"/>${dot('M12 16.1h.01')}`),
  // ── What the screens of the Outing added ────────────────────────────────
  like: stroke(
    '<path d="M7.5 10.5V20H5a1.5 1.5 0 0 1-1.5-1.5V12A1.5 1.5 0 0 1 5 10.5h2.5Zm0 0 3.6-6.6c1.5 0 2.6 1.2 2.4 2.7l-.5 3h5a2 2 0 0 1 2 2.4l-1.2 6.4a2 2 0 0 1-2 1.6H7.5"/>',
  ),
  dislike: stroke(
    '<path d="M7.5 13.5V4H5a1.5 1.5 0 0 0-1.5 1.5V12A1.5 1.5 0 0 0 5 13.5h2.5Zm0 0 3.6 6.6c1.5 0 2.6-1.2 2.4-2.7l-.5-3h5a2 2 0 0 0 2-2.4l-1.2-6.4a2 2 0 0 0-2-1.6H7.5"/>',
  ),
  bell: stroke(
    '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2ZM10 21a2.2 2.2 0 0 0 4 0"/>',
  ),
  swap: stroke('<path d="M4.5 8.5h13M14 5l3.5 3.5L14 12M19.5 15.5h-13M10 12l-3.5 3.5L10 19"/>'),
  tack: stroke('<path d="M9 3.5h6l-1 6 3.5 3.5h-11L10 9.5l-1-6ZM12 13v7.5"/>'),
  calendar: stroke(
    '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  ),
  mail: stroke(
    '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7.5 7.5 6 7.5-6"/>',
  ),
  send: stroke('<path d="M20.5 3.5 10 14M20.5 3.5 14 20.5 10 14 3.5 10l17-6.5Z"/>'),
  signOut: stroke(
    '<path d="M14 4.5H7A1.5 1.5 0 0 0 5.5 6v12A1.5 1.5 0 0 0 7 19.5h7M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5"/>',
  ),
  history: stroke('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9M4.5 4.5V9H9M12 8v4.5l3 1.8"/>'),
  link: stroke(
    '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  ),
  speaker: stroke(
    '<path d="M4.5 9.5v5H8l5 4v-13l-5 4H4.5ZM16.5 9a4 4 0 0 1 0 6M18.8 6.5a7.5 7.5 0 0 1 0 11"/>',
  ),
  // ── What the internal console added ─────────────────────────────────────
  funnel: stroke('<path d="M4 5.5h16l-6.2 7.3V19l-3.6-1.8v-4.4L4 5.5Z"/>'),
  sort: stroke('<path d="M8 4.5v15M4.5 8 8 4.5 11.5 8M16 19.5v-15M12.5 16l3.5 3.5 3.5-3.5"/>'),
  undo: stroke('<path d="M8.5 5.5 4.5 9.5l4 4M4.5 9.5H14a5 5 0 0 1 0 10h-3.5"/>'),
  merge: stroke('<path d="M5.5 4v3.5a6 6 0 0 0 6 6h1a6 6 0 0 0 6-6V4M12 13.5V20M9 17l3 3 3-3"/>'),
  split: stroke(
    '<path d="M12 4v6.5M5.5 20v-3.5a6 6 0 0 1 6-6h1a6 6 0 0 1 6 6V20M3 17.5 5.5 20 8 17.5M16 17.5l2.5 2.5 2.5-2.5"/>',
  ),
  eyeOff: stroke(
    '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/><path d="m4.5 4 15 16"/>',
  ),
  tray: stroke(
    '<path d="M3.5 13.5 6 5.5h12l2.5 8v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-4ZM3.5 13.5h5a3.5 3.5 0 0 0 7 0h5"/>',
  ),
  bars: stroke('<path d="M5.5 20v-8.5M12 20V4.5M18.5 20v-5.5M3.5 20h17"/>'),
  coin: stroke(
    '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.6c-.5-1-1.5-1.5-2.8-1.5-1.7 0-2.8.8-2.8 2 0 2.8 5.6 1.2 5.6 4 0 1.2-1.1 2-2.8 2-1.4 0-2.4-.6-2.9-1.5M12 6.3v1.8M12 16.1v1.6"/>',
  ),
  door: stroke(
    `<path d="M6.5 20.5V5A1.5 1.5 0 0 1 8 3.5h8A1.5 1.5 0 0 1 17.5 5v15.5M4 20.5h16"/>${dot('M14.3 12.3h.01')}`,
  ),
  dossier: stroke(
    '<path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l2 2.5h7A1.5 1.5 0 0 1 20 9v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V6.5ZM8 12h8M8 15.5h5"/>',
  ),
  boundary: stroke(
    `<path d="M5 8.5 13 4.5l6.5 6-3 8.5H7L5 8.5Z"/>${dot('M5 8.5h.01')}${dot('M13 4.5h.01')}${dot('M19.5 10.5h.01')}${dot('M16.5 19h.01')}${dot('M7 19h.01')}`,
  ),
  radius: stroke(
    `<circle cx="12" cy="12" r="8.5" stroke-dasharray="2.4 3.2"/><path d="M12 12h8.5"/>${dot('M12 12h.01')}`,
  ),
  key: stroke(
    '<circle cx="8" cy="15.5" r="4"/><path d="M11 12.5 19.5 4M16.5 7l2.5 2.5M13.8 9.7l2 2"/>',
  ),
  gauge: stroke(`<path d="M4.6 17a8.5 8.5 0 1 1 14.8 0M12 13.5l4-5.5"/>${dot('M12 13.5h.01')}`),
};

/** @typedef {keyof typeof icons} IconName */
/** @typedef {'ios' | 'android' | 'web'} Os */

/**
 * The three signs each system draws its own way.
 * @param {'back' | 'share' | 'more'} name @param {Os} os
 */
export const platformIcon = (name, os) =>
  icons[/** @type {IconName} */ (`${name}${os === 'android' ? 'Android' : 'Ios'}`)];

/** The icon of a kind of Place; a kind without a sign of its own is a building. @param {string} kind */
export const kindIcon = (kind) => icons[/** @type {IconName} */ (kind)] ?? icons.building;

/** What a screen reader says when the icon stands alone. */
export const ICON_NAMES = {
  backIos: { ru: 'Назад', en: 'Back' },
  backAndroid: { ru: 'Назад', en: 'Back' },
  close: { ru: 'Закрыть', en: 'Close' },
  shareIos: { ru: 'Поделиться', en: 'Share' },
  shareAndroid: { ru: 'Поделиться', en: 'Share' },
  moreIos: { ru: 'Ещё', en: 'More' },
  moreAndroid: { ru: 'Ещё', en: 'More' },
  chevronRight: { ru: 'Открыть', en: 'Open' },
  chevronLeft: { ru: 'Назад', en: 'Back' },
  chevronUp: { ru: 'Развернуть', en: 'Expand' },
  chevronDown: { ru: 'Свернуть', en: 'Collapse' },
  arrowDown: { ru: 'Вниз', en: 'Down' },
  arrowRight: { ru: 'Дальше', en: 'Onwards' },
  external: { ru: 'Открыть источник', en: 'Open the source' },
  search: { ru: 'Найти', en: 'Search' },
  compass: { ru: 'Каталог', en: 'Catalog' },
  bookmark: { ru: 'Мои маршруты', en: 'My routes' },
  person: { ru: 'Профиль', en: 'Profile' },
  people: { ru: 'Компания', en: 'Party' },
  tune: { ru: 'Настройки', en: 'Settings' },
  globe: { ru: 'Язык', en: 'Language' },
  plus: { ru: 'Больше', en: 'More' },
  minus: { ru: 'Меньше', en: 'Less' },
  check: { ru: 'Готово', en: 'Done' },
  edit: { ru: 'Изменить', en: 'Edit' },
  trash: { ru: 'Убрать', en: 'Remove' },
  drag: { ru: 'Переставить', en: 'Reorder' },
  download: { ru: 'Скачать', en: 'Download' },
  reload: { ru: 'Повторить', en: 'Try again' },
  sync: { ru: 'Ждёт отправки', en: 'Waiting to be sent' },
  flag: { ru: 'Сообщить о неточности', en: 'Report an inaccuracy' },
  star: { ru: 'Оценить', en: 'Rate' },
  chat: { ru: 'Чат', en: 'Chat' },
  mic: { ru: 'Спросить гида', en: 'Ask the guide' },
  play: { ru: 'Слушать', en: 'Play' },
  pause: { ru: 'Пауза', en: 'Pause' },
  stop: { ru: 'Завершить', en: 'Finish' },
  next: { ru: 'Следующий рассказ', en: 'Next story' },
  back10: { ru: 'Назад на 10 секунд', en: 'Back 10 seconds' },
  lines: { ru: 'Текст рассказа', en: 'Text of the story' },
  headphones: { ru: 'Звук', en: 'Audio' },
  voice: { ru: 'С гидом', en: 'With the guide' },
  quiet: { ru: 'Тихий режим', en: 'Quiet mode' },
  book: { ru: 'Источник', en: 'Source' },
  shield: { ru: 'Проверено', en: 'Verified' },
  map: { ru: 'Карта', en: 'Map' },
  layers: { ru: 'Вид карты', en: 'Map view' },
  list: { ru: 'Список', en: 'List' },
  route: { ru: 'Маршрут', en: 'Route' },
  locate: { ru: 'Где я', en: 'My position' },
  navigate: { ru: 'Направление', en: 'Heading' },
  pin: { ru: 'Место', en: 'Place' },
  clock: { ru: 'Время', en: 'Time' },
  timer: { ru: 'Сократить', en: 'Shorten' },
  eye: { ru: 'Снаружи', en: 'From outside' },
  pack: { ru: 'Пакет маршрута', en: 'Route pack' },
  walk: { ru: 'Пешком', en: 'On foot' },
  bicycle: { ru: 'На велосипеде', en: 'By bicycle' },
  car: { ru: 'На машине', en: 'By car' },
  cup: { ru: 'Пауза на кофе', en: 'Coffee break' },
  building: { ru: 'Здание', en: 'Building' },
  church: { ru: 'Храм', en: 'Church' },
  theatre: { ru: 'Театр', en: 'Theatre' },
  ensemble: { ru: 'Ансамбль', en: 'Ensemble' },
  museum: { ru: 'Музей', en: 'Museum' },
  monument: { ru: 'Памятник', en: 'Monument' },
  park: { ru: 'Парк', en: 'Park' },
  bridge: { ru: 'Мост', en: 'Bridge' },
  station: { ru: 'Вокзал', en: 'Station' },
  wifi: { ru: 'Wi-Fi', en: 'Wi-Fi' },
  noNetwork: { ru: 'Нет сети', en: 'No network' },
  battery: { ru: 'Заряд', en: 'Battery' },
  sun: { ru: 'Яркое солнце', en: 'Bright sunlight' },
  moon: { ru: 'Тёмная тема', en: 'Dark theme' },
  lock: { ru: 'Недоступно', en: 'Unavailable' },
  info: { ru: 'Пояснение', en: 'Details' },
  question: { ru: 'Вопрос', en: 'Question' },
  warning: { ru: 'Внимание', en: 'Warning' },
  alert: { ru: 'Ошибка', en: 'Error' },
  like: { ru: 'Понравилось', en: 'Liked' },
  dislike: { ru: 'Не понравилось', en: 'Did not like' },
  bell: { ru: 'Уведомления', en: 'Notifications' },
  swap: { ru: 'Заменить', en: 'Replace' },
  tack: { ru: 'Закрепить', en: 'Pin' },
  calendar: { ru: 'Дата', en: 'Date' },
  mail: { ru: 'Почта', en: 'E-mail' },
  send: { ru: 'Отправить', en: 'Send' },
  signOut: { ru: 'Выйти', en: 'Sign out' },
  history: { ru: 'Версии', en: 'Versions' },
  link: { ru: 'Ссылка', en: 'Link' },
  speaker: { ru: 'Звук', en: 'Sound' },
  funnel: { ru: 'Отбор', en: 'Filter' },
  sort: { ru: 'Порядок', en: 'Sort' },
  undo: { ru: 'Отменить', en: 'Undo' },
  merge: { ru: 'Объединить', en: 'Merge' },
  split: { ru: 'Разделить', en: 'Split' },
  eyeOff: { ru: 'Скрыть', en: 'Hide' },
  tray: { ru: 'Входящие', en: 'Inbox' },
  bars: { ru: 'Сводки', en: 'Dashboards' },
  coin: { ru: 'Стоимость', en: 'Cost' },
  door: { ru: 'Вход', en: 'Entrance' },
  dossier: { ru: 'Досье', en: 'Dossier' },
  boundary: { ru: 'Граница', en: 'Boundary' },
  radius: { ru: 'Радиус срабатывания', en: 'Trigger radius' },
  key: { ru: 'Ключевое место', en: 'Key place' },
  gauge: { ru: 'Эксплуатация', en: 'Operations' },
};
