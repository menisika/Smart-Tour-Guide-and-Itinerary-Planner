import { supportedLocales } from '@promenade/i18n';
import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { useTranslator, type Translator } from '../i18n/LocaleProvider';
import type { DeviceDatabaseState } from '../storage/device-database';
import { useDeviceDatabase } from '../storage/DeviceDatabaseContext';
import { PlaceholderScreen } from './PlaceholderScreen';

function describeDeviceData(state: DeviceDatabaseState, t: Translator['t']): string {
  switch (state.status) {
    case 'opening':
      return t('settings.deviceData.opening');
    case 'ready':
      return t('settings.deviceData.ready', { version: state.schemaVersion });
    case 'failed':
      return t('settings.deviceData.failed');
    case 'absent':
      return t('settings.deviceData.absent');
  }
}

/**
 * PLACEHOLDER: the settings. It names the languages the interface has — the
 * choice itself is wired by `S1-ACC-10` — and says what state the data of the
 * device is in, which is the first thing read through the data layer.
 */
export function SettingsScreen() {
  const { locale, t } = useTranslator();
  const deviceData = useDeviceDatabase();

  return (
    <PlaceholderScreen title={t('settings.title')}>
      <Link href="/profile" role="link" aria-label={t('settings.back')}>
        {t('settings.back')}
      </Link>

      <Text role="heading" aria-level={2}>
        {t('settings.language')}
      </Text>
      <View role="list" aria-label={t('settings.language')}>
        {supportedLocales.map((code) => (
          <Text key={code} role="listitem" aria-current={code === locale}>
            {t(`language.${code}`)}
          </Text>
        ))}
      </View>

      <Text role="heading" aria-level={2}>
        {t('settings.deviceData')}
      </Text>
      <Text
        role={deviceData.status === 'failed' ? 'alert' : 'status'}
        aria-live={deviceData.status === 'failed' ? 'assertive' : 'polite'}
      >
        {describeDeviceData(deviceData, t)}
      </Text>
    </PlaceholderScreen>
  );
}
