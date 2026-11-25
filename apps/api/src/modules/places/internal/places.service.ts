import { Injectable } from '@nestjs/common';

import type { CityVersionRef, PlacesApi } from '../places.api.ts';

@Injectable()
export class PlacesService implements PlacesApi {
  /** PLACEHOLDER: no city version has been published, and no table exists yet. */
  publishedCityVersion(_cityId: string): Promise<CityVersionRef | null> {
    return Promise.resolve(null);
  }
}
