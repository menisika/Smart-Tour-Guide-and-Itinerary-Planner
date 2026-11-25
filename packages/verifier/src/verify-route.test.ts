import type { PlanningRequest, RouteDraft } from '@promenade/contracts';
import { describe, expect, it } from 'vitest';

import { verifyRoute } from './verify-route.ts';

const request: PlanningRequest = {
  timeBudgetSeconds: 3600,
  candidates: [
    { placeId: 'castle', visitSeconds: 1800 },
    { placeId: 'park', visitSeconds: 1200 },
    { placeId: 'museum', visitSeconds: 2400 },
  ],
};

describe('verifyRoute (placeholder)', () => {
  it('accepts a Route that keeps every constraint', () => {
    const route: RouteDraft = {
      stops: [
        { placeId: 'castle', visitSeconds: 1800 },
        { placeId: 'park', visitSeconds: 1200 },
      ],
      totalSeconds: 3000,
    };

    expect(verifyRoute(request, route)).toEqual([]);
  });

  // ADR-0006, point 9: "a deliberately broken planner must be caught".
  // Each case is the output of a planner with one specific defect.
  it.each<{ defect: string; route: RouteDraft; expected: string[] }>([
    {
      defect: 'ignores the time budget',
      route: {
        stops: [
          { placeId: 'castle', visitSeconds: 1800 },
          { placeId: 'museum', visitSeconds: 2400 },
        ],
        totalSeconds: 4200,
      },
      expected: ['over-budget'],
    },
    {
      defect: 'reports a total it did not compute',
      route: { stops: [{ placeId: 'castle', visitSeconds: 1800 }], totalSeconds: 60 },
      expected: ['total-mismatch'],
    },
    {
      defect: 'visits a Place twice',
      route: {
        stops: [
          { placeId: 'park', visitSeconds: 1200 },
          { placeId: 'park', visitSeconds: 1200 },
        ],
        totalSeconds: 2400,
      },
      expected: ['duplicate-place'],
    },
    {
      defect: 'invents a Place',
      route: { stops: [{ placeId: 'nowhere', visitSeconds: 600 }], totalSeconds: 600 },
      expected: ['unknown-place'],
    },
    {
      defect: 'shortens a visit',
      route: { stops: [{ placeId: 'museum', visitSeconds: 600 }], totalSeconds: 600 },
      expected: ['visit-time-mismatch'],
    },
  ])('catches a planner that $defect', ({ route, expected }) => {
    expect(verifyRoute(request, route).map((violation) => violation.code)).toEqual(expected);
  });
});
