export const supportedLocales = ['ru', 'en'] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = 'ru';

const english = {
  'app.name': 'Promenade',
  'app.tagline': 'A walk through the city, planned for your company.',
  'skeleton.notice': 'This is the empty skeleton of the product. Nothing is built yet.',
  'console.title': 'Promenade — internal console',
  'console.api.checking': 'Checking the API…',
  'console.api.ok': 'The API answers and its database is ready.',
  'console.api.unavailable': 'The API or its database is not available.',
} as const;

export type MessageKey = keyof typeof english;

const messages: Readonly<Record<Locale, Readonly<Record<MessageKey, string>>>> = {
  en: english,
  ru: {
    'app.name': 'Promenade',
    'app.tagline': 'Прогулка по городу, спланированная для вашей компании.',
    'skeleton.notice': 'Это пустой каркас продукта. Здесь пока ничего не построено.',
    'console.title': 'Promenade — внутренняя консоль',
    'console.api.checking': 'Проверяем API…',
    'console.api.ok': 'API отвечает, база данных готова.',
    'console.api.unavailable': 'API или его база данных недоступны.',
  },
};

export function isLocale(value: string): value is Locale {
  return (supportedLocales as readonly string[]).includes(value);
}

/** The text of `key` in `locale`. Every key exists in every locale, by type. */
export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}
