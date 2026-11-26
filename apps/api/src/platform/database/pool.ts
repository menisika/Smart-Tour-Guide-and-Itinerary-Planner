import { Logger } from '@nestjs/common';
import { Pool } from 'pg';

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
export function createPool(connectionString: string): Pool {
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
