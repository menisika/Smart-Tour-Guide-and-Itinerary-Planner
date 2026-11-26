#!/usr/bin/env node
// @ts-check
/**
 * Exports the approved screens as images under `design/approved/`: the fixed
 * reference that built screens are later compared with (work package D-05).
 *
 *     pnpm design                                   in one terminal, then
 *     node design/tools/export-approved.mjs         every screen, every state, every system
 *     node design/tools/export-approved.mjs --only route,edit --theme dark --lang en --scale 2
 *
 * It needs a Chrome on the machine: `--chrome <path>`, the variable `CHROME`,
 * or `google-chrome` on the path. Each drawing is photographed alone at its
 * exact size — `screens/one.html?bare` — in a headless window, and saved as
 * `<package>/<screen>--<state>--<system>.webp` beside an index of what was
 * exported and when. A drawing that is already there is kept, so that a run
 * that was cut short goes on where it stopped; `--fresh` photographs all anew.
 */
import { execFile } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { SIZES } from '../directions/shared/frames.js';
import { screens } from '../screens/registry.js';

const run = promisify(execFile);
const args = process.argv.slice(2);
const option = (/** @type {string} */ name, /** @type {string} */ otherwise) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] ? args[at + 1] : otherwise;
};

const port = option('port', '4310');
const theme = option('theme', 'light');
const lang = option('lang', 'ru');
const only = option('only', '').split(',').filter(Boolean);
// One pixel to a point by default: the reference is compared by eye, and four
// hundred drawings at twice the size would weigh a quarter of a gigabyte.
const scale = option('scale', '1');
const chrome = option('chrome', process.env.CHROME ?? 'google-chrome');
const fresh = args.includes('--fresh');
// Chrome writes the format the file's name asks for. WebP keeps four hundred
// drawings near fifteen megabytes; `--format png` is five times that.
const format = option('format', 'webp');
const out = fileURLToPath(new URL('../approved/', import.meta.url));

const chosen = only.length
  ? screens.filter((s) => only.includes(s.id) || only.includes(s.pkg))
  : screens;
if (chosen.length === 0) {
  console.error('No screen matches --only.');
  process.exit(1);
}

try {
  const response = await fetch(`http://localhost:${port}/screens/one.html`);
  if (!response.ok) throw new Error(String(response.status));
} catch {
  console.error(`Nothing answers on port ${port}: start \`pnpm design\` first, or pass --port.`);
  process.exit(1);
}

/** @type {{ file: string, screen: string, state: string, system: string }[]} */
const exported = [];
for (const screen of chosen) {
  await mkdir(`${out}${screen.pkg}`, { recursive: true });
  for (const state of Object.keys(screen.states)) {
    for (const system of screen.on) {
      const size = SIZES[/** @type {keyof typeof SIZES} */ (system)];
      const file = `${screen.pkg}/${screen.id}--${state}--${system}.${format}`;
      const address = `http://localhost:${port}/screens/one.html?bare#screen=${screen.id}&state=${state}&os=${system}&theme=${theme}&lang=${lang}`;
      const kept =
        !fresh &&
        (await access(`${out}${file}`).then(
          () => true,
          () => false,
        ));
      if (!kept) {
        await run(chrome, [
          '--headless=new',
          '--disable-gpu',
          '--hide-scrollbars',
          `--force-device-scale-factor=${scale}`,
          `--window-size=${size.width},${size.height}`,
          // The page draws after its data and its fonts have come: give it time.
          '--virtual-time-budget=6000',
          `--screenshot=${out}${file}`,
          address,
        ]);
      }
      exported.push({ file, screen: screen.id, state, system });
      process.stdout.write(`\r${exported.length} drawings`);
    }
  }
}

const today = new Date().toISOString().slice(0, 10);
const index = `# Approved screens

Exported on ${today} by \`design/tools/export-approved.mjs\`: ${exported.length} drawings of ${chosen.length} screens, theme \`${theme}\`, language \`${lang}\`, at ${scale === '1' ? 'one pixel to a point' : `${scale} pixels to a point`}. They are the fixed reference that built screens are compared with; the screens themselves are in [\`design/screens/\`](../screens/README.md), and this folder is written again only when the owner approves a change.

| Screen | State | System | File |
| ------ | ----- | ------ | ---- |
${exported.map((e) => `| \`${e.screen}\` | ${e.state} | ${e.system} | [${e.file}](${e.file}) |`).join('\n')}
`;
await writeFile(`${out}README.md`, index);
console.log(`\nWrote ${exported.length} drawings and design/approved/README.md.`);
