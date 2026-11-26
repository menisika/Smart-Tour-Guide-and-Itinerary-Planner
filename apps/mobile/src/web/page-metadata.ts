import { defaultLocale, translate, type MessageKey } from '@promenade/i18n';
import type { GenerateMetadataFunction } from 'expo-router/server';

/**
 * The title and the link-preview tags of a page of the shell, written on the
 * server before the page is rendered (ADR-0007, point 2). Route Pages and
 * Invitation pages will build theirs from the request; these are fixed.
 */
export function shellPageMetadata(titleKey?: MessageKey): GenerateMetadataFunction {
  return () => {
    const name = translate(defaultLocale, 'app.name');
    const title = titleKey === undefined ? name : `${translate(defaultLocale, titleKey)} — ${name}`;
    const description = translate(defaultLocale, 'app.tagline');
    return { title, description, openGraph: { title, description } };
  };
}
