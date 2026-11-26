/**
 * The rules of a planning problem that the planner and the verifier must apply
 * in exactly the same way: the fixed-point scale, the numbering of nodes, the
 * rounding of pace.
 *
 * They are part of the definition of the constraints, not optimisation code,
 * which is why both sides may share them (ADR-0006, point 7). The file imports
 * nothing — its parameters are stated structurally — and is under the
 * `promenade/no-floating-point` lint rule.
 */
/**
 * Fixed-point scale of theme scores, theme weights and contributions: the
 * integer 1000 stands for 1.
 */
export const SCORE_SCALE = 1000;

/** The pace at which visit and travel seconds are stated, in per cent. */
export const NORMAL_PACE_PERCENT = 100;

/** The most members a Party has (`PTY-6`). */
export const MAX_PARTY_MEMBERS = 10;

/**
 * A person's hard conditions (`PRF-3`). The list is closed so that the planner
 * can enforce each one; each has its flag on a candidate.
 */
export const dealbreakers = [
  'no-alcohol',
  'no-inside',
  'no-stairs',
  'no-paid-entry',
  'no-religious',
  'no-cemeteries-or-memorials',
] as const;
export type Dealbreaker = (typeof dealbreakers)[number];

/**
 * Which flag of a candidate breaks which Dealbreaker. `no-stairs` binds the
 * paths too: the travel times of the problem must then avoid stairs.
 */
export const dealbreakerFlags = {
  'no-alcohol': 'alcohol',
  'no-inside': 'inside',
  'no-stairs': 'stairs',
  'no-paid-entry': 'paidEntry',
  'no-religious': 'religious',
  'no-cemeteries-or-memorials': 'cemeteryOrMemorial',
} as const satisfies Readonly<Record<Dealbreaker, string>>;

type CandidateRef =
  | { readonly type: 'place'; readonly placeId: string }
  | { readonly type: 'break'; readonly breakId: string };

/** The identifier of a candidate, whichever kind it is. */
export function candidateId(candidate: CandidateRef): string {
  return candidate.type === 'place' ? candidate.placeId : candidate.breakId;
}

/** Index of the start in the travel-time matrix. */
export const START_NODE = 0;
/** Index of the finish in the travel-time matrix. */
export const FINISH_NODE = 1;
/** Index in the travel-time matrix of the candidate at `candidateIndex`. */
export function candidateNode(candidateIndex: number): number {
  return candidateIndex + 2;
}

/** The identifier of the candidate a stop stands at. */
export function stopCandidateId(stop: CandidateRef): string {
  return stop.type === 'place' ? stop.placeId : stop.breakId;
}

/**
 * The pace of a Party: that of its slowest member.
 */
export function partyPacePercent(party: {
  readonly members: readonly { readonly pacePercent: number }[];
}): number {
  let slowest = 0;
  for (const member of party.members) slowest = Math.max(slowest, member.pacePercent);
  return slowest;
}

/**
 * The one rounding rule for pace (`PRF-4`): a time stated at normal pace,
 * scaled by a percentage and rounded up to a whole second, so that a plan
 * never promises less time than the Party needs.
 */
export function secondsAtPace(secondsAtNormalPace: number, pacePercent: number): number {
  return Math.ceil((secondsAtNormalPace * pacePercent) / NORMAL_PACE_PERCENT);
}

/** The instant by which the Route must reach the finish: the budget less the buffer. */
export function latestFinishAt(problem: {
  readonly startAt: number;
  readonly timeBudgetSeconds: number;
  readonly bufferSeconds: number;
}): number {
  return problem.startAt + Math.max(0, problem.timeBudgetSeconds - problem.bufferSeconds);
}
