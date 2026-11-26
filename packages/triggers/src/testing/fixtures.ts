import type { TriggerPlace } from '../advance.ts';
import { planPlace, syntheticTrack, type TrackSegment } from '../synthetic-track.ts';
import type { RecordedTrack } from '../track.ts';

/**
 * Named fixtures of the trigger rules: a few Places on a flat plan and a track
 * past them. Every track is synthetic — drawn by `syntheticTrack`, belonging
 * to no city and to no person — and says so in its header.
 *
 * The plan: a street running east from the origin. A walk at 1.4 m/s with a
 * fix every second moves 1.4 m per fix.
 */
export interface TriggerFixture {
  readonly places: readonly TriggerPlace[];
  readonly track: RecordedTrack;
}

const at = (east: number, north = 0) => ({ east, north });
const walkTo = (east: number, north = 0): TrackSegment => ({ kind: 'walk', to: at(east, north) });

const fixture = (
  description: string,
  places: readonly TriggerPlace[],
  segments: readonly TrackSegment[],
  options: { accuracyMeters?: number } = {},
): TriggerFixture => ({
  places,
  track: syntheticTrack({ description, ...options }, segments),
});

/** One Place a hundred metres down the street. */
const alone = [planPlace('place-a', at(100))];

export const fixtures = {
  // ── T2: the radius adapts to the accuracy ────────────────────────────────
  walkUpAtGoodAccuracy: fixture(
    'Walks up to a Place with accuracy 8 m: the radius is the smallest, 25 m.',
    alone,
    [walkTo(100), { kind: 'stand', seconds: 5 }],
  ),
  walkUpAtFairAccuracy: fixture(
    'Walks up to a Place with accuracy 20 m: the radius is 40 m.',
    alone,
    [walkTo(100), { kind: 'stand', seconds: 5 }],
    { accuracyMeters: 20 },
  ),
  walkUpAtPoorAccuracy: fixture(
    'Walks up to a Place with accuracy 45 m: the radius stops at the largest, 60 m.',
    alone,
    [walkTo(100), { kind: 'stand', seconds: 5 }],
    { accuracyMeters: 45 },
  ),
  walkUpToAnOverriddenRadius: fixture(
    'Walks up to a Place whose radius a Curator set to 15 m, with accuracy 20 m.',
    [planPlace('place-a', at(100), { radiusOverrideMeters: 15 })],
    [walkTo(100), { kind: 'stand', seconds: 5 }],
    { accuracyMeters: 20 },
  ),
  passAtFortyMetres: fixture(
    'Walks past a Place 40 m to the side with accuracy 8 m: outside the radius of 25 m.',
    alone,
    [walkTo(0, 40), walkTo(200, 40)],
  ),

  // ── T3: arrival needs confirmation ───────────────────────────────────────
  oneFixThrownInside: fixture(
    'Walks past 80 m to the side; one fix jumps onto the Place and the next is back.',
    alone,
    [walkTo(0, 80), walkTo(90, 80), { kind: 'jump', east: 10, north: -80 }, walkTo(200, 80)],
  ),
  twoFixesInside: fixture(
    'Crosses the edge of the radius: the second fix inside confirms the arrival.',
    alone,
    [walkTo(80)],
  ),
  presenceAcrossPoorFixes: fixture(
    'One good fix inside, then six seconds of poor accuracy, then one good fix: presence confirms.',
    alone,
    [
      walkTo(74),
      walkTo(76),
      { kind: 'accuracy', meters: 70 },
      { kind: 'stand', seconds: 6 },
      { kind: 'accuracy', meters: 8 },
      { kind: 'stand', seconds: 1 },
    ],
  ),
  standingWithUncertainPosition: fixture(
    'Stands at a Place with accuracy 70 m, worse than the limit of 50 m.',
    alone,
    [walkTo(100), { kind: 'stand', seconds: 20 }],
    { accuracyMeters: 70 },
  ),
  uncertainAndFarAway: fixture(
    'Stands 150 m from a Place with accuracy 70 m.',
    alone,
    [walkTo(-50), { kind: 'stand', seconds: 20 }],
    { accuracyMeters: 70 },
  ),

  // ── T4: leaving, and one automatic start per Place ───────────────────────
  strollWithinLeavingDistance: fixture(
    'Arrives, strolls 32 m away — inside 1.5 × 25 m — and comes back.',
    alone,
    [walkTo(100), walkTo(132), walkTo(100), { kind: 'stand', seconds: 5 }],
  ),
  leaveAndComeBack: fixture(
    'Arrives, walks 60 m away — beyond 1.5 × 25 m — and comes back.',
    alone,
    [walkTo(100), walkTo(160), walkTo(100), { kind: 'stand', seconds: 5 }],
  ),
  poorFixThrownFarWhilePresent: fixture(
    'Arrives and stands; three fixes of accuracy 120 m are thrown 200 m away, then good ones return.',
    alone,
    [
      walkTo(100),
      { kind: 'accuracy', meters: 120 },
      { kind: 'jump', east: 200, north: 0 },
      { kind: 'stand', seconds: 1 },
      { kind: 'jump', east: 200, north: 0 },
      { kind: 'stand', seconds: 1 },
      { kind: 'jump', east: 200, north: 0 },
      { kind: 'stand', seconds: 1 },
      { kind: 'accuracy', meters: 8 },
      { kind: 'stand', seconds: 5 },
    ],
  ),

  // ── T7: scenes ───────────────────────────────────────────────────────────
  twoPlacesCloseTogether: fixture(
    'Two Places 40 m apart — closer than two radii — on the way.',
    [planPlace('place-a', at(100)), planPlace('place-b', at(140))],
    [walkTo(250)],
  ),
  twoPlacesApart: fixture(
    'Two Places 120 m apart on the way.',
    [planPlace('place-a', at(100)), planPlace('place-b', at(220))],
    [walkTo(330)],
  ),
  chainOfThreePlaces: fixture(
    'Three Places 40 m apart each: the first and the last are 80 m apart, one scene by the chain.',
    [planPlace('place-c', at(100)), planPlace('place-a', at(140)), planPlace('place-b', at(180))],
    [walkTo(300)],
  ),

  // ── T10: manual Places ───────────────────────────────────────────────────
  manualPlace: fixture(
    'Walks up to a Place marked manual.',
    [planPlace('place-a', at(100), { manual: true })],
    [walkTo(100), { kind: 'stand', seconds: 5 }],
  ),
  manualPlaceInAScene: fixture(
    'A scene of an ordinary Place and a manual one.',
    [planPlace('place-a', at(100)), planPlace('place-b', at(130), { manual: true })],
    [walkTo(100), { kind: 'stand', seconds: 5 }],
  ),
} satisfies Record<string, TriggerFixture>;

/** The item at `index`, or an error: a fixture is expected to have it. */
export function nth<T>(items: readonly T[], index: number): T {
  const item = items.at(index);
  if (item === undefined) throw new Error(`Nothing at ${index}.`);
  return item;
}
