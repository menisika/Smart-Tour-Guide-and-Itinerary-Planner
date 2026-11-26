import { Injectable } from '@nestjs/common';
import type { z } from 'zod';

import type { Transaction } from '../database/index.ts';

/**
 * A kind of domain event: its name and the schema of what it carries.
 *
 * The module that publishes the event defines it in its interface file
 * (`modules/<name>/<name>.api.ts`) or, when clients see the same shape, in
 * `contracts`, and exports it; the modules that react import it from there.
 */
export interface DomainEventType<Payload> {
  /** `<module>.<what-happened>`, for example `outings.outing-finished`. */
  readonly name: string;
  readonly schema: z.ZodType<Payload>;
}

const EVENT_NAME = /^[a-z][a-z0-9]*\.[a-z0-9]+(-[a-z0-9]+)*$/;

export function defineDomainEvent<Payload>(
  name: string,
  schema: z.ZodType<Payload>,
): DomainEventType<Payload> {
  if (!EVENT_NAME.test(name)) {
    throw new Error(
      `A domain event is named <module>.<what-happened> in lower case with hyphens; got "${name}".`,
    );
  }

  return { name, schema };
}

/** Runs inside the publisher's transaction; what it throws rolls the whole unit of work back. */
export type InTransactionHandler<Payload> = (
  payload: Payload,
  tx: Transaction,
) => Promise<void> | void;

/** Runs right after the commit, still inside the request; it has no transaction of its own. */
export type AfterCommitHandler<Payload> = (payload: Payload) => Promise<void> | void;

interface Handlers {
  readonly inTransaction: InTransactionHandler<never>[];
  readonly afterCommit: AfterCommitHandler<never>[];
}

/**
 * The in-process bus of domain events (ADR-0003, point 5).
 *
 * A module publishes an event inside a transaction. The handlers that other
 * modules registered run in one of two places, and nowhere else:
 *
 * - **inside the same transaction** (`subscribe`), awaited by `publish` — the
 *   handler's writes commit or roll back together with the publisher's, and
 *   its failure rolls the whole unit of work back;
 * - **right after the commit** (`subscribeAfterCommit`), awaited by
 *   `UnitOfWork.run` before it returns — for effects that must not happen for
 *   work that was rolled back. If the transaction is rolled back, they never
 *   run. A failure here is logged and cannot undo the commit, so anything that
 *   must not be lost is written in the transaction (ADR-0020's outbox).
 *
 * Nothing is deferred beyond that: an event cannot be published without an
 * open transaction, and no handler runs after the response is sent
 * (ADR-0024, rule 2).
 *
 * Handlers are registered when the application starts, in `onModuleInit` of a
 * provider of the reacting module, and run in the order of registration.
 */
@Injectable()
export class DomainEvents {
  private readonly handlers = new Map<string, Handlers>();

  subscribe<Payload>(type: DomainEventType<Payload>, handler: InTransactionHandler<Payload>): void {
    this.handlersOf(type.name).inTransaction.push(handler);
  }

  subscribeAfterCommit<Payload>(
    type: DomainEventType<Payload>,
    handler: AfterCommitHandler<Payload>,
  ): void {
    this.handlersOf(type.name).afterCommit.push(handler);
  }

  /**
   * Publishes one event in the given transaction. The payload is checked
   * against the schema of the event first, so a handler never sees a shape the
   * event does not promise.
   */
  async publish<Payload>(
    tx: Transaction,
    type: DomainEventType<Payload>,
    payload: Payload,
  ): Promise<void> {
    const checked = type.schema.parse(payload);
    const handlers = this.handlers.get(type.name);

    // Registered first: a closed transaction refuses here, before any handler runs.
    tx.afterCommit(async () => {
      for (const handler of handlers?.afterCommit ?? []) {
        await (handler as AfterCommitHandler<Payload>)(checked);
      }
    });

    for (const handler of handlers?.inTransaction ?? []) {
      await (handler as InTransactionHandler<Payload>)(checked, tx);
    }
  }

  private handlersOf(name: string): Handlers {
    let handlers = this.handlers.get(name);
    if (handlers === undefined) {
      handlers = { inTransaction: [], afterCommit: [] };
      this.handlers.set(name, handlers);
    }
    return handlers;
  }
}
