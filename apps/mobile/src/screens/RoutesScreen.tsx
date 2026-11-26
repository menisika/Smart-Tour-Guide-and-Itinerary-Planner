import { Text } from 'react-native';

import { useTranslator } from '../i18n/LocaleProvider';
import { PlaceholderScreen } from './PlaceholderScreen';

/** PLACEHOLDER: the person's Routes. The list comes with `S1-RTE-14`. */
export function RoutesScreen() {
  const { t } = useTranslator();
  return (
    <PlaceholderScreen title={t('routes.title')}>
      <Text>{t('routes.empty')}</Text>
    </PlaceholderScreen>
  );
}
