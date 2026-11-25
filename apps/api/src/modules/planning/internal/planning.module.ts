import { Module } from '@nestjs/common';

import { PlacesModule } from '../../places/index.ts';
import { PLANNING_API } from '../planning.api.ts';
import { PlanningService } from './planning.service.ts';

@Module({
  imports: [PlacesModule],
  providers: [PlanningService, { provide: PLANNING_API, useExisting: PlanningService }],
  exports: [PLANNING_API],
})
export class PlanningModule {}
