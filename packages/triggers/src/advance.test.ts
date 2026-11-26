import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  advance,
  advanceAll,
  confirmArrival,
  groupIntoScenes,
  startOuting,
  triggerRadiusMeters,
  type TriggerEvent,
  type TriggerPlace,
  type TriggerState,
} from './advance.ts';
import { defaultTriggerConfig } from './config.ts';
import { distanceMeters } from './geometry.ts';
import { fixtures, nth, type TriggerFixture } from './testing/fixtures.ts';
import { outingArbitrary } from './testing/track-arbitraries.ts';

const rules = defaultTriggerConfig.foot;

function start(places: readonly TriggerPlace[]): TriggerState {
  return startOuting({ travelMode: 'foot', config: defaultTriggerConfig, places });
}

function run(fixture: TriggerFixture): readonly TriggerEvent[] {
  return advanceAll(start(fixture.places), fixture.track.fixes).events;
}

const kinds = (events: readonly TriggerEvent[]): string[] => events.map((event) => event.type);

/** Distance from the Place to the fix that produced the event, in metres. */
function distanceAt(fixture: TriggerFixture, event: TriggerEvent, placeIndex = 0): number {
  const fix = fixture.track.fixes.find((item) => item.timestampMs === event.atMs);
  const place = fixture.places[placeIndex];
  if (fix === undefined || place === undefined) throw new Error('No fix at the time of the event.');
  return distanceMeters(place, fix);
}

describe('T1 — the rules are a pure function of the state and the fix', () => {
  const first = nth(fixtures.walkUpAtGoodAccuracy.track.fixes, 0);
  const second = nth(fixtures.walkUpAtGoodAccuracy.track.fixes, 1);
  const initial = start(fixtures.walkUpAtGoodAccuracy.places);

  it('returns a new state and leaves the given one untouched', () => {
    const before = JSON.stringify(initial);
    const step = advance(initial, first);

    expect(step.state.lastFixTimestampMs).toBe(first.timestampMs);
    expect(JSON.stringify(initial)).toBe(before);
  });

  it('gives the same answer for the same input', () => {
    expect(advance(initial, first)).toEqual(advance(initial, first));
  });

  it('ignores a fix that is not later than the last one', () => {
    const state = advanceAll(initial, [first, second]).state;

    expect(advance(state, first)).toEqual({ state, events: [] });
    expect(advance(state, second)).toEqual({ state, events: [] });
  });

  it('keeps its state as plain data, so an Outing resumes after a restart', () => {
    const { places, track } = fixtures.leaveAndComeBack;
    const half = Math.trunc(track.fixes.length / 2);

    const before = advanceAll(start(places), track.fixes.slice(0, half));
    const restored = JSON.parse(JSON.stringify(before.state)) as TriggerState;
    const after = advanceAll(restored, track.fixes.slice(half));

    expect([...before.events, ...after.events]).toEqual(run(fixtures.leaveAndComeBack));
  });
});

describe('T2 — the radius adapts to the reported accuracy', () => {
  const place = { radiusOverrideMeters: null };

  it('is twice the accuracy, within 25 m and 60 m', () => {
    expect(triggerRadiusMeters(rules, place, 5)).toBe(25);
    expect(triggerRadiusMeters(rules, place, 12.5)).toBe(25);
    expect(triggerRadiusMeters(rules, place, 20)).toBe(40);
    expect(triggerRadiusMeters(rules, place, 30)).toBe(60);
    expect(triggerRadiusMeters(rules, place, 200)).toBe(60);
  });

  it("lets a Curator's radius win, below the bounds and above them", () => {
    expect(triggerRadiusMeters(rules, { radiusOverrideMeters: 15 }, 30)).toBe(15);
    expect(triggerRadiusMeters(rules, { radiusOverrideMeters: 90 }, 5)).toBe(90);
  });

  it.each([
    { name: 'walkUpAtGoodAccuracy', radius: 25 },
    { name: 'walkUpAtFairAccuracy', radius: 40 },
    { name: 'walkUpAtPoorAccuracy', radius: 60 },
    { name: 'walkUpToAnOverriddenRadius', radius: 15 },
  ] as const)('$name: the arrival comes just inside $radius m', ({ name, radius }) => {
    const [arrival, ...rest] = run(fixtures[name]);

    expect(arrival?.type).toBe('arrived');
    expect(rest).toEqual([]);
    // The second fix inside confirms; a fix is 1.4 m further than the one before.
    const distance = distanceAt(fixtures[name], nth(run(fixtures[name]), 0));
    expect(distance).toBeLessThanOrEqual(radius);
    expect(distance).toBeGreaterThan(radius - 3);
  });

  it('passAtFortyMetres: does not fire outside the radius', () => {
    expect(run(fixtures.passAtFortyMetres)).toEqual([]);
  });
});

describe('T3 — arrival needs confirmation', () => {
  it('twoFixesInside: fires on the second consecutive fix inside the radius', () => {
    const { places, track } = fixtures.twoFixesInside;
    const inside = track.fixes.filter((fix) => distanceMeters(nth(places, 0), fix) <= 25);
    const events = run(fixtures.twoFixesInside);

    expect(kinds(events)).toEqual(['arrived']);
    expect(events[0]?.atMs).toBe(inside[1]?.timestampMs);
  });

  it('oneFixThrownInside: does not fire on a single fix inside', () => {
    const { places, track } = fixtures.oneFixThrownInside;
    const inside = track.fixes.filter((fix) => distanceMeters(nth(places, 0), fix) <= 25);

    expect(inside).toHaveLength(1);
    expect(run(fixtures.oneFixThrownInside)).toEqual([]);
  });

  it('presenceAcrossPoorFixes: fires on a few seconds of presence, at the next good fix', () => {
    const { track } = fixtures.presenceAcrossPoorFixes;
    const events = run(fixtures.presenceAcrossPoorFixes);

    // The poor fixes in between ask once; the arrival waits for a good fix.
    expect(kinds(events)).toEqual(['ask', 'arrived']);
    expect(events[1]?.atMs).toBe(track.fixes.at(-1)?.timestampMs);
  });

  it('standingWithUncertainPosition: asks "are you at …?" once instead of arriving (OUT-4)', () => {
    const events = run(fixtures.standingWithUncertainPosition);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'ask', sceneId: 'place-a', placeIds: ['place-a'] });
  });

  it('uncertainAndFarAway: does not ask away from every Place', () => {
    expect(run(fixtures.uncertainAndFarAway)).toEqual([]);
  });

  it('takes a "yes" to the question as the arrival, once', () => {
    const { places, track } = fixtures.standingWithUncertainPosition;
    const asked = advanceAll(start(places), track.fixes).state;

    const answered = confirmArrival(asked, 'place-a', 1_795_000_100_000);
    expect(answered.events).toEqual([
      {
        type: 'arrived',
        sceneId: 'place-a',
        atMs: 1_795_000_100_000,
        placeIds: ['place-a'],
        autoStart: ['place-a'],
        prompt: [],
      },
    ]);
    expect(confirmArrival(answered.state, 'place-a', 1_795_000_200_000).events).toEqual([]);
    expect(confirmArrival(asked, 'place-unknown', 1_795_000_100_000).events).toEqual([]);
  });
});

describe('T4 — leaving, and one automatic start per Place', () => {
  it('strollWithinLeavingDistance: does not register leaving inside 1.5 × the radius', () => {
    expect(kinds(run(fixtures.strollWithinLeavingDistance))).toEqual(['arrived']);
  });

  it('leaveAndComeBack: registers leaving beyond 1.5 × the radius', () => {
    const events = run(fixtures.leaveAndComeBack);
    const left = nth(events, 1);

    expect(kinds(events)).toEqual(['arrived', 'left', 'arrived']);
    expect(distanceAt(fixtures.leaveAndComeBack, left)).toBeGreaterThan(37.5);
    expect(distanceAt(fixtures.leaveAndComeBack, left)).toBeLessThan(37.5 + 1.5);
  });

  it('poorFixThrownFarWhilePresent: does not register leaving on a fix it cannot trust', () => {
    expect(kinds(run(fixtures.poorFixThrownFarWhilePresent))).toEqual(['arrived']);
  });

  it('leaveAndComeBack: starts the Story by itself the first time only', () => {
    const [first, , second] = run(fixtures.leaveAndComeBack);

    expect(first).toMatchObject({ type: 'arrived', autoStart: ['place-a'] });
    expect(second).toMatchObject({ type: 'arrived', autoStart: [] });
  });
});

describe('T7 — Places closer than two radii form a scene', () => {
  it('twoPlacesCloseTogether: one arrival, the Places in the order of the Route', () => {
    const events = run(fixtures.twoPlacesCloseTogether);

    expect(kinds(events)).toEqual(['arrived', 'left']);
    expect(events[0]).toMatchObject({
      sceneId: 'place-a',
      placeIds: ['place-a', 'place-b'],
      autoStart: ['place-a', 'place-b'],
    });
  });

  it('twoPlacesApart: two scenes, two arrivals', () => {
    const events = run(fixtures.twoPlacesApart);

    expect(kinds(events)).toEqual(['arrived', 'left', 'arrived', 'left']);
    expect(events[0]).toMatchObject({ sceneId: 'place-a', placeIds: ['place-a'] });
    expect(events[2]).toMatchObject({ sceneId: 'place-b', placeIds: ['place-b'] });
  });

  it('chainOfThreePlaces: a chain is one scene, in the order of the Route and not of the names', () => {
    const scenes = groupIntoScenes(rules, fixtures.chainOfThreePlaces.places);

    expect(scenes.map((scene) => scene.places.map((place) => place.placeId))).toEqual([
      ['place-c', 'place-a', 'place-b'],
    ]);
    expect(kinds(run(fixtures.chainOfThreePlaces))).toEqual(['arrived', 'left']);
  });

  it('counts a radius set by a Curator when it measures "two radii"', () => {
    const a = nth(fixtures.twoPlacesApart.places, 0);
    const b = nth(fixtures.twoPlacesApart.places, 1);

    expect(groupIntoScenes(rules, [a, b])).toHaveLength(2);
    // 120 m apart: one scene only when the two radii add up to more.
    expect(groupIntoScenes(rules, [{ ...a, radiusOverrideMeters: 100 }, b])).toHaveLength(1);
  });
});

describe('T10 — a manual Place never starts by itself', () => {
  it('manualPlace: arrives with a prompt and no automatic start', () => {
    expect(run(fixtures.manualPlace)).toMatchObject([
      { type: 'arrived', autoStart: [], prompt: ['place-a'] },
    ]);
  });

  it('manualPlaceInAScene: starts the ordinary Place and prompts for the manual one', () => {
    expect(run(fixtures.manualPlaceInAScene)).toMatchObject([
      { type: 'arrived', autoStart: ['place-a'], prompt: ['place-b'] },
    ]);
  });

  it('walkUpAtGoodAccuracy: an ordinary Place starts and is not prompted for', () => {
    expect(run(fixtures.walkUpAtGoodAccuracy)).toMatchObject([
      { type: 'arrived', autoStart: ['place-a'], prompt: [] },
    ]);
  });
});

describe('the trigger numbers are data, keyed by Travel Mode', () => {
  it('holds the starting values of the specification for every Travel Mode', () => {
    for (const mode of ['foot', 'bicycle', 'car'] as const) {
      expect(defaultTriggerConfig[mode]).toMatchObject({
        minRadiusMeters: 25,
        maxRadiusMeters: 60,
        uncertaintyLimitMeters: 50,
        leaveFactor: 1.5,
      });
    }
  });

  it('follows the configuration it is given', () => {
    const wide = { ...rules, minRadiusMeters: 45 };
    const state = startOuting({
      travelMode: 'car',
      config: { ...defaultTriggerConfig, car: wide },
      places: fixtures.passAtFortyMetres.places,
    });

    // 40 m to the side is inside a radius of 45 m.
    expect(kinds(advanceAll(state, fixtures.passAtFortyMetres.track.fixes).events)).toEqual([
      'arrived',
      'left',
    ]);
  });
});

describe('properties over synthetic tracks with noise, jumps and gaps', () => {
  it('never starts a Place by itself twice in an Outing', () => {
    fc.assert(
      fc.property(outingArbitrary, ({ places, track }) => {
        const started = advanceAll(start(places), track.fixes).events.flatMap((event) =>
          event.type === 'arrived' ? event.autoStart : [],
        );

        expect(new Set(started).size).toBe(started.length);
      }),
      { numRuns: 500 },
    );
  });

  it('never starts a manual Place by itself, and prompts for it at most once', () => {
    fc.assert(
      fc.property(outingArbitrary, ({ places, track }) => {
        const manual = new Set(
          places.filter((place) => place.manual).map((place) => place.placeId),
        );
        const arrivals = advanceAll(start(places), track.fixes).events.flatMap((event) =>
          event.type === 'arrived' ? [event] : [],
        );
        const prompted = arrivals.flatMap((event) => event.prompt);

        expect(arrivals.flatMap((event) => event.autoStart).filter((id) => manual.has(id))).toEqual(
          [],
        );
        expect(new Set(prompted).size).toBe(prompted.length);
      }),
      { numRuns: 500 },
    );
  });

  it('never emits an arrival while accuracy is worse than the limit', () => {
    fc.assert(
      fc.property(outingArbitrary, ({ places, track }) => {
        const accuracyAt = new Map(track.fixes.map((fix) => [fix.timestampMs, fix.accuracyMeters]));

        for (const event of advanceAll(start(places), track.fixes).events) {
          if (event.type !== 'arrived') continue;
          expect(accuracyAt.get(event.atMs)).toBeLessThanOrEqual(rules.uncertaintyLimitMeters);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('gives the same events however the fixes are split across calls', () => {
    fc.assert(
      fc.property(
        outingArbitrary,
        fc.array(fc.integer({ min: 1, max: 40 }), { minLength: 1, maxLength: 10 }),
        ({ places, track }, sizes) => {
          const whole = advanceAll(start(places), track.fixes);

          let state = start(places);
          const events: TriggerEvent[] = [];
          let from = 0;
          for (let turn = 0; from < track.fixes.length; turn += 1) {
            const size = sizes[turn % sizes.length] ?? 1;
            const step = advanceAll(state, track.fixes.slice(from, from + size));
            state = step.state;
            events.push(...step.events);
            from += size;
          }

          expect(events).toEqual(whole.events);
          expect(state).toEqual(whole.state);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('arrives and leaves in turn at each scene, and arrives somewhere in most tracks', () => {
    let withArrival = 0;
    const runs = 300;

    fc.assert(
      fc.property(outingArbitrary, ({ places, track }) => {
        const present = new Set<string>();
        const events = advanceAll(start(places), track.fixes).events;

        for (const event of events) {
          if (event.type === 'arrived') {
            expect(present.has(event.sceneId)).toBe(false);
            present.add(event.sceneId);
          } else if (event.type === 'left') {
            expect(present.has(event.sceneId)).toBe(true);
            present.delete(event.sceneId);
          }
        }
        if (events.some((event) => event.type === 'arrived')) withArrival += 1;
      }),
      { numRuns: runs, seed: 20261126 },
    );

    // Otherwise the properties above would hold for a function that does nothing.
    expect(withArrival).toBeGreaterThan(runs / 4);
  });
});
