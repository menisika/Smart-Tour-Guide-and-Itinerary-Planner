/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';

import type { SqlDatabase, SqlValue } from '../sql-database';

/**
 * A real SQLite file behind the interface the device's data layer uses, for
 * tests: the engine is the one built into Node.js, the SQL is the same.
 */
export function openNodeDatabase(path = ':memory:'): SqlDatabase & { close(): void } {
  const database = new DatabaseSync(path);

  return {
    execAsync(source) {
      database.exec(source);
      return Promise.resolve();
    },
    runAsync(source, params: SqlValue[]) {
      return Promise.resolve(database.prepare(source).run(...params));
    },
    getFirstAsync<Row>(source: string, params: SqlValue[]) {
      return Promise.resolve((database.prepare(source).get(...params) as Row | undefined) ?? null);
    },
    getAllAsync<Row>(source: string, params: SqlValue[]) {
      return Promise.resolve(database.prepare(source).all(...params) as Row[]);
    },
    async withTransactionAsync(task) {
      database.exec('BEGIN');
      try {
        await task();
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
    close() {
      database.close();
    },
  };
}
