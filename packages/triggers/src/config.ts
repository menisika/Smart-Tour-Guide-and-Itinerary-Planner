/** How a Party moves; the trigger numbers differ by it (`NFR-37`). */
export type TravelMode = 'foot' | 'bicycle' | 'car';

/**
 * The numbers of the trigger rules for one Travel Mode. They are data: the
 * starting values below are to be calibrated on real Outings.
 */
export interface TriggerRules {
  /** T2: the smallest trigger radius, used at good accuracy, in metres. */
  readonly minRadiusMeters: number;
  /** T2: the largest trigger radius, in metres. */
  readonly maxRadiusMeters: number;
  /** T2: the radius is the reported accuracy times this factor, within the bounds. */
  readonly accuracyFactor: number;
  /** T3: this many consecutive fixes inside the radius confirm an arrival. */
  readonly confirmFixes: number;
  /** T3: or this long a presence inside the radius, in milliseconds. */
  readonly confirmDwellMs: number;
  /** T3: with accuracy worse than this the app asks instead of starting, in metres. */
  readonly uncertaintyLimitMeters: number;
  /** T4: leaving is registered only beyond the radius times this factor. */
  readonly leaveFactor: number;
}

/** The trigger configuration: the rules, keyed by Travel Mode. */
export type TriggerConfig = Readonly<Record<TravelMode, TriggerRules>>;

const ON_FOOT: TriggerRules = {
  minRadiusMeters: 25,
  maxRadiusMeters: 60,
  accuracyFactor: 2,
  confirmFixes: 2,
  confirmDwellMs: 5000,
  uncertaintyLimitMeters: 50,
  leaveFactor: 1.5,
};

/**
 * The starting values of the specification (§4.7). Bicycle and car take the
 * values of walking until S4 sets their own: inside a Territory the Party
 * walks in every Travel Mode.
 */
export const defaultTriggerConfig: TriggerConfig = {
  foot: ON_FOOT,
  bicycle: ON_FOOT,
  car: ON_FOOT,
};
