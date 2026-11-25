import { describe, expect, it } from 'vitest';

import { healthReportSchema } from './health.ts';

describe('healthReportSchema', () => {
  it('accepts a report of a healthy database', () => {
    const report = {
      status: 'ok',
      database: { reachable: true, postgresVersion: '18.1', postgisVersion: '3.6.1' },
    };

    expect(healthReportSchema.parse(report)).toEqual(report);
  });

  it('rejects a report without the PostGIS field', () => {
    const report = {
      status: 'ok',
      database: { reachable: true, postgresVersion: '18.1' },
    };

    expect(healthReportSchema.safeParse(report).success).toBe(false);
  });
});
