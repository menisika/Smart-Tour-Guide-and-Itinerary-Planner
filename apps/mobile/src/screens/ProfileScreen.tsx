import { Link } from 'expo-router';
import { Text } from 'react-native';

import { useTranslator } from '../i18n/LocaleProvider';
import { PlaceholderScreen } from './PlaceholderScreen';

/** PLACEHOLDER: the Profile and the way to the settings. It comes with `S1-RTE-13`. */
export function ProfileScreen() {
  const { t } = useTranslator();
  return (
    <PlaceholderScreen title={t('profile.title')}>
      <Text>{t('profile.empty')}</Text>
      <Link href="/settings" role="link" aria-label={t('profile.openSettings')}>
        {t('profile.openSettings')}
      </Link>
    </PlaceholderScreen>
  );
}
