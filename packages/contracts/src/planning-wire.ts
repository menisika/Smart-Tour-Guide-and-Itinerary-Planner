/**
 * The wire form of a Route request and of its answer (ADR-0025, point 2).
 *
 * This is a shape of its own, apart from the planning problem: it says what a
 * person asked for, and the server turns it into the integer problem of
 * `planning.ts` using the city's data. It is the only planning shape that may
 * hold a coordinate — the start and the finish.
 */
import { z } from 'zod';

import { MAX_PARTY_MEMBERS } from './planning-rules.ts';
import {
  dealbreakerSchema,
  planningAnswerSchema,
  planningVersionsSchema,
  type PlanningErrorCode,
  travelModeSchema,
  type TravelMode,
} from './planning.ts';

/** The Travel Modes a request may ask for today (`RTE-1`: foot only until S4). */
export const offeredTravelModes: readonly TravelMode[] = ['foot'];

const identifierSchema = z.string().min(1).max(128);
const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);

/** Bounds of the cell a person's position is coarsened to (invariant 8 of §3.6). */
export const MIN_CELL_SIZE_METERS = 100;
export const MAX_CELL_SIZE_METERS = 150;

/**
 * A start or a finish.
 *
 * - `cell` — taken from the person's position and coarsened on the device: the
 *   centre of a cell of 100–150 m. Nothing finer may be sent.
 * - `point` — picked on the map by the person; it is Route data and is sent as
 *   picked.
 */
export const routeEndpointSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('cell'),
    centerLatitude: latitudeSchema,
    centerLongitude: longitudeSchema,
    sizeMeters: z.int().min(MIN_CELL_SIZE_METERS).max(MAX_CELL_SIZE_METERS),
  }),
  z.strictObject({
    kind: z.literal('point'),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
  }),
]);
export type RouteEndpoint = z.infer<typeof routeEndpointSchema>;

export const interestAttitudes = ['like', 'dislike'] as const;
export const paces = ['relaxed', 'normal', 'brisk'] as const;

/** A member's Profile as a request carries it (`PRF-2…4`). */
export const requestMemberSchema = z.strictObject({
  memberId: identifierSchema,
  /** Themes that are not neutral. */
  interests: z
    .array(z.strictObject({ themeId: identifierSchema, attitude: z.enum(interestAttitudes) }))
    .refine(
      (items) => new Set(items.map((item) => item.themeId)).size === items.length,
      'A theme is marked once per member.',
    ),
  dealbreakers: z.array(dealbreakerSchema),
  pace: z.enum(paces),
});
export type RequestMember = z.infer<typeof requestMemberSchema>;

const TRAVEL_MODE_NOT_OFFERED: PlanningErrorCode = 'planning.travel-mode-not-offered';

/**
 * A Route request (`RTE-1`).
 *
 * `bicycle` and `car` are part of the type (`NFR-37`) and are refused here
 * with the stable code `planning.travel-mode-not-offered` until S4; see
 * {@link routeRequestErrorCode}.
 */
export const routeRequestSchema = z.strictObject({
  cityId: identifierSchema,
  travelMode: travelModeSchema.refine((mode) => offeredTravelModes.includes(mode), {
    error: 'This Travel Mode is not offered yet.',
    params: { planningErrorCode: TRAVEL_MODE_NOT_OFFERED },
  }),
  members: z.array(requestMemberSchema).min(1).max(MAX_PARTY_MEMBERS),
  start: routeEndpointSchema,
  finish: routeEndpointSchema,
  /** `now`, or an instant in whole seconds since the Unix epoch. */
  when: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('now') }),
    z.strictObject({ kind: z.literal('at'), startAt: z.int().min(0) }),
  ]),
  durationSeconds: z.int().min(1),
  goInside: z.boolean(),
  /** The familiar ↔ unusual setting: 0 is familiar, 100 is unusual. */
  unusualPercent: z.int().min(0).max(100),
  excludeUnknownHours: z.boolean(),
  pinnedPlaceIds: z.array(identifierSchema),
  /** `auto` leaves the Break to the length of the Outing; `requested` asks for one. */
  break: z.enum(['auto', 'requested']),
  /** Which option to return: 0 for the first; "another option" is the next number. */
  optionNumber: z.int().min(0),
});
export type RouteRequest = z.infer<typeof routeRequestSchema>;

/**
 * The stable code to answer with when {@link routeRequestSchema} refuses a
 * value: the code an issue names, or `planning.invalid-request`.
 */
export function routeRequestErrorCode(error: z.ZodError): PlanningErrorCode {
  for (const issue of error.issues) {
    if (issue.code !== 'custom') continue;
    const named: unknown = issue.params?.['planningErrorCode'];
    if (named === TRAVEL_MODE_NOT_OFFERED) return TRAVEL_MODE_NOT_OFFERED;
  }
  return 'planning.invalid-request';
}

/**
 * The answer to a Route request: what the planner returned, and the versions
 * it is a function of, so that the same Route can be rebuilt (`RTE-8`).
 */
export const routeResponseSchema = z.strictObject({
  versions: planningVersionsSchema,
  answer: planningAnswerSchema,
});
export type RouteResponse = z.infer<typeof routeResponseSchema>;
