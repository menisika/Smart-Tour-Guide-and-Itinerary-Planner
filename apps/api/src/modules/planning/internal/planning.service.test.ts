import type { PlanningRequest } from '@promenade/contracts';
import { describe, expect, it } from 'vitest';

import type { CityVersionRef, PlacesApi } from '../../places/index.ts';
import { PlanningService } from './planning.service.ts';

/** The places module, replaced through its interface — as any module can be. */
function placesAnswering(cityVersion: CityVersionRef | null): PlacesApi {
  return { publishedCityVersion: () => Promise.resolve(cityVersion) };
}

const request: PlanningRequest = {
  timeBudgetSeconds: 3600,
  candidates: [
    { placeId: 'castle', visitSeconds: 1800 },
    { placeId: 'museum', visitSeconds: 2400 },
    { placeId: 'park', visitSeconds: 1200 },
  ],
};

describe('PlanningService (placeholder)', () => {
  it('plans against the published version of the city and names it in the outcome', async () => {
    const cityVersion = { cityId: 'test-city', versionId: 'test-version' };
    const planning = new PlanningService(placesAnswering(cityVersion));

    const outcome = await planning.plan('test-city', request);

    expect(outcome).toEqual({
      kind: 'planned',
      cityVersion,
      route: {
        stops: [
          { placeId: 'castle', visitSeconds: 1800 },
          { placeId: 'park', visitSeconds: 1200 },
        ],
        totalSeconds: 3000,
      },
    });
  });

  it('does not plan for a city that has no published version', async () => {
    const planning = new PlanningService(placesAnswering(null));

    await expect(planning.plan('test-city', request)).resolves.toEqual({
      kind: 'city-not-published',
      cityId: 'test-city',
    });
  });
});
