import { describe, expect, it } from 'vitest';

import { isLocale, matchLocale, messageKeys, supportedLocales, translate } from './messages.ts';

const placesOf = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('the dictionary', () => {
  it('has a non-empty text for every key in every locale', () => {
    for (const locale of supportedLocales) {
      for (const key of messageKeys) {
        expect(translate(locale, key), `${locale}: ${key}`).not.toBe('');
      }
    }
  });

  it('names the same places in every locale of a message', () => {
    for (const key of messageKeys) {
      const expected = placesOf(translate('en', key));
      for (const locale of supportedLocales) {
        expect(placesOf(translate(locale, key)), `${locale}: ${key}`).toEqual(expected);
      }
    }
  });

  it('writes the name of a language in that language, whatever the locale', () => {
    expect(translate('en', 'language.ru')).toBe(translate('ru', 'language.ru'));
    expect(translate('ru', 'language.en')).toBe(translate('en', 'language.en'));
  });
});

describe('translate', () => {
  it('puts a value into its place', () => {
    expect(translate('en', 'settings.deviceData.ready', { version: 3 })).toBe(
      'Ready, version 3 of the structure.',
    );
  });

  it('leaves a place without a value as written', () => {
    expect(translate('en', 'settings.deviceData.ready', {})).toContain('{version}');
  });
});

describe('isLocale', () => {
  it('tells a supported locale from an unsupported one', () => {
    expect(isLocale('ru')).toBe(true);
    expect(isLocale('be')).toBe(false);
  });
});

describe('matchLocale', () => {
  it('ignores the region and the script of a preference', () => {
    expect(matchLocale(['en-001'])).toBe('en');
    expect(matchLocale(['ru_Cyrl'])).toBe('ru');
    expect(matchLocale(['EN'])).toBe('en');
  });

  it('takes the first preference the interface has', () => {
    expect(matchLocale(['pl', 'be', 'en', 'ru'])).toBe('en');
  });

  it('falls back to the default language', () => {
    expect(matchLocale([])).toBe('ru');
    expect(matchLocale(['pl', ''])).toBe('ru');
  });
});
