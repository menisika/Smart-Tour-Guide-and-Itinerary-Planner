import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module.ts';

/**
 * The worker: started explicitly, it works until its queue is empty and then
 * exits (ADR-0003, point 2; ADR-0012). It never waits for work and never polls.
 *
 * PLACEHOLDER: there is no queue yet, so it starts, finds nothing and exits.
 */
export async function runWorker(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const logger = new Logger('Worker');

  try {
    logger.log('The Preparation queue does not exist yet: nothing to do.');
  } finally {
    await app.close();
  }
}
