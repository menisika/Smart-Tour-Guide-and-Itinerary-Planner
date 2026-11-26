import { AsyncLocalStorage } from 'node:async_hooks';

import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Pool, PoolClient, QueryResultRow } from 'pg';

import { DATABASE_POOL } from './pool.ts';
import type { SqlQuery } from './sql.ts';

export interface QueryOutcome<Row> {
  readonly rows: readonly Row[];
  /** Rows the statement returned or changed. */
  readonly rowCount: number;
}

/** Anything a statement can be sent through: the database itself or an open transaction. */
export interface Queryable {
  query<Row extends QueryResultRow = QueryResultRow>(query: SqlQuery): Promise<QueryOutcome<Row>>;
}

/**
 * One open transaction, handed by {@link UnitOfWork.run} to the code it runs
 * and passed on to the interface of every module that takes part.
 */
export interface Transaction extends Queryable {
  /**
   * Registers work to run once the transaction has been committed, before
   * `UnitOfWork.run` returns — so still inside the request (ADR-0024, rule 2).
   * It never runs when the transaction is rolled back.
   */
  afterCommit(hook: () => Promise<void> | void): void;
}

/** A transaction was used after it had been committed or rolled back. */
export class TransactionClosedError extends Error {
  constructor() {
    super(
      'The transaction is closed. Work that outlives its unit of work would run after the response (ADR-0024, rule 2).',
    );
    this.name = 'TransactionClosedError';
  }
}

/**
 * A unit of work nested in this one failed, and the outer code carried on.
 * Both share one transaction, so nothing of it can be committed.
 */
export class UnitOfWorkRolledBackError extends Error {
  constructor(cause: unknown) {
    super('A nested unit of work failed, so the whole transaction was rolled back.', { cause });
    this.name = 'UnitOfWorkRolledBackError';
  }
}

type AfterCommitHook = () => Promise<void> | void;

class OpenTransaction implements Transaction {
  readonly hooks: AfterCommitHook[] = [];
  /** Set when a nested unit of work fails: the transaction can only be rolled back. */
  failure: { readonly cause: unknown } | null = null;
  closed = false;

  constructor(private readonly client: PoolClient) {}

  async query<Row extends QueryResultRow = QueryResultRow>(
    query: SqlQuery,
  ): Promise<QueryOutcome<Row>> {
    if (this.closed) throw new TransactionClosedError();

    const result = await this.client.query<Row>(query.text, [...query.values]);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  }

  afterCommit(hook: AfterCommitHook): void {
    if (this.closed) throw new TransactionClosedError();

    this.hooks.push(hook);
  }
}

/** The transaction of the unit of work the current asynchronous call chain is inside, if any. */
const activeTransaction = new AsyncLocalStorage<OpenTransaction | undefined>();

function currentTransaction(): OpenTransaction | undefined {
  const transaction = activeTransaction.getStore();
  return transaction === undefined || transaction.closed ? undefined : transaction;
}

/**
 * Opens a transaction, runs the given work in it and commits once.
 *
 * ```ts
 * await unitOfWork.run(async (tx) => {
 *   await outings.start(tx, outingId);
 *   await feedback.open(tx, outingId);
 * });
 * ```
 *
 * - **Shared.** The request opens one unit of work and passes `tx` to the
 *   interfaces of the modules that take part; all of them commit or none.
 * - **Nested use joins.** `run` called inside a running unit of work — by a
 *   module that also works alone — gets the same transaction; only the
 *   outermost `run` commits. When a nested `run` fails, the whole transaction
 *   is rolled back, even if the outer code catches the error.
 * - **Rolled back on any error** thrown by the work, which is then rethrown.
 * - **Closed afterwards.** A `tx` kept past its unit of work refuses to work.
 */
@Injectable()
export class UnitOfWork {
  private readonly logger = new Logger(UnitOfWork.name);

  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async run<Result>(work: (tx: Transaction) => Promise<Result>): Promise<Result> {
    const outer = currentTransaction();
    if (outer !== undefined) return this.join(outer, work);

    const client = await this.pool.connect();
    const transaction = new OpenTransaction(client);
    let result: Result;

    try {
      await client.query('BEGIN');
    } catch (error) {
      client.release(true);
      throw error;
    }

    try {
      result = await activeTransaction.run(transaction, () => work(transaction));
      if (transaction.failure !== null) {
        throw new UnitOfWorkRolledBackError(transaction.failure.cause);
      }
      transaction.closed = true;
      await client.query('COMMIT');
    } catch (error) {
      transaction.closed = true;
      try {
        await client.query('ROLLBACK');
        client.release();
      } catch {
        // A connection whose state is unknown must not go back into the pool.
        client.release(true);
      }
      throw error;
    }
    client.release();

    await this.runAfterCommit(transaction.hooks);
    return result;
  }

  private async join<Result>(
    outer: OpenTransaction,
    work: (tx: Transaction) => Promise<Result>,
  ): Promise<Result> {
    try {
      return await work(outer);
    } catch (error) {
      outer.failure ??= { cause: error };
      throw error;
    }
  }

  /**
   * The data is committed by now, so a failing hook cannot undo it and must
   * not turn a successful request into an error: it is logged, and the hooks
   * after it still run. What must not be lost is written inside the
   * transaction instead.
   */
  private async runAfterCommit(hooks: readonly AfterCommitHook[]): Promise<void> {
    for (const hook of hooks) {
      try {
        // Outside the finished transaction: a hook that opens a unit of work gets a new one.
        await activeTransaction.run(undefined, async () => {
          await hook();
        });
      } catch (error) {
        this.logger.error(
          `Work after commit failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
        );
      }
    }
  }
}

/**
 * Sends single statements. Inside a running unit of work a statement joins its
 * transaction, so that a read sees what the unit has written; outside one it
 * takes a connection from the pool for itself.
 */
@Injectable()
export class Database implements Queryable {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async query<Row extends QueryResultRow = QueryResultRow>(
    query: SqlQuery,
  ): Promise<QueryOutcome<Row>> {
    const transaction = currentTransaction();
    if (transaction !== undefined) return transaction.query<Row>(query);

    const result = await this.pool.query<Row>(query.text, [...query.values]);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  }
}
