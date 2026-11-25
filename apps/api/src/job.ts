import { NestFactory } from '@nestjs/core';

import { batchJobs } from './jobs/registry.ts';
import { WorkerModule } from './worker.module.ts';

export class UnknownJobError extends Error {
  constructor(name: string | undefined) {
    const known = batchJobs.map((job) => `  ${job.name} — ${job.description}`).join('\n');
    super(
      `${name === undefined ? 'No job was named.' : `Unknown job "${name}".`} Known jobs:\n${known}`,
    );
    this.name = 'UnknownJobError';
  }
}

/** Runs one batch job to its end and returns (ADR-0003, point 3). */
export async function runJob(name: string | undefined): Promise<void> {
  const job = batchJobs.find((candidate) => candidate.name === name);
  if (!job) throw new UnknownJobError(name);

  const app = await NestFactory.createApplicationContext(WorkerModule);
  try {
    await job.run(app);
  } finally {
    await app.close();
  }
}
