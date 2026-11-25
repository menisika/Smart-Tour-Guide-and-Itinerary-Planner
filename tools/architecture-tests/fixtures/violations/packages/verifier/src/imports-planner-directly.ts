// VIOLATION (verifier-not-to-planner): a relative import of the planner.
import { planner } from '../../planner/src/index.ts';

export const direct = planner;
