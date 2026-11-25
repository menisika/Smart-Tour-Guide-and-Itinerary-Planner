import type { NestExpressApplication } from '@nestjs/platform-express';

import type { AppConfig } from './platform/config/app-config.ts';
import { API_PREFIX, mountPublicWeb } from './platform/public-web/mount-public-web.ts';

/**
 * Everything that shapes the HTTP surface, in one place, so that tests start
 * the application exactly as the entry point does.
 */
export function configureApi(app: NestExpressApplication, config: AppConfig): void {
  // Close the database pool on SIGTERM, which is how the platform stops an instance.
  app.enableShutdownHooks();

  // Do not advertise the framework in every response.
  app.disable('x-powered-by');

  // Every endpoint lives under /api, except the health checks. Whatever is
  // left belongs to the public web.
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health', 'health/live'] });
  mountPublicWeb(app, config.publicWebDir);
}
