import { Module } from '@nestjs/common';

import { PlacesModule } from './modules/places/index.ts';
import { PlanningModule } from './modules/planning/index.ts';
import { ConfigModule } from './platform/config/config.module.ts';
import { DatabaseModule } from './platform/database/database.module.ts';
import { DomainEventsModule } from './platform/events/index.ts';
import { HealthModule } from './platform/health/health.module.ts';
import { ModelPortsModule } from './ports/model-ports.module.ts';
import { ObjectStoreModule } from './ports/object-store/index.ts';

/** The API: every request-response endpoint of the modular monolith (ADR-0003, point 1). */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule.forRoot('pooled'),
    DomainEventsModule,
    ModelPortsModule,
    ObjectStoreModule,
    HealthModule,
    PlacesModule,
    PlanningModule,
  ],
})
export class AppModule {}
