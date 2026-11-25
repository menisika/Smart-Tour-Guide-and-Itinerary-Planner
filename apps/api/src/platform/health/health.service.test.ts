import { Logger } from '@nestjs/common';
import type { Pool } from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';

import { HealthService } from './health.service.ts';

/** A pool that answers one query, or fails it. */
function poolAnswering(answer: () => Promise<{ rows: unknown[] }>): Pool {
  return { query: answer } as unknown as Pool;
}

describe('HealthService', () => {
  // The service logs the failure it reports; the test output does not need it.
  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  it('reports the versions when the database answers and PostGIS is enabled', async () => {
    const service = new HealthService(
      poolAnswering(() =>
        Promise.resolve({ rows: [{ postgres_version: '18.1', postgis_version: '3.6.1' }] }),
      ),
    );

    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      database: { reachable: true, postgresVersion: '18.1', postgisVersion: '3.6.1' },
    });
  });

  it('is unavailable when PostGIS is not enabled, although the database answers', async () => {
    const service = new HealthService(
      poolAnswering(() =>
        Promise.resolve({ rows: [{ postgres_version: '18.1', postgis_version: null }] }),
      ),
    );

    await expect(service.check()).resolves.toEqual({
      status: 'unavailable',
      database: { reachable: true, postgresVersion: '18.1', postgisVersion: null },
    });
  });

  it('is unavailable, and does not throw, when the database cannot be reached', async () => {
    const service = new HealthService(
      poolAnswering(() => Promise.reject(new Error('connect ECONNREFUSED'))),
    );

    await expect(service.check()).resolves.toEqual({
      status: 'unavailable',
      database: { reachable: false, postgresVersion: null, postgisVersion: null },
    });
  });
});
