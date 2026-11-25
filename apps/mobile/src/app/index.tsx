import { defaultLocale, translate } from '@promenade/i18n';
import type { GenerateMetadataFunction } from 'expo-router/server';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Runs on the server before the page is rendered and gives it its title and
 * link-preview tags (ADR-0007, point 2). Route Pages and Invitation pages will
 * build theirs from the request; this one is fixed.
 */
export const generateMetadata: GenerateMetadataFunction = () => ({
  title: translate(defaultLocale, 'app.name'),
  description: translate(defaultLocale, 'app.tagline'),
  openGraph: {
    title: translate(defaultLocale, 'app.name'),
    description: translate(defaultLocale, 'app.tagline'),
  },
});

/** PLACEHOLDER: the one screen of the skeleton. */
export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <Text role="heading" aria-level={1} style={styles.name}>
        {translate(defaultLocale, 'app.name')}
      </Text>
      <Text style={styles.tagline}>{translate(defaultLocale, 'app.tagline')}</Text>
      <Text style={styles.notice}>{translate(defaultLocale, 'skeleton.notice')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#ffffff',
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111111',
  },
  tagline: {
    fontSize: 18,
    textAlign: 'center',
    color: '#111111',
  },
  notice: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555555',
  },
});
