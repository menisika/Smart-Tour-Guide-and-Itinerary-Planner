// Runs after `expo export --platform web`.
//
// Expo writes the server build as CommonJS files with the `.js` extension.
// The API that mounts it is an ES-module package, and Node.js reads `.js`
// files by the nearest package.json — so, copied under the API, the server
// build would be parsed as ES modules and fail on its first `module.exports`.
// A package.json of its own keeps the export CommonJS wherever it is placed.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../dist/package.json', import.meta.url));

writeFileSync(target, `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`);
console.log(`Marked the web export as CommonJS: ${target}`);
