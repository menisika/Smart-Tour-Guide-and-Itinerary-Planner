#!/usr/bin/env node
/**
 * Serves the design folder as static files, so that the mockups open in a
 * browser:
 *
 *     pnpm design                 http://localhost:4310
 *     pnpm design --port 5000
 *     pnpm design --lan           also reachable from a phone on the same network
 *
 * Nothing is built and nothing leaves the machine: every font, script and
 * image the pages use is a file of this folder.
 */
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const port = portFlag === -1 ? 4310 : Number(args[portFlag + 1]);
const lan = args.includes('--lan');
const host = lan ? '0.0.0.0' : '127.0.0.1';

/** @type {Record<string, string>} */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

/** @param {string} urlPath @returns {string | undefined} the file to send */
function resolveFile(urlPath) {
  const relative = normalize(decodeURIComponent(urlPath)).replace(/^[/\\]+/, '');
  const file = join(root, relative);
  if (file !== root.replace(/[/\\]$/, '') && !file.startsWith(root)) return undefined;
  try {
    const stat = statSync(file);
    if (stat.isFile()) return file;
    if (stat.isDirectory()) {
      const index = join(file, 'index.html');
      if (statSync(index).isFile()) return index;
    }
  } catch {
    // Not found: reported by the caller.
  }
  return undefined;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname === '/') {
    response.writeHead(302, { location: '/directions/' });
    response.end();
    return;
  }
  const file = resolveFile(url.pathname);
  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(`Not found: ${url.pathname}\n`);
    return;
  }
  // A folder is addressed with a trailing slash, so that relative links resolve.
  if (
    file.endsWith(`${sep}index.html`) &&
    !url.pathname.endsWith('/') &&
    !url.pathname.endsWith('.html')
  ) {
    response.writeHead(302, { location: `${url.pathname}/` });
    response.end();
    return;
  }
  response.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Design mockups: http://localhost:${port}/`);
  if (lan) {
    for (const addresses of Object.values(networkInterfaces())) {
      for (const address of addresses ?? []) {
        if (address.family === 'IPv4' && !address.internal) {
          console.log(`On this network: http://${address.address}:${port}/`);
        }
      }
    }
  }
});
