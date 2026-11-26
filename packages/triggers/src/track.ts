import type { PositionFix } from './advance.ts';
import type { TravelMode } from './config.ts';

/**
 * Where a recorded track came from. There is no value for "a person using the
 * product": such a track is never recorded as a fixture (ADR-0027, point 3).
 */
export const trackOrigins = ['synthetic', 'test-walk'] as const;
export type TrackOrigin = (typeof trackOrigins)[number];

export const TRACK_FORMAT = 'promenade-track';
export const TRACK_VERSION = 1;

/**
 * A recorded track: what a location session delivered, fix by fix. The same
 * files test the trigger rules here and any later native port (ADR-0005,
 * point 3), and can be played back into the app in an emulator.
 */
export interface RecordedTrack {
  readonly format: typeof TRACK_FORMAT;
  readonly version: typeof TRACK_VERSION;
  /** Synthetic, or recorded on a walk made for testing. */
  readonly origin: TrackOrigin;
  /** What the track shows, in a sentence. */
  readonly description: string;
  readonly travelMode: TravelMode;
  /** The fixes, in the order they were delivered. */
  readonly fixes: readonly PositionFix[];
}

const TRAVEL_MODES: readonly string[] = ['foot', 'bicycle', 'car'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFix(value: unknown): value is PositionFix {
  if (!isRecord(value)) return false;
  const { timestampMs, latitude, longitude, accuracyMeters } = value;

  return (
    typeof timestampMs === 'number' &&
    Number.isFinite(timestampMs) &&
    typeof latitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    longitude >= -180 &&
    longitude <= 180 &&
    typeof accuracyMeters === 'number' &&
    accuracyMeters >= 0
  );
}

/**
 * Reads a recorded track from parsed JSON. Throws an error that names what is
 * wrong; a track without a known origin is refused.
 */
export function parseRecordedTrack(value: unknown): RecordedTrack {
  if (!isRecord(value)) throw new Error('A recorded track is an object.');
  if (value['format'] !== TRACK_FORMAT) throw new Error(`The format is not "${TRACK_FORMAT}".`);
  if (value['version'] !== TRACK_VERSION) {
    throw new Error(`Version ${String(value['version'])} of the track format is not known.`);
  }

  const { origin, description, travelMode, fixes } = value;
  if (typeof origin !== 'string' || !(trackOrigins as readonly string[]).includes(origin)) {
    throw new Error(`The origin of a track is one of: ${trackOrigins.join(', ')}.`);
  }
  if (typeof description !== 'string') throw new Error('A track has a description.');
  if (typeof travelMode !== 'string' || !TRAVEL_MODES.includes(travelMode)) {
    throw new Error('A track states its Travel Mode.');
  }
  if (!Array.isArray(fixes)) throw new Error('A track has a list of fixes.');

  fixes.forEach((fix, index) => {
    if (!isFix(fix)) throw new Error(`Fix ${index} is not a position fix.`);
  });

  return {
    format: TRACK_FORMAT,
    version: TRACK_VERSION,
    origin: origin as TrackOrigin,
    description,
    travelMode: travelMode as TravelMode,
    fixes: fixes as PositionFix[],
  };
}
