import type { PlanningRequest } from '@promenade/contracts';
import { verifyRoute } from '@promenade/verifier';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { planRoute } from './plan-route.ts';

/**
 * The seed of the suites of ADR-0027, points 1 and 2: generated requests, each
 * Route accepted by the verifier, the same Route on every repetition.
 *
 * Place identifiers are unique per request: what a duplicate candidate means
 * is a question for the real contract, not for this stub.
 */
const requestArbitrary: fc.Arbitrary<PlanningRequest> = fc.record({
  timeBudgetSeconds: fc.integer({ min: 0, max: 8 * 60 * 60 }),
  candidates: fc.uniqueArray(
    fc.record({
      placeId: fc.stringMatching(/^[a-z0-9]{1,8}$/),
      visitSeconds: fc.integer({ min: 60, max: 2 * 60 * 60 }),
    }),
    { maxLength: 40, selector: (candidate) => candidate.placeId },
  ),
});

describe('planRoute (placeholder)', () => {
  it('is accepted by the verifier for every generated request', () => {
    fc.assert(
      fc.property(requestArbitrary, (request) => {
        expect(verifyRoute(request, planRoute(request))).toEqual([]);
      }),
      { numRuns: 1000 },
    );
  });

  it('gives the same Route when repeated and when the candidates are reordered', () => {
    fc.assert(
      fc.property(requestArbitrary, (request) => {
        const first = planRoute(request);
        const repeated = planRoute(request);
        const reordered = planRoute({
          ...request,
          candidates: [...request.candidates].reverse(),
        });

        expect(repeated).toEqual(first);
        expect(reordered).toEqual(first);
      }),
      { numRuns: 1000 },
    );
  });

  it('plans nothing when nothing fits', () => {
    const route = planRoute({
      timeBudgetSeconds: 59,
      candidates: [{ placeId: 'a', visitSeconds: 60 }],
    });

    expect(route).toEqual({ stops: [], totalSeconds: 0 });
  });
});
