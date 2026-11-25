/** One reading of the device's position. */
export interface PositionFix {
  /** Time of the reading, in milliseconds since the Unix epoch. */
  readonly timestampMs: number;
  readonly latitude: number;
  readonly longitude: number;
  /** Radius of uncertainty reported by the platform, in metres. */
  readonly accuracyMeters: number;
}

export interface TriggerState {
  readonly lastFixTimestampMs: number | null;
}

/** PLACEHOLDER: no rule exists yet, so no event can be emitted. */
export type TriggerEvent = never;

export interface TriggerStep {
  readonly state: TriggerState;
  readonly events: readonly TriggerEvent[];
}

export const initialTriggerState: TriggerState = { lastFixTimestampMs: null };

/** Applies one position fix to the state of the trigger rules. */
export function advance(_state: TriggerState, fix: PositionFix): TriggerStep {
  return {
    state: { lastFixTimestampMs: fix.timestampMs },
    events: [],
  };
}
