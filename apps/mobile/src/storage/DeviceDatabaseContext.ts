import { createContext, useContext } from 'react';

import type { DeviceDatabaseState } from './device-database';

export const DeviceDatabaseContext = createContext<DeviceDatabaseState>({ status: 'absent' });

/** The database of the device, in whatever state it is in. */
export function useDeviceDatabase(): DeviceDatabaseState {
  return useContext(DeviceDatabaseContext);
}
