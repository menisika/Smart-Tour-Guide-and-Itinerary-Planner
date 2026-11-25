/**
 * The shared description of a planning problem and of its answer.
 *
 * The planner and the verifier both depend on these types and on nothing of
 * each other (ADR-0006). Every quantity is an integer; coordinates never
 * appear here.
 *
 * PLACEHOLDER: the shapes below are the smallest ones that let the planner
 * stub, the verifier stub and their tests exist. The real description — time
 * windows, pins, Dealbreakers, Breaks, a Party — replaces them.
 */

/** A Place the planner may put on a Route. */
export interface PlanningCandidate {
  readonly placeId: string;
  /** Time spent at the Place, in whole seconds. */
  readonly visitSeconds: number;
}

export interface PlanningRequest {
  /** Time available for the whole Route, in whole seconds. */
  readonly timeBudgetSeconds: number;
  readonly candidates: readonly PlanningCandidate[];
}

export interface RouteStop {
  readonly placeId: string;
  readonly visitSeconds: number;
}

export interface RouteDraft {
  readonly stops: readonly RouteStop[];
  /** Sum of the visit times of all stops, in whole seconds. */
  readonly totalSeconds: number;
}

export type RouteViolationCode =
  'unknown-place' | 'duplicate-place' | 'visit-time-mismatch' | 'total-mismatch' | 'over-budget';

/** One broken constraint, as the verifier reports it. */
export interface RouteViolation {
  readonly code: RouteViolationCode;
  /** The Place the violation is about, when it is about one Place. */
  readonly placeId: string | null;
}
