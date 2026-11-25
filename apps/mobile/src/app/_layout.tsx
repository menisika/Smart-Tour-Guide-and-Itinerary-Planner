import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

/** The root of every screen, on the phone and on the web. */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
