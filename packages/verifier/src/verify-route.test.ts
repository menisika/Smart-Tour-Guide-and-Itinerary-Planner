import {
  type PlannedRoute,
  type PlanningProblem,
  planningProblemSchema,
  routeViolationSchema,
} from '@promenade/contracts';
import { plannedRouteArbitrary, planningProblemArbitrary } from '@promenade/contracts/testing';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { verifyRoute } from './verify-route.ts';

/** Start, finish and two Places on one street, a minute apart; the Party walks slowly. */
const problem: PlanningProblem = planningProblemSchema.parse({
  travelMode: 'foot',
  party: {
    members: [{ memberId: 'member-1', themeWeights: [], dealbreakers: [], pacePercent: 125 }],
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
    cityVersion: { cityId: 'city-1', versionId: 'version-1' },
    scoreVersions: [],
    plannerConfigId: 'config-1',
  },
  candidates: ['place-a', 'place-b'].map((placeId) => ({
    type: 'place',
    placeId,
    kind: 'kind-a',
    experience: 'outside',
    status: 'open',
    visitSeconds: 600,
    hours: { confidence: 'unknown' },
    flags: {
      alcohol: false,
      inside: false,
      stairs: false,
      paidEntry: false,
      religious: false,
      cemeteryOrMemorial: false,
    },
    themeScores: [],
    popularity: 0,
    manual: false,
  })),
  travel: {
    avoidsStairs: false,
    // start, finish, a, b — there is no way from b back to a.
    seconds: [
      [0, 180, 60, 120],
      [180, 0, 120, 60],
      [60, 120, 0, 60],
      [120, 60, null, 0],
    ],
  },
});

const stop = (placeId: string, arriveAt: number, visitStartAt: number, departAt: number) => ({
  type: 'place' as const,
  placeId,
  arriveAt,
  visitStartAt,
  departAt,
  warnings: [],
  why: [],
});

/** At 125 % a minute of walking takes 75 seconds and a visit of ten minutes takes 750. */
const accepted: PlannedRoute = {
  origin: 'planner',
  travelMode: 'foot',
  optionNumber: 0,
  character: 'classic',
  startAt: 1_000_000,
  stops: [
    stop('place-a', 1_000_075, 1_000_075, 1_000_825),
    stop('place-b', 1_000_900, 1_000_900, 1_001_650),
  ],
  legs: [{ travelSeconds: 75 }, { travelSeconds: 75 }, { travelSeconds: 75 }],
  finishAt: 1_001_725,
};

describe('verifyRoute (placeholder)', () => {
  it('accepts a Route that keeps every constraint it checks', () => {
    expect(verifyRoute(problem, accepted)).toEqual([]);
  });

  it('accepts the walk from the start to the finish', () => {
    const walk = { ...accepted, stops: [], legs: [{ travelSeconds: 225 }], finishAt: 1_000_225 };

    expect(verifyRoute(problem, walk)).toEqual([]);
  });

  // ADR-0006, point 9: "a deliberately broken planner must be caught".
  // Each case is the output of a planner with one specific defect.
  it.each<{ defect: string; route: PlannedRoute; expected: unknown[] }>([
    {
      defect: 'ignores the time budget',
      route: {
        ...accepted,
        stops: [stop('place-a', 1_000_075, 1_002_000, 1_002_750), accepted.stops[1]].flatMap(
          (item) => (item === undefined ? [] : [item]),
        ),
      },
      // The second stop no longer follows the first, and the finish is late.
      expected: ['schedule-mismatch'],
    },
    {
      defect: 'plans past the budget less the buffer',
      route: {
        ...accepted,
        stops: [
          stop('place-a', 1_000_075, 1_002_500, 1_003_250),
          stop('place-b', 1_003_325, 1_003_325, 1_004_075),
        ],
        finishAt: 1_004_150,
      },
      expected: [{ code: 'over-time-budget', seconds: 850 }],
    },
    {
      defect: 'visits a Place twice',
      route: {
        ...accepted,
        stops: [
          stop('place-a', 1_000_075, 1_000_075, 1_000_825),
          stop('place-a', 1_000_825, 1_000_825, 1_001_575),
        ],
        legs: [{ travelSeconds: 75 }, { travelSeconds: 0 }, { travelSeconds: 150 }],
      },
      expected: [{ code: 'duplicate-stop', stopIndex: 1, candidateId: 'place-a' }],
    },
    {
      defect: 'invents a Place',
      route: {
        ...accepted,
        stops: [stop('place-nowhere', 1_000_075, 1_000_075, 1_000_825)],
        legs: [{ travelSeconds: 75 }, { travelSeconds: 75 }],
        finishAt: 1_000_900,
      },
      expected: [{ code: 'unknown-stop', stopIndex: 0, candidateId: 'place-nowhere' }],
    },
    {
      defect: 'shortens a visit',
      route: {
        ...accepted,
        stops: [
          stop('place-a', 1_000_075, 1_000_075, 1_000_675),
          stop('place-b', 1_000_750, 1_000_750, 1_001_500),
        ],
        finishAt: 1_001_575,
      },
      expected: [{ code: 'visit-time-mismatch', stopIndex: 0, seconds: 150 }],
    },
    {
      defect: 'forgets the pace on a leg',
      route: {
        ...accepted,
        stops: [
          stop('place-a', 1_000_060, 1_000_060, 1_000_810),
          stop('place-b', 1_000_885, 1_000_885, 1_001_635),
        ],
        legs: [{ travelSeconds: 60 }, { travelSeconds: 75 }, { travelSeconds: 75 }],
        finishAt: 1_001_710,
      },
      expected: [{ code: 'leg-time-mismatch', stopIndex: 0, seconds: 15 }],
    },
    {
      defect: 'walks where there is no path',
      route: {
        ...accepted,
        stops: [
          stop('place-b', 1_000_150, 1_000_150, 1_000_900),
          stop('place-a', 1_000_975, 1_000_975, 1_001_725),
        ],
        legs: [{ travelSeconds: 150 }, { travelSeconds: 75 }, { travelSeconds: 150 }],
        finishAt: 1_001_875,
      },
      expected: [{ code: 'no-path', stopIndex: 1, candidateId: 'place-a' }],
    },
    {
      defect: 'reports a finish it did not compute',
      route: { ...accepted, finishAt: 1_001_000 },
      expected: ['schedule-mismatch'],
    },
    {
      defect: 'leaves at another time than asked',
      route: { ...accepted, startAt: 999_000 },
      // The first arrival does not follow from that start either.
      expected: ['schedule-mismatch', 'schedule-mismatch'],
    },
    {
      defect: 'answers for another Travel Mode',
      route: { ...accepted, travelMode: 'car' },
      expected: ['travel-mode-mismatch'],
    },
  ])('catches a planner that $defect', ({ route, expected }) => {
    const violations = verifyRoute(problem, route);

    expect(violations).toHaveLength(expected.length);
    violations.forEach((violation, index) => {
      const wanted = expected[index];
      if (typeof wanted === 'string') expect(violation.code).toBe(wanted);
      else expect(violation).toMatchObject(wanted as object);
    });
  });

  it('reports in the shape of the contract, whatever Route it is given', () => {
    fc.assert(
      fc.property(planningProblemArbitrary(), plannedRouteArbitrary, (generated, route) => {
        for (const violation of verifyRoute(generated, route)) {
          expect(routeViolationSchema.parse(violation)).toEqual(violation);
        }
      }),
      { numRuns: 500 },
    );
  });
});
