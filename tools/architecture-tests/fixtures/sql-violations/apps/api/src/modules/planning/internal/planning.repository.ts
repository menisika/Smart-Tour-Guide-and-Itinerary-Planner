import { type Queryable, sql } from '../../../platform/database/index.ts';

/** Keeps the rule. */
export function routeOf(database: Queryable, id: string) {
  return database.query(sql`select id, place_id from planning.route where id = ${id}`);
}
