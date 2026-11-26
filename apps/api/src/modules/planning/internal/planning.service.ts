import { Inject, Injectable } from '@nestjs/common';
import type { PlanningProblem, RouteViolation } from '@promenade/contracts';
import { planRoute } from '@promenade/planner';
import { verifyRoute } from '@promenade/verifier';

import { PLACES_API, type PlacesApi } from '../../places/index.ts';
import type { PlanningApi, PlanningOutcome } from '../planning.api.ts';

/** The planner produced a Route that the verifier does not accept (`RTE-6`). */
export class RouteRejectedError extends Error {
  constructor(readonly violations: readonly RouteViolation[]) {
    super(
      `The verifier rejected the planned Route: ${violations.map((violation) => violation.code).join(', ')}`,
    );
    this.name = 'RouteRejectedError';
  }
}

@Injectable()
export class PlanningService implements PlanningApi {
  constructor(@Inject(PLACES_API) private readonly places: PlacesApi) {}

  /**
   * PLACEHOLDER: the planner runs in the request's own thread here. ADR-0003,
   * point 4 puts it in a pool of worker threads, so that a second of planning
   * does not freeze everyone connected to the instance.
   */
  async plan(cityId: string, problem: PlanningProblem): Promise<PlanningOutcome> {
    const cityVersion = await this.places.publishedCityVersion(cityId);
    if (cityVersion === null) return { kind: 'city-not-published', cityId };

    const answer = planRoute(problem);

    // Every plan is checked by code that shares nothing with the planner.
    if (answer.outcome === 'route') {
      const violations = verifyRoute(problem, answer.route);
      if (violations.length > 0) throw new RouteRejectedError(violations);
    }

    return { kind: 'planned', cityVersion, answer };
  }
}
