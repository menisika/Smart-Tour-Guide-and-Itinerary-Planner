import { Text } from 'react-native';

import { useTranslator } from '../i18n/LocaleProvider';
import { PlaceholderScreen } from './PlaceholderScreen';

/** PLACEHOLDER: the Outing under way. The screen comes with `S1-OUT-13`. */
export function OutingScreen() {
  const { t } = useTranslator();
  return (
    <PlaceholderScreen title={t('outing.title')}>
      <Text>{t('outing.none')}</Text>
    </PlaceholderScreen>
  );
}
