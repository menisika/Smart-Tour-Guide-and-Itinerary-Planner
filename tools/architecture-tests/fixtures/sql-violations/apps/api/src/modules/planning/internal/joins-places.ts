import { type Queryable, sql } from '../../../platform/database/index.ts';

/** Breaks the rule inside an otherwise legitimate query: a join into another module's schema. */
export function routesWithPlaces(database: Queryable) {
  return database.query(sql`
    select r.id, p.name
    from planning.route as r
    join places.place as p on p.id = r.place_id
  `);
}
