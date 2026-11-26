import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import { candidateNode, partyPacePercent, secondsAtPace } from './planning-rules.ts';
import {
  offeredTravelModes,
  routeRequestErrorCode,
  routeRequestSchema,
  routeResponseSchema,
} from './planning-wire.ts';
import {
  planningAnswerSchema,
  planningErrorEnvelopeSchema,
  planningProblemSchema,
  routeViolationCodes,
  routeViolationSchema,
} from './planning.ts';
import {
  planningAnswerArbitrary,
  planningProblemArbitrary,
  routeRequestArbitrary,
  routeResponseArbitrary,
  routeViolationArbitrary,
  samplePlanningProblems,
} from './testing/index.ts';

type Path = readonly (string | number)[];

/** Every place in a value where a number stands. */
function numberPaths(value: unknown, path: Path = []): Path[] {
  if (typeof value === 'number') return [path];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => numberPaths(item, [...path, index]));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => numberPaths(item, [...path, key]));
  }
  return [];
}

/** A copy of `value` with the number at `path` moved off the integers by a half. */
function withFraction(value: unknown, path: Path): unknown {
  const [head, ...rest] = path;
  if (head === undefined) return (value as number) + 0.5;
  if (Array.isArray(value)) {
    return value.map((item: unknown, index) => (index === head ? withFraction(item, rest) : item));
  }
  const record = value as Record<string, unknown>;
  return { ...record, [head]: withFraction(record[head], rest) };
}

/** The names of the fields, without positions in lists: `stops.arriveAt`. */
const fieldName = (path: Path): string => path.filter((part) => typeof part === 'string').join('.');

/**
 * Asserts that the schema refuses a fraction in every number of every
 * generated value, except in the fields named as allowed to hold one. Returns
 * the names of the fields it tried, so that a test can show none was missed.
 */
function expectIntegersOnly<T>(
  schema: z.ZodType,
  arbitrary: fc.Arbitrary<T>,
  fractionalFields: readonly string[] = [],
): Set<string> {
  const tried = new Set<string>();

  fc.assert(
    fc.property(arbitrary, (value) => {
      for (const path of numberPaths(value)) {
        const name = fieldName(path);
        if (fractionalFields.includes(name)) continue;
        tried.add(name);

        const refused = !schema.safeParse(withFraction(value, path)).success;
        if (!refused) throw new Error(`A fraction was accepted in ${path.join('.')}`);
      }
    }),
    { numRuns: 200 },
  );

  return tried;
}

function expectRoundTrip<T>(schema: z.ZodType, arbitrary: fc.Arbitrary<T>): void {
  fc.assert(
    fc.property(arbitrary, (value) => {
      expect(schema.parse(value)).toEqual(value);
      // The wire is JSON: nothing may be lost on the way through it either.
      expect(schema.parse(JSON.parse(JSON.stringify(value)))).toEqual(value);
    }),
    { numRuns: 500 },
  );
}

describe('planningProblemSchema', () => {
  it('round-trips every generated problem unchanged', () => {
    expectRoundTrip(planningProblemSchema, planningProblemArbitrary());
  });

  it('rejects a fractional number in each integer field', () => {
    const tried = expectIntegersOnly(planningProblemSchema, planningProblemArbitrary());

    expect([...tried].sort()).toEqual([
      'bufferSeconds',
      'candidates.hours.intervals.closesAt',
      'candidates.hours.intervals.opensAt',
      'candidates.popularity',
      'candidates.themeScores.value',
      'candidates.visitSeconds',
      'optionNumber',
      'party.members.pacePercent',
      'party.members.themeWeights.value',
      'startAt',
      'timeBudgetSeconds',
      'travel.seconds',
      'unusualPercent',
    ]);
  });

  it('has no field that can hold a coordinate: unknown fields are refused at every level', () => {
    const [problem] = samplePlanningProblems(7, 1, { maxCandidates: 0 });
    const extra = { latitude: 10, longitude: 20 };

    expect(planningProblemSchema.safeParse(problem).success).toBe(true);
    expect(planningProblemSchema.safeParse({ ...problem, ...extra }).success).toBe(false);
    expect(planningProblemSchema.safeParse({ ...problem, start: extra }).success).toBe(false);
    expect(
      planningProblemSchema.safeParse({ ...problem, travel: { ...problem?.travel, ...extra } })
        .success,
    ).toBe(false);
  });

  it('rejects a matrix that does not cover the start, the finish and every candidate', () => {
    const [problem] = samplePlanningProblems(7, 1, { maxCandidates: 0 });

    expect(
      planningProblemSchema.safeParse({
        ...problem,
        travel: { avoidsStairs: false, seconds: [[0]] },
      }).success,
    ).toBe(false);
  });

  it('rejects a pinned Place that is not among the candidates', () => {
    const [problem] = samplePlanningProblems(7, 1, { maxCandidates: 0 });

    expect(
      planningProblemSchema.safeParse({ ...problem, pinnedPlaceIds: ['place-absent'] }).success,
    ).toBe(false);
  });

  it('accepts all three Travel Modes: the problem is ready for S4 (NFR-37)', () => {
    const [problem] = samplePlanningProblems(7, 1, { maxCandidates: 0 });

    for (const travelMode of ['foot', 'bicycle', 'car']) {
      expect(planningProblemSchema.safeParse({ ...problem, travelMode }).success).toBe(true);
    }
  });
});

describe('planningAnswerSchema', () => {
  it('round-trips every generated answer unchanged', () => {
    expectRoundTrip(planningAnswerSchema, planningAnswerArbitrary);
  });

  it('rejects a fractional number in each integer field', () => {
    const tried = expectIntegersOnly(planningAnswerSchema, planningAnswerArbitrary);

    expect([...tried].sort()).toEqual([
      'relaxations.addSeconds',
      'relaxations.shiftSeconds',
      'route.finishAt',
      'route.legs.travelSeconds',
      'route.optionNumber',
      'route.startAt',
      'route.stops.arriveAt',
      'route.stops.departAt',
      'route.stops.visitStartAt',
      'route.stops.why.contribution',
    ]);
  });

  it('rejects a Route whose legs do not match its stops', () => {
    const answer = {
      outcome: 'route',
      route: {
        origin: 'planner',
        travelMode: 'foot',
        optionNumber: 0,
        character: 'classic',
        startAt: 1000,
        stops: [],
        legs: [{ travelSeconds: 60 }, { travelSeconds: 60 }],
        finishAt: 1120,
      },
    };

    expect(planningAnswerSchema.safeParse(answer).success).toBe(false);
  });
});

describe('routeViolationSchema', () => {
  it('round-trips every generated violation unchanged', () => {
    expectRoundTrip(routeViolationSchema, routeViolationArbitrary);
  });

  it('rejects a fractional number in each integer field', () => {
    const tried = expectIntegersOnly(routeViolationSchema, routeViolationArbitrary);

    expect([...tried].sort()).toEqual(['seconds', 'stopIndex']);
  });

  it('rejects a code outside the closed list', () => {
    const violation = {
      code: 'something-else',
      stopIndex: null,
      candidateId: null,
      seconds: null,
      dealbreaker: null,
    };

    expect(routeViolationSchema.safeParse(violation).success).toBe(false);
    expect(new Set(routeViolationCodes).size).toBe(routeViolationCodes.length);
  });
});

describe('routeRequestSchema (the wire request)', () => {
  it('round-trips every generated request unchanged', () => {
    expectRoundTrip(routeRequestSchema, routeRequestArbitrary);
  });

  it('rejects a fractional number in each integer field; only a start or a finish holds a coordinate', () => {
    const coordinates = [
      'start.centerLatitude',
      'start.centerLongitude',
      'start.latitude',
      'start.longitude',
      'finish.centerLatitude',
      'finish.centerLongitude',
      'finish.latitude',
      'finish.longitude',
    ];
    const tried = expectIntegersOnly(routeRequestSchema, routeRequestArbitrary, coordinates);

    expect([...tried].sort()).toEqual([
      'durationSeconds',
      'finish.sizeMeters',
      'optionNumber',
      'start.sizeMeters',
      'unusualPercent',
      'when.startAt',
    ]);
  });

  it.each(['bicycle', 'car'])('refuses the Travel Mode %s with the stable code', (travelMode) => {
    const [request] = fc.sample(routeRequestArbitrary, { seed: 3, numRuns: 1 });
    const result = routeRequestSchema.safeParse({ ...request, travelMode });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(routeRequestErrorCode(result.error)).toBe('planning.travel-mode-not-offered');
    }
  });

  it('answers any other refusal with the general code', () => {
    const [request] = fc.sample(routeRequestArbitrary, { seed: 3, numRuns: 1 });
    const result = routeRequestSchema.safeParse({ ...request, travelMode: 'boat' });

    expect(offeredTravelModes).toEqual(['foot']);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(routeRequestErrorCode(result.error)).toBe('planning.invalid-request');
    }
  });

  it("refuses a cell finer than a person's position may be sent as", () => {
    const [request] = fc.sample(routeRequestArbitrary, { seed: 3, numRuns: 1 });
    const start = { kind: 'cell', centerLatitude: 10, centerLongitude: 20, sizeMeters: 99 };

    expect(routeRequestSchema.safeParse({ ...request, start }).success).toBe(false);
    expect(
      routeRequestSchema.safeParse({ ...request, start: { ...start, sizeMeters: 100 } }).success,
    ).toBe(true);
  });
});

describe('routeResponseSchema (the wire answer)', () => {
  it('round-trips every generated answer unchanged', () => {
    expectRoundTrip(routeResponseSchema, routeResponseArbitrary);
  });

  it('rejects a fractional number in each integer field', () => {
    const tried = expectIntegersOnly(routeResponseSchema, routeResponseArbitrary);

    expect(tried.has('answer.route.stops.arriveAt')).toBe(true);
    expect(tried.has('answer.route.legs.travelSeconds')).toBe(true);
  });
});

describe('planningErrorEnvelopeSchema', () => {
  it('accepts a code of the planning endpoints and refuses any other', () => {
    const envelope = (code: string) => ({ error: { code, message: 'for developers' } });

    expect(
      planningErrorEnvelopeSchema.safeParse(envelope('planning.travel-mode-not-offered')).success,
    ).toBe(true);
    expect(planningErrorEnvelopeSchema.safeParse(envelope('planning.other')).success).toBe(false);
  });
});

describe('the rules both sides apply', () => {
  it('rounds pace up to a whole second, and leaves normal pace alone', () => {
    expect(secondsAtPace(100, 100)).toBe(100);
    expect(secondsAtPace(101, 125)).toBe(127);
    expect(secondsAtPace(101, 80)).toBe(81);
    expect(secondsAtPace(0, 125)).toBe(0);
  });

  it('gives a whole number of seconds, never fewer than the exact product', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 50, max: 200 }),
        (seconds, percent) => {
          const scaled = secondsAtPace(seconds, percent);

          expect(Number.isInteger(scaled)).toBe(true);
          expect(scaled * 100).toBeGreaterThanOrEqual(seconds * percent);
          expect((scaled - 1) * 100).toBeLessThan(seconds * percent);
        },
      ),
    );
  });

  it('moves a Party at the pace of its slowest member', () => {
    expect(partyPacePercent({ members: [{ pacePercent: 80 }, { pacePercent: 125 }] })).toBe(125);
  });

  it('numbers the nodes: start, finish, then the candidates', () => {
    expect(candidateNode(0)).toBe(2);
  });

  it('generates the same problems for the same seed', () => {
    expect(samplePlanningProblems(42, 5)).toEqual(samplePlanningProblems(42, 5));
  });
});
