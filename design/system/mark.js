/**
 * The mark of Promenade: the sign, the application's icon and the wordmark.
 *
 * The sign is the product's own line. It leaves the square of the start,
 * goes out, turns at a stop and comes back to the way it left by: an Outing
 * is a closed walk. Drawn that way, the line is also the first letter of the
 * name. It is made of the three things the map is made of — the line, the
 * disc of a stop, the square of the start — and of nothing else.
 *
 * These functions return SVG and touch no document, so that the system's
 * page and design/tools/build-system.mjs draw the same thing: the page shows
 * it, the tool writes it to design/system/mark/ as files.
 */

/** The line of the sign on a grid of 96 units: up from the start, round the turn, and back. */
const LINE = 'M34 78V26h20a17 17 0 0 1 0 34H34';
const LINE_WIDTH = 11;

/**
 * The sign alone.
 * @param {{ line: string, paper: string, edge?: string, dot?: string }} colours `paper` is the square of the start and the disc of the stop; `edge` lifts the line off a ground; `dot` is the disc alone, for a mark of one colour, where it takes the colour of the ground
 * @param {{ size?: number, title?: string }} [options]
 */
export function sign({ line, paper, edge, dot }, { size = 96, title } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="14 12 72 84" width="${(size * 72) / 84}" height="${size}"${title ? ` role="img" aria-label="${title}"` : ' aria-hidden="true"'}>${signBody({ line, paper, edge, dot })}</svg>`;
}

/** @param {{ line: string, paper: string, edge?: string, dot?: string }} colours */
function signBody({ line, paper, edge, dot = paper }) {
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
    ${edge ? `<path d="${LINE}" stroke="${edge}" stroke-width="${LINE_WIDTH + 4.5}"/>` : ''}
    <path d="${LINE}" stroke="${line}" stroke-width="${LINE_WIDTH}"/>
    <rect x="24" y="68" width="20" height="20" rx="6" fill="${paper}"${edge ? ` stroke="${edge}" stroke-width="2.2"` : ''}/>
    <circle cx="71" cy="43" r="4.3" fill="${dot}"/>
  </g>`;
}

/**
 * The application's icon, as a square of 1024 that each system masks to its
 * own shape. The ground is a piece of a map — streets at the angle of no
 * city in particular — so that the icon is the product seen small: a line on
 * a map.
 *
 *   dark    the icon: the line lit on a night map
 *   light   iOS, the light appearance
 *   mono    one colour, for the tinted icon of iOS and the themed icon of Android
 *
 * @param {'dark' | 'light' | 'mono'} variant
 * @param {Record<'light' | 'dark', Record<string, string>>} colours the colours of the tokens
 */
export function appIcon(variant, colours) {
  const c = colours[variant === 'light' ? 'light' : 'dark'];
  const mono = variant === 'mono';
  const ground = mono ? '#1c1c1e' : c['m-ground'];
  const street = mono ? '#2c2c2e' : c['m-street'];
  const block = mono ? '#232325' : c['m-building'];
  const line = mono ? '#ffffff' : variant === 'light' ? c.accent : c.line;
  const edge = mono ? undefined : variant === 'light' ? c['line-case'] : c['line-case'];
  const paper = mono ? '#ffffff' : variant === 'light' ? c.ink : c.marker;
  const dot = mono ? '#1c1c1e' : c.marker;
  const scale = 6.5;
  // The sign takes the middle of the square, inside the part every mask keeps.
  const x = 512 - 50.25 * scale;
  const y = 512 - 54.25 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Promenade">
  <defs>
    <filter id="g-${variant}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5.5"/></filter>
    <filter id="s-${variant}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.6"/></filter>
  </defs>
  <rect width="1024" height="1024" fill="${ground}"/>
  <g transform="rotate(-27 512 512)">
    <g fill="${block}">
      <rect x="-90" y="-60" width="250" height="270" rx="18"/><rect x="210" y="-60" width="240" height="270" rx="18"/><rect x="500" y="-60" width="250" height="270" rx="18"/><rect x="800" y="-60" width="330" height="270" rx="18"/>
      <rect x="-90" y="290" width="250" height="200" rx="18"/><rect x="210" y="290" width="240" height="200" rx="18"/><rect x="500" y="290" width="250" height="200" rx="18"/><rect x="800" y="290" width="330" height="200" rx="18"/>
      <rect x="-90" y="550" width="250" height="220" rx="18"/><rect x="210" y="550" width="240" height="220" rx="18"/><rect x="500" y="550" width="250" height="220" rx="18"/><rect x="800" y="550" width="330" height="220" rx="18"/>
      <rect x="-90" y="830" width="250" height="300" rx="18"/><rect x="210" y="830" width="240" height="300" rx="18"/><rect x="500" y="830" width="250" height="300" rx="18"/><rect x="800" y="830" width="330" height="300" rx="18"/>
    </g>
    <g stroke="${street}" stroke-linecap="round" fill="none">
      <path d="M-300 250H1400M-300 800H1400M475 -300V1400" stroke-width="60"/>
      <path d="M-300 520H1400M185 -300V1400M775 -300V1400" stroke-width="34"/>
    </g>
  </g>
  <g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke-linecap="round" stroke-linejoin="round">
    ${mono ? '' : `<path d="${LINE}" stroke="#000000" stroke-width="${LINE_WIDTH + 4}" opacity="0.32" transform="translate(0 3.4)" filter="url(#s-${variant})"/>`}
    ${mono || variant === 'light' ? '' : `<path d="${LINE}" stroke="${c.accent}" stroke-width="${LINE_WIDTH + 14}" opacity="0.42" filter="url(#g-${variant})"/>`}
    ${edge ? `<path d="${LINE}" stroke="${edge}" stroke-width="${LINE_WIDTH + 4.5}"/>` : ''}
    <path d="${LINE}" stroke="${line}" stroke-width="${LINE_WIDTH}"/>
    <rect x="24" y="68" width="20" height="20" rx="6" fill="${paper}"${edge ? ` stroke="${edge}" stroke-width="2.2"` : ''}/>
    <circle cx="71" cy="43" r="4.3" fill="${dot}"/>
  </g>
</svg>`;
}

/**
 * The name, set from the outlines of its letters.
 * @param {any} outline design/system/mark/outline.json
 * @param {{ fill?: string, height?: number, tracking?: number, title?: boolean }} [options] height of a capital, in points; tracking in em
 */
export function wordmark(
  outline,
  { fill = 'currentColor', height = 24, tracking = -0.02, title = true } = {},
) {
  const { width, body } = wordBody(outline, tracking);
  const scale = height / outline.capHeight;
  const descent = 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${-outline.capHeight - descent} ${width} ${outline.capHeight + descent * 2}" width="${(width * scale).toFixed(1)}" height="${((outline.capHeight + descent * 2) * scale).toFixed(1)}" fill="${fill}"${title ? ` role="img" aria-label="${outline.word}"` : ' aria-hidden="true"'}>${body}</svg>`;
}

/** @param {any} outline @param {number} tracking */
function wordBody(outline, tracking) {
  let x = 0;
  let body = '';
  for (const letter of outline.letters) {
    body += `<path transform="translate(${x} 0)" d="${letter.d}"/>`;
    x += letter.advance + tracking * outline.unitsPerEm;
  }
  return { width: Math.round(x - tracking * outline.unitsPerEm), body };
}

/**
 * The sign and the name together. The sign stands as high as a capital and a
 * half; the space between them is the width of the sign's line twice.
 * @param {any} outline
 * @param {{ line: string, paper: string, ink: string, edge?: string, dot?: string }} colours
 * @param {{ height?: number }} [options] height of a capital, in points
 */
export function lockup(outline, { line, paper, ink, edge, dot }, { height = 24 } = {}) {
  const { width, body } = wordBody(outline, -0.02);
  const cap = outline.capHeight;
  // The sign is 76 units high on its grid of 96: scaled so that it is 1.5 capitals.
  const signScale = (cap * 1.5) / 67.5;
  const signWidth = 52.5 * signScale;
  const gap = LINE_WIDTH * 2 * signScale;
  const total = signWidth + gap + width;
  const top = -cap * 1.25;
  const boxHeight = cap * 1.5;
  const scale = height / cap;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${top - 30} ${Math.round(total)} ${boxHeight + 60}" width="${(total * scale).toFixed(1)}" height="${((boxHeight + 60) * scale).toFixed(1)}" role="img" aria-label="${outline.word}">
    <g transform="translate(${-24 * signScale} ${top - 20.5 * signScale}) scale(${signScale})">${signBody({ line, paper, edge, dot })}</g>
    <g transform="translate(${signWidth + gap} 0)" fill="${ink}">${body}</g>
  </svg>`;
}
