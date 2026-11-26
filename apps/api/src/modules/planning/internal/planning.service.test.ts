import type { PlanningProblem } from '@promenade/contracts';
import { describe, expect, it } from 'vitest';

import type { CityVersionRef, PlacesApi } from '../../places/index.ts';
import { PlanningService } from './planning.service.ts';

/** The places module, replaced through its interface — as any module can be. */
function placesAnswering(cityVersion: CityVersionRef | null): PlacesApi {
  return { publishedCityVersion: () => Promise.resolve(cityVersion) };
}

/** The start and the finish three minutes apart, and nothing to visit. */
const problem: PlanningProblem = {
  travelMode: 'foot',
  party: {
    members: [{ memberId: 'member-1', themeWeights: [], dealbreakers: [], pacePercent: 100 }],
  },
  startAt: 1_000_000,
  timeBudgetSeconds: 3600,
  bufferSeconds: 300,
  allowInside: true,
  unusualPercent: 50,
  excludeUnknownHours: false,
  pinnedPlaceIds: [],
  break: { required: false },
  optionNumber: 0,
  versions: {
    cityVersion: { cityId: 'test-city', versionId: 'test-version' },
    scoreVersions: [],
    plannerConfigId: 'test-config',
  },
  candidates: [],
  travel: {
    avoidsStairs: false,
    seconds: [
      [0, 180],
      [180, 0],
    ],
  },
};

describe('PlanningService (placeholder)', () => {
  it('plans against the published version of the city and names it in the outcome', async () => {
    const cityVersion = { cityId: 'test-city', versionId: 'test-version' };
    const planning = new PlanningService(placesAnswering(cityVersion));

    const outcome = await planning.plan('test-city', problem);

    expect(outcome).toEqual({
      kind: 'planned',
      cityVersion,
      answer: {
        outcome: 'route',
        route: {
          origin: 'planner',
          travelMode: 'foot',
          optionNumber: 0,
          character: 'classic',
          startAt: 1_000_000,
          stops: [],
          legs: [{ travelSeconds: 180 }],
          finishAt: 1_000_180,
        },
      },
    });
  });

  it('does not plan for a city that has no published version', async () => {
    const planning = new PlanningService(placesAnswering(null));

    await expect(planning.plan('test-city', problem)).resolves.toEqual({
      kind: 'city-not-published',
      cityId: 'test-city',
    });
  });
});
