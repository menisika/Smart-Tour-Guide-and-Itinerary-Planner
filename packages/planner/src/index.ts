/**
 * The planner (ADR-0006): one deterministic heuristic that runs unchanged on
 * the server, on the phone and in the browser.
 *
 * Rules of this package, checked automatically:
 * - integer arithmetic only — no floating-point literal, no bare division, no
 *   `Math` function outside a short integer-safe list (`promenade/no-floating-point`);
 * - no clock, no randomness that is not seeded, explicit tie-breaking.
 *
 * PLACEHOLDER: `planRoute` is a stub, not the iterated local search. It is
 * written against the real description of a planning problem in `contracts`,
 * so the suites and the pipeline around it are already the real ones.
 */
export { planRoute } from './plan-route.ts';
