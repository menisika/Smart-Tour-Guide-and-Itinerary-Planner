import type { PositionFix, TriggerPlace } from './advance.ts';
import type { TravelMode } from './config.ts';
import { offsetMeters, type Point } from './geometry.ts';
import { TRACK_FORMAT, TRACK_VERSION, type RecordedTrack } from './track.ts';

/**
 * A point on a flat plan in metres, east and north of the plan's origin.
 * Synthetic tracks are drawn on such a plan and belong to no city.
 */
export interface PlanPoint {
  readonly east: number;
  readonly north: number;
}

/** One stretch of a synthetic track. */
export type TrackSegment =
  /** Walk in a straight line to a point of the plan. */
  | {
      readonly kind: 'walk';
      readonly to: PlanPoint;
      /** Metres per second. Default 1.4, a walking speed. */
      readonly speed?: number;
    }
  /** Stand still. */
  | { readonly kind: 'stand'; readonly seconds: number }
  /** The next fix is thrown this far off, once: a jump of the receiver. */
  | { readonly kind: 'jump'; readonly east: number; readonly north: number }
  /** No fixes for this long, while the walk goes on along the next segment. */
  | { readonly kind: 'gap'; readonly seconds: number }
  /** From here on fixes report this accuracy. */
  | { readonly kind: 'accuracy'; readonly meters: number };

export interface SyntheticTrackOptions {
  readonly description: string;
  readonly travelMode?: TravelMode;
  /** Where the origin of the plan lies. Any point; the default is in no city. */
  readonly origin?: Point;
  /** Where on the plan the track starts. Default the origin. */
  readonly start?: PlanPoint;
  /** Time of the first fix. */
  readonly startTimestampMs?: number;
  /** Time between fixes, in milliseconds. Default one second. */
  readonly intervalMs?: number;
  /** Accuracy the fixes report until a segment changes it, in metres. Default 8. */
  readonly accuracyMeters?: number;
  /**
   * Scatter of the positions, in metres: each fix is moved by up to this much
   * east and north. Default 0. The scatter is drawn from `seed`.
   */
  readonly noiseMeters?: number;
  readonly seed?: number;
}

/** The plan's default origin: open sea, far from any city. */
export const SYNTHETIC_ORIGIN: Point = { latitude: 10, longitude: -30 };

/** A small seeded generator (mulberry32), so that a track is the same on every run. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Draws a synthetic track from segments: walks, stops, jumps, gaps and changes
 * of accuracy. The same arguments give the same track.
 */
export function syntheticTrack(
  options: SyntheticTrackOptions,
  segments: readonly TrackSegment[],
): RecordedTrack {
  const origin = options.origin ?? SYNTHETIC_ORIGIN;
  const intervalMs = options.intervalMs ?? 1000;
  const noiseMeters = options.noiseMeters ?? 0;
  const random = seeded(options.seed ?? 1);

  const fixes: PositionFix[] = [];
  let position = options.start ?? { east: 0, north: 0 };
  let timestampMs = options.startTimestampMs ?? 1_795_000_000_000;
  let accuracyMeters = options.accuracyMeters ?? 8;
  let jump: PlanPoint | null = null;
  let silentUntilMs = timestampMs;

  const emit = (): void => {
    if (timestampMs >= silentUntilMs) {
      const thrown: PlanPoint = jump ?? { east: 0, north: 0 };
      jump = null;
      const point = offsetMeters(
        origin,
        position.east + thrown.east + (random() * 2 - 1) * noiseMeters,
        position.north + thrown.north + (random() * 2 - 1) * noiseMeters,
      );
      fixes.push({ timestampMs, ...point, accuracyMeters });
    }
    timestampMs += intervalMs;
  };

  emit();
  for (const segment of segments) {
    switch (segment.kind) {
      case 'accuracy':
        accuracyMeters = segment.meters;
        break;
      case 'jump':
        jump = { east: segment.east, north: segment.north };
        break;
      case 'gap':
        silentUntilMs = timestampMs + segment.seconds * 1000;
        break;
      case 'stand':
        for (let elapsed = 0; elapsed < segment.seconds * 1000; elapsed += intervalMs) emit();
        break;
      case 'walk': {
        const from = position;
        const east = segment.to.east - from.east;
        const north = segment.to.north - from.north;
        const stepMeters = ((segment.speed ?? 1.4) * intervalMs) / 1000;
        const steps = Math.max(1, Math.ceil(Math.hypot(east, north) / stepMeters));
        for (let step = 1; step <= steps; step += 1) {
          position = {
            east: from.east + (east * step) / steps,
            north: from.north + (north * step) / steps,
          };
          emit();
        }
        break;
      }
    }
  }

  return {
    format: TRACK_FORMAT,
    version: TRACK_VERSION,
    origin: 'synthetic',
    description: options.description,
    travelMode: options.travelMode ?? 'foot',
    fixes,
  };
}

/** A Place of a synthetic plan, for the trigger rules. */
export function planPlace(
  placeId: string,
  at: PlanPoint,
  options: { radiusOverrideMeters?: number; manual?: boolean; origin?: Point } = {},
): TriggerPlace {
  return {
    placeId,
    ...offsetMeters(options.origin ?? SYNTHETIC_ORIGIN, at.east, at.north),
    radiusOverrideMeters: options.radiusOverrideMeters ?? null,
    manual: options.manual ?? false,
  };
}
