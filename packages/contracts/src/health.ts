import { z } from 'zod';

/**
 * Answer of `GET /health`.
 *
 * `status` is `ok` only when the database answers and PostGIS is enabled in it.
 */
export const healthReportSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  database: z.object({
    reachable: z.boolean(),
    postgresVersion: z.string().nullable(),
    postgisVersion: z.string().nullable(),
  }),
});

export type HealthReport = z.infer<typeof healthReportSchema>;

/** Answer of `GET /health/live`: the process is up; nothing else is checked. */
export const livenessReportSchema = z.object({
  status: z.literal('ok'),
});

export type LivenessReport = z.infer<typeof livenessReportSchema>;
