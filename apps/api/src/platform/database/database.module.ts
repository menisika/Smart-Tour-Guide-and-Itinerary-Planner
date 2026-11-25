import {
  type DynamicModule,
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { Pool } from 'pg';

import { APP_CONFIG, type AppConfig } from '../config/app-config.ts';

export const DATABASE_POOL = Symbol('DATABASE_POOL');

/**
 * Which address the pool uses (ADR-0010, point 9): the API goes through the
 * pooler, the worker and the batch jobs connect directly.
 */
export type DatabaseConnection = 'pooled' | 'direct';

const logger = new Logger('Database');

/**
 * The pool opens a connection only when a query asks for one and closes it
 * after ten idle seconds. Nothing here pings the database, so an idle service
 * lets it suspend (ADR-0024, rule 1).
 */
function createPool(connectionString: string): Pool {
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: true,
  });

  // An idle connection dropped by the server — a suspended database does
  // this — must not take the process down.
  pool.on('error', (error) => {
    logger.warn(`Idle database connection failed: ${error.message}`);
  });

  return pool;
}

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Offers one `pg` pool as `DATABASE_POOL`.
 *
 * Each module of the API reads and writes only its own tables through it
 * (ADR-0003, point 5). That rule is not checkable by imports; it is kept by
 * review until the modules get schemas of their own.
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
      ],
      exports: [DATABASE_POOL],
    };
  }
}
