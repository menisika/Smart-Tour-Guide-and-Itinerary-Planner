// VIOLATION (api-module-internals-from-outside, api-platform-not-to-modules).
import { placesTable } from '../modules/places/internal/places.repository.ts';

export const leaked = placesTable;
