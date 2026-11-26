import type { ReactNode } from 'react';

import type { DeviceDatabaseState } from './device-database';
import { DeviceDatabaseContext } from './DeviceDatabaseContext';

const ABSENT: DeviceDatabaseState = { status: 'absent' };

/**
 * The public web keeps no database of a device: an Outing, its journal and its
 * track exist in the application only (ADR-0005, point 5; ADR-0007, point 1).
 * Keeping `expo-sqlite` out of this file keeps its WebAssembly build, and the
 * cross-origin isolation it would ask of every page, out of the web bundle.
 */
export function DeviceDatabaseProvider({ children }: { readonly children: ReactNode }) {
  return <DeviceDatabaseContext value={ABSENT}>{children}</DeviceDatabaseContext>;
}
