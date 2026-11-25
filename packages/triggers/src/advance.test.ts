import { describe, expect, it } from 'vitest';

import { advance, initialTriggerState, type PositionFix } from './advance.ts';

// A synthetic fix. Fixtures are synthetic tracks or tracks recorded on test
// walks; a track of a person using the product is never a fixture (ADR-0027).
const fix: PositionFix = {
  timestampMs: 1_795_000_000_000,
  latitude: 10.5,
  longitude: 20.25,
  accuracyMeters: 8,
};

describe('advance (placeholder)', () => {
  it('returns a new state and leaves the given one untouched', () => {
    const step = advance(initialTriggerState, fix);

    expect(step.state).toEqual({ lastFixTimestampMs: fix.timestampMs });
    expect(step.events).toEqual([]);
    expect(initialTriggerState).toEqual({ lastFixTimestampMs: null });
  });

  it('gives the same answer for the same input', () => {
    expect(advance(initialTriggerState, fix)).toEqual(advance(initialTriggerState, fix));
  });
});
