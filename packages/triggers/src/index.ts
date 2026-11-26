/**
 * Trigger rules of an Outing as one pure function (ADR-0005, point 3):
 *
 *     (state, position fix) → (new state, events)
 *
 * No clock, no I/O and no platform interface: the same function runs in the
 * app, in tests against recorded tracks, and in any later native port.
 * Positions are handled here and stay on the device.
 *
 * The rules that decide arrival are here: T1 (computed on the device, from the
 * stream of fixes), T2 (adaptive radius), T3 (confirmation, or a question when
 * the position is uncertain), T4 (leaving, one automatic start per Place), T7
 * (scenes) and T10 (manual Places). T5, T6, T8 and T9 are still to come.
 */
export {
  advance,
  advanceAll,
  confirmArrival,
  groupIntoScenes,
  startOuting,
  triggerRadiusMeters,
  type OutingSetup,
  type PositionFix,
  type SceneProgress,
  type TriggerEvent,
  type TriggerPlace,
  type TriggerScene,
  type TriggerState,
  type TriggerStep,
} from './advance.ts';
export {
  defaultTriggerConfig,
  type TravelMode,
  type TriggerConfig,
  type TriggerRules,
} from './config.ts';
export { distanceMeters, offsetMeters, type Point } from './geometry.ts';
export {
  planPlace,
  SYNTHETIC_ORIGIN,
  syntheticTrack,
  type PlanPoint,
  type SyntheticTrackOptions,
  type TrackSegment,
} from './synthetic-track.ts';
export {
  parseRecordedTrack,
  TRACK_FORMAT,
  TRACK_VERSION,
  trackOrigins,
  type RecordedTrack,
  type TrackOrigin,
} from './track.ts';
