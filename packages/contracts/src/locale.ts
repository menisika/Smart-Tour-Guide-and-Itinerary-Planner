import { z } from 'zod';

/**
 * The code of a language, as it is stored and sent: a BCP 47 language tag such
 * as `ru`, `en` or `be-tarask`.
 *
 * It is an open string on purpose (`I18N-3`, `NFR-26`). Which languages the
 * interface or the Stories exist in is a matter of content — the dictionaries
 * of `@promenade/i18n`, the rows of city data — and never of a schema: a
 * closed list here would turn every new language into a change of every
 * stored record and every client.
 */
export const localeCodeSchema = z
  .string()
  .regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/, 'expected a BCP 47 language tag');

export type LocaleCode = z.infer<typeof localeCodeSchema>;

/**
 * A text held once per language, keyed by the code of the language. A new
 * language is a new key; nothing else changes.
 */
export const localizedTextSchema = z.record(localeCodeSchema, z.string());

export type LocalizedText = z.infer<typeof localizedTextSchema>;
