import type { TravelMode, TriggerConfig, TriggerRules } from './config.ts';
import { distanceMeters } from './geometry.ts';

/** One reading of the device's position. */
export interface PositionFix {
  /** Time of the reading, in milliseconds since the Unix epoch. */
  readonly timestampMs: number;
  readonly latitude: number;
  readonly longitude: number;
  /** Radius of uncertainty reported by the platform, in metres. */
  readonly accuracyMeters: number;
}

/** A Place of the Route, as far as the trigger rules are concerned. */
export interface TriggerPlace {
  readonly placeId: string;
  readonly latitude: number;
  readonly longitude: number;
  /** T2: a radius a Curator set for this Place; it wins over the adaptive one. */
  readonly radiusOverrideMeters: number | null;
  /** T10: the Place never starts its Story by itself. */
  readonly manual: boolean;
}

/**
 * T7: Places standing closer than two radii form a scene with one arrival.
 * A Place that stands alone is a scene of one.
 */
export interface TriggerScene {
  /** The identifier of the first Place of the scene in the order of the Route. */
  readonly sceneId: string;
  /** The Places of the scene, in the order of the Route. */
  readonly places: readonly TriggerPlace[];
}

/** Where the rules stand for one scene. */
export interface SceneProgress {
  /** True from a confirmed arrival until the Party has left (T4). */
  readonly present: boolean;
  /** Fixes in a row inside the radius, whatever their accuracy. */
  readonly nearFixes: number;
  /** Fixes in a row inside the radius with accuracy within the limit. */
  readonly sureFixes: number;
  /** Time of the first fix of the current run inside the radius. */
  readonly nearSinceMs: number | null;
  /** True once "are you at …?" was asked, until the Party has left. */
  readonly asked: boolean;
}

/**
 * Everything the rules remember between two fixes. It is plain data, so that
 * the app can store it and resume an Outing after a restart (`OUT-13`).
 */
export interface TriggerState {
  readonly rules: TriggerRules;
  readonly scenes: readonly TriggerScene[];
  /** One entry per scene, in the order of `scenes`. */
  readonly progress: readonly SceneProgress[];
  /** T4: Places whose automatic start was already emitted in this Outing. */
  readonly autoStarted: readonly string[];
  /** T10: manual Places the app was already told to prompt for. */
  readonly prompted: readonly string[];
  readonly lastFixTimestampMs: number | null;
}

export type TriggerEvent =
  /**
   * T3: the Party has arrived at a scene. `autoStart` lists the Places whose
   * Stories start now, in order — each Place appears there at most once per
   * Outing (T4). `prompt` lists the manual Places to offer by hand (T10).
   */
  | {
      readonly type: 'arrived';
      readonly sceneId: string;
      readonly atMs: number;
      readonly placeIds: readonly string[];
      readonly autoStart: readonly string[];
      readonly prompt: readonly string[];
    }
  /** T3, `OUT-4`: the position is too uncertain to start; ask "are you at …?". */
  | {
      readonly type: 'ask';
      readonly sceneId: string;
      readonly atMs: number;
      readonly placeIds: readonly string[];
    }
  /** T4: the Party has gone beyond the leaving distance of the scene. */
  | { readonly type: 'left'; readonly sceneId: string; readonly atMs: number };

export interface TriggerStep {
  readonly state: TriggerState;
  readonly events: readonly TriggerEvent[];
}

export interface OutingSetup {
  readonly travelMode: TravelMode;
  readonly config: TriggerConfig;
  /** The Places of the Route, in its order. */
  readonly places: readonly TriggerPlace[];
}

const AWAY: SceneProgress = {
  present: false,
  nearFixes: 0,
  sureFixes: 0,
  nearSinceMs: null,
  asked: false,
};

/** T2: the radius of a Place when nothing is known about accuracy. */
function restingRadius(rules: TriggerRules, place: TriggerPlace): number {
  return place.radiusOverrideMeters ?? rules.minRadiusMeters;
}

/**
 * T2: the trigger radius of a Place for a fix of the given accuracy — the
 * Curator's override when there is one, otherwise the accuracy times the
 * factor, kept within the bounds.
 */
export function triggerRadiusMeters(
  rules: TriggerRules,
  place: Pick<TriggerPlace, 'radiusOverrideMeters'>,
  accuracyMeters: number,
): number {
  if (place.radiusOverrideMeters !== null) return place.radiusOverrideMeters;

  return Math.min(
    rules.maxRadiusMeters,
    Math.max(rules.minRadiusMeters, accuracyMeters * rules.accuracyFactor),
  );
}

/**
 * T7: groups the Places into scenes. Two Places belong together when they
 * stand closer than their two radii; belonging together carries over a chain
 * of such Places. Scenes and their Places keep the order of the Route.
 */
export function groupIntoScenes(
  rules: TriggerRules,
  places: readonly TriggerPlace[],
): TriggerScene[] {
  // The scene of each Place, as the index of the first Place of that scene.
  const sceneOf = places.map((_, index) => index);

  for (let a = 0; a < places.length; a += 1) {
    for (let b = a + 1; b < places.length; b += 1) {
      const first = places[a];
      const second = places[b];
      if (first === undefined || second === undefined) continue;

      const twoRadii = restingRadius(rules, first) + restingRadius(rules, second);
      if (distanceMeters(first, second) >= twoRadii) continue;

      const from = Math.max(sceneOf[a] ?? a, sceneOf[b] ?? b);
      const to = Math.min(sceneOf[a] ?? a, sceneOf[b] ?? b);
      for (let index = 0; index < sceneOf.length; index += 1) {
        if (sceneOf[index] === from) sceneOf[index] = to;
      }
    }
  }

  const scenes: TriggerScene[] = [];
  places.forEach((place, index) => {
    if (sceneOf[index] !== index) return;
    scenes.push({
      sceneId: place.placeId,
      places: places.filter((_, other) => sceneOf[other] === index),
    });
  });
  return scenes;
}

/** The state of the rules at the Start of an Outing (`OUT-1`). */
export function startOuting(setup: OutingSetup): TriggerState {
  const rules = setup.config[setup.travelMode];
  const scenes = groupIntoScenes(rules, setup.places);

  return {
    rules,
    scenes,
    progress: scenes.map(() => AWAY),
    autoStarted: [],
    prompted: [],
    lastFixTimestampMs: null,
  };
}

/** How a fix stands to a scene. */
interface Reading {
  /** Inside the radius of at least one Place of the scene. */
  readonly near: boolean;
  /** Beyond the leaving distance of every Place of the scene. */
  readonly gone: boolean;
  /** Distance to the nearest Place of the scene, in metres. */
  readonly distance: number;
}

function read(rules: TriggerRules, scene: TriggerScene, fix: PositionFix): Reading {
  let near = false;
  let gone = true;
  let nearest = Number.POSITIVE_INFINITY;

  for (const place of scene.places) {
    const distance = distanceMeters(place, fix);
    const radius = triggerRadiusMeters(rules, place, fix.accuracyMeters);

    if (distance <= radius) near = true;
    if (distance <= radius * rules.leaveFactor) gone = false;
    nearest = Math.min(nearest, distance);
  }

  return { near, gone, distance: nearest };
}

/**
 * Applies one position fix to the state of the trigger rules.
 *
 * A pure function: no clock, no I/O, and the given state is left untouched. A
 * fix that is not later than the last one applied changes nothing.
 */
export function advance(state: TriggerState, fix: PositionFix): TriggerStep {
  if (state.lastFixTimestampMs !== null && fix.timestampMs <= state.lastFixTimestampMs) {
    return { state, events: [] };
  }

  const { rules } = state;
  const sure = fix.accuracyMeters <= rules.uncertaintyLimitMeters;
  const readings = state.scenes.map((scene) => read(rules, scene, fix));

  // When the radii of two scenes overlap, a fix speaks for the nearer scene
  // only (the earlier one on the Route on a tie), so one position never
  // arrives at two scenes.
  let nearest = -1;
  readings.forEach((reading, index) => {
    if (!reading.near) return;
    const best = readings[nearest];
    if (best === undefined || reading.distance < best.distance) nearest = index;
  });

  const events: TriggerEvent[] = [];
  const autoStarted = [...state.autoStarted];
  const prompted = [...state.prompted];

  const progress = state.scenes.map((scene, index): SceneProgress => {
    const before = state.progress[index] ?? AWAY;
    const reading = readings[index];
    if (reading === undefined) return before;

    if (before.present) {
      // T4: only a trustworthy fix beyond the leaving distance ends a presence.
      if (!reading.gone || !sure) return before;
      events.push({ type: 'left', sceneId: scene.sceneId, atMs: fix.timestampMs });
      return AWAY;
    }

    if (index !== nearest) {
      // Outside the radius: the run is broken. The question is not repeated
      // until the Party has really gone.
      return { ...AWAY, asked: before.asked && !(reading.gone && sure) };
    }

    const nearFixes = before.nearFixes + 1;
    const sureFixes = sure ? before.sureFixes + 1 : 0;
    const nearSinceMs = before.nearSinceMs ?? fix.timestampMs;
    const dwelt = fix.timestampMs - nearSinceMs >= rules.confirmDwellMs;
    const placeIds = scene.places.map((place) => place.placeId);

    // T3: two consecutive fixes inside the radius, or a few seconds of presence.
    if (sure && (sureFixes >= rules.confirmFixes || dwelt)) {
      const autoStart = scene.places
        .filter((place) => !place.manual && !autoStarted.includes(place.placeId))
        .map((place) => place.placeId);
      const prompt = scene.places
        .filter((place) => place.manual && !prompted.includes(place.placeId))
        .map((place) => place.placeId);

      autoStarted.push(...autoStart);
      prompted.push(...prompt);
      events.push({
        type: 'arrived',
        sceneId: scene.sceneId,
        atMs: fix.timestampMs,
        placeIds,
        autoStart,
        prompt,
      });
      return { ...AWAY, present: true };
    }

    // `OUT-4`: the same evidence at poor accuracy is a question, asked once.
    if (!sure && !before.asked && (nearFixes >= rules.confirmFixes || dwelt)) {
      events.push({ type: 'ask', sceneId: scene.sceneId, atMs: fix.timestampMs, placeIds });
      return { present: false, nearFixes, sureFixes, nearSinceMs, asked: true };
    }

    return { present: false, nearFixes, sureFixes, nearSinceMs, asked: before.asked };
  });

  return {
    state: { ...state, progress, autoStarted, prompted, lastFixTimestampMs: fix.timestampMs },
    events,
  };
}

/** Applies a run of fixes in order and gathers the events. */
export function advanceAll(state: TriggerState, fixes: readonly PositionFix[]): TriggerStep {
  let current = state;
  const events: TriggerEvent[] = [];

  for (const fix of fixes) {
    const step = advance(current, fix);
    current = step.state;
    events.push(...step.events);
  }

  return { state: current, events };
}

/**
 * The person answered "yes" to "are you at …?" (`OUT-4`): the arrival is taken
 * on their word. Nothing happens when the Party is already present there or
 * the scene is unknown.
 */
export function confirmArrival(state: TriggerState, sceneId: string, atMs: number): TriggerStep {
  const index = state.scenes.findIndex((scene) => scene.sceneId === sceneId);
  const scene = state.scenes[index];
  if (scene === undefined || state.progress[index]?.present === true) {
    return { state, events: [] };
  }

  const autoStart = scene.places
    .filter((place) => !place.manual && !state.autoStarted.includes(place.placeId))
    .map((place) => place.placeId);
  const prompt = scene.places
    .filter((place) => place.manual && !state.prompted.includes(place.placeId))
    .map((place) => place.placeId);

  return {
    state: {
      ...state,
      progress: state.progress.map((item, other) =>
        other === index ? { ...AWAY, present: true } : item,
      ),
      autoStarted: [...state.autoStarted, ...autoStart],
      prompted: [...state.prompted, ...prompt],
    },
    events: [
      {
        type: 'arrived',
        sceneId,
        atMs,
        placeIds: scene.places.map((place) => place.placeId),
        autoStart,
        prompt,
      },
    ],
  };
}
