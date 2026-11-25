/** Walking time in whole seconds, by origin Place and then by destination Place. */
export type TravelTimeTable = ReadonlyMap<string, ReadonlyMap<string, number>>;

/**
 * Walking time from one Place to another, in whole seconds.
 *
 * Returns `null` when the table holds no time for the pair: an unknown pair is
 * never treated as free, and never guessed.
 */
export function travelSeconds(
  table: TravelTimeTable,
  fromPlaceId: string,
  toPlaceId: string,
): number | null {
  if (fromPlaceId === toPlaceId) return 0;
  return table.get(fromPlaceId)?.get(toPlaceId) ?? null;
}
