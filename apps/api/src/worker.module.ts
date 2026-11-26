import { Module } from '@nestjs/common';

import { ConfigModule } from './platform/config/config.module.ts';
import { DatabaseModule } from './platform/database/database.module.ts';
import { DomainEventsModule } from './platform/events/index.ts';
import { ModelPortsModule } from './ports/model-ports.module.ts';

/**
 * The worker and the batch jobs: the same codebase without the HTTP side,
 * on a direct database connection (ADR-0010, point 9).
 */
@Module({
  imports: [ConfigModule, DatabaseModule.forRoot('direct'), DomainEventsModule, ModelPortsModule],
})
export class WorkerModule {}
