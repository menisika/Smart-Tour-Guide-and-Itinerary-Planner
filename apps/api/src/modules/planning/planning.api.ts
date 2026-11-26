import type { PlanningAnswer, PlanningProblem } from '@promenade/contracts';

import type { CityVersionRef } from '../places/index.ts';

/**
 * The public interface of the planning module.
 *
 * PLACEHOLDER: it shows one module using another through its interface, and
 * the server-side sequence "plan, then verify" (ADR-0006). No endpoint offers
 * it yet.
 */
export const PLANNING_API = Symbol('PlanningApi');

export type PlanningOutcome =
  | {
      readonly kind: 'planned';
      /** Part of what makes the Route reproducible (`NFR-2`). */
      readonly cityVersion: CityVersionRef;
      /** A verified Route, or what to relax when nothing fits. */
      readonly answer: PlanningAnswer;
    }
  | { readonly kind: 'city-not-published'; readonly cityId: string };

export interface PlanningApi {
  plan(cityId: string, problem: PlanningProblem): Promise<PlanningOutcome>;
}
