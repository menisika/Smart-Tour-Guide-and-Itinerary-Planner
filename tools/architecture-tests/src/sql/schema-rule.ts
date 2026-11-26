import {
  commonTableNamesIn,
  type Node,
  schemasOfFunctionsAndTypesIn,
  tablesNamedIn,
} from './parse.ts';

/**
 * The rule both checks share: a statement that belongs to a module names
 * tables of that module's schema only, and always with the schema written out
 * (ADR-0003, point 5; ADR-0026, point 5).
 *
 * Returns one sentence per breach, each naming the module.
 */
export function schemaBreaches(
  statement: Node,
  owner: string,
  modules: readonly string[],
): readonly string[] {
  const breaches: string[] = [];
  const commonTables = commonTableNamesIn(statement);

  for (const table of tablesNamedIn(statement)) {
    if (table.schema === null) {
      if (commonTables.has(table.name)) continue;
      breaches.push(
        `names \`${table.name}\` without a schema; module \`${owner}\` writes \`${owner}.${table.name}\`, so that the statement cannot land in another schema`,
      );
    } else if (table.schema !== owner) {
      breaches.push(
        modules.includes(table.schema)
          ? `touches \`${table.schema}.${table.name}\`, which belongs to module \`${table.schema}\`; module \`${owner}\` reads and writes only schema \`${owner}\` and reaches other modules through their interfaces`
          : `touches \`${table.schema}.${table.name}\`, outside schema \`${owner}\` of module \`${owner}\``,
      );
    }
  }

  for (const schema of schemasOfFunctionsAndTypesIn(statement)) {
    if (schema !== owner && modules.includes(schema)) {
      breaches.push(
        `uses a function or a type of schema \`${schema}\`, which belongs to module \`${schema}\`, not to module \`${owner}\``,
      );
    }
  }

  return breaches;
}
