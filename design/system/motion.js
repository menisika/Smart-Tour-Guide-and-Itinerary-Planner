/**
 * The arithmetic of motion the system needs in more than one place: a spring
 * as a curve. The application drives a spring with its three numbers; a style
 * sheet cannot, so the curve is sampled — by design/tools/build-system.mjs for
 * tokens.css, and by the system's page to draw it.
 */

/**
 * @param {{ stiffness: number, damping: number, mass: number }} spring
 * @param {number} [points] how many samples the curve keeps
 * @returns {{ values: number[], duration: number }} the position at even steps of time, from 0 to rest at 1, and the time to rest in milliseconds
 */
export function springCurve({ stiffness, damping, mass }, points = 26) {
  const step = 1 / 240;
  let x = 0;
  let v = 0;
  let t = 0;
  /** @type {number[]} */
  const samples = [0];
  while (t < 3) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * step;
    x += v * step;
    t += step;
    samples.push(x);
    if (Math.abs(x - 1) < 0.001 && Math.abs(v) < 0.01) break;
  }
  /** @type {number[]} */
  const values = [];
  for (let i = 0; i <= points; i++) {
    const at = Math.min(samples.length - 1, Math.round((i / points) * (samples.length - 1)));
    values.push(i === 0 ? 0 : i === points ? 1 : Number(samples[at].toFixed(3)));
  }
  return { values, duration: Math.round(t * 1000) };
}

/** The same curve as CSS reads it. @param {number[]} values */
export const linearEasing = (values) => `linear(${values.join(', ')})`;
