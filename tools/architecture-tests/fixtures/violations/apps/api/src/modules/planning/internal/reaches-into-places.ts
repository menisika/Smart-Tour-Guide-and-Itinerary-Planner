// VIOLATION (api-module-internals): one module imports the internals of another.
import { placesTable } from '../../places/internal/places.repository.ts';

export const stolen = placesTable;
