/**
 * What the modules of the API may use of the database layer. The pool itself
 * stays inside the platform: a module sends `sql` statements through
 * `Database` or through the `Transaction` of a `UnitOfWork`, and nothing else
 * (`.dependency-cruiser.cjs`, rules `api-modules-database-through-index` and
 * `api-modules-not-to-pg`).
 */
export { sql, type SqlQuery } from './sql.ts';
export {
  Database,
  TransactionClosedError,
  UnitOfWork,
  UnitOfWorkRolledBackError,
  type Queryable,
  type QueryOutcome,
  type Transaction,
} from './unit-of-work.ts';
