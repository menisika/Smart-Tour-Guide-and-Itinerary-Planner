import { describe, expect, it } from 'vitest';

import { isLocale, supportedLocales, translate } from './messages.ts';

describe('translate (placeholder)', () => {
  it('has a non-empty text for the product name in every locale', () => {
    for (const locale of supportedLocales) {
      expect(translate(locale, 'app.name')).not.toBe('');
    }
  });

  it('tells a supported locale from an unsupported one', () => {
    expect(isLocale('ru')).toBe(true);
    expect(isLocale('be')).toBe(false);
  });
});
