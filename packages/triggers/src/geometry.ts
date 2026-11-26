const EARTH_RADIUS_METERS = 6_371_008.8;
const RADIANS_PER_DEGREE = Math.PI / 180;

export interface Point {
  readonly latitude: number;
  readonly longitude: number;
}

/** Distance between two points on the sphere, in metres (haversine). */
export function distanceMeters(a: Point, b: Point): number {
  const latitudeA = a.latitude * RADIANS_PER_DEGREE;
  const latitudeB = b.latitude * RADIANS_PER_DEGREE;
  const halfLatitude = (latitudeB - latitudeA) / 2;
  const halfLongitude = ((b.longitude - a.longitude) * RADIANS_PER_DEGREE) / 2;

  const h =
    Math.sin(halfLatitude) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(halfLongitude) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The point reached from `origin` by going `eastMeters` east and `northMeters` north. */
export function offsetMeters(origin: Point, eastMeters: number, northMeters: number): Point {
  const metersPerDegree = EARTH_RADIUS_METERS * RADIANS_PER_DEGREE;

  return {
    latitude: origin.latitude + northMeters / metersPerDegree,
    longitude:
      origin.longitude +
      eastMeters / (metersPerDegree * Math.cos(origin.latitude * RADIANS_PER_DEGREE)),
  };
}
