import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.ts';
import { configureApi } from './configure-api.ts';
import { APP_CONFIG, type AppConfig } from './platform/config/app-config.ts';

/** Starts the HTTP server: the API and, when it is present, the public web. */
export async function startApi(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);

  configureApi(app, config);

  await app.listen(config.port, '0.0.0.0');
  new Logger('Api').log(`Listening on port ${config.port}`);
}
