import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  Database,
  sql,
  UnitOfWork,
  UnitOfWorkRolledBackError,
} from '../src/platform/database/index.ts';
import { defineDomainEvent, DomainEvents } from '../src/platform/events/index.ts';
import { createScratchDatabase, type ScratchDatabase } from './scratch-database.ts';

/**
 * The same promises as `src/platform/database/unit-of-work.test.ts` and
 * `src/platform/events/domain-events.test.ts`, kept by a real Postgres: what
 * is asserted here is what a second connection can and cannot see.
 *
 * Two tables stand for the tables of two modules.
 */
const outingFinished = defineDomainEvent(
  'outings.outing-finished',
  z.object({ outingId: z.string().min(1) }),
);

describe('the unit of work and domain events against a real database', () => {
  let scratch: ScratchDatabase;
  let pool: Pool;
  let observer: Pool;
  let unitOfWork: UnitOfWork;
  let database: Database;
  let events: DomainEvents;

  /** What another connection sees, so only what has been committed. */
  const committed = async (table: 'outing' | 'feedback_request'): Promise<string[]> => {
    const result = await observer.query<{ id: string }>(
      `select id from scratch.${table} order by id`,
    );
    return result.rows.map((row) => row.id);
  };

  beforeAll(async () => {
    scratch = await createScratchDatabase();
    pool = new Pool({ connectionString: scratch.url, max: 3 });
    observer = new Pool({ connectionString: scratch.url, max: 1 });
    await pool.query(`
      create schema scratch;
      create table scratch.outing (id text primary key);
      create table scratch.feedback_request (id text primary key);
    `);
    unitOfWork = new UnitOfWork(pool);
    database = new Database(pool);
  });

  beforeEach(async () => {
    events = new DomainEvents();
    await pool.query('truncate scratch.outing, scratch.feedback_request');
  });

  afterAll(async () => {
    await pool.end();
    await observer.end();
    await scratch.drop();
  });

  it('commits the writes of two modules together, and nothing is visible before', async () => {
    await unitOfWork.run(async (tx) => {
      await tx.query(sql`insert into scratch.outing (id) values (${'o-1'})`);
      await tx.query(sql`insert into scratch.feedback_request (id) values (${'o-1'})`);

      expect(await committed('outing')).toEqual([]);
    });

    expect(await committed('outing')).toEqual(['o-1']);
    expect(await committed('feedback_request')).toEqual(['o-1']);
  });

  it('rolls back the first module when the database refuses the second', async () => {
    await pool.query(`insert into scratch.feedback_request (id) values ('o-1')`);

    await expect(
      unitOfWork.run(async (tx) => {
        await tx.query(sql`insert into scratch.outing (id) values (${'o-1'})`);
        await tx.query(sql`insert into scratch.feedback_request (id) values (${'o-1'})`);
      }),
    ).rejects.toThrow(/duplicate key/);

    expect(await committed('outing')).toEqual([]);
  });

  it('nested use joins the outer transaction', async () => {
    const transactionId = (queryable: Database) =>
      queryable
        .query<{ id: string }>(sql`select txid_current()::text as id`)
        .then((outcome) => outcome.rows[0]?.id);

    await unitOfWork.run(async (tx) => {
      await tx.query(sql`insert into scratch.outing (id) values (${'o-1'})`);
      const outer = await transactionId(database);

      await unitOfWork.run(async (inner) => {
        await inner.query(sql`insert into scratch.feedback_request (id) values (${'o-1'})`);
        expect(await transactionId(database)).toBe(outer);
      });

      expect(await committed('feedback_request')).toEqual([]);
    });

    expect(await committed('outing')).toEqual(['o-1']);
    expect(await committed('feedback_request')).toEqual(['o-1']);
  });

  it('commits nothing when a nested unit failed, even if the outer code caught the error', async () => {
    await expect(
      unitOfWork.run(async (tx) => {
        await tx.query(sql`insert into scratch.outing (id) values (${'o-1'})`);
        await unitOfWork
          .run(() => Promise.reject(new Error('nested work failed')))
          .catch(() => undefined);
      }),
    ).rejects.toBeInstanceOf(UnitOfWorkRolledBackError);

    expect(await committed('outing')).toEqual([]);
  });

  it('a statement through Database inside a unit of work sees what the unit has written', async () => {
    await unitOfWork.run(async (tx) => {
      await tx.query(sql`insert into scratch.outing (id) values (${'o-1'})`);

      const seen = await database.query(sql`select id from scratch.outing`);
      expect(seen.rows).toEqual([{ id: 'o-1' }]);
    });
  });

  it("a handler's failure inside the transaction rolls the whole unit back", async () => {
    events.subscribe(outingFinished, async ({ outingId }, tx) => {
      await tx.query(sql`insert into scratch.feedback_request (id) values (${outingId})`);
      throw new Error('the handler failed after writing');
    });

    await expect(
      unitOfWork.run(async (tx) => {
        await tx.query(sql`insert into scratch.outing (id) values (${'o-1'})`);
        await events.publish(tx, outingFinished, { outingId: 'o-1' });
      }),
    ).rejects.toThrow('the handler failed after writing');

    expect(await committed('outing')).toEqual([]);
    expect(await committed('feedback_request')).toEqual([]);
  });

  it('a rolled-back transaction publishes nothing after commit', async () => {
    const heard: string[] = [];
    events.subscribeAfterCommit(outingFinished, ({ outingId }) => {
      heard.push(outingId);
    });

    await expect(
      unitOfWork.run(async (tx) => {
        await tx.query(sql`insert into scratch.outing (id) values (${'o-1'})`);
        await events.publish(tx, outingFinished, { outingId: 'o-1' });
        throw new Error('the request failed later');
      }),
    ).rejects.toThrow('the request failed later');

    expect(heard).toEqual([]);
    expect(await committed('outing')).toEqual([]);
  });

  it('an after-commit handler runs when the data is already visible to everyone, before the unit returns', async () => {
    const seenByHandler: string[][] = [];
    events.subscribeAfterCommit(outingFinished, async () => {
      seenByHandler.push(await committed('outing'));
    });

    await unitOfWork.run(async (tx) => {
      await tx.query(sql`insert into scratch.outing (id) values (${'o-1'})`);
      await events.publish(tx, outingFinished, { outingId: 'o-1' });
    });

    expect(seenByHandler).toEqual([['o-1']]);
  });

  it('returns every connection to the pool, after success and after failure', async () => {
    await unitOfWork.run((tx) => tx.query(sql`select 1`));
    await unitOfWork.run(() => Promise.reject(new Error('failed'))).catch(() => undefined);

    expect(pool.idleCount).toBe(pool.totalCount);
    expect(pool.waitingCount).toBe(0);
  });
});
