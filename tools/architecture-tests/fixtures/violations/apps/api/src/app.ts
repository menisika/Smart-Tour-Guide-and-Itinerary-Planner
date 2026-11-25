// ALLOWED: code outside the modules uses a module through its index.
import { PlacesFacade } from './modules/places/index.ts';

export const app = new PlacesFacade();
