import { randomBytes } from 'node:crypto';

import { Client } from 'pg';

/**
 * The integration tests run against the Postgres of the compose environment
 * (`docker compose up`), each file in a database of its own that is created
 * empty and dropped afterwards — so they see what a fresh volume sees and
 * leave the developer's database alone.
 */
const serverUrl =
  process.env['PROMENADE_TEST_DATABASE_URL'] ??
  `postgres://promenade:promenade@127.0.0.1:${process.env['PROMENADE_POSTGRES_PORT'] ?? '5433'}/promenade`;

export interface ScratchDatabase {
  readonly url: string;
  readonly drop: () => Promise<void>;
}

async function onServer(statement: string): Promise<void> {
  const client = new Client({ connectionString: serverUrl });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `The integration tests need the Postgres of the compose environment (docker compose up --wait postgres). Could not connect: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  try {
    await client.query(statement);
  } finally {
    await client.end();
  }
}

export async function createScratchDatabase(): Promise<ScratchDatabase> {
  // The name is generated here from hexadecimal digits, so it is safe to write into the statement.
  const name = `promenade_test_${randomBytes(6).toString('hex')}`;
  await onServer(`CREATE DATABASE ${name}`);

  const url = new URL(serverUrl);
  url.pathname = `/${name}`;

  return {
    url: url.toString(),
    drop: () => onServer(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`),
  };
}
