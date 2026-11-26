import { planningAnswerSchema, type PlanningProblem } from '@promenade/contracts';
import { planningProblemArbitrary } from '@promenade/contracts/testing';
import { verifyRoute } from '@promenade/verifier';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { planRoute } from './plan-route.ts';

/**
 * The seed of the suites of ADR-0027, points 1 and 2: generated problems, each
 * Route accepted by the verifier, the same Route on every repetition.
 */
const problems = planningProblemArbitrary();

/** The same problem with its candidates, and their rows of the matrix, in reverse order. */
function reordered(problem: PlanningProblem): PlanningProblem {
  const count = problem.candidates.length;
  const nodes = [0, 1, ...problem.candidates.map((_, index) => count + 1 - index)];

  return {
    ...problem,
    candidates: [...problem.candidates].reverse(),
    travel: {
      ...problem.travel,
      seconds: nodes.map((from) => nodes.map((to) => problem.travel.seconds[from]?.[to] ?? null)),
    },
  };
}

/** A problem with two Places on one street: start, a, b, finish, a minute apart. */
function street(overrides: Partial<PlanningProblem> = {}): PlanningProblem {
  const place = (placeId: string) => ({
    type: 'place' as const,
    placeId,
    kind: 'kind-a',
    experience: 'outside' as const,
    status: 'open' as const,
    visitSeconds: 600,
    hours: { confidence: 'unknown' as const },
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
  });

  return {
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
      cityVersion: { cityId: 'city-1', versionId: 'version-1' },
      scoreVersions: [],
      plannerConfigId: 'config-1',
    },
    candidates: [place('place-a'), place('place-b')],
    travel: {
      avoidsStairs: false,
      // start, finish, a, b
      seconds: [
        [0, 180, 60, 120],
        [180, 0, 120, 60],
        [60, 120, 0, 60],
        [120, 60, 60, 0],
      ],
    },
    ...overrides,
  };
}

describe('planRoute (placeholder)', () => {
  it('answers every generated problem in the shape of the contract', () => {
    fc.assert(
      fc.property(problems, (problem) => {
        const answer = planRoute(problem);

        expect(planningAnswerSchema.parse(answer)).toEqual(answer);
      }),
      { numRuns: 1000 },
    );
  });

  it('is accepted by the verifier for every generated problem', () => {
    fc.assert(
      fc.property(problems, (problem) => {
        const answer = planRoute(problem);
        if (answer.outcome !== 'route') return;

        expect(verifyRoute(problem, answer.route)).toEqual([]);
      }),
      { numRuns: 1000 },
    );
  });

  it('gives the same answer when repeated and when the candidates are reordered', () => {
    fc.assert(
      fc.property(problems, (problem) => {
        const first = planRoute(problem);

        expect(planRoute(problem)).toEqual(first);
        expect(planRoute(reordered(problem))).toEqual(first);
      }),
      { numRuns: 1000 },
    );
  });

  it('plans a Route more often than not, so the properties above test something', () => {
    const answers = fc.sample(problems, { seed: 1, numRuns: 300 }).map(planRoute);
    const routes = answers.flatMap((answer) => (answer.outcome === 'route' ? [answer.route] : []));

    expect(routes.length).toBeGreaterThan(150);
    expect(routes.filter((route) => route.stops.length > 0).length).toBeGreaterThan(100);
  });

  it('walks the street: both Places, with their times', () => {
    expect(planRoute(street())).toEqual({
      outcome: 'route',
      route: {
        origin: 'planner',
        travelMode: 'foot',
        optionNumber: 0,
        character: 'classic',
        startAt: 1_000_000,
        stops: [
          {
            type: 'place',
            placeId: 'place-a',
            arriveAt: 1_000_060,
            visitStartAt: 1_000_060,
            departAt: 1_000_660,
            warnings: [],
            why: [],
          },
          {
            type: 'place',
            placeId: 'place-b',
            arriveAt: 1_000_720,
            visitStartAt: 1_000_720,
            departAt: 1_001_320,
            warnings: [],
            why: [],
          },
        ],
        legs: [{ travelSeconds: 60 }, { travelSeconds: 60 }, { travelSeconds: 60 }],
        finishAt: 1_001_380,
      },
    });
  });

  it('slows a slower Party down, rounding up', () => {
    const problem = street();
    const answer = planRoute({
      ...problem,
      party: {
        members: [{ memberId: 'member-1', themeWeights: [], dealbreakers: [], pacePercent: 125 }],
      },
    });

    expect(answer.outcome === 'route' && answer.route.legs).toEqual([
      { travelSeconds: 75 },
      { travelSeconds: 75 },
      { travelSeconds: 75 },
    ]);
  });

  it('says how much time to add when the finish itself is out of reach', () => {
    expect(planRoute(street({ timeBudgetSeconds: 400 }))).toEqual({
      outcome: 'infeasible',
      relaxations: [{ relax: 'time-budget', addSeconds: 80 }],
    });
  });

  it('plans the walk alone when no Place fits', () => {
    const answer = planRoute(street({ timeBudgetSeconds: 600 }));

    expect(answer.outcome === 'route' && answer.route.stops).toEqual([]);
    expect(answer.outcome === 'route' && answer.route.legs).toEqual([{ travelSeconds: 180 }]);
  });

  it('names the pinned Place that cannot be reached in time', () => {
    expect(planRoute(street({ timeBudgetSeconds: 600, pinnedPlaceIds: ['place-b'] }))).toEqual({
      outcome: 'infeasible',
      relaxations: [{ relax: 'pinned-place', placeId: 'place-b' }],
    });
  });
});
