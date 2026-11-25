/**
 * Travel times between Places (ADR-0009).
 *
 * The planner and the verifier never see coordinates: they read precomputed
 * integer costs. This package is where those costs are looked up, and it obeys
 * the same rule as they do — integer arithmetic only.
 *
 * PLACEHOLDER: one lookup over an in-memory table. The pedestrian graph and
 * the sparse matrix of a city version replace it.
 */
export { travelSeconds, type TravelTimeTable } from './travel-times.ts';
