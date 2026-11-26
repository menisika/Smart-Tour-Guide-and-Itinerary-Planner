/**
 * The shared description of a planning problem and of its answer.
 *
 * The planner and the verifier are both written against this file and against
 * nothing of each other (ADR-0006, point 7). Three rules hold for everything
 * here:
 *
 * - every quantity is an integer: seconds, fixed-point scores, percentages;
 * - no field can hold a coordinate — a problem knows its nodes only by the
 *   travel times between them (the wire request, which may hold one, lives in
 *   `planning-wire.ts`);
 * - instants are absolute, in whole seconds since the Unix epoch, and opening
 *   hours arrive as absolute intervals already resolved from the city's
 *   calendar and time zone (ADR-0029, points 2 and 3).
 *
 * The few rules both sides must apply the same way — pace, node numbering —
 * are in `planning-rules.ts`, which holds no schema, so that the planner and
 * the verifier can run without a schema library.
 */
import { z } from 'zod';

import {
  candidateId,
  type Dealbreaker,
  dealbreakerFlags,
  dealbreakers,
  MAX_PARTY_MEMBERS,
  SCORE_SCALE,
} from './planning-rules.ts';

// ── Scalars ─────────────────────────────────────────────────────────────────

/** A whole, non-negative number of seconds: a duration. */
const secondsSchema = z.int().min(0);

/** An instant: whole seconds since the Unix epoch. */
const instantSchema = z.int().min(0);

/** An identifier issued by us: of a Place, a Break option, a version. */
const identifierSchema = z.string().min(1).max(128);

/** A fixed-point value between 0 and 1, both included. */
const unitScoreSchema = z.int().min(0).max(SCORE_SCALE);

/**
 * True when no two items of the list share a key. Used by the schemas, so that
 * "which one wins" is never a question for the planner or the verifier.
 */
function hasUniqueKeys<T>(items: readonly T[], key: (item: T) => string): boolean {
  return new Set(items.map(key)).size === items.length;
}

// ── Closed lists ────────────────────────────────────────────────────────────

/** How a Party moves between stops (`NFR-37`). Only `foot` is offered before S4. */
export const travelModes = ['foot', 'bicycle', 'car'] as const;
export const travelModeSchema = z.enum(travelModes);
export type TravelMode = z.infer<typeof travelModeSchema>;

export const dealbreakerSchema = z.enum(dealbreakers);

/** The flags of a candidate that the Dealbreakers read, one per Dealbreaker. */
export const candidateFlagsSchema = z
  .strictObject({
    alcohol: z.boolean(),
    inside: z.boolean(),
    stairs: z.boolean(),
    paidEntry: z.boolean(),
    religious: z.boolean(),
    cemeteryOrMemorial: z.boolean(),
  })
  .readonly();
export type CandidateFlags = z.infer<typeof candidateFlagsSchema>;

// Every Dealbreaker reads a flag that exists.
dealbreakerFlags satisfies Readonly<Record<Dealbreaker, keyof CandidateFlags>>;

/** Status of a Place (specification §3.2). */
export const placeStatuses = [
  'open',
  'temporarily-closed',
  'permanently-closed',
  'unknown',
] as const;
export const placeStatusSchema = z.enum(placeStatuses);
export type PlaceStatus = z.infer<typeof placeStatusSchema>;

/** Whether a Place is seen from outside or visited inside (ADR-0029, point 8). */
export const placeExperiences = ['outside', 'inside'] as const;
export const placeExperienceSchema = z.enum(placeExperiences);
export type PlaceExperience = z.infer<typeof placeExperienceSchema>;

/** The character of a Route option (`RTE-7`). */
export const routeCharacters = ['classic', 'unusual', 'relaxed'] as const;
export const routeCharacterSchema = z.enum(routeCharacters);
export type RouteCharacter = z.infer<typeof routeCharacterSchema>;

/** What a stop can warn about without being a violation (`RTE-13`). */
export const stopWarnings = ['unknown-hours', 'temporarily-closed'] as const;
export const stopWarningSchema = z.enum(stopWarnings);
export type StopWarning = z.infer<typeof stopWarningSchema>;

// ── The problem ─────────────────────────────────────────────────────────────

/**
 * A theme and a fixed-point number about it. Themes are data of the product
 * (`PRF-2`), so a theme is an identifier here and not a closed list.
 */
const themeValueSchema = (value: z.ZodType<number>) =>
  z.strictObject({ themeId: identifierSchema, value }).readonly();

const uniqueThemes = (items: readonly { readonly themeId: string }[]) =>
  hasUniqueKeys(items, (item) => item.themeId);

/** One member of the Party, as far as planning is concerned. */
export const partyMemberSchema = z
  .strictObject({
    memberId: identifierSchema,
    /**
     * Weight per theme in fixed point: positive for a liked theme, negative
     * for a disliked one, absent for a neutral one. A Wish has already been
     * folded in (ADR-0015, point 3).
     */
    themeWeights: z
      .array(themeValueSchema(z.int().min(-SCORE_SCALE).max(SCORE_SCALE)))
      .refine(uniqueThemes, 'A theme is weighted once per member.')
      .readonly(),
    dealbreakers: z
      .array(dealbreakerSchema)
      .refine((items) => hasUniqueKeys(items, (item) => item), 'A Dealbreaker is listed once.')
      .readonly(),
    /**
     * Pace in per cent of the time a walk or a visit takes at normal pace:
     * 100 is normal, more is slower (`PRF-4`). See {@link secondsAtPace}.
     */
    pacePercent: z.int().min(50).max(200),
  })
  .readonly();
export type PartyMember = z.infer<typeof partyMemberSchema>;

/** Who is going. A person planning alone is a Party of one (`PTY-1`). */
export const partySchema = z
  .strictObject({
    members: z
      .array(partyMemberSchema)
      .min(1)
      .max(MAX_PARTY_MEMBERS)
      .refine((items) => hasUniqueKeys(items, (item) => item.memberId), 'A member is listed once.')
      .readonly(),
  })
  .readonly();
export type Party = z.infer<typeof partySchema>;

/** A half-open interval of instants: open from `opensAt`, closed at `closesAt`. */
export const openingIntervalSchema = z
  .strictObject({ opensAt: instantSchema, closesAt: instantSchema })
  .refine((interval) => interval.opensAt < interval.closesAt, 'An interval ends after it starts.')
  .readonly();
export type OpeningInterval = z.infer<typeof openingIntervalSchema>;

/**
 * Opening hours with their confidence (specification §3.2). Known hours are a
 * hard constraint; with unknown hours a stop is allowed and carries a warning.
 *
 * The intervals of a nested Place are already intersected with those of every
 * Territory above it, so neither the planner nor the verifier knows about
 * nesting. A known list that is empty means "closed for the whole horizon".
 */
export const hoursSchema = z.discriminatedUnion('confidence', [
  z
    .strictObject({
      confidence: z.literal('known'),
      intervals: z.array(openingIntervalSchema).readonly(),
    })
    .readonly(),
  z.strictObject({ confidence: z.literal('unknown') }).readonly(),
]);
export type Hours = z.infer<typeof hoursSchema>;

/** A Place the planner may put on a Route. */
export const placeCandidateSchema = z
  .strictObject({
    type: z.literal('place'),
    placeId: identifierSchema,
    /**
     * The kind of the Place as city data names it. The planner reads it for
     * the monotony penalty and the ceiling per kind; it is not a closed list.
     */
    kind: identifierSchema,
    /**
     * Seen from outside or visited inside. Unknown hours and a temporary
     * closure matter only for a Place visited inside (ADR-0029, point 8).
     */
    experience: placeExperienceSchema,
    status: placeStatusSchema,
    /** Time spent at the Place at normal pace, before the Party's pace. */
    visitSeconds: secondsSchema,
    hours: hoursSchema,
    flags: candidateFlagsSchema,
    /** Fixed-point score per theme (ADR-0015, point 1); an absent theme scores 0. */
    themeScores: z
      .array(themeValueSchema(unitScoreSchema))
      .refine(uniqueThemes, 'A theme is scored once per Place.')
      .readonly(),
    /** The popularity value of ADR-0015, point 7. */
    popularity: z.int().min(0),
    /** The Place never starts its Story by itself (trigger rule T10). */
    manual: z.boolean(),
  })
  .refine((place) => place.flags.inside === (place.experience === 'inside'), {
    path: ['flags', 'inside'],
    error: 'The flag says what the experience says.',
  })
  .readonly();
export type PlaceCandidate = z.infer<typeof placeCandidateSchema>;

/**
 * One way to take a Break: a spot on the way where time can be reserved. Which
 * Venues are near it is shown to the person and is not planning data.
 */
export const breakCandidateSchema = z
  .strictObject({
    type: z.literal('break'),
    breakId: identifierSchema,
    /** Length of the Break. Pace does not change it. */
    visitSeconds: secondsSchema,
    hours: hoursSchema,
  })
  .readonly();
export type BreakCandidate = z.infer<typeof breakCandidateSchema>;

export const planningCandidateSchema = z.discriminatedUnion('type', [
  placeCandidateSchema,
  breakCandidateSchema,
]);
export type PlanningCandidate = z.infer<typeof planningCandidateSchema>;

/**
 * Travel times among the nodes of the problem: the start (index 0), the finish
 * (index 1) and each candidate in the order of `candidates` (index 2 onward).
 *
 * `seconds[from][to]` is the time at normal pace in whole seconds, or `null`
 * when there is no path: a missing path is stated, never guessed and never
 * free (ADR-0009, point 4). The diagonal is zero.
 */
export const travelTimesSchema = z
  .strictObject({
    /**
     * True when the times were computed on paths without stairs. It must be
     * true whenever a member has the `no-stairs` Dealbreaker.
     */
    avoidsStairs: z.boolean(),
    seconds: z.array(z.array(secondsSchema.nullable()).readonly()).readonly(),
  })
  .readonly();
export type TravelTimes = z.infer<typeof travelTimesSchema>;

/** Whether the Route must hold a Break (`RTE-5`): the caller has already decided. */
export const breakRequestSchema = z.strictObject({ required: z.boolean() }).readonly();
export type BreakRequest = z.infer<typeof breakRequestSchema>;

/**
 * Everything the result is a function of besides the request itself (`NFR-2`,
 * ADR-0006, point 2).
 */
export const planningVersionsSchema = z
  .strictObject({
    cityVersion: z
      .strictObject({ cityId: identifierSchema, versionId: identifierSchema })
      .readonly(),
    /** Versions of the models that scored the Places (ADR-0015, point 2). */
    scoreVersions: z.array(identifierSchema).readonly(),
    /** The planner configuration: budget, preselection rule, limits. */
    plannerConfigId: identifierSchema,
  })
  .readonly();
export type PlanningVersions = z.infer<typeof planningVersionsSchema>;

function matrixFitsCandidates(problem: {
  readonly candidates: readonly unknown[];
  readonly travel: TravelTimes;
}): boolean {
  const size = problem.candidates.length + 2;
  const rows = problem.travel.seconds;
  return (
    rows.length === size && rows.every((row, index) => row.length === size && row[index] === 0)
  );
}

/**
 * A planning problem: what the planner receives and what the verifier checks a
 * Route against.
 */
export const planningProblemSchema = z
  .strictObject({
    travelMode: travelModeSchema,
    party: partySchema,
    /** When the Party leaves the start. */
    startAt: instantSchema,
    /** Time available from the start to the finish. */
    timeBudgetSeconds: secondsSchema,
    /** Kept free for uncertainty: the Route ends this much before the budget (`RTE-5`). */
    bufferSeconds: secondsSchema,
    /** False when the request says not to go inside. */
    allowInside: z.boolean(),
    /** The familiar ↔ unusual setting: 0 is familiar, 100 is unusual (`RTE-14`). */
    unusualPercent: z.int().min(0).max(100),
    /**
     * True when a Place visited inside whose hours are unknown may not be on
     * the Route (`RTE-13`). A Place seen from outside is not concerned.
     */
    excludeUnknownHours: z.boolean(),
    /** Places that must be on the Route (`EDT-3`). Each is among the candidates. */
    pinnedPlaceIds: z
      .array(identifierSchema)
      .refine((items) => hasUniqueKeys(items, (item) => item), 'A Place is pinned once.')
      .readonly(),
    break: breakRequestSchema,
    /** Which option of the request this is: 0 for the first (`RTE-8`). */
    optionNumber: z.int().min(0),
    versions: planningVersionsSchema,
    candidates: z
      .array(planningCandidateSchema)
      .refine((items) => hasUniqueKeys(items, candidateId), 'A candidate is listed once.')
      .readonly(),
    travel: travelTimesSchema,
  })
  .refine(matrixFitsCandidates, {
    path: ['travel', 'seconds'],
    error:
      'The matrix is square, has a row for the start, the finish and every candidate, and a zero diagonal.',
  })
  .refine(
    (problem) => {
      const placeIds = new Set(
        problem.candidates.flatMap((candidate) =>
          candidate.type === 'place' ? [candidate.placeId] : [],
        ),
      );
      return problem.pinnedPlaceIds.every((placeId) => placeIds.has(placeId));
    },
    { path: ['pinnedPlaceIds'], error: 'A pinned Place is among the candidates.' },
  )
  .readonly();
export type PlanningProblem = z.infer<typeof planningProblemSchema>;

// ── The answer ──────────────────────────────────────────────────────────────

const stopTimesShape = {
  /** When the Party reaches the stop. */
  arriveAt: instantSchema,
  /** When the visit starts: later than the arrival when the Party waits for opening. */
  visitStartAt: instantSchema,
  /** When the Party leaves. */
  departAt: instantSchema,
};

/**
 * One feature behind "why it is here" (`RTE-9`): a theme and what it added to
 * the Place's score in this Route, in fixed point. Leading themes first.
 */
export const stopReasonSchema = z
  .strictObject({ themeId: identifierSchema, contribution: z.int() })
  .readonly();
export type StopReason = z.infer<typeof stopReasonSchema>;

export const placeStopSchema = z
  .strictObject({
    type: z.literal('place'),
    placeId: identifierSchema,
    ...stopTimesShape,
    warnings: z
      .array(stopWarningSchema)
      .refine((items) => hasUniqueKeys(items, (item) => item), 'A warning is given once.')
      .readonly(),
    why: z.array(stopReasonSchema).readonly(),
  })
  .readonly();
export type PlaceStop = z.infer<typeof placeStopSchema>;

/** A Break on the Route: reserved time at one of the problem's Break options. */
export const breakStopSchema = z
  .strictObject({
    type: z.literal('break'),
    breakId: identifierSchema,
    ...stopTimesShape,
  })
  .readonly();
export type BreakStop = z.infer<typeof breakStopSchema>;

export const routeStopSchema = z.discriminatedUnion('type', [placeStopSchema, breakStopSchema]);
export type RouteStop = z.infer<typeof routeStopSchema>;

/** One move between two consecutive points of the Route, at the Party's pace. */
export const routeLegSchema = z.strictObject({ travelSeconds: secondsSchema }).readonly();
export type RouteLeg = z.infer<typeof routeLegSchema>;

/** Who decided the composition of a Route: the planner, or a person's edit (`EDT-1`). */
export const routeOrigins = ['planner', 'edited'] as const;
export const routeOriginSchema = z.enum(routeOrigins);
export type RouteOrigin = z.infer<typeof routeOriginSchema>;

/**
 * A Route as planned: stops in order, with one leg before each stop and one
 * after the last, so `legs` is one longer than `stops`. A Route with no stops
 * is the walk from the start to the finish.
 */
export const plannedRouteSchema = z
  .strictObject({
    origin: routeOriginSchema,
    travelMode: travelModeSchema,
    optionNumber: z.int().min(0),
    character: routeCharacterSchema,
    /** When the Party leaves the start. */
    startAt: instantSchema,
    stops: z.array(routeStopSchema).readonly(),
    legs: z.array(routeLegSchema).min(1).readonly(),
    /** When the Party reaches the finish. */
    finishAt: instantSchema,
  })
  .refine((route) => route.legs.length === route.stops.length + 1, {
    path: ['legs'],
    error: 'There is one leg before each stop and one after the last.',
  })
  .readonly();
export type PlannedRoute = z.infer<typeof plannedRouteSchema>;

/**
 * What to relax when nothing fits, and by how much where that has a size
 * (`RTE-10`). A Dealbreaker is named without its owner (`PTY-9`).
 */
export const relaxationSchema = z.discriminatedUnion('relax', [
  z.strictObject({ relax: z.literal('time-budget'), addSeconds: secondsSchema }).readonly(),
  z.strictObject({ relax: z.literal('start-time'), shiftSeconds: z.int() }).readonly(),
  z.strictObject({ relax: z.literal('allow-inside') }).readonly(),
  z.strictObject({ relax: z.literal('include-unknown-hours') }).readonly(),
  z.strictObject({ relax: z.literal('dealbreaker'), dealbreaker: dealbreakerSchema }).readonly(),
  z.strictObject({ relax: z.literal('pinned-place'), placeId: identifierSchema }).readonly(),
  z.strictObject({ relax: z.literal('break') }).readonly(),
]);
export type Relaxation = z.infer<typeof relaxationSchema>;

/**
 * The answer to a planning problem: a Route, or the statement that nothing
 * fits with the ways out, most useful first. An empty list of relaxations
 * means no single change helps — there is no path from the start to the finish.
 */
export const planningAnswerSchema = z.discriminatedUnion('outcome', [
  z.strictObject({ outcome: z.literal('route'), route: plannedRouteSchema }).readonly(),
  z
    .strictObject({
      outcome: z.literal('infeasible'),
      relaxations: z.array(relaxationSchema).readonly(),
    })
    .readonly(),
]);
export type PlanningAnswer = z.infer<typeof planningAnswerSchema>;

// ── Violations ──────────────────────────────────────────────────────────────

/**
 * The closed list of what a Route can break. The verifier reports these and an
 * edited Route lists them (`EDT-1`); a client chooses the text by code.
 *
 * The first group is about the Route not being a schedule of this problem at
 * all, the second about the hard constraints of `RTE-4`.
 */
export const routeViolationCodes = [
  // The Route does not describe this problem.
  'unknown-stop',
  'duplicate-stop',
  'no-path',
  'leg-time-mismatch',
  'visit-time-mismatch',
  'schedule-mismatch',
  'travel-mode-mismatch',
  // A hard constraint is broken.
  'over-time-budget',
  'outside-opening-hours',
  'dealbreaker',
  'inside-not-allowed',
  'pinned-place-missing',
  'break-missing',
  'permanently-closed',
  'temporarily-closed-inside',
  'unknown-hours-excluded',
  'warning-missing',
] as const;
export const routeViolationCodeSchema = z.enum(routeViolationCodes);
export type RouteViolationCode = z.infer<typeof routeViolationCodeSchema>;

/**
 * One broken constraint. Every field is always present, `null` where it does
 * not apply, so that a list of violations has one shape on every engine.
 */
export const routeViolationSchema = z
  .strictObject({
    code: routeViolationCodeSchema,
    /** The stop the violation is about, by its position in the Route. */
    stopIndex: z.int().min(0).nullable(),
    /** The Place or Break option the violation is about. */
    candidateId: identifierSchema.nullable(),
    /** The size of the breach where it has one: "over by 12 minutes" is 720. */
    seconds: secondsSchema.nullable(),
    /** Which Dealbreaker, for the code `dealbreaker`. */
    dealbreaker: dealbreakerSchema.nullable(),
  })
  .readonly();
export type RouteViolation = z.infer<typeof routeViolationSchema>;

// ── Error codes of the planning API ─────────────────────────────────────────

/**
 * The stable codes the planning endpoints answer with in the error envelope
 * (ADR-0025, point 5). "Nothing fits" is not among them: it is an answer.
 *
 * Kept here, beside what they describe, and not in a general list of codes.
 */
export const planningErrorCodes = [
  'planning.invalid-request',
  'planning.travel-mode-not-offered',
  'planning.city-not-published',
  'planning.outside-any-city',
  'planning.unknown-place',
] as const;
export const planningErrorCodeSchema = z.enum(planningErrorCodes);
export type PlanningErrorCode = z.infer<typeof planningErrorCodeSchema>;

/** The error envelope, narrowed to the codes of the planning endpoints. */
export const planningErrorEnvelopeSchema = z.strictObject({
  error: z.strictObject({ code: planningErrorCodeSchema, message: z.string() }),
});
export type PlanningErrorEnvelope = z.infer<typeof planningErrorEnvelopeSchema>;
