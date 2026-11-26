import {
  candidateId,
  candidateNode,
  FINISH_NODE,
  latestFinishAt,
  partyPacePercent,
  type PlannedRoute,
  type PlanningCandidate,
  type PlanningProblem,
  type RouteViolation,
  type RouteViolationCode,
  secondsAtPace,
  START_NODE,
  stopCandidateId,
} from '@promenade/contracts';

interface Known {
  readonly candidate: PlanningCandidate;
  readonly node: number;
}

/**
 * Lists every constraint of `problem` that `route` breaks; an empty list means
 * the Route is accepted.
 *
 * Written from the description of the problem alone. It shares no code with
 * the planner and trusts none of the times the Route states: the schedule is
 * recomputed from the stops, the problem's travel times and the Party's pace.
 *
 * PLACEHOLDER: it checks that the Route is a schedule of this problem and that
 * it keeps the time budget. Opening hours, Dealbreakers, pins, Breaks, statuses
 * and warnings are the verifier proper.
 */
export function verifyRoute(
  problem: PlanningProblem,
  route: PlannedRoute,
): readonly RouteViolation[] {
  const violations: RouteViolation[] = [];
  const report = (
    code: RouteViolationCode,
    about: { stopIndex?: number; candidateId?: string; seconds?: number } = {},
  ): void => {
    violations.push({
      code,
      stopIndex: about.stopIndex ?? null,
      candidateId: about.candidateId ?? null,
      seconds: about.seconds ?? null,
      dealbreaker: null,
    });
  };

  const pace = partyPacePercent(problem.party);
  const known = new Map<string, Known>();
  problem.candidates.forEach((candidate, index) => {
    known.set(`${candidate.type}:${candidateId(candidate)}`, {
      candidate,
      node: candidateNode(index),
    });
  });

  if (route.travelMode !== problem.travelMode) report('travel-mode-mismatch');
  if (route.startAt !== problem.startAt) report('schedule-mismatch');

  /**
   * Checks the leg at `legIndex` from `from` to `to` and returns the instant
   * the Party arrives. A node that is not known cannot be checked.
   */
  const follow = (
    legIndex: number,
    from: number | null,
    to: number | null,
    leaveAt: number,
    about: { stopIndex?: number; candidateId?: string },
  ): number => {
    const stated = route.legs[legIndex]?.travelSeconds ?? 0;
    if (from !== null && to !== null) {
      const stored = problem.travel.seconds[from]?.[to];
      if (stored === undefined || stored === null) {
        report('no-path', about);
      } else {
        const expected = secondsAtPace(stored, pace);
        if (stated !== expected) {
          report('leg-time-mismatch', { ...about, seconds: Math.abs(stated - expected) });
        }
      }
    }
    return leaveAt + stated;
  };

  const seen = new Set<string>();
  let node: number | null = START_NODE;
  let at = route.startAt;

  route.stops.forEach((stop, stopIndex) => {
    const id = stopCandidateId(stop);
    const about = { stopIndex, candidateId: id };
    const key = `${stop.type}:${id}`;
    const match = known.get(key);

    if (match === undefined) report('unknown-stop', about);
    if (seen.has(key)) report('duplicate-stop', about);
    seen.add(key);

    const arriveAt = follow(stopIndex, node, match?.node ?? null, at, about);
    if (stop.arriveAt !== arriveAt || stop.visitStartAt < stop.arriveAt) {
      report('schedule-mismatch', about);
    }

    if (match !== undefined) {
      const expected =
        match.candidate.type === 'place'
          ? secondsAtPace(match.candidate.visitSeconds, pace)
          : match.candidate.visitSeconds;
      const stated = stop.departAt - stop.visitStartAt;
      if (stated !== expected) {
        report('visit-time-mismatch', { ...about, seconds: Math.abs(stated - expected) });
      }
    }

    node = match?.node ?? null;
    at = stop.departAt;
  });

  const finishAt = follow(route.stops.length, node, FINISH_NODE, at, {});
  if (route.finishAt !== finishAt) report('schedule-mismatch');

  const deadline = latestFinishAt(problem);
  if (finishAt > deadline) report('over-time-budget', { seconds: finishAt - deadline });

  return violations;
}
