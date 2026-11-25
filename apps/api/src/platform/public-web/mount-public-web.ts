import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type * as ExpoExpressAdapter from 'expo-server/adapter/express';
import type { NextFunction, Request, Response } from 'express';

/**
 * Expo publishes its Express adapter in two builds, and Node.js can load only
 * the CommonJS one: the files of the ES-module build import each other without
 * extensions, which a bundler resolves and Node.js does not (expo-server
 * 58.1.0). So the adapter is loaded with `require`, as Expo's own
 * documentation does, and only when there is a public web to serve.
 */
function loadExpoExpressAdapter(): typeof ExpoExpressAdapter {
  const requireCommonJs = createRequire(import.meta.url);
  return requireCommonJs('expo-server/adapter/express') as typeof ExpoExpressAdapter;
}

/** Every endpoint of the API lives under this prefix. */
export const API_PREFIX = 'api';

/** True for a path that the API answers itself; everything else is the public web. */
export function isApiPath(path: string): boolean {
  return (
    path === `/${API_PREFIX}` ||
    path.startsWith(`/${API_PREFIX}/`) ||
    path === '/health' ||
    path.startsWith('/health/')
  );
}

/**
 * Serves the public web from inside the API's process (ADR-0007, point 2):
 * the server build of the Expo application renders pages on each request,
 * through Expo's documented Express adapter, and the client build is served
 * as static files. A page opened from a messenger pays for one cold start.
 *
 * `publicWebDir` is the output of `expo export --platform web`, with its
 * `client/` and `server/` folders. Without it — when the API is run from
 * sources — the API serves its own endpoints only.
 */
export function mountPublicWeb(app: NestExpressApplication, publicWebDir: string | null): void {
  const logger = new Logger('PublicWeb');

  if (publicWebDir === null) {
    logger.log('PUBLIC_WEB_DIR is not set: the public web is not served by this process.');
    return;
  }

  const clientDir = join(publicWebDir, 'client');
  const serverDir = join(publicWebDir, 'server');
  if (!existsSync(clientDir) || !existsSync(serverDir)) {
    throw new Error(
      `PUBLIC_WEB_DIR is ${publicWebDir}, but it holds no "client" and "server" folders. ` +
        'Build them with "pnpm --filter @promenade/mobile export:web".',
    );
  }

  app.useStaticAssets(clientDir, { maxAge: '1h', index: false });

  const renderPage = loadExpoExpressAdapter().createRequestHandler({ build: serverDir });
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (isApiPath(request.path)) {
      next();
      return;
    }
    // The adapter reports its own failures through `next`.
    void renderPage(request, response, next);
  });

  logger.log(`Serving the public web from ${publicWebDir}`);
}
