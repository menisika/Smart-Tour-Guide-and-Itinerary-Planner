import { Global, Module } from '@nestjs/common';

import { APP_CONFIG, loadAppConfig } from './app-config.ts';

/** Reads the environment once, at start-up, and offers it as `APP_CONFIG`. */
@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadAppConfig(process.env) }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
