/**
 * One step of the structure of the device database.
 *
 * Forward only: a step that has shipped is never edited, reordered or removed,
 * because phones in the field have already applied it. A mistake is corrected
 * by the next step. There is no way down: an application older than the data
 * it finds refuses to open it (`migrate`).
 */
export interface Migration {
  /** 1, 2, 3… with no gaps: the value of `PRAGMA user_version` once applied. */
  readonly version: number;
  /** What the step does, for the log and for the reader. */
  readonly name: string;
  readonly sql: string;
}

export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: 'device settings',
    sql: `
      CREATE TABLE device_setting (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT, WITHOUT ROWID;
    `,
  },
];
