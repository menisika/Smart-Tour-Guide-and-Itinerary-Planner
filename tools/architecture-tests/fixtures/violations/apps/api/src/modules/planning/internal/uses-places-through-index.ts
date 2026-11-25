// ALLOWED: another module is used through its public interface.
import { PlacesFacade } from '../../places/index.ts';

export const places = new PlacesFacade();
