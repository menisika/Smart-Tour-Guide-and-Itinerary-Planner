/**
 * Test-only entry point of `@promenade/contracts`: generators of planning
 * problems, answers and wire requests (fast-check arbitraries).
 *
 * The planner's and the verifier's suites share these, so that the verifier
 * never has to import the planner to get a problem (ADR-0006, point 7). The
 * entry point is published as sources only and is left out of `dist`: it can
 * be imported from a test or a tool, and never at run time.
 */
export * from './planning-arbitraries.ts';
