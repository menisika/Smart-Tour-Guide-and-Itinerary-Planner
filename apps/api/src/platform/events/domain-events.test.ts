import type { AddressInfo } from 'node:net';

import { Controller, Module, Post } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { APP_CONFIG } from '../config/app-config.ts';
import { DatabaseModule } from '../database/database.module.ts';
import { sql, type Transaction, TransactionClosedError, UnitOfWork } from '../database/index.ts';
import { DATABASE_POOL } from '../database/pool.ts';
import { recordingPool } from '../database/testing/recording-pool.ts';
import { DomainEventsModule } from './domain-events.module.ts';
import { defineDomainEvent, DomainEvents } from './domain-events.ts';

const outingFinished = defineDomainEvent(
  'outings.outing-finished',
  z.object({ outingId: z.string().min(1) }),
);

function setUp() {
  const recording = recordingPool();
  return { ...recording, unitOfWork: new UnitOfWork(recording.pool), events: new DomainEvents() };
}

describe('domain events', () => {
  it('refuses a name that is not <module>.<what-happened>', () => {
    expect(() => defineDomainEvent('OutingFinished', z.object({}))).toThrow(
      /<module>\.<what-happened>/,
    );
  });

  it("runs a handler inside the publisher's transaction, before the commit", async () => {
    const { unitOfWork, events, log } = setUp();
    let handlerTransaction: Transaction | undefined;
    events.subscribe(outingFinished, async ({ outingId }, tx) => {
      handlerTransaction = tx;
      await tx.query(sql`insert into feedback.request (outing_id) values (${outingId})`);
    });

    await unitOfWork.run(async (tx) => {
      await tx.query(sql`update outings.outing set finished = true`);
      await events.publish(tx, outingFinished, { outingId: 'o-1' });
      expect(handlerTransaction).toBe(tx);
    });

    expect(log).toEqual([
      'connection 1: BEGIN',
      'connection 1: update outings.outing set finished = true',
      'connection 1: insert into feedback.request (outing_id) values ($1)',
      'connection 1: COMMIT',
    ]);
  });

  it("a handler's failure inside the transaction rolls the whole unit back", async () => {
    const { unitOfWork, events, log } = setUp();
    const failure = new Error('the feedback module refused');
    const afterCommit: string[] = [];
    events.subscribe(outingFinished, () => {
      throw failure;
    });
    events.subscribeAfterCommit(outingFinished, () => {
      afterCommit.push('ran');
    });

    await expect(
      unitOfWork.run(async (tx) => {
        await tx.query(sql`update outings.outing set finished = true`);
        await events.publish(tx, outingFinished, { outingId: 'o-1' });
      }),
    ).rejects.toBe(failure);

    expect(log.at(-1)).toBe('connection 1: ROLLBACK');
    expect(log).not.toContain('connection 1: COMMIT');
    expect(afterCommit).toEqual([]);
  });

  it('a rolled-back transaction publishes nothing after commit', async () => {
    const { unitOfWork, events } = setUp();
    const heard: string[] = [];
    events.subscribeAfterCommit(outingFinished, ({ outingId }) => {
      heard.push(outingId);
    });

    await expect(
      unitOfWork.run(async (tx) => {
        await events.publish(tx, outingFinished, { outingId: 'o-1' });
        throw new Error('something later in the request failed');
      }),
    ).rejects.toThrow('something later in the request failed');

    expect(heard).toEqual([]);
  });

  it('runs an after-commit handler after COMMIT and before the unit of work returns', async () => {
    const { unitOfWork, events, log } = setUp();
    events.subscribeAfterCommit(outingFinished, async ({ outingId }) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      log.push(`heard ${outingId}`);
    });

    await unitOfWork.run(async (tx) => {
      await events.publish(tx, outingFinished, { outingId: 'o-1' });
      log.push('published');
    });
    log.push('unit of work returned');

    expect(log).toEqual([
      'connection 1: BEGIN',
      'published',
      'connection 1: COMMIT',
      'heard o-1',
      'unit of work returned',
    ]);
  });

  it('checks the payload against the schema of the event before any handler sees it', async () => {
    const { unitOfWork, events, log } = setUp();
    const heard: unknown[] = [];
    events.subscribe(outingFinished, (payload) => {
      heard.push(payload);
    });

    await expect(
      unitOfWork.run((tx) => events.publish(tx, outingFinished, { outingId: '' })),
    ).rejects.toThrow();

    expect(heard).toEqual([]);
    expect(log.at(-1)).toBe('connection 1: ROLLBACK');
  });

  it('cannot publish once the transaction is closed', async () => {
    const { unitOfWork, events } = setUp();
    const heard: string[] = [];
    events.subscribe(outingFinished, ({ outingId }) => {
      heard.push(outingId);
    });
    let kept: Transaction | undefined;
    await unitOfWork.run((tx) => {
      kept = tx;
      return Promise.resolve();
    });
    if (kept === undefined) throw new Error('the unit of work did not run');

    await expect(events.publish(kept, outingFinished, { outingId: 'o-1' })).rejects.toBeInstanceOf(
      TransactionClosedError,
    );
    expect(heard).toEqual([]);
  });

  it('delivers nothing to a module that did not subscribe', async () => {
    const { unitOfWork, events } = setUp();
    const other = defineDomainEvent('places.place-published', z.object({ placeId: z.string() }));
    const heard: string[] = [];
    events.subscribe(other, ({ placeId }) => {
      heard.push(placeId);
    });

    await unitOfWork.run((tx) => events.publish(tx, outingFinished, { outingId: 'o-1' }));

    expect(heard).toEqual([]);
  });
});

/**
 * ADR-0024, rule 2: nothing runs after the response. Shown on a real HTTP
 * request: the slow after-commit handler has finished before the response is.
 */
describe('no handler runs after the response is sent', () => {
  const order: string[] = [];

  @Controller('outings')
  class FinishOutingController {
    constructor(
      private readonly unitOfWork: UnitOfWork,
      private readonly events: DomainEvents,
    ) {}

    @Post('finish')
    async finish(): Promise<{ finished: true }> {
      await this.unitOfWork.run((tx) =>
        this.events.publish(tx, outingFinished, { outingId: 'o-1' }),
      );
      return { finished: true };
    }
  }

  @Module({ controllers: [FinishOutingController] })
  class OutingsTestModule {}

  let app: NestExpressApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    order.length = 0;
  });

  it('the after-commit handler has ended before the response is finished', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule.forRoot('pooled'), DomainEventsModule, OutingsTestModule],
    })
      .useMocker((token) => (token === APP_CONFIG ? {} : undefined))
      .overrideProvider(DATABASE_POOL)
      .useValue(recordingPool().pool)
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.useLogger(false);
    app.use((_request: Request, response: Response, next: () => void) => {
      response.on('finish', () => order.push('response finished'));
      next();
    });
    app.get(DomainEvents).subscribe(outingFinished, async () => {
      order.push('in-transaction handler started');
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push('in-transaction handler ended');
    });
    app.get(DomainEvents).subscribeAfterCommit(outingFinished, async () => {
      order.push('after-commit handler started');
      await new Promise((resolve) => setTimeout(resolve, 30));
      order.push('after-commit handler ended');
    });
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/outings/finish`, { method: 'POST' });
    expect(response.status).toBe(201);
    // Long enough for anything left running to show itself.
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(order).toEqual([
      'in-transaction handler started',
      'in-transaction handler ended',
      'after-commit handler started',
      'after-commit handler ended',
      'response finished',
    ]);
  });
});
