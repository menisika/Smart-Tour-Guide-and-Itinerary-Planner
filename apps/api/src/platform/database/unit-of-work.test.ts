import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sql } from './sql.ts';
import { recordingPool } from './testing/recording-pool.ts';
import {
  Database,
  type Transaction,
  TransactionClosedError,
  UnitOfWork,
  UnitOfWorkRolledBackError,
} from './unit-of-work.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the unit of work', () => {
  it('runs the work of several modules in one transaction and commits once', async () => {
    const { pool, log, checkedOut } = recordingPool();
    const unitOfWork = new UnitOfWork(pool);

    const result = await unitOfWork.run(async (tx) => {
      await tx.query(sql`insert into places.place (id) values (${1})`);
      await tx.query(sql`insert into planning.route (id) values (${2})`);
      return 'done';
    });

    expect(result).toBe('done');
    expect(log).toEqual([
      'connection 1: BEGIN',
      'connection 1: insert into places.place (id) values ($1)',
      'connection 1: insert into planning.route (id) values ($1)',
      'connection 1: COMMIT',
    ]);
    expect(checkedOut()).toBe(0);
  });

  it('rolls back and rethrows when the work fails', async () => {
    const { pool, log, checkedOut } = recordingPool();
    const unitOfWork = new UnitOfWork(pool);
    const failure = new Error('the second module refused');

    await expect(
      unitOfWork.run(async (tx) => {
        await tx.query(sql`insert into places.place (id) values (${1})`);
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(log.at(-1)).toBe('connection 1: ROLLBACK');
    expect(log).not.toContain('connection 1: COMMIT');
    expect(checkedOut()).toBe(0);
  });

  it('rolls back when the database refuses a statement', async () => {
    const { pool, log, failOn } = recordingPool();
    const unitOfWork = new UnitOfWork(pool);
    const refused = new Error('duplicate key value violates unique constraint');
    failOn('insert into planning.route', refused);

    await expect(
      unitOfWork.run(async (tx) => {
        await tx.query(sql`insert into places.place (id) values (${1})`);
        await tx.query(sql`insert into planning.route (id) values (${1})`);
      }),
    ).rejects.toBe(refused);

    expect(log.at(-1)).toBe('connection 1: ROLLBACK');
  });

  it('nested use joins the outer transaction: one BEGIN, one COMMIT', async () => {
    const { pool, log } = recordingPool();
    const unitOfWork = new UnitOfWork(pool);
    let inner: Transaction | undefined;

    await unitOfWork.run(async (outer) => {
      await outer.query(sql`select 1`);
      await unitOfWork.run(async (tx) => {
        inner = tx;
        await tx.query(sql`select 2`);
      });
      expect(inner).toBe(outer);
    });

    expect(log).toEqual([
      'connection 1: BEGIN',
      'connection 1: select 1',
      'connection 1: select 2',
      'connection 1: COMMIT',
    ]);
  });

  it('rolls everything back when a nested unit fails, even if the outer code catches it', async () => {
    const { pool, log } = recordingPool();
    const unitOfWork = new UnitOfWork(pool);
    const failure = new Error('nested work failed');

    const outcome = unitOfWork.run(async (tx) => {
      await tx.query(sql`select 1`);
      await unitOfWork
        .run(() => Promise.reject(failure))
        .catch(() => {
          // The outer code carries on as if nothing had happened.
        });
    });

    await expect(outcome).rejects.toBeInstanceOf(UnitOfWorkRolledBackError);
    await expect(outcome).rejects.toHaveProperty('cause', failure);
    expect(log.at(-1)).toBe('connection 1: ROLLBACK');
  });

  it('gives two requests two transactions', async () => {
    const { pool, log } = recordingPool();
    const unitOfWork = new UnitOfWork(pool);

    await Promise.all([
      unitOfWork.run((tx) => tx.query(sql`select 1`)),
      unitOfWork.run((tx) => tx.query(sql`select 2`)),
    ]);

    expect(log.filter((line) => line.endsWith('BEGIN'))).toEqual([
      'connection 1: BEGIN',
      'connection 2: BEGIN',
    ]);
  });

  it('refuses a transaction kept past its unit of work', async () => {
    const { pool, log } = recordingPool();
    const unitOfWork = new UnitOfWork(pool);
    let kept: Transaction | undefined;

    await unitOfWork.run((tx) => {
      kept = tx;
      return Promise.resolve();
    });
    const sent = log.length;

    await expect(kept?.query(sql`select 1`)).rejects.toBeInstanceOf(TransactionClosedError);
    expect(() => kept?.afterCommit(() => undefined)).toThrow(TransactionClosedError);
    expect(log).toHaveLength(sent);
  });

  describe('work after commit', () => {
    it('runs after COMMIT and before run() returns, in the order registered', async () => {
      const { pool, log } = recordingPool();
      const unitOfWork = new UnitOfWork(pool);

      await unitOfWork.run((tx) => {
        tx.afterCommit(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          log.push('first hook');
        });
        tx.afterCommit(() => {
          log.push('second hook');
        });
        return Promise.resolve();
      });
      log.push('run() returned');

      expect(log).toEqual([
        'connection 1: BEGIN',
        'connection 1: COMMIT',
        'first hook',
        'second hook',
        'run() returned',
      ]);
    });

    it('does not run when the transaction is rolled back', async () => {
      const { pool, log } = recordingPool();
      const unitOfWork = new UnitOfWork(pool);

      await expect(
        unitOfWork.run((tx) => {
          tx.afterCommit(() => {
            log.push('hook');
          });
          return Promise.reject(new Error('failed after registering'));
        }),
      ).rejects.toThrow('failed after registering');

      expect(log).not.toContain('hook');
    });

    it('does not run when the commit itself fails', async () => {
      const { pool, log, failOn } = recordingPool();
      const unitOfWork = new UnitOfWork(pool);
      failOn('COMMIT', new Error('could not serialize access'));

      await expect(
        unitOfWork.run((tx) => {
          tx.afterCommit(() => {
            log.push('hook');
          });
          return Promise.resolve();
        }),
      ).rejects.toThrow('could not serialize access');

      expect(log).not.toContain('hook');
    });

    it('a failing hook is logged, does not fail the committed work and does not stop the next hook', async () => {
      const { pool, log } = recordingPool();
      const unitOfWork = new UnitOfWork(pool);
      const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      const result = await unitOfWork.run((tx) => {
        tx.afterCommit(() => {
          throw new Error('the push service is down');
        });
        tx.afterCommit(() => {
          log.push('second hook');
        });
        return Promise.resolve('committed');
      });

      expect(result).toBe('committed');
      expect(log).toContain('second hook');
      expect(logged).toHaveBeenCalledWith(expect.stringContaining('the push service is down'));
    });

    it('a hook that opens a unit of work gets a new transaction', async () => {
      const { pool, log } = recordingPool();
      const unitOfWork = new UnitOfWork(pool);

      await unitOfWork.run((tx) => {
        tx.afterCommit(async () => {
          await unitOfWork.run((next) => next.query(sql`select 2`));
        });
        return Promise.resolve();
      });

      expect(log).toEqual([
        'connection 1: BEGIN',
        'connection 1: COMMIT',
        'connection 2: BEGIN',
        'connection 2: select 2',
        'connection 2: COMMIT',
      ]);
    });
  });
});

describe('a single statement through Database', () => {
  it('goes to the pool when no unit of work is running', async () => {
    const { pool, log } = recordingPool();

    await new Database(pool).query(sql`select 1`);

    expect(log).toEqual(['pool: select 1']);
  });

  it('joins the running unit of work, so that it sees what the unit has written', async () => {
    const { pool, log } = recordingPool();
    const database = new Database(pool);

    await new UnitOfWork(pool).run(async (tx) => {
      await tx.query(sql`insert into places.place (id) values (${1})`);
      await database.query(sql`select id from places.place`);
    });

    expect(log).toEqual([
      'connection 1: BEGIN',
      'connection 1: insert into places.place (id) values ($1)',
      'connection 1: select id from places.place',
      'connection 1: COMMIT',
    ]);
  });
});
