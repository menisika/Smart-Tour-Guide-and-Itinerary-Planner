import { describe, expect, it } from 'vitest';

import { localeCodeSchema, localizedTextSchema } from './locale.ts';

describe('localeCodeSchema', () => {
  it('accepts a language the product does not have yet', () => {
    for (const code of ['ru', 'en', 'be', 'pl', 'be-tarask', 'zh-Hant']) {
      expect(localeCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it('refuses what is not a language tag', () => {
    for (const code of ['', 'r', 'russian language', 'ru_RU', '-ru']) {
      expect(localeCodeSchema.safeParse(code).success).toBe(false);
    }
  });
});

describe('localizedTextSchema', () => {
  it('takes one more language as one more key', () => {
    const twoLanguages = { ru: 'Прогулка', en: 'Outing' };
    const threeLanguages = { ...twoLanguages, be: 'Шпацыр' };

    expect(localizedTextSchema.parse(twoLanguages)).toEqual(twoLanguages);
    expect(localizedTextSchema.parse(threeLanguages)).toEqual(threeLanguages);
  });

  it('refuses a key that is not a language tag', () => {
    expect(localizedTextSchema.safeParse({ 'not a tag': 'x' }).success).toBe(false);
  });
});
