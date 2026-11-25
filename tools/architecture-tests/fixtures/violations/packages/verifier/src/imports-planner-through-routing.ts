// VIOLATION (verifier-not-to-planner, verifier-only-on-contracts):
// the planner is reached through another package.
import { viaRouting } from '../../routing/src/index.ts';

export const transitive = viaRouting;
