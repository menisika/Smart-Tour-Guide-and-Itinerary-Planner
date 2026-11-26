import { loadModule, parse } from 'libpg-query';

/**
 * SQL is read with PostgreSQL's own parser (`libpg-query` is that parser
 * compiled to WebAssembly), so the checks see a statement exactly as the
 * server will: no pattern over text can be fooled by a comment, a quoted name
 * or a string that looks like SQL.
 */

/**
 * The fields of the parser's tree that the checks read. The tree is JSON with
 * hundreds of node types; naming only what is used keeps a misspelt field a
 * compile error.
 */
type Field =
  | 'AlterTableCmd'
  | 'ColumnDef'
  | 'Constraint'
  | 'List'
  | 'String'
  | 'cmds'
  | 'colname'
  | 'comment'
  | 'concurrent'
  | 'constraints'
  | 'contype'
  | 'ctename'
  | 'def'
  | 'extname'
  | 'funcname'
  | 'if_not_exists'
  | 'items'
  | 'missing_ok'
  | 'name'
  | 'names'
  | 'object'
  | 'objects'
  | 'objtype'
  | 'relation'
  | 'relname'
  | 'removeType'
  | 'schemaname'
  | 'subtype'
  | 'sval'
  | 'typeName';

export type Node = Readonly<Partial<Record<Field, unknown>>>;

export interface Statement {
  /** The parser's name for the statement: `CreateStmt`, `AlterTableStmt`, `SelectStmt`, … */
  readonly kind: string;
  readonly node: Node;
}

export interface TableName {
  readonly schema: string | null;
  readonly name: string;
}

let loaded: Promise<void> | undefined;

/** Parses a text of one or more statements. Throws what the parser throws on invalid SQL. */
export async function parseStatements(text: string): Promise<readonly Statement[]> {
  loaded ??= loadModule();
  await loaded;

  const result = (await parse(text)) as {
    stmts?: readonly { stmt?: Readonly<Record<string, Node>> }[];
  };

  return (result.stmts ?? []).flatMap(({ stmt }) => {
    const kind = stmt === undefined ? undefined : Object.keys(stmt)[0];
    if (stmt === undefined || kind === undefined) return [];
    const node = stmt[kind];
    return node === undefined ? [] : [{ kind, node }];
  });
}

export function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Calls `visit` for every object of the tree, with the key it hangs on. */
export function walk(value: unknown, visit: (node: Node, key: string | null) => void): void {
  const descend = (current: unknown, key: string | null): void => {
    if (Array.isArray(current)) {
      for (const item of current) descend(item, key);
    } else if (isNode(current)) {
      visit(current, key);
      for (const [childKey, child] of Object.entries(current)) descend(child, childKey);
    }
  };
  descend(value, null);
}

/** `[{ String: { sval: 'a' } }, { String: { sval: 'b' } }]` → `['a', 'b']`. */
export function nameParts(value: unknown): readonly string[] {
  const items = isNode(value) && isNode(value.List) ? value.List.items : value;
  if (!Array.isArray(items)) {
    return isNode(value) && isNode(value.String) && typeof value.String.sval === 'string'
      ? [value.String.sval]
      : [];
  }

  return items.flatMap((item: unknown) =>
    isNode(item) && isNode(item.String) && typeof item.String.sval === 'string'
      ? [item.String.sval]
      : [],
  );
}

/**
 * Every table, view or sequence a statement names — the target of DDL, the
 * tables of a query, the table a foreign key points at.
 */
export function tablesNamedIn(statement: Node): readonly TableName[] {
  const tables: TableName[] = [];
  walk(statement, (node) => {
    if (typeof node.relname === 'string') {
      tables.push({
        schema: typeof node.schemaname === 'string' ? node.schemaname : null,
        name: node.relname,
      });
    }
  });
  return tables;
}

/** Names that a `WITH` clause introduces: they are not tables of any schema. */
export function commonTableNamesIn(statement: Node): ReadonlySet<string> {
  const names = new Set<string>();
  walk(statement, (node) => {
    if (typeof node.ctename === 'string') names.add(node.ctename);
  });
  return names;
}

/** Schemas that functions and types are taken from by a qualified name, such as `places.rank(…)`. */
export function schemasOfFunctionsAndTypesIn(statement: Node): readonly string[] {
  const schemas: string[] = [];
  walk(statement, (node) => {
    for (const name of [node.funcname, node.names, node.typeName]) {
      const parts = nameParts(name);
      const [schema] = parts;
      if (parts.length >= 2 && schema !== undefined) schemas.push(schema);
    }
  });
  return schemas;
}
