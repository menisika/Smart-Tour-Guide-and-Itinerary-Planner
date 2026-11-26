#!/usr/bin/env node
// @ts-check
/**
 * Smoke test of the local environment. Run it after `docker compose up --build --wait`:
 *
 *     node scripts/smoke.mjs        (or: pnpm smoke)
 *
 * It asks every service one question whose answer shows that the service is
 * the one we expect and is wired as decided. It changes nothing that matters:
 * the one thing it creates is an anonymous user in the Authentication
 * emulator, which lives in memory.
 */

const port = (/** @type {string} */ name, /** @type {number} */ fallback) =>
  process.env[name] ?? String(fallback);

const api = `http://127.0.0.1:${port('PROMENADE_API_PORT', 8080)}`;
const auth = `http://127.0.0.1:${port('PROMENADE_FIREBASE_AUTH_PORT', 9099)}`;
const storage = `http://127.0.0.1:${port('PROMENADE_OBJECT_STORAGE_PORT', 8333)}`;
const mail = `http://127.0.0.1:${port('PROMENADE_MAIL_UI_PORT', 8025)}`;

/** @type {{ name: string, run: () => Promise<string> }[]} */
const checks = [
  {
    name: 'API: GET /health reports the database and PostGIS',
    async run() {
      const response = await fetch(`${api}/health`);
      const report = await response.json();
      expect(response.status === 200, `status ${response.status}: ${JSON.stringify(report)}`);
      expect(report.status === 'ok', `status field is ${report.status}`);
      expect(report.database.reachable === true, 'the database is not reachable');
      expect(
        /^\d+\.\d+/.test(report.database.postgisVersion ?? ''),
        `no PostGIS version: ${JSON.stringify(report.database)}`,
      );
      return `Postgres ${report.database.postgresVersion}, PostGIS ${report.database.postgisVersion}`;
    },
  },
  {
    name: 'API: GET /health/live answers',
    async run() {
      const response = await fetch(`${api}/health/live`);
      expect(response.status === 200, `status ${response.status}`);
      return 'ok';
    },
  },
  {
    name: 'Public web: GET / is rendered on the server inside the API',
    async run() {
      const response = await fetch(`${api}/`);
      const html = await response.text();
      expect(response.status === 200, `status ${response.status}`);
      expect(
        (response.headers.get('content-type') ?? '').includes('text/html'),
        `content type is ${response.headers.get('content-type')}`,
      );
      expect(html.includes('Promenade'), 'the page does not contain the name of the product');
      const title = /<title[^>]*>([^<]*)<\/title>/.exec(html)?.[1];
      return `${html.length} bytes of HTML, title "${title ?? '(none)'}"`;
    },
  },
  {
    name: 'Public web: every section of the shell is rendered on the server',
    async run() {
      // The address of a section and the words of its first-level heading.
      const sections = [
        ['/', 'Маршруты'],
        ['/outing', 'Прогулка'],
        ['/profile', 'Профиль'],
        ['/settings', 'Настройки'],
      ];
      for (const [path, heading] of sections) {
        const response = await fetch(`${api}${path}`);
        const html = await response.text();
        expect(response.status === 200, `${path}: status ${response.status}`);
        expect(
          new RegExp(`<h1[^>]*>${heading}</h1>`).test(html),
          `${path}: no first-level heading "${heading}" in the HTML`,
        );
      }
      return `${sections.length} pages, each with its heading`;
    },
  },
  {
    name: 'Firebase Authentication emulator: an anonymous user (a Guest) can be created',
    async run() {
      const response = await fetch(
        `${auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-emulator`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ returnSecureToken: true }),
        },
      );
      const body = await response.json();
      expect(response.status === 200, `status ${response.status}: ${JSON.stringify(body)}`);
      expect(typeof body.idToken === 'string' && body.idToken.length > 0, 'no token returned');
      return `user ${body.localId}`;
    },
  },
  {
    name: 'Object storage: the public bucket is readable by anyone',
    async run() {
      // A missing object in a readable bucket is "not found", not "forbidden".
      const response = await fetch(`${storage}/promenade-public/smoke-test-no-such-object`);
      expect(response.status === 404, `expected 404, got ${response.status}`);
      return '404 for a missing object';
    },
  },
  {
    name: 'Object storage: the private bucket refuses a request without a signature',
    async run() {
      const response = await fetch(`${storage}/promenade-private/smoke-test-no-such-object`);
      expect(response.status === 403, `expected 403, got ${response.status}`);
      return '403 without a signature';
    },
  },
  {
    name: 'Mail catcher: its interface answers',
    async run() {
      const response = await fetch(`${mail}/api/v1/info`);
      const info = await response.json();
      expect(response.status === 200, `status ${response.status}`);
      return `Mailpit ${info.Version}`;
    },
  },
];

function expect(/** @type {boolean} */ condition, /** @type {string} */ message) {
  if (!condition) throw new Error(message);
}

let failed = 0;
for (const check of checks) {
  try {
    console.log(`ok    ${check.name} — ${await check.run()}`);
  } catch (error) {
    failed += 1;
    console.error(
      `FAIL  ${check.name} — ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} checks passed.`);
