import type { PlanningRequest, RouteDraft, RouteViolation } from '@promenade/contracts';

/**
 * Lists every constraint of `request` that `route` breaks; an empty list means
 * the Route is accepted.
 *
 * Written from the description of the constraints alone. It shares no code
 * with the planner and does not trust the totals the planner reports.
 */
export function verifyRoute(
  request: PlanningRequest,
  route: RouteDraft,
): readonly RouteViolation[] {
  const violations: RouteViolation[] = [];

  const visitSecondsByPlace = new Map<string, number>();
  for (const candidate of request.candidates) {
    visitSecondsByPlace.set(candidate.placeId, candidate.visitSeconds);
  }

  const seen = new Set<string>();
  let recomputedTotal = 0;

  for (const stop of route.stops) {
    recomputedTotal += stop.visitSeconds;

    if (seen.has(stop.placeId)) {
      violations.push({ code: 'duplicate-place', placeId: stop.placeId });
    }
    seen.add(stop.placeId);

    const expectedVisitSeconds = visitSecondsByPlace.get(stop.placeId);
    if (expectedVisitSeconds === undefined) {
      violations.push({ code: 'unknown-place', placeId: stop.placeId });
    } else if (expectedVisitSeconds !== stop.visitSeconds) {
      violations.push({ code: 'visit-time-mismatch', placeId: stop.placeId });
    }
  }

  if (recomputedTotal !== route.totalSeconds) {
    violations.push({ code: 'total-mismatch', placeId: null });
  }
  if (recomputedTotal > request.timeBudgetSeconds) {
    violations.push({ code: 'over-budget', placeId: null });
  }

  return violations;
}
