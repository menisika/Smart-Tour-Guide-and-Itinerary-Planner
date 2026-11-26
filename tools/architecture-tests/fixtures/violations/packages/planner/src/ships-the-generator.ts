// VIOLATION (testing-entry-only-from-tests): shipped code imports the test-only generators.
import { generated } from '../../contracts/src/testing/index.ts';

export const shipped = generated;
