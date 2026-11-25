import { Logger } from '@nestjs/common';
import type { Pool } from 'pg';

import { DATABASE_POOL } from '../platform/database/database.module.ts';
import { MIGRATIONS_TABLE } from '../platform/database/migrations.ts';
import type { BatchJob } from './batch-job.ts';

interface ReportRow {
  postgres_version: string;
  postgis_version: string | null;
  applied_migrations: number;
}

/**
 * Prints what the job sees of its environment. It is the batch entry point in
 * its smallest useful form: a job that connects directly, reads and exits.
 */
export const environmentReportJob: BatchJob = {
  name: 'environment-report',
  description: 'print the versions of Postgres and PostGIS and the number of applied migrations',

  async run(app) {
    const pool = app.get<Pool>(DATABASE_POOL);
    const logger = new Logger('environment-report');

    const result = await pool.query<ReportRow>(`
      select
        current_setting('server_version') as postgres_version,
        (select extversion from pg_extension where extname = 'postgis') as postgis_version,
        (select count(*)::int from ${MIGRATIONS_TABLE}) as applied_migrations
    `);
    const row = result.rows[0];
    if (!row) throw new Error('The database returned no row for the environment report.');

    logger.log(`Postgres ${row.postgres_version}`);
    logger.log(`PostGIS ${row.postgis_version ?? 'is not enabled'}`);
    logger.log(`Applied migrations: ${row.applied_migrations}`);
  },
};
