import fc from 'fast-check';

import {
  type Dealbreaker,
  dealbreakers,
  MAX_PARTY_MEMBERS,
  SCORE_SCALE,
} from '../planning-rules.ts';
import type { RouteEndpoint, RouteRequest, RouteResponse } from '../planning-wire.ts';
import {
  type BreakCandidate,
  type CandidateFlags,
  type Hours,
  type PartyMember,
  type PlaceCandidate,
  placeExperiences,
  placeStatuses,
  type PlannedRoute,
  type PlanningAnswer,
  type PlanningCandidate,
  type PlanningProblem,
  type PlanningVersions,
  type Relaxation,
  routeCharacters,
  routeOrigins,
  type RouteStop,
  routeViolationCodes,
  type RouteViolation,
  stopWarnings,
  travelModes,
} from '../planning.ts';

/**
 * Themes and kinds are data of the product; the generator uses names that
 * mean nothing, so that no test leans on a real list.
 */
const THEME_IDS = ['theme-a', 'theme-b', 'theme-c', 'theme-d', 'theme-e', 'theme-f'] as const;
const KIND_IDS = ['kind-a', 'kind-b', 'kind-c', 'kind-d'] as const;

const HOUR = 3600;

/**
 * Identifiers whose order as strings differs from their order as numbers
 * (`place-10` sorts before `place-9`), which is what an explicit tie-break
 * has to get right.
 */
const identifier = (prefix: string): fc.Arbitrary<string> =>
  fc.integer({ min: 0, max: 9999 }).map((suffix) => `${prefix}-${suffix}`);

const instant = fc.integer({ min: 1_000_000, max: 2_000_000_000 });

function themeValues(value: fc.Arbitrary<number>) {
  return fc.uniqueArray(fc.record({ themeId: fc.constantFrom(...THEME_IDS), value }), {
    selector: (item) => item.themeId,
    maxLength: THEME_IDS.length,
  });
}

export const partyMemberArbitrary: fc.Arbitrary<PartyMember> = fc.record({
  memberId: identifier('member'),
  themeWeights: themeValues(fc.integer({ min: -SCORE_SCALE, max: SCORE_SCALE })),
  dealbreakers: fc.oneof(
    { weight: 2, arbitrary: fc.constant<Dealbreaker[]>([]) },
    { weight: 1, arbitrary: fc.uniqueArray(fc.constantFrom(...dealbreakers), { maxLength: 2 }) },
  ),
  pacePercent: fc.constantFrom(80, 100, 125),
});

/** True once in six: most Places break no Dealbreaker. */
const seldom = fc.oneof(
  { weight: 5, arbitrary: fc.constant(false) },
  { weight: 1, arbitrary: fc.constant(true) },
);

const flagsArbitrary: fc.Arbitrary<CandidateFlags> = fc.record({
  alcohol: seldom,
  inside: seldom,
  stairs: seldom,
  paidEntry: seldom,
  religious: seldom,
  cemeteryOrMemorial: seldom,
});

/** Hours around the given start: before it, across it, after it, or unknown. */
function hoursAround(startAt: number): fc.Arbitrary<Hours> {
  const interval = fc
    .record({
      offset: fc.integer({ min: -2 * HOUR, max: 6 * HOUR }),
      length: fc.integer({ min: 600, max: 10 * HOUR }),
    })
    .map(({ offset, length }) => {
      const opensAt = Math.max(0, startAt + offset);
      return { opensAt, closesAt: opensAt + length };
    });

  return fc.oneof(
    { weight: 3, arbitrary: fc.constant<Hours>({ confidence: 'unknown' }) },
    {
      weight: 2,
      arbitrary: fc
        .array(interval, { maxLength: 3 })
        .map((intervals): Hours => ({ confidence: 'known', intervals })),
    },
  );
}

function placeCandidate(startAt: number): fc.Arbitrary<PlaceCandidate> {
  return (
    fc
      .record({
        type: fc.constant('place' as const),
        placeId: identifier('place'),
        kind: fc.constantFrom(...KIND_IDS),
        experience: fc.constantFrom(...placeExperiences),
        // Mostly open: a problem where nothing can be visited tests little.
        status: fc.oneof(
          { weight: 6, arbitrary: fc.constant('open' as const) },
          { weight: 1, arbitrary: fc.constantFrom(...placeStatuses) },
        ),
        visitSeconds: fc.integer({ min: 0, max: 2 * HOUR }),
        hours: hoursAround(startAt),
        flags: flagsArbitrary,
        themeScores: themeValues(fc.integer({ min: 0, max: SCORE_SCALE })),
        popularity: fc.integer({ min: 0, max: 100_000 }),
        manual: fc.boolean(),
      })
      // One attribute, stated twice: the flag follows the experience.
      .map((place) => ({
        ...place,
        flags: { ...place.flags, inside: place.experience === 'inside' },
      }))
  );
}

function breakCandidate(startAt: number): fc.Arbitrary<BreakCandidate> {
  return fc.record({
    type: fc.constant('break' as const),
    breakId: identifier('break'),
    visitSeconds: fc.integer({ min: 300, max: HOUR }),
    hours: hoursAround(startAt),
  });
}

const versionsArbitrary: fc.Arbitrary<PlanningVersions> = fc.record({
  cityVersion: fc.record({ cityId: identifier('city'), versionId: identifier('version') }),
  scoreVersions: fc.array(identifier('scores'), { maxLength: 2 }),
  plannerConfigId: identifier('config'),
});

/**
 * Travel times of nodes laid out on a street grid: the time between two nodes
 * is the number of blocks between them times the seconds one block takes. The
 * times are therefore symmetric and keep the triangle inequality, as walking
 * times do. A node marked unreachable has no path to or from any other.
 */
function travelSeconds(
  nodes: readonly { readonly x: number; readonly y: number; readonly reachable: boolean }[],
  secondsPerBlock: number,
): (number | null)[][] {
  return nodes.map((from, fromIndex) =>
    nodes.map((to, toIndex) => {
      if (fromIndex === toIndex) return 0;
      if (!from.reachable || !to.reachable) return null;
      return (Math.abs(from.x - to.x) + Math.abs(from.y - to.y)) * secondsPerBlock;
    }),
  );
}

export interface PlanningProblemOptions {
  /** Most candidates in a problem. Default 12. */
  readonly maxCandidates?: number;
  /** Most members in the Party. Default 3; 1 gives the solo problems of S1. */
  readonly maxMembers?: number;
}

/**
 * Planning problems that the schema accepts: consistent matrix, unique
 * identifiers, pinned Places among the candidates. Some are infeasible — a
 * budget of zero, an unreachable finish — because the planner must answer
 * those too.
 */
export function planningProblemArbitrary(
  options: PlanningProblemOptions = {},
): fc.Arbitrary<PlanningProblem> {
  const maxCandidates = options.maxCandidates ?? 12;
  const maxMembers = Math.min(options.maxMembers ?? 3, MAX_PARTY_MEMBERS);

  return instant.chain((startAt) => {
    const candidates: fc.Arbitrary<PlanningCandidate[]> = fc.uniqueArray(
      fc.oneof(
        { weight: 6, arbitrary: placeCandidate(startAt) },
        { weight: 1, arbitrary: breakCandidate(startAt) },
      ),
      {
        maxLength: maxCandidates,
        selector: (candidate) =>
          candidate.type === 'place' ? candidate.placeId : candidate.breakId,
      },
    );

    return candidates.chain((chosen) => {
      const placeIds = chosen.flatMap((candidate) =>
        candidate.type === 'place' ? [candidate.placeId] : [],
      );
      const node = fc.record({
        x: fc.integer({ min: 0, max: 20 }),
        y: fc.integer({ min: 0, max: 20 }),
        reachable: fc.oneof(
          { weight: 19, arbitrary: fc.constant(true) },
          { weight: 1, arbitrary: fc.constant(false) },
        ),
      });

      return fc.record({
        travelMode: fc.constant('foot' as const),
        party: fc.record({
          members: fc.uniqueArray(partyMemberArbitrary, {
            minLength: 1,
            maxLength: maxMembers,
            selector: (member) => member.memberId,
          }),
        }),
        startAt: fc.constant(startAt),
        timeBudgetSeconds: fc.integer({ min: 0, max: 8 * HOUR }),
        bufferSeconds: fc.integer({ min: 0, max: 1800 }),
        allowInside: fc.boolean(),
        unusualPercent: fc.integer({ min: 0, max: 100 }),
        excludeUnknownHours: fc.boolean(),
        pinnedPlaceIds:
          placeIds.length === 0
            ? fc.constant<string[]>([])
            : fc.oneof(
                { weight: 4, arbitrary: fc.constant<string[]>([]) },
                {
                  weight: 1,
                  arbitrary: fc.subarray(placeIds, { maxLength: Math.min(2, placeIds.length) }),
                },
              ),
        break: fc.record({ required: seldom }),
        optionNumber: fc.integer({ min: 0, max: 5 }),
        versions: versionsArbitrary,
        candidates: fc.constant(chosen),
        travel: fc.record({
          avoidsStairs: fc.boolean(),
          seconds: fc
            .tuple(
              fc.array(node, { minLength: chosen.length + 2, maxLength: chosen.length + 2 }),
              fc.integer({ min: 30, max: 240 }),
            )
            .map(([nodes, secondsPerBlock]) => travelSeconds(nodes, secondsPerBlock)),
        }),
      });
    });
  });
}

const stopTimes = fc
  .tuple(instant, fc.integer({ min: 0, max: HOUR }), fc.integer({ min: 0, max: 2 * HOUR }))
  .map(([arriveAt, wait, visit]) => ({
    arriveAt,
    visitStartAt: arriveAt + wait,
    departAt: arriveAt + wait + visit,
  }));

const routeStopArbitrary: fc.Arbitrary<RouteStop> = fc.oneof(
  {
    weight: 5,
    arbitrary: fc
      .tuple(
        identifier('place'),
        stopTimes,
        fc.uniqueArray(fc.constantFrom(...stopWarnings)),
        fc.array(
          fc.record({
            themeId: fc.constantFrom(...THEME_IDS),
            contribution: fc.integer({
              min: -SCORE_SCALE * SCORE_SCALE,
              max: SCORE_SCALE * SCORE_SCALE,
            }),
          }),
          { maxLength: 3 },
        ),
      )
      .map(([placeId, times, warnings, why]): RouteStop => ({
        type: 'place',
        placeId,
        ...times,
        warnings,
        why,
      })),
  },
  {
    weight: 1,
    arbitrary: fc
      .tuple(identifier('break'), stopTimes)
      .map(([breakId, times]): RouteStop => ({ type: 'break', breakId, ...times })),
  },
);

/** Routes that the schema accepts. They are shapes, not feasible schedules. */
export const plannedRouteArbitrary: fc.Arbitrary<PlannedRoute> = fc
  .array(routeStopArbitrary, { maxLength: 8 })
  .chain((stops) =>
    fc.record({
      origin: fc.constantFrom(...routeOrigins),
      travelMode: fc.constantFrom(...travelModes),
      optionNumber: fc.integer({ min: 0, max: 5 }),
      character: fc.constantFrom(...routeCharacters),
      startAt: instant,
      stops: fc.constant(stops),
      legs: fc.array(fc.record({ travelSeconds: fc.integer({ min: 0, max: HOUR }) }), {
        minLength: stops.length + 1,
        maxLength: stops.length + 1,
      }),
      finishAt: instant,
    }),
  );

const relaxationArbitrary: fc.Arbitrary<Relaxation> = fc.oneof(
  fc.record({
    relax: fc.constant('time-budget' as const),
    addSeconds: fc.integer({ min: 1, max: 4 * HOUR }),
  }),
  fc.record({
    relax: fc.constant('start-time' as const),
    shiftSeconds: fc.integer({ min: -12 * HOUR, max: 12 * HOUR }),
  }),
  fc.constant<Relaxation>({ relax: 'allow-inside' }),
  fc.constant<Relaxation>({ relax: 'include-unknown-hours' }),
  fc.record({
    relax: fc.constant('dealbreaker' as const),
    dealbreaker: fc.constantFrom(...dealbreakers),
  }),
  fc.record({ relax: fc.constant('pinned-place' as const), placeId: identifier('place') }),
  fc.constant<Relaxation>({ relax: 'break' }),
);

/** Answers that the schema accepts: a Route, or "nothing fits" with ways out. */
export const planningAnswerArbitrary: fc.Arbitrary<PlanningAnswer> = fc.oneof(
  {
    weight: 3,
    arbitrary: plannedRouteArbitrary.map((route): PlanningAnswer => ({ outcome: 'route', route })),
  },
  {
    weight: 1,
    arbitrary: fc
      .array(relaxationArbitrary, { maxLength: 4 })
      .map((relaxations): PlanningAnswer => ({ outcome: 'infeasible', relaxations })),
  },
);

/** Violations that the schema accepts. */
export const routeViolationArbitrary: fc.Arbitrary<RouteViolation> = fc.record({
  code: fc.constantFrom(...routeViolationCodes),
  stopIndex: fc.option(fc.integer({ min: 0, max: 20 }), { nil: null }),
  candidateId: fc.option(identifier('place'), { nil: null }),
  seconds: fc.option(fc.integer({ min: 0, max: 8 * HOUR }), { nil: null }),
  dealbreaker: fc.option(fc.constantFrom(...dealbreakers), { nil: null }),
});

/**
 * A coordinate with at most five decimal places, so that it survives JSON
 * unchanged on every engine. Whole numbers of hundred-thousandths, divided.
 */
const coordinate = (limit: number): fc.Arbitrary<number> =>
  fc.integer({ min: -limit * 100_000, max: limit * 100_000 }).map((value) => value / 100_000);

const endpointArbitrary: fc.Arbitrary<RouteEndpoint> = fc.oneof(
  fc.record({
    kind: fc.constant('cell' as const),
    centerLatitude: coordinate(90),
    centerLongitude: coordinate(180),
    sizeMeters: fc.integer({ min: 100, max: 150 }),
  }),
  fc.record({
    kind: fc.constant('point' as const),
    latitude: coordinate(90),
    longitude: coordinate(180),
  }),
);

/** Route requests in their wire form, on foot: the mode offered today. */
export const routeRequestArbitrary: fc.Arbitrary<RouteRequest> = fc.record({
  cityId: identifier('city'),
  travelMode: fc.constant('foot' as const),
  members: fc.uniqueArray(
    fc.record({
      memberId: identifier('member'),
      interests: fc.uniqueArray(
        fc.record({
          themeId: fc.constantFrom(...THEME_IDS),
          attitude: fc.constantFrom('like' as const, 'dislike' as const),
        }),
        { selector: (item) => item.themeId, maxLength: THEME_IDS.length },
      ),
      dealbreakers: fc.uniqueArray(fc.constantFrom(...dealbreakers), { maxLength: 2 }),
      pace: fc.constantFrom('relaxed' as const, 'normal' as const, 'brisk' as const),
    }),
    { minLength: 1, maxLength: 3, selector: (member) => member.memberId },
  ),
  start: endpointArbitrary,
  finish: endpointArbitrary,
  when: fc.oneof(
    fc.constant({ kind: 'now' as const }),
    fc.record({ kind: fc.constant('at' as const), startAt: instant }),
  ),
  durationSeconds: fc.integer({ min: 1, max: 12 * HOUR }),
  goInside: fc.boolean(),
  unusualPercent: fc.integer({ min: 0, max: 100 }),
  excludeUnknownHours: fc.boolean(),
  pinnedPlaceIds: fc.uniqueArray(identifier('place'), { maxLength: 3 }),
  break: fc.constantFrom('auto' as const, 'requested' as const),
  optionNumber: fc.integer({ min: 0, max: 5 }),
});

/** Answers to a Route request in their wire form. */
export const routeResponseArbitrary: fc.Arbitrary<RouteResponse> = fc.record({
  versions: versionsArbitrary,
  answer: planningAnswerArbitrary,
});

/**
 * The same problems for the same seed, on every machine: what a committed
 * corpus is generated from.
 */
export function samplePlanningProblems(
  seed: number,
  count: number,
  options: PlanningProblemOptions = {},
): PlanningProblem[] {
  return fc.sample(planningProblemArbitrary(options), { seed, numRuns: count });
}
