import { Inject, Injectable, Logger } from '@nestjs/common';
import type { HealthReport } from '@promenade/contracts';
import type { Pool } from 'pg';

import { DATABASE_POOL } from '../database/database.module.ts';

interface VersionsRow {
  postgres_version: string;
  postgis_version: string | null;
}

const VERSIONS_QUERY = `
  select
    current_setting('server_version') as postgres_version,
    (select extversion from pg_extension where extname = 'postgis') as postgis_version
`;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  /** Asks the database for its version and for the version of PostGIS. */
  async check(): Promise<HealthReport> {
    try {
      const result = await this.pool.query<VersionsRow>(VERSIONS_QUERY);
      const row = result.rows[0];
      const postgresVersion = row?.postgres_version ?? null;
      const postgisVersion = row?.postgis_version ?? null;

      return {
        status: postgisVersion === null ? 'unavailable' : 'ok',
        database: { reachable: true, postgresVersion, postgisVersion },
      };
    } catch (error) {
      this.logger.error(
        `Database check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        status: 'unavailable',
        database: { reachable: false, postgresVersion: null, postgisVersion: null },
      };
    }
  }
}
