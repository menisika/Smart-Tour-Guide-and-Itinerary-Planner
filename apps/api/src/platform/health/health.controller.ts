import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import type { HealthReport, LivenessReport } from '@promenade/contracts';

import { HealthService } from './health.service.ts';

/**
 * Two endpoints, on purpose.
 *
 * `GET /health` queries the database, so it must not be called on a timer in
 * the cloud: a periodic query keeps the database awake and uses up its free
 * compute hours (ADR-0024, rule 1). Probes use `GET /health/live`, which
 * touches nothing.
 *
 * The path is not `/healthz`: Cloud Run reserves some paths that end in `z`.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async report(): Promise<HealthReport> {
    const report = await this.health.check();
    if (report.status !== 'ok') {
      // 503 with the report itself as the body.
      throw new ServiceUnavailableException(report);
    }
    return report;
  }

  @Get('live')
  live(): LivenessReport {
    return { status: 'ok' };
  }
}
