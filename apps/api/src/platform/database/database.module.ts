import {
  type DynamicModule,
  Global,
  Inject,
  Injectable,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { Pool } from 'pg';

import { APP_CONFIG, type AppConfig } from '../config/app-config.ts';
import { createPool, DATABASE_POOL, type DatabaseConnection } from './pool.ts';
import { Database, UnitOfWork } from './unit-of-work.ts';

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Offers the database to the whole application: `UnitOfWork` and `Database`
 * to the modules, and the `pg` pool itself, as `DATABASE_POOL`, to the
 * platform layer only.
 *
 * Each module of the API reads and writes only the tables of its own schema
 * through them (ADR-0003, point 5), which `tools/architecture-tests` checks.
 */
@Global()
@Module({})
export class DatabaseModule {
  static forRoot(connection: DatabaseConnection): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DATABASE_POOL,
          inject: [APP_CONFIG],
          useFactory: (config: AppConfig) =>
            createPool(connection === 'direct' ? config.databaseUrlDirect : config.databaseUrl),
        },
        DatabaseLifecycle,
        UnitOfWork,
        Database,
      ],
      exports: [DATABASE_POOL, UnitOfWork, Database],
    };
  }
}
