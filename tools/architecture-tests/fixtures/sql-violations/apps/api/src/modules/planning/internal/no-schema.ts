import { type Queryable, sql } from '../../../platform/database/index.ts';

/** Breaks the rule: without a schema the table is whatever the search path finds. */
export function routes(database: Queryable) {
  return database.query(sql`select id from route`);
}
