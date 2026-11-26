import { type Queryable, sql as statement } from '../../../platform/database/index.ts';

/** Breaks the rule: under another name the check cannot find the statement. */
export function placeName(database: Queryable, id: string) {
  return database.query(statement`select name from places.place where id = ${id}`);
}
