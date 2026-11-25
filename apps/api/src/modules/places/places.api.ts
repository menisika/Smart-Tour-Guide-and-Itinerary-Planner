/**
 * The public interface of the places module.
 *
 * PLACEHOLDER: one question, with a fixed answer. It exists to show how a
 * module is offered to the others; the base of Places (ADR-0030, ADR-0031)
 * and the published city versions (ADR-0010) give it substance.
 */
export const PLACES_API = Symbol('PlacesApi');

/** Identifies one immutable, published version of a city's data (ADR-0010, point 4). */
export interface CityVersionRef {
  readonly cityId: string;
  readonly versionId: string;
}

export interface PlacesApi {
  /** The version of the city that planning must read, or `null` if none is published. */
  publishedCityVersion(cityId: string): Promise<CityVersionRef | null>;
}
