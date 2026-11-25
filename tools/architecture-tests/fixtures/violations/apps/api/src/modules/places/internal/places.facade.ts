// ALLOWED: a module uses its own internals.
import { placesTable } from './places.repository.ts';

export class PlacesFacade {
  readonly table = placesTable;
}
