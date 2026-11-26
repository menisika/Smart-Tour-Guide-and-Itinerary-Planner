import { type Queryable, sql } from '../../../platform/database/index.ts';

/** Breaks the rule: the shape of the database is changed by migrations, not by code. */
export function addColumn(database: Queryable) {
  return database.query(sql`alter table planning.route add column if not exists hint text`);
}
