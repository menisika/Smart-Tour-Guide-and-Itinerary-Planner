import { Module } from '@nestjs/common';

import { PLACES_API } from '../places.api.ts';
import { PlacesService } from './places.service.ts';

/** Offers the module to the others as `PLACES_API` only; the service class stays inside. */
@Module({
  providers: [PlacesService, { provide: PLACES_API, useExisting: PlacesService }],
  exports: [PLACES_API],
})
export class PlacesModule {}
