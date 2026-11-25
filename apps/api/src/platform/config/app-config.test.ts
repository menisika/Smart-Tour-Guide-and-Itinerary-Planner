import { describe, expect, it } from 'vitest';

import { InvalidConfigurationError, loadAppConfig } from './app-config.ts';

const complete = {
  DATABASE_URL: 'postgres://user:password@localhost:5432/promenade',
  LANGUAGE_MODEL_ADAPTER: 'replay',
  SPEECH_SYNTHESIS_ADAPTER: 'replay',
  SPEECH_RECOGNITION_ADAPTER: 'replay',
};

describe('loadAppConfig', () => {
  it('fills the defaults that are safe to assume', () => {
    const config = loadAppConfig(complete);

    expect(config.port).toBe(8080);
    expect(config.databaseUrlDirect).toBe(complete.DATABASE_URL);
    expect(config.publicWebDir).toBeNull();
    expect(config.recordingsDir).toMatch(/recordings$/);
  });

  it('keeps the pooled and the direct connection apart when both are given', () => {
    const config = loadAppConfig({ ...complete, DATABASE_URL_DIRECT: 'postgres://direct' });

    expect(config.databaseUrl).toBe(complete.DATABASE_URL);
    expect(config.databaseUrlDirect).toBe('postgres://direct');
  });

  it('refuses to start without a database address', () => {
    const { DATABASE_URL: _omitted, ...withoutDatabase } = complete;

    expect(() => loadAppConfig(withoutDatabase)).toThrow(InvalidConfigurationError);
  });

  it('refuses to guess which adapter serves a port', () => {
    const { LANGUAGE_MODEL_ADAPTER: _omitted, ...withoutAdapter } = complete;

    expect(() => loadAppConfig(withoutAdapter)).toThrow(/LANGUAGE_MODEL_ADAPTER/);
  });

  it('refuses an adapter that does not exist', () => {
    expect(() => loadAppConfig({ ...complete, SPEECH_SYNTHESIS_ADAPTER: 'cloud' })).toThrow(
      /SPEECH_SYNTHESIS_ADAPTER/,
    );
  });
});
