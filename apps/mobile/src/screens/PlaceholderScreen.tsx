import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

/**
 * PLACEHOLDER: the frame of a screen of the shell — a main region with one
 * heading and whatever the screen says under it. It has no look of its own:
 * colour, type and spacing arrive with the design system (`F-12`). What it
 * does carry is the habit the designed screens inherit: one main region, one
 * first-level heading, and a name and a role on everything that can be used.
 */
export function PlaceholderScreen({
  title,
  children,
}: {
  readonly title: string;
  readonly children?: ReactNode;
}) {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <View role="main" aria-label={title}>
        <Text role="heading" aria-level={1}>
          {title}
        </Text>
        {children}
      </View>
    </ScrollView>
  );
}
