/**
 * Schemas and types shared by the API and every client (ADR-0025).
 *
 * Every request, response, journal entry and event is to be defined here once.
 * The server validates against these schemas at its boundary and clients take
 * their types from them. Only the first few shapes exist so far.
 */
export * from './errors.ts';
export * from './health.ts';
export * from './locale.ts';
export * from './planning-rules.ts';
export * from './planning-wire.ts';
export * from './planning.ts';
