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
  '.pmtiles': 'application/octet-stream',
  '.pbf': 'application/x-protobuf',
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

/**
 * The one thing the pages do not carry themselves: the renderer of the live
 * map on the system's page and the reader of its tile archive. They are
 * development dependencies of the repository, served from where pnpm put them.
 * @type {Record<string, string>}
 */
const VENDOR = {
  '/vendor/maplibre-gl.css': 'maplibre-gl/dist/maplibre-gl.css',
  '/vendor/maplibre-gl.mjs': 'maplibre-gl/dist/maplibre-gl.mjs',
  '/vendor/maplibre-gl-shared.mjs': 'maplibre-gl/dist/maplibre-gl-shared.mjs',
  '/vendor/maplibre-gl-worker.mjs': 'maplibre-gl/dist/maplibre-gl-worker.mjs',
  '/vendor/pmtiles.js': 'pmtiles/dist/pmtiles.js',
};

/** @param {string} urlPath @returns {string | undefined} */
function vendorFile(urlPath) {
  const target = VENDOR[urlPath];
  if (!target) return undefined;
  const file = join(root, '..', 'node_modules', target);
  try {
    return statSync(file).isFile() ? file : undefined;
  } catch {
    return undefined;
  }
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname === '/') {
    response.writeHead(302, { location: '/system/' });
    response.end();
    return;
  }
  const file = vendorFile(url.pathname) ?? resolveFile(url.pathname);
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
  const headers = {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
    'accept-ranges': 'bytes',
  };
  // A tile archive is read a piece at a time, as it is from object storage
  // (ADR-0008): a request for a range of bytes gets that range.
  const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range ?? '');
  if (range) {
    const size = statSync(file).size;
    const start = Number(range[1]);
    const end = range[2] === '' ? size - 1 : Math.min(Number(range[2]), size - 1);
    if (start > end) {
      response.writeHead(416, { 'content-range': `bytes */${size}` });
      response.end();
      return;
    }
    response.writeHead(206, {
      ...headers,
      'content-range': `bytes ${start}-${end}/${size}`,
      'content-length': end - start + 1,
    });
    createReadStream(file, { start, end }).pipe(response);
    return;
  }
  response.writeHead(200, headers);
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Design: http://localhost:${port}/`);
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
