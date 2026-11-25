import type {
  PlanningCandidate,
  PlanningRequest,
  RouteDraft,
  RouteStop,
} from '@promenade/contracts';

/**
 * Orders by Place identifier, comparing UTF-16 code units. `localeCompare`
 * would depend on the engine's locale data and is therefore not used.
 */
function byPlaceId(a: PlanningCandidate, b: PlanningCandidate): number {
  if (a.placeId < b.placeId) return -1;
  if (a.placeId > b.placeId) return 1;
  return 0;
}

/**
 * PLACEHOLDER planner: takes candidates in the order of their identifiers and
 * keeps each one that still fits the time budget.
 *
 * It is deliberately trivial, but it already has the properties the real
 * planner must keep: the same request gives the same Route, the order of the
 * input does not matter, and nothing but integers is involved.
 */
export function planRoute(request: PlanningRequest): RouteDraft {
  const stops: RouteStop[] = [];
  const taken = new Set<string>();
  let totalSeconds = 0;

  for (const candidate of [...request.candidates].sort(byPlaceId)) {
    if (taken.has(candidate.placeId)) continue;
    if (totalSeconds + candidate.visitSeconds > request.timeBudgetSeconds) continue;

    taken.add(candidate.placeId);
    stops.push({ placeId: candidate.placeId, visitSeconds: candidate.visitSeconds });
    totalSeconds += candidate.visitSeconds;
  }

  return { stops, totalSeconds };
}
