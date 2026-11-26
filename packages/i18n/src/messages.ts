export const supportedLocales = ['ru', 'en'] as const;

/** A language the interface exists in. Stored data keeps open strings (`I18N-3`). */
export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = 'ru';

const english = {
  'app.name': 'Promenade',
  'app.tagline': 'A walk through the city, planned for your company.',
  'skeleton.notice': 'This is the empty skeleton of the product. Nothing is built yet.',

  // The name of a language is written in that language, in every locale.
  'language.ru': 'Русский',
  'language.en': 'English',

  // The shell of the application: its sections and what each says when empty.
  'shell.navigation': 'Sections of the application',
  'shell.tab.routes': 'Routes',
  'shell.tab.outing': 'Outing',
  'shell.tab.profile': 'Profile',
  'routes.title': 'Routes',
  'routes.empty': 'There are no Routes yet. Saved Routes will be listed here.',
  'outing.title': 'Outing',
  'outing.none': 'No Outing is under way. An Outing starts from a Route.',
  'profile.title': 'Profile',
  'profile.empty': 'Pace, interests and limits will be kept here.',
  'profile.openSettings': 'Settings',
  'settings.title': 'Settings',
  'settings.language': 'Language of the interface',
  'settings.back': 'Back to the Profile',
  'settings.deviceData': 'Data on this device',
  'settings.deviceData.opening': 'Opening the data on this device…',
  'settings.deviceData.ready': 'Ready, version {version} of the structure.',
  'settings.deviceData.failed': 'The data on this device did not open.',
  'settings.deviceData.absent': 'A browser keeps no Outing data: Outings run in the application.',

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

    'language.ru': 'Русский',
    'language.en': 'English',

    'shell.navigation': 'Разделы приложения',
    'shell.tab.routes': 'Маршруты',
    'shell.tab.outing': 'Прогулка',
    'shell.tab.profile': 'Профиль',
    'routes.title': 'Маршруты',
    'routes.empty': 'Маршрутов пока нет. Сохранённые маршруты появятся здесь.',
    'outing.title': 'Прогулка',
    'outing.none': 'Сейчас прогулки нет. Прогулка начинается с маршрута.',
    'profile.title': 'Профиль',
    'profile.empty': 'Здесь будут темп, интересы и запреты.',
    'profile.openSettings': 'Настройки',
    'settings.title': 'Настройки',
    'settings.language': 'Язык интерфейса',
    'settings.back': 'Назад к профилю',
    'settings.deviceData': 'Данные на этом устройстве',
    'settings.deviceData.opening': 'Открываем данные на этом устройстве…',
    'settings.deviceData.ready': 'Готово, версия структуры — {version}.',
    'settings.deviceData.failed': 'Данные на этом устройстве не открылись.',
    'settings.deviceData.absent': 'Браузер не хранит данные прогулок: прогулки идут в приложении.',

    'console.title': 'Promenade — внутренняя консоль',
    'console.api.checking': 'Проверяем API…',
    'console.api.ok': 'API отвечает, база данных готова.',
    'console.api.unavailable': 'API или его база данных недоступны.',
  },
};

export function isLocale(value: string): value is Locale {
  return (supportedLocales as readonly string[]).includes(value);
}

/**
 * The interface language for a person who prefers `preferred`, most wanted
 * first. The preferences are open strings as a device or a browser reports
 * them (`ru-Cyrl`, `en_001`, `pl`); a region or a script is ignored, and a
 * language the interface does not have falls through to the next one.
 */
export function matchLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const language = /^[A-Za-z]{2,3}/.exec(tag.trim())?.[0].toLowerCase();
    if (language !== undefined && isLocale(language)) {
      return language;
    }
  }
  return defaultLocale;
}

/** What stands in the `{name}` places of a message. */
export type MessageValues = Readonly<Record<string, string | number>>;

/**
 * The text of `key` in `locale`. Every key exists in every locale, by type.
 * A `{name}` in the text is replaced by `values.name`; a place with no value
 * is left as written, so that a forgotten value is seen and not hidden.
 */
export function translate(locale: Locale, key: MessageKey, values?: MessageValues): string {
  const text = messages[locale][key];
  if (values === undefined) {
    return text;
  }
  return text.replace(/\{(\w+)\}/g, (place, name: string) =>
    name in values ? String(values[name]) : place,
  );
}

/** Every key of the dictionary, for the checks that walk all of it. */
export const messageKeys = Object.keys(english) as readonly MessageKey[];
