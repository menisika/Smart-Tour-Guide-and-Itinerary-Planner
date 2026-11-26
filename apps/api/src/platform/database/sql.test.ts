import { describe, expect, it } from 'vitest';

import { sql } from './sql.ts';

describe('the sql tag', () => {
  it('numbers the values and keeps them out of the text', () => {
    const name = "Robert'); drop table places.place; --";
    const query = sql`insert into places.place (id, name) values (${7}, ${name})`;

    expect(query.text).toBe('insert into places.place (id, name) values ($1, $2)');
    expect(query.values).toEqual([7, name]);
  });

  it('leaves a statement without values as it is written', () => {
    const query = sql`select 1`;

    expect(query.text).toBe('select 1');
    expect(query.values).toEqual([]);
  });
});
