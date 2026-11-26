import { Global, Module } from '@nestjs/common';

import { APP_CONFIG, type AppConfig } from '../../platform/config/app-config.ts';
import { OBJECT_STORE } from './object-store.port.ts';
import { S3ObjectStore } from './s3-object-store.adapter.ts';

/**
 * Binds the `ObjectStore` port to its S3 adapter. There is one adapter for
 * every environment: the local emulator and Cloudflare R2 differ in
 * configuration only (ADR-0010, point 3).
 */
@Global()
@Module({
  providers: [
    {
      provide: OBJECT_STORE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => new S3ObjectStore(config.objectStore),
    },
  ],
  exports: [OBJECT_STORE],
})
export class ObjectStoreModule {}
