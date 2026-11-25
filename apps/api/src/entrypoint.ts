import 'reflect-metadata';

/**
 * The one executable of the container image (ADR-0002, ADR-0003).
 *
 *     api              serve HTTP (the default)
 *     worker           run Preparation until its queue is empty, then exit
 *     job <name>       run one batch job, then exit
 *     migrate          apply pending schema migrations, then exit
 *
 * Whatever is started here does its work and stops: nothing runs on a timer
 * and nothing continues after a response (ADR-0024, rule 2).
 */
const USAGE = 'Usage: api | worker | job <name> | migrate';

const [command = 'api', ...rest] = process.argv.slice(2);

try {
  switch (command) {
    case 'api': {
      const { startApi } = await import('./main.ts');
      await startApi();
      break;
    }
    case 'worker': {
      const { runWorker } = await import('./worker.ts');
      await runWorker();
      break;
    }
    case 'job': {
      const { runJob } = await import('./job.ts');
      await runJob(rest[0]);
      break;
    }
    case 'migrate': {
      const { runMigrations } = await import('./migrate.ts');
      await runMigrations();
      break;
    }
    default:
      console.error(`Unknown command "${command}". ${USAGE}`);
      process.exitCode = 64;
  }
} catch (error) {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
}
