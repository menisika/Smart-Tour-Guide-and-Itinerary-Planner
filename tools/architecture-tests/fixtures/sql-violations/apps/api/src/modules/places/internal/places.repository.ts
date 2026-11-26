import { type Queryable, sql } from '../../../platform/database/index.ts';

/** Keeps the rule: every statement names tables of schema `places` only. */
export class PlacesRepository {
  constructor(private readonly database: Queryable) {}

  async rename(id: string, name: string): Promise<void> {
    await this.database.query(sql`update places.place set name = ${name} where id = ${id}`);
  }

  async named(name: string) {
    return this.database.query(sql`
      with matching as (select p.id from places.place as p where p.name = ${name})
      select m.id, st_astext(p.position) as position
      from matching as m
      join places.place as p on p.id = m.id
    `);
  }
}
