import fc from 'fast-check';

import type { TriggerPlace } from '../advance.ts';
import {
  planPlace,
  type PlanPoint,
  syntheticTrack,
  type TrackSegment,
} from '../synthetic-track.ts';
import type { RecordedTrack } from '../track.ts';

/** A point of a plan 400 m across, on a grid of whole metres. */
const planPoint: fc.Arbitrary<PlanPoint> = fc.record({
  east: fc.integer({ min: -200, max: 200 }),
  north: fc.integer({ min: -200, max: 200 }),
});

interface PlacedPlace {
  readonly at: PlanPoint;
  readonly place: TriggerPlace;
}

/** Places scattered over the plan: some alone, some close enough to form scenes. */
const placedPlaces: fc.Arbitrary<PlacedPlace[]> = fc
  .uniqueArray(
    fc.record({
      at: planPoint,
      radiusOverrideMeters: fc.option(fc.integer({ min: 10, max: 80 }), { nil: undefined }),
      manual: fc.boolean(),
    }),
    { maxLength: 8, selector: (place) => `${place.at.east}:${place.at.north}` },
  )
  .map((places) =>
    places.map(({ at, manual, radiusOverrideMeters }, index) => ({
      at,
      place: planPlace(`place-${index}`, at, {
        manual,
        ...(radiusOverrideMeters === undefined ? {} : { radiusOverrideMeters }),
      }),
    })),
  );

const segment: fc.Arbitrary<TrackSegment> = fc.oneof(
  {
    weight: 6,
    arbitrary: fc.record({
      kind: fc.constant('walk' as const),
      to: planPoint,
      speed: fc.constantFrom(0.7, 1.4, 2.5),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant('stand' as const),
      seconds: fc.integer({ min: 1, max: 30 }),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant('jump' as const),
      east: fc.integer({ min: -150, max: 150 }),
      north: fc.integer({ min: -150, max: 150 }),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant('gap' as const),
      seconds: fc.integer({ min: 2, max: 60 }),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant('accuracy' as const),
      meters: fc.constantFrom(4, 8, 15, 30, 49, 50, 51, 70, 120),
    }),
  },
);

/**
 * Synthetic tracks with noise, jumps and gaps over a set of Places. Half of
 * the walks head for a Place, so that arrivals happen.
 */
export const outingArbitrary: fc.Arbitrary<{
  readonly places: TriggerPlace[];
  readonly track: RecordedTrack;
}> = fc
  .record({
    placed: placedPlaces,
    segments: fc.array(segment, { minLength: 1, maxLength: 12 }),
    visits: fc.array(fc.nat(), { maxLength: 6 }),
    noiseMeters: fc.constantFrom(0, 3, 10),
    seed: fc.integer({ min: 1, max: 1_000_000 }),
    start: planPoint,
  })
  .map(({ placed, segments, visits, noiseMeters, seed, start }) => {
    // Weave walks to the Places themselves between the free segments.
    const woven: TrackSegment[] = [];
    segments.forEach((free, index) => {
      woven.push(free);
      const visit = visits[index];
      const target = visit === undefined ? undefined : placed[visit % placed.length];
      if (target === undefined) return;
      woven.push({ kind: 'walk', to: target.at }, { kind: 'stand', seconds: 8 });
    });

    return {
      places: placed.map((item) => item.place),
      track: syntheticTrack({ description: 'A generated track.', noiseMeters, seed, start }, woven),
    };
  });
