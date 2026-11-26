/** A value SQLite stores as it is given. */
export type SqlValue = string | number | null;

/**
 * The part of a SQLite connection that the device's data layer uses.
 *
 * `expo-sqlite`'s `SQLiteDatabase` satisfies it as it is. Naming only this
 * part keeps the migrations and the data access free of the native module, so
 * that the tests run them against a real SQLite outside a phone.
 */
export interface SqlDatabase {
  /** Runs one or more statements that take no values and return no rows. */
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<unknown>;
  getFirstAsync<Row>(source: string, params: SqlValue[]): Promise<Row | null>;
  getAllAsync<Row>(source: string, params: SqlValue[]): Promise<Row[]>;
  /** Commits what `task` did, or rolls all of it back when `task` throws. */
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
