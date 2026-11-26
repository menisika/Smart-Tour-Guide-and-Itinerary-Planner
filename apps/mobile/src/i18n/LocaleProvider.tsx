import {
  defaultLocale,
  translate,
  type Locale,
  type MessageKey,
  type MessageValues,
} from '@promenade/i18n';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface Translator {
  readonly locale: Locale;
  /** The text of `key` in the language of the interface. */
  readonly t: (key: MessageKey, values?: MessageValues) => string;
}

const translatorFor = (locale: Locale): Translator => ({
  locale,
  t: (key, values) => translate(locale, key, values),
});

const LocaleContext = createContext<Translator>(translatorFor(defaultLocale));

/**
 * Gives every screen below it the language of the interface. The shell passes
 * the default language; the person's choice arrives here with `S1-ACC-10`.
 */
export function LocaleProvider({
  locale,
  children,
}: {
  readonly locale: Locale;
  readonly children: ReactNode;
}) {
  const translator = useMemo(() => translatorFor(locale), [locale]);
  return <LocaleContext value={translator}>{children}</LocaleContext>;
}

/** A screen takes its texts from here and never names a language itself. */
export function useTranslator(): Translator {
  return useContext(LocaleContext);
}
