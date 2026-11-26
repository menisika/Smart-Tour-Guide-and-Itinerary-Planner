import ts from 'typescript';

import type { Breach } from './migration-rules.ts';
import { parseStatements } from './parse.ts';
import { schemaBreaches } from './schema-rule.ts';

/**
 * What the code of a module may ask the database, checked on its sources
 * (ADR-0003, point 5): every statement is a `sql` template — the database
 * services of `platform/database` accept nothing else — and each one reads and
 * writes tables of the module's own schema only.
 */

export interface ModuleSource {
  /** Path of the file, as it should appear in a message. */
  readonly file: string;
  /** The module the file belongs to: `modules/<module>/…`. */
  readonly module: string;
  readonly text: string;
}

/** A module asks for data and changes data; the shape of the database belongs to migrations. */
const DATA_STATEMENTS = new Set(['SelectStmt', 'InsertStmt', 'UpdateStmt', 'DeleteStmt']);

const SQL_TAG = 'sql';

interface FoundStatement {
  readonly line: number;
  readonly text: string;
}

interface Found {
  readonly statements: readonly FoundStatement[];
  /** Lines where `sql` is used as anything but the tag of a template. */
  readonly otherUses: readonly number[];
}

/** Finds every `sql` template of a source file, with `$1`, `$2`, … in place of its values. */
export function sqlTemplatesIn(source: ModuleSource): Found {
  const tree = ts.createSourceFile(source.file, source.text, ts.ScriptTarget.Latest, true);
  const statements: FoundStatement[] = [];
  const otherUses: number[] = [];
  const lineOf = (node: ts.Node) =>
    tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;

  const visit = (node: ts.Node): void => {
    if (ts.isTaggedTemplateExpression(node) && isSqlTag(node.tag)) {
      const template = node.template;
      let text: string;
      if (ts.isNoSubstitutionTemplateLiteral(template)) {
        text = template.text;
      } else {
        text = template.head.text;
        template.templateSpans.forEach((span, index) => {
          text += `$${index + 1}${span.literal.text}`;
        });
        // Values may hold `sql` templates of their own.
        template.templateSpans.forEach((span) => {
          visit(span.expression);
        });
      }
      statements.push({ line: lineOf(node), text });
      return;
    }

    if (ts.isIdentifier(node) && node.text === SQL_TAG && !isPlainImportOfSql(node)) {
      otherUses.push(lineOf(node));
    }
    if (ts.isImportSpecifier(node) && node.propertyName?.text === SQL_TAG) {
      otherUses.push(lineOf(node));
      return;
    }

    ts.forEachChild(node, visit);
  };
  visit(tree);

  return { statements, otherUses };
}

function isSqlTag(tag: ts.Expression): boolean {
  return ts.isIdentifier(tag) && tag.text === SQL_TAG;
}

/** `import { sql } from …` — the one place the name stands without a template. */
function isPlainImportOfSql(node: ts.Identifier): boolean {
  return ts.isImportSpecifier(node.parent) && node.parent.propertyName === undefined;
}

export async function checkModuleQueries(
  sources: readonly ModuleSource[],
  modules: readonly string[],
): Promise<readonly Breach[]> {
  const breaches: Breach[] = [];

  for (const source of sources) {
    const found = sqlTemplatesIn(source);

    for (const line of found.otherUses) {
      breaches.push({
        file: `${source.file}:${line}`,
        message: `module \`${source.module}\`: \`sql\` is used here as something other than the tag of a template, so the statement cannot be read by the check; write sql\`…\` where the statement is sent`,
      });
    }

    for (const { line, text } of found.statements) {
      const report = (message: string) =>
        breaches.push({
          file: `${source.file}:${line}`,
          message: `module \`${source.module}\`: ${message}`,
        });

      let statements;
      try {
        statements = await parseStatements(text);
      } catch (error) {
        report(
          `the statement is not valid SQL (${error instanceof Error ? error.message : String(error)}); only values can be interpolated into a sql template, never names or pieces of SQL`,
        );
        continue;
      }

      if (statements.length !== 1) {
        report(`a sql template holds one statement; this one holds ${statements.length}`);
      }
      for (const { kind, node } of statements) {
        if (!DATA_STATEMENTS.has(kind)) {
          report(
            `the code runs \`${kind}\`; a module only selects, inserts, updates and deletes, and the shape of the database is changed by migrations`,
          );
        }
        for (const breach of schemaBreaches(node, source.module, modules)) {
          report(`the query ${breach}`);
        }
      }
    }
  }

  return breaches;
}
