/**
 * The verifier (ADR-0006, point 7): checks a Route against the constraints of
 * its request and lists every violation.
 *
 * Rules of this package, checked automatically:
 * - it may not import the planner, directly or through another package — it
 *   depends only on the shared description of the constraints in `contracts`;
 * - integer arithmetic only, as in the planner.
 *
 * PLACEHOLDER: `verifyRoute` recomputes the schedule and checks the time
 * budget; the other hard constraints of the problem are still to be checked.
 */
export { verifyRoute } from './verify-route.ts';
