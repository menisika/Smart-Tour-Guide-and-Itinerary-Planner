import { type Queryable, sql } from '../../../platform/database/index.ts';

/** Breaks the rule: a table name passed as a value hides which table is read. */
export function rows(database: Queryable, table: string) {
  return database.query(sql`select id from ${table}`);
}
