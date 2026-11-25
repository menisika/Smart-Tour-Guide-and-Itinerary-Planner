/**
 * The arithmetic of colour the system needs: reading a token, laying a
 * translucent colour over a solid one, and contrast as WCAG 2.2 defines it.
 *
 * It runs in Node (the checks of the repository) and in a browser (the
 * system's page), so both report the same numbers.
 */

/** @typedef {[number, number, number, number]} Rgba red, green and blue 0…255, alpha 0…1 */

/** @param {string} hex #rrggbb or #rrggbbaa @returns {Rgba} */
export function parse(hex) {
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!match) throw new Error(`Not a colour: ${hex}`);
  const n = parseInt(match[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255, match[2] ? parseInt(match[2], 16) / 255 : 1];
}

/** @param {Rgba} colour @returns {string} #rrggbb; the alpha is dropped */
export const hex = ([r, g, b]) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** @param {Rgba} top @param {Rgba} bottom a solid colour @returns {Rgba} */
export function over(top, bottom) {
  const a = top[3];
  return [
    top[0] * a + bottom[0] * (1 - a),
    top[1] * a + bottom[1] * (1 - a),
    top[2] * a + bottom[2] * (1 - a),
    1,
  ];
}

/** Relative luminance. @param {Rgba} colour */
export function luminance([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** @param {Rgba} a @param {Rgba} b both solid */
export function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Every pair of the tokens, measured in one theme.
 *
 * A text that is itself translucent is laid over its ground first. A ground
 * written as { over, each } is measured over each of its bases, and the worst
 * of them is the result.
 *
 * @param {any} tokens the parsed tokens.json
 * @param {'light' | 'dark' | 'sun'} theme
 * @returns {{ use: string, text: string, on: string, level: string, need: number, ratio: number, worst: string, textHex: string, groundHex: string, passes: boolean }[]}
 */
export function measure(tokens, theme) {
  const palette = tokens.color[theme];
  const { levels, pairs } = tokens.contrast;
  /** @param {string} name */
  const token = (name) => {
    if (!(name in palette)) throw new Error(`No colour “${name}” in the ${theme} theme`);
    return parse(palette[name]);
  };
  /** @param {string | string[]} each */
  const names = (each) => (Array.isArray(each) ? each : tokens.contrast[each]);

  return pairs.map((/** @type {any} */ pair) => {
    /** @type {{ name: string, colour: Rgba }[]} */
    const grounds =
      typeof pair.on === 'string'
        ? [{ name: pair.on, colour: over(token(pair.on), [255, 255, 255, 1]) }]
        : names(pair.on.each).map((/** @type {string} */ base) => ({
            name: `${pair.on.over} over ${base}`,
            colour: over(token(pair.on.over), token(base)),
          }));
    let worst = { ratio: Infinity, name: '', ground: grounds[0].colour, text: token(pair.text) };
    for (const ground of grounds) {
      const text = over(token(pair.text), ground.colour);
      const ratio = contrast(text, ground.colour);
      if (ratio < worst.ratio) worst = { ratio, name: ground.name, ground: ground.colour, text };
    }
    const need = levels[pair.level][theme === 'sun' ? 'sun' : 'aa'];
    return {
      use: pair.use,
      text: pair.text,
      on:
        typeof pair.on === 'string'
          ? pair.on
          : `${pair.on.over} over ${Array.isArray(pair.on.each) ? pair.on.each.join(' or ') : 'the map'}`,
      level: pair.level,
      need,
      ratio: worst.ratio,
      worst: worst.name,
      textHex: hex(worst.text),
      groundHex: hex(worst.ground),
      // Compared as it is printed, to two decimals, and never rounded up.
      passes: Math.floor(worst.ratio * 100) / 100 >= need,
    };
  });
}
