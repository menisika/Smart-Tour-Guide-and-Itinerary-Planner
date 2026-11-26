import { openDatabaseAsync } from 'expo-sqlite';
import { useEffect, useState, type ReactNode } from 'react';

import { DEVICE_DATABASE_NAME, type DeviceDatabaseState } from './device-database';
import { DeviceDatabaseContext } from './DeviceDatabaseContext';
import { migrate } from './migrate';

/**
 * Opens the database of the device once, brings it to the latest structure
 * and hands it to the screens. The browser has a file of its own beside this
 * one (`DeviceDatabaseProvider.web.tsx`).
 */
export function DeviceDatabaseProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<DeviceDatabaseState>({ status: 'opening' });

  useEffect(() => {
    // Set when the provider is gone before the file has opened.
    const provider = { mounted: true };

    void (async () => {
      try {
        const database = await openDatabaseAsync(DEVICE_DATABASE_NAME);
        // The journal of an Outing is written while it is read (ADR-0017).
        await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
        const schemaVersion = await migrate(database);
        if (provider.mounted) {
          setState({ status: 'ready', database, schemaVersion });
        }
      } catch (error) {
        if (provider.mounted) {
          setState({ status: 'failed', error });
        }
      }
    })();

    return () => {
      provider.mounted = false;
    };
  }, []);

  return <DeviceDatabaseContext value={state}>{children}</DeviceDatabaseContext>;
}
