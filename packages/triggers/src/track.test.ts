import { describe, expect, it } from 'vitest';

import { distanceMeters, offsetMeters } from './geometry.ts';
import { syntheticTrack, SYNTHETIC_ORIGIN } from './synthetic-track.ts';
import { fixtures, nth } from './testing/fixtures.ts';
import { parseRecordedTrack, trackOrigins } from './track.ts';

describe('recorded tracks', () => {
  it.each(Object.entries(fixtures))(
    'the fixture %s states its origin, and it is not a person using the product',
    (_name, fixture) => {
      expect(fixture.track.origin).toBe('synthetic');
      expect(fixture.track.description.length).toBeGreaterThan(10);
      expect(fixture.track.fixes.length).toBeGreaterThan(0);
    },
  );

  it('knows only origins made for testing', () => {
    expect(trackOrigins).toEqual(['synthetic', 'test-walk']);
  });

  it.each(Object.entries(fixtures))('the fixture %s survives its file format', (_name, fixture) => {
    const file: unknown = JSON.parse(JSON.stringify(fixture.track));

    expect(parseRecordedTrack(file)).toEqual(fixture.track);
  });

  it.each([
    ['no origin', { origin: undefined }, /origin/],
    ['an origin that is not for testing', { origin: 'outing' }, /origin/],
    ['another format', { format: 'gpx' }, /format/],
    ['a later version', { version: 2 }, /Version 2/],
    ['no Travel Mode', { travelMode: 'boat' }, /Travel Mode/],
    ['a fix without accuracy', { fixes: [{ timestampMs: 1, latitude: 0, longitude: 0 }] }, /Fix 0/],
    [
      'a latitude off the globe',
      { fixes: [{ timestampMs: 1, latitude: 91, longitude: 0, accuracyMeters: 5 }] },
      /Fix 0/,
    ],
  ])('refuses a track with %s', (_what, change, message) => {
    const file = { ...fixtures.twoFixesInside.track, ...change };

    expect(() => parseRecordedTrack(file)).toThrow(message);
  });
});

describe('synthetic tracks', () => {
  const walk = [{ kind: 'walk' as const, to: { east: 140, north: 0 } }];

  it('walks at 1.4 m/s with a fix every second', () => {
    const { fixes } = syntheticTrack({ description: 'A straight walk.' }, walk);

    expect(fixes).toHaveLength(101);
    expect(distanceMeters(nth(fixes, 0), nth(fixes, 1))).toBeCloseTo(1.4, 2);
    expect(distanceMeters(nth(fixes, 0), nth(fixes, -1))).toBeCloseTo(140, 1);
    expect(nth(fixes, 1).timestampMs - nth(fixes, 0).timestampMs).toBe(1000);
  });

  it('is the same track for the same seed, and another for another', () => {
    const noisy = (seed: number) =>
      syntheticTrack({ description: 'A noisy walk.', noiseMeters: 10, seed }, walk);

    expect(noisy(7)).toEqual(noisy(7));
    expect(noisy(7)).not.toEqual(noisy(8));
  });

  it('scatters fixes by no more than the noise asked for', () => {
    const still = [{ kind: 'stand' as const, seconds: 200 }];
    const { fixes } = syntheticTrack({ description: 'Standing.', noiseMeters: 10 }, still);
    const farthest = Math.max(...fixes.map((fix) => distanceMeters(SYNTHETIC_ORIGIN, fix)));

    expect(farthest).toBeGreaterThan(5);
    expect(farthest).toBeLessThan(10 * Math.SQRT2 + 0.01);
  });

  it('throws one fix off for a jump, leaves a hole for a gap, and reports a changed accuracy', () => {
    const { fixes } = syntheticTrack({ description: 'Jump, gap, accuracy.' }, [
      { kind: 'jump', east: 300, north: 0 },
      { kind: 'stand', seconds: 2 },
      { kind: 'gap', seconds: 10 },
      { kind: 'accuracy', meters: 70 },
      { kind: 'stand', seconds: 12 },
    ]);
    const fromOrigin = fixes.map((fix) => Math.round(distanceMeters(SYNTHETIC_ORIGIN, fix)));
    const steps = fixes
      .slice(1)
      .map((fix, index) => fix.timestampMs - nth(fixes, index).timestampMs);

    expect(fromOrigin.filter((distance) => distance === 300)).toHaveLength(1);
    expect(Math.max(...steps)).toBe(11_000);
    expect(fixes.at(-1)?.accuracyMeters).toBe(70);
    expect(fixes[0]?.accuracyMeters).toBe(8);
  });

  it('measures a plan in metres', () => {
    const point = offsetMeters(SYNTHETIC_ORIGIN, 300, 400);

    expect(distanceMeters(SYNTHETIC_ORIGIN, point)).toBeCloseTo(500, 0);
  });
});
