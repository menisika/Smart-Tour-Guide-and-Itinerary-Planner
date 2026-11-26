import { describe, expect, it } from 'vitest';

import { InvalidConfigurationError, loadAppConfig } from './app-config.ts';

const complete = {
  DATABASE_URL: 'postgres://user:password@localhost:5432/promenade',
  LANGUAGE_MODEL_ADAPTER: 'replay',
  SPEECH_SYNTHESIS_ADAPTER: 'replay',
  SPEECH_RECOGNITION_ADAPTER: 'replay',
  OBJECT_STORE_ENDPOINT: 'http://object-storage:8333',
  OBJECT_STORE_ACCESS_KEY_ID: 'key',
  OBJECT_STORE_SECRET_ACCESS_KEY: 'secret',
  OBJECT_STORE_PUBLIC_BUCKET: 'promenade-public',
  OBJECT_STORE_PRIVATE_BUCKET: 'promenade-private',
  OBJECT_STORE_PUBLIC_BASE_URL: 'http://localhost:8333/promenade-public/',
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

  it('signs links for the address of the store itself unless devices reach it elsewhere', () => {
    expect(loadAppConfig(complete).objectStore).toMatchObject({
      endpoint: 'http://object-storage:8333',
      linkEndpoint: 'http://object-storage:8333',
      region: 'auto',
      publicBaseUrl: 'http://localhost:8333/promenade-public',
    });
    expect(
      loadAppConfig({ ...complete, OBJECT_STORE_LINK_ENDPOINT: 'http://localhost:8333' })
        .objectStore.linkEndpoint,
    ).toBe('http://localhost:8333');
  });

  it('refuses to start without the credentials of the object store', () => {
    const { OBJECT_STORE_SECRET_ACCESS_KEY: _omitted, ...withoutSecret } = complete;

    expect(() => loadAppConfig(withoutSecret)).toThrow(/OBJECT_STORE_SECRET_ACCESS_KEY/);
  });
});
