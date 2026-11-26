import { Tabs } from 'expo-router/js-tabs';

import { useTranslator } from '../../i18n/LocaleProvider';

/**
 * The sections of the application. PLACEHOLDER in look only: the bar is the
 * platform's default one until the designed navigation of `F-12` replaces it;
 * the three sections and their addresses stay.
 */
export default function TabsLayout() {
  const { t } = useTranslator();

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('shell.tab.routes'),
          tabBarAccessibilityLabel: t('shell.tab.routes'),
        }}
      />
      <Tabs.Screen
        name="outing"
        options={{
          title: t('shell.tab.outing'),
          tabBarAccessibilityLabel: t('shell.tab.outing'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('shell.tab.profile'),
          tabBarAccessibilityLabel: t('shell.tab.profile'),
        }}
      />
    </Tabs>
  );
}
