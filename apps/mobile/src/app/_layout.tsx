import { defaultLocale } from '@promenade/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { LocaleProvider } from '../i18n/LocaleProvider';
import { DeviceDatabaseProvider } from '../storage/DeviceDatabaseProvider';

/**
 * The root of every screen, on the phone and on the web: the language of the
 * interface, the database of the device, and the stack that holds the tabs
 * and whatever opens over them.
 */
export default function RootLayout() {
  return (
    <LocaleProvider locale={defaultLocale}>
      <DeviceDatabaseProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </DeviceDatabaseProvider>
    </LocaleProvider>
  );
}
