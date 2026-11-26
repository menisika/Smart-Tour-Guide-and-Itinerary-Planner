import { type Queryable, sql } from '../../../platform/database/index.ts';

/** Breaks the rule: planning reads a table of places instead of asking the places module. */
export function placeName(database: Queryable, id: string) {
  return database.query(sql`select name from places.place where id = ${id}`);
}
