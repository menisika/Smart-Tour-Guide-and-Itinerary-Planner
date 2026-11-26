import { Global, Module } from '@nestjs/common';

import { DomainEvents } from './domain-events.ts';

/** One bus for the whole process, so that every module publishes to and hears from the same one. */
@Global()
@Module({
  providers: [DomainEvents],
  exports: [DomainEvents],
})
export class DomainEventsModule {}
