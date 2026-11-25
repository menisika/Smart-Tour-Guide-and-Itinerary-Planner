import { describe, expect, it } from 'vitest';

import { travelSeconds, type TravelTimeTable } from './travel-times.ts';

const table: TravelTimeTable = new Map([['castle', new Map([['park', 420]])]]);

describe('travelSeconds (placeholder)', () => {
  it('reads a stored time', () => {
    expect(travelSeconds(table, 'castle', 'park')).toBe(420);
  });

  it('is zero from a Place to itself', () => {
    expect(travelSeconds(table, 'park', 'park')).toBe(0);
  });

  it('does not guess a time that is not stored', () => {
    expect(travelSeconds(table, 'park', 'castle')).toBeNull();
  });
});
