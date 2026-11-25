import type { INestApplicationContext } from '@nestjs/common';

/**
 * A batch job: started explicitly — by a person, by the pipeline, or by the
 * hourly trigger through the API — it does one thing and exits (ADR-0024).
 */
export interface BatchJob {
  /** The name given on the command line: `job <name>`. */
  readonly name: string;
  readonly description: string;
  run(app: INestApplicationContext): Promise<void>;
}
