import {
  candidateId,
  candidateNode,
  dealbreakerFlags,
  FINISH_NODE,
  latestFinishAt,
  partyPacePercent,
  type PlaceCandidate,
  type PlanningAnswer,
  type PlanningCandidate,
  type PlanningProblem,
  type RouteLeg,
  type RouteStop,
  SCORE_SCALE,
  secondsAtPace,
  START_NODE,
  type StopReason,
  type StopWarning,
} from '@promenade/contracts';

/**
 * Orders by identifier, comparing UTF-16 code units. `localeCompare` would
 * depend on the engine's locale data and is therefore not used.
 */
function compareIds(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

interface Indexed {
  readonly candidate: PlanningCandidate;
  readonly node: number;
}

/** Where the Route stands while it is being built. */
interface Progress {
  node: number;
  at: number;
}

/** The earliest start of a visit of `duration` seconds for a Party arriving at `arriveAt`. */
function earliestVisitStart(
  candidate: PlanningCandidate,
  arriveAt: number,
  duration: number,
): number | null {
  if (candidate.hours.confidence === 'unknown') return arriveAt;

  let earliest: number | null = null;
  for (const interval of candidate.hours.intervals) {
    const start = Math.max(arriveAt, interval.opensAt);
    if (start + duration > interval.closesAt) continue;
    if (earliest === null || start < earliest) earliest = start;
  }
  return earliest;
}

function mayBeVisited(problem: PlanningProblem, place: PlaceCandidate): boolean {
  if (place.status === 'permanently-closed') return false;
  if (place.experience === 'inside') {
    if (!problem.allowInside) return false;
    if (place.status === 'temporarily-closed') return false;
    if (problem.excludeUnknownHours && place.hours.confidence === 'unknown') return false;
  }
  for (const member of problem.party.members) {
    for (const dealbreaker of member.dealbreakers) {
      if (place.flags[dealbreakerFlags[dealbreaker]]) return false;
    }
  }
  return true;
}

function warningsOf(place: PlaceCandidate): StopWarning[] {
  const warnings: StopWarning[] = [];
  if (place.experience === 'inside' && place.hours.confidence === 'unknown') {
    warnings.push('unknown-hours');
  }
  if (place.status === 'temporarily-closed') warnings.push('temporarily-closed');
  return warnings;
}

/** The two themes that speak most for the Place, for this Party. */
function reasonsOf(problem: PlanningProblem, place: PlaceCandidate): StopReason[] {
  const reasons: StopReason[] = [];
  for (const score of place.themeScores) {
    let weight = 0;
    for (const member of problem.party.members) {
      for (const themeWeight of member.themeWeights) {
        if (themeWeight.themeId === score.themeId) weight += themeWeight.value;
      }
    }
    const contribution = Math.trunc((weight * score.value) / SCORE_SCALE);
    if (contribution > 0) reasons.push({ themeId: score.themeId, contribution });
  }
  reasons.sort((a, b) => b.contribution - a.contribution || compareIds(a.themeId, b.themeId));
  return reasons.slice(0, 2);
}

/**
 * PLACEHOLDER planner: walks from the start, takes the pinned Places and then
 * the others in the order of their identifiers, and keeps each one that can be
 * visited and still leaves time to reach the finish.
 *
 * It is deliberately trivial — no search, no scoring — but it already has the
 * properties the real planner must keep: the same problem gives the same
 * answer, the order of the candidates does not matter, and nothing but
 * integers is involved.
 */
export function planRoute(problem: PlanningProblem): PlanningAnswer {
  const pace = partyPacePercent(problem.party);
  const deadline = latestFinishAt(problem);

  const travel = (from: number, to: number): number | null => {
    const seconds = problem.travel.seconds[from]?.[to];
    return seconds === undefined || seconds === null ? null : secondsAtPace(seconds, pace);
  };

  const direct = travel(START_NODE, FINISH_NODE);
  if (direct === null) return { outcome: 'infeasible', relaxations: [] };
  if (problem.startAt + direct > deadline) {
    return {
      outcome: 'infeasible',
      relaxations: [{ relax: 'time-budget', addSeconds: problem.startAt + direct - deadline }],
    };
  }

  const stops: RouteStop[] = [];
  const legs: RouteLeg[] = [];
  const progress: Progress = { node: START_NODE, at: problem.startAt };

  /** Appends the candidate to the Route when it fits; says whether it did. */
  const append = ({ candidate, node }: Indexed): boolean => {
    const there = travel(progress.node, node);
    const back = travel(node, FINISH_NODE);
    if (there === null || back === null) return false;

    const duration =
      candidate.type === 'place'
        ? secondsAtPace(candidate.visitSeconds, pace)
        : candidate.visitSeconds;
    const arriveAt = progress.at + there;
    const visitStartAt = earliestVisitStart(candidate, arriveAt, duration);
    if (visitStartAt === null) return false;

    const departAt = visitStartAt + duration;
    if (departAt + back > deadline) return false;

    const times = { arriveAt, visitStartAt, departAt };
    stops.push(
      candidate.type === 'place'
        ? {
            type: 'place',
            placeId: candidate.placeId,
            ...times,
            warnings: warningsOf(candidate),
            why: reasonsOf(problem, candidate),
          }
        : { type: 'break', breakId: candidate.breakId, ...times },
    );
    legs.push({ travelSeconds: there });
    progress.node = node;
    progress.at = departAt;
    return true;
  };

  const ordered: Indexed[] = problem.candidates
    .map((candidate, index) => ({ candidate, node: candidateNode(index) }))
    .sort((a, b) => compareIds(candidateId(a.candidate), candidateId(b.candidate)));

  const pinned = new Set(problem.pinnedPlaceIds);
  const places = ordered.filter(
    (item): item is Indexed & { candidate: PlaceCandidate } => item.candidate.type === 'place',
  );

  for (const item of places) {
    if (!pinned.has(item.candidate.placeId)) continue;
    if (!mayBeVisited(problem, item.candidate) || !append(item)) {
      return {
        outcome: 'infeasible',
        relaxations: [{ relax: 'pinned-place', placeId: item.candidate.placeId }],
      };
    }
  }

  if (problem.break.required) {
    const taken = ordered.some((item) => item.candidate.type === 'break' && append(item));
    if (!taken) return { outcome: 'infeasible', relaxations: [{ relax: 'break' }] };
  }

  for (const item of places) {
    if (pinned.has(item.candidate.placeId)) continue;
    if (mayBeVisited(problem, item.candidate)) append(item);
  }

  // The stops stand; the last leg takes the Party to the finish.
  const last = travel(progress.node, FINISH_NODE) ?? 0;
  legs.push({ travelSeconds: last });

  return {
    outcome: 'route',
    route: {
      origin: 'planner',
      travelMode: problem.travelMode,
      optionNumber: problem.optionNumber,
      character: 'classic',
      startAt: problem.startAt,
      stops,
      legs,
      finishAt: progress.at + last,
    },
  };
}
