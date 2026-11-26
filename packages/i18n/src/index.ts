/**
 * Interface texts in Russian and English, shared by the mobile app, the public
 * web and the console.
 *
 * A typed dictionary, one lookup with named places, and the match of a
 * person's preferred languages to the ones the interface has. Plurals and the
 * messages behind the error codes of ADR-0025 come with the first screens that
 * need them.
 */
export {
  defaultLocale,
  isLocale,
  matchLocale,
  messageKeys,
  supportedLocales,
  translate,
  type Locale,
  type MessageKey,
  type MessageValues,
} from './messages.ts';
