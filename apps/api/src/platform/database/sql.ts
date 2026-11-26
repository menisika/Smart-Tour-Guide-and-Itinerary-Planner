declare const sqlQueryBrand: unique symbol;

/**
 * One SQL statement with its values kept apart from its text.
 *
 * The only way to make one is the `sql` tag below, and the only thing the
 * database services accept is this type. So every statement a module sends is
 * a `sql` template in its source, which is what lets
 * `tools/architecture-tests` read each one and check that it names only the
 * module's own schema (ADR-0003, point 5).
 */
export interface SqlQuery {
  readonly text: string;
  readonly values: readonly unknown[];
  readonly [sqlQueryBrand]: true;
}

/**
 * Writes a parameterised statement: each `${value}` becomes `$1`, `$2`, … and
 * travels separately, so a value can never be read as SQL.
 *
 * ```ts
 * await tx.query(sql`insert into places.place (id, name) values (${id}, ${name})`);
 * ```
 *
 * Only values can be interpolated. Table, column and schema names are written
 * out, schema included: `places.place`, never `place`.
 */
export function sql(strings: TemplateStringsArray, ...values: readonly unknown[]): SqlQuery {
  let text = strings[0] ?? '';
  for (let index = 0; index < values.length; index += 1) {
    text += `$${index + 1}${strings[index + 1] ?? ''}`;
  }

  return { text, values } as unknown as SqlQuery;
}
