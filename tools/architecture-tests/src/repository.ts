import { fileURLToPath } from 'node:url';

/** Absolute path of the repository root. */
export const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

/** Absolute path of this package. */
export const packageRoot = fileURLToPath(new URL('../', import.meta.url));

/** A tree laid out like the repository, with imports that break the rules. */
export const violationsRoot = fileURLToPath(new URL('../fixtures/violations/', import.meta.url));

/** A tree laid out like the repository, with migrations and queries that break the schema rules. */
export const sqlViolationsRoot = fileURLToPath(
  new URL('../fixtures/sql-violations/', import.meta.url),
);
