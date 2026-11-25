#!/usr/bin/env node
/**
 * Checks the design system, as part of `pnpm lint`:
 *
 *     node design/tools/check-system.mjs            check
 *     node design/tools/check-system.mjs --report   also print every pair with its ratio
 *
 * It fails when:
 *  - a generated file is older than the tokens;
 *  - a pair of a text or a graphic and its ground misses WCAG 2.2 level AA in
 *    any theme, or the system's own higher bar in the sun theme;
 *  - a colour exists in one theme and not in another, or has no stated role;
 *  - anything that can be touched is declared smaller than its platform's
 *    minimum target;
 *  - a role of the type scale is set smaller than the smallest text allowed;
 *  - a style of the map is not a valid MapLibre style, or the three themes do
 *    not have the same layers;
 *  - an icon has no name in one of the two languages.
 */
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { measure } from '../system/colour.js';
import { icons, ICON_NAMES } from '../system/icons.js';
import { mapStyle, readTokens, stale } from './build-system.mjs';

const THEMES = /** @type {const} */ (['light', 'dark', 'sun']);
/** What each platform asks of anything that can be touched, in its own points. */
const PLATFORM_MINIMUM = { ios: 44, android: 48, web: 24 };
/** Nothing that is read is set smaller than this. */
const SMALLEST_TEXT = 11;

const report = process.argv.includes('--report');
/** @type {string[]} */
const problems = [];
const tokens = readTokens();

// ── Generated files ─────────────────────────────────────────────────────────
for (const path of stale()) {
  problems.push(`${path} is out of date: run \`pnpm design:build\``);
}

// ── Colour: the same roles in every theme, each with its use ────────────────
const roles = Object.keys(tokens.color.roles);
for (const theme of THEMES) {
  const names = Object.keys(tokens.color[theme]);
  for (const role of roles) {
    if (!names.includes(role)) problems.push(`colour “${role}” is missing in the ${theme} theme`);
  }
  for (const name of names) {
    if (!roles.includes(name)) problems.push(`colour “${name}” (${theme}) has no stated role`);
  }
}

// ── Contrast ────────────────────────────────────────────────────────────────
let measured = 0;
for (const theme of THEMES) {
  const results = measure(tokens, theme);
  measured += results.length;
  if (report) console.log(`\n${theme}`);
  for (const r of results) {
    const line = `${r.passes ? '  ' : '✗ '}${r.ratio.toFixed(2).padStart(5)} : 1  needs ${r.need}  ${r.text} on ${r.on} — ${r.use}`;
    if (report) console.log(line);
    if (!r.passes) {
      problems.push(
        `contrast, ${theme}: ${r.text} on ${r.worst} is ${r.ratio.toFixed(2)} : 1, needs ${r.need} : 1 (${r.use})`,
      );
    }
  }
}

// ── Touch targets ───────────────────────────────────────────────────────────
const TOUCHED = ['target', 'control', 'action', 'key', 'key-main'];
for (const [os, minimum] of Object.entries(PLATFORM_MINIMUM)) {
  for (const name of TOUCHED) {
    const size = tokens.size[name];
    const value = size[os] ?? size.value;
    if (typeof value !== 'number') {
      problems.push(`size.${name} has no value for ${os}`);
    } else if (value < minimum) {
      problems.push(
        `size.${name} is ${value} on ${os}; the platform's minimum target is ${minimum}`,
      );
    }
  }
  const target = tokens.size.target[os];
  for (const name of TOUCHED.slice(1)) {
    const value = tokens.size[name][os] ?? tokens.size[name].value;
    if (value < target)
      problems.push(`size.${name} (${value}) is below size.target (${target}) on ${os}`);
  }
}

// ── Type ────────────────────────────────────────────────────────────────────
for (const [name, role] of Object.entries(tokens.type)) {
  if (name === 'about') continue;
  if (!(role.font in tokens.font))
    problems.push(`type.${name} names the font “${role.font}”, which does not exist`);
  if (!['full', 'capped', 'none'].includes(role.scales))
    problems.push(`type.${name}: scales is “${role.scales}”`);
  if (role.scales !== 'none' && role.size < SMALLEST_TEXT) {
    problems.push(`type.${name} is ${role.size}; text that is read is at least ${SMALLEST_TEXT}`);
  }
  if (role.line < role.size)
    problems.push(`type.${name}: the line (${role.line}) is shorter than the size (${role.size})`);
}

// ── The map ─────────────────────────────────────────────────────────────────
/** @type {string | undefined} */
let layerIds;
for (const theme of THEMES) {
  const style = /** @type {any} */ (mapStyle(tokens, theme));
  for (const error of validateStyleMin(style)) {
    problems.push(`map style, ${theme}: ${error.message}`);
  }
  // A theme changes paint and nothing else, so the application can switch
  // themes without rebuilding the map. The glow is the one layer the sun drops.
  const ids = style.layers
    .map((/** @type {any} */ l) => l.id)
    .filter((/** @type {string} */ id) => id !== 'line-glow')
    .join(' ');
  layerIds ??= ids;
  if (ids !== layerIds)
    problems.push(`map style, ${theme}: its layers differ from those of the light theme`);
}

// ── Icons ───────────────────────────────────────────────────────────────────
for (const name of Object.keys(icons)) {
  const label = ICON_NAMES[/** @type {keyof typeof ICON_NAMES} */ (name)];
  if (!label?.ru || !label.en) problems.push(`icon “${name}” has no name in Russian and English`);
}
for (const name of Object.keys(ICON_NAMES)) {
  if (!(name in icons)) problems.push(`ICON_NAMES names “${name}”, which is not an icon`);
}

// ── Verdict ─────────────────────────────────────────────────────────────────
if (problems.length > 0) {
  console.error(
    `Design system: ${problems.length} to fix.\n${problems.map((p) => `  ${p}`).join('\n')}`,
  );
  process.exit(1);
}
console.log(
  `Design system: ${measured} colour pairs pass level AA in ${THEMES.length} themes; targets, type, ${Object.keys(icons).length} icons and the map styles hold.`,
);
