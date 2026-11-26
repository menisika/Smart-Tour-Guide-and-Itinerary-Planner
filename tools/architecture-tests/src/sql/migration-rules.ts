import { isNode, nameParts, type Node, parseStatements } from './parse.ts';
import { schemaBreaches } from './schema-rule.ts';

/**
 * What a schema migration may do, checked on the text of the migration files
 * (ADR-0026):
 *
 * 1. **Its own schema only.** `<time>_<module>_<what>.sql` creates and alters
 *    objects in schema `<module>` and nowhere else. `platform` is the owner of
 *    what belongs to no module; it alone may create an extension.
 * 2. **Expand only.** A migration adds. A table or a column is dropped only
 *    after an earlier migration marked it
 *    `COMMENT ON … IS 'deprecated: <why>'`; a new column of an existing table
 *    is nullable or has a default; nothing is renamed or tightened in place.
 * 3. **Safe to apply twice.** Every statement says `IF NOT EXISTS` or
 *    `IF EXISTS`.
 *
 * The check fails closed: a statement it does not know is a breach, and the
 * message says to teach the check in the same pull request.
 */

export interface MigrationFile {
  readonly name: string;
  readonly sql: string;
}

export interface Breach {
  /** The migration file or the source file. */
  readonly file: string;
  readonly message: string;
}

/** The owner of what belongs to no module. */
export const PLATFORM = 'platform';

const FILE_NAME = /^\d{17}_([a-z][a-z0-9]*)_[a-z0-9]+(?:-[a-z0-9]+)*\.sql$/;

const TEACH =
  'If the migration is right, teach `tools/architecture-tests/src/sql/migration-rules.ts` about it in the same pull request.';

/** Tables and columns marked deprecated, with the migration that marked each. */
type Deprecations = Map<string, string>;

export async function checkMigrations(
  files: readonly MigrationFile[],
  modules: readonly string[],
): Promise<readonly Breach[]> {
  const breaches: Breach[] = [];
  const deprecations: Deprecations = new Map();
  const owners = [...modules, PLATFORM];

  for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    const owner = FILE_NAME.exec(file.name)?.[1];
    const report = (message: string) => breaches.push({ file: file.name, message });

    if (owner === undefined) {
      report('is not named <17-digit UTC time>_<module>_<what-it-does>.sql');
      continue;
    }
    if (!owners.includes(owner)) {
      report(
        `is named for module \`${owner}\`, which does not exist in apps/api/src/modules; the owners are ${owners.map((name) => `\`${name}\``).join(', ')}`,
      );
      continue;
    }

    let statements;
    try {
      statements = await parseStatements(file.sql);
    } catch (error) {
      report(`is not valid SQL: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    // Marks made by this file count only for the files after it.
    const markedHere: string[] = [];
    for (const { kind, node } of statements) {
      for (const breach of schemaBreaches(node, owner, owners)) {
        report(`module \`${owner}\`: the migration ${breach}`);
      }
      for (const message of statementBreaches(kind, node, owner, deprecations, markedHere)) {
        report(`module \`${owner}\`: ${message}`);
      }
    }
    for (const object of markedHere) {
      if (!deprecations.has(object)) deprecations.set(object, file.name);
    }
  }

  return breaches;
}

function statementBreaches(
  kind: string,
  node: Node,
  owner: string,
  deprecations: Deprecations,
  markedHere: string[],
): readonly string[] {
  switch (kind) {
    case 'CreateSchemaStmt':
      return [
        ...(node.schemaname === owner
          ? []
          : [
              `the migration creates schema \`${String(node.schemaname)}\`; a migration of module \`${owner}\` creates only schema \`${owner}\``,
            ]),
        ...ifNotExists(node, 'CREATE SCHEMA'),
      ];

    case 'CreateExtensionStmt':
      return [
        ...(owner === PLATFORM
          ? []
          : [
              `the migration creates extension \`${String(node.extname)}\`; an extension serves every module, so only a \`${PLATFORM}\` migration creates one`,
            ]),
        ...ifNotExists(node, 'CREATE EXTENSION'),
      ];

    case 'CreateStmt':
      return ifNotExists(node, 'CREATE TABLE');

    case 'IndexStmt':
      return [
        ...ifNotExists(node, 'CREATE INDEX'),
        ...(node.concurrent === true
          ? [
              'CREATE INDEX CONCURRENTLY cannot run inside the one transaction in which migrations are applied',
            ]
          : []),
      ];

    case 'AlterTableStmt':
      return alterTableBreaches(node, deprecations);

    case 'CommentStmt':
      return commentBreaches(node, owner, markedHere);

    case 'DropStmt':
      return dropBreaches(node, owner, deprecations);

    // Data, not shape: the schema rule above is all that applies.
    case 'InsertStmt':
    case 'UpdateStmt':
    case 'DeleteStmt':
      return [];

    case 'RenameStmt':
      return [
        'the migration renames in place, which breaks the image that is still running; add the new name, copy, switch, and drop the old one in a later release (ADR-0026, point 2)',
      ];

    default:
      return [`\`${kind}\` is not a statement the migration check knows. ${TEACH}`];
  }
}

function ifNotExists(node: Node, statement: string): readonly string[] {
  return node.if_not_exists === true
    ? []
    : [
        `${statement} without IF NOT EXISTS: a migration must be safe to apply twice (write ${statement} IF NOT EXISTS)`,
      ];
}

function tableOf(node: Node): string {
  const relation = isNode(node.relation) ? node.relation : {};
  return `${String(relation.schemaname)}.${String(relation.relname)}`;
}

function alterTableBreaches(node: Node, deprecations: Deprecations): readonly string[] {
  const table = tableOf(node);
  const commands = Array.isArray(node.cmds) ? (node.cmds as unknown[]) : [];

  return commands.flatMap((entry): readonly string[] => {
    const command = isNode(entry) && isNode(entry.AlterTableCmd) ? entry.AlterTableCmd : {};
    const column = `${table}.${String(command.name)}`;

    switch (command.subtype) {
      case 'AT_AddColumn': {
        const definition =
          isNode(command.def) && isNode(command.def.ColumnDef) ? command.def.ColumnDef : {};
        const constraints = (Array.isArray(definition.constraints) ? definition.constraints : [])
          .map((item: unknown) => (isNode(item) && isNode(item.Constraint) ? item.Constraint : {}))
          .map((constraint) => constraint.contype);
        const required =
          (constraints.includes('CONSTR_NOTNULL') || constraints.includes('CONSTR_PRIMARY')) &&
          !constraints.includes('CONSTR_DEFAULT') &&
          !constraints.includes('CONSTR_IDENTITY') &&
          !constraints.includes('CONSTR_GENERATED');

        return [
          ...(command.missing_ok === true
            ? []
            : [
                `ADD COLUMN \`${table}.${String(definition.colname)}\` without IF NOT EXISTS: a migration must be safe to apply twice`,
              ]),
          ...(required
            ? [
                `the new column \`${table}.${String(definition.colname)}\` is NOT NULL without a default, so the image that is still running can no longer insert; a release only adds, and a new column is nullable or has a default (ADR-0026, point 2)`,
              ]
            : []),
        ];
      }

      case 'AT_DropColumn':
        return [
          ...(command.missing_ok === true
            ? []
            : [
                `DROP COLUMN \`${column}\` without IF EXISTS: a migration must be safe to apply twice`,
              ]),
          ...(deprecations.has(column) || deprecations.has(table)
            ? []
            : [removalWithoutMark('column', column)]),
        ];

      // Loosening: what the running image writes stays valid.
      case 'AT_DropNotNull':
      case 'AT_ColumnDefault':
        return [];

      case 'AT_DropConstraint':
        return command.missing_ok === true
          ? []
          : [
              `DROP CONSTRAINT on \`${table}\` without IF EXISTS: a migration must be safe to apply twice`,
            ];

      case 'AT_SetNotNull':
      case 'AT_AddConstraint':
      case 'AT_AlterColumnType':
        return [
          `\`${command.subtype}\` tightens the existing table \`${table}\`, which the image that is still running writes to; add a new column or table, copy, switch, and drop the old one in a later release (ADR-0026, point 2). Constraints of a new table go inside its CREATE TABLE`,
        ];

      default:
        return [
          `ALTER TABLE … \`${String(command.subtype)}\` is not a change the migration check knows. ${TEACH}`,
        ];
    }
  });
}

function removalWithoutMark(what: string, name: string): string {
  return `the migration drops ${what} \`${name}\`, which no earlier migration marked as deprecated; a removal takes two releases: first COMMENT ON … IS 'deprecated: <why>', and the drop in a later one (ADR-0026, point 2)`;
}

const COMMENTED = new Map([
  ['OBJECT_SCHEMA', 1],
  ['OBJECT_TABLE', 2],
  ['OBJECT_INDEX', 2],
  ['OBJECT_COLUMN', 3],
]);

function commentBreaches(node: Node, owner: string, markedHere: string[]): readonly string[] {
  const parts = nameParts(node.object);
  const expected = COMMENTED.get(String(node.objtype));

  if (expected === undefined) {
    return [`COMMENT ON \`${String(node.objtype)}\` is not known to the migration check. ${TEACH}`];
  }
  if (parts.length !== expected) {
    return [
      `COMMENT ON \`${parts.join('.')}\` does not write the schema out; module \`${owner}\` writes \`${owner}.…\``,
    ];
  }
  if (parts[0] !== owner) {
    return [
      `the migration comments on \`${parts.join('.')}\`, outside schema \`${owner}\` of module \`${owner}\``,
    ];
  }

  const isMark = typeof node.comment === 'string' && /^deprecated\b/i.test(node.comment);
  if (isMark && (node.objtype === 'OBJECT_TABLE' || node.objtype === 'OBJECT_COLUMN')) {
    markedHere.push(parts.join('.'));
  }
  return [];
}

function dropBreaches(node: Node, owner: string, deprecations: Deprecations): readonly string[] {
  const what = node.removeType;
  if (what !== 'OBJECT_TABLE' && what !== 'OBJECT_INDEX') {
    return [`DROP of \`${String(what)}\` is not known to the migration check. ${TEACH}`];
  }

  const breaches: string[] = [];
  if (node.missing_ok !== true) {
    breaches.push('DROP without IF EXISTS: a migration must be safe to apply twice');
  }

  for (const object of Array.isArray(node.objects) ? (node.objects as unknown[]) : []) {
    const parts = nameParts(object);
    const name = parts.join('.');

    if (parts.length !== 2) {
      breaches.push(
        `DROP names \`${name}\` without a schema; module \`${owner}\` writes \`${owner}.…\``,
      );
    } else if (parts[0] !== owner) {
      breaches.push(
        `the migration drops \`${name}\`, outside schema \`${owner}\` of module \`${owner}\``,
      );
    } else if (what === 'OBJECT_TABLE' && !deprecations.has(name)) {
      // An index is not part of the shape an image reads or writes; a table is.
      breaches.push(removalWithoutMark('table', name));
    }
  }

  return breaches;
}
