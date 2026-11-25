import type { BatchJob } from './batch-job.ts';
import { environmentReportJob } from './environment-report.job.ts';

/**
 * Every batch job the image can run. A new job is added to this list.
 *
 * The jobs the decision records name, none of which exists yet: the base of
 * Places — gather and match (ADR-0030); the Freshness Checks (ADR-0031); the
 * build of city data (ADR-0008, ADR-0009, ADR-0029); the export and
 * aggregation of product events (ADR-0021); the backup (ADR-0010). The hourly
 * trigger of ADR-0024 decides which of them is due and starts it.
 */
export const batchJobs: readonly BatchJob[] = [environmentReportJob];
