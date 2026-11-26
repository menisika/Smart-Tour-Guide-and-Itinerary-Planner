import type { AddressInfo } from 'node:net';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { healthReportSchema, livenessReportSchema } from '@promenade/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { AppModule } from './app.module.ts';
import { configureApi } from './configure-api.ts';
import { PLANNING_API } from './modules/planning/index.ts';
import { APP_CONFIG, type AppConfig } from './platform/config/app-config.ts';
import { DATABASE_POOL } from './platform/database/pool.ts';
import { LANGUAGE_MODEL } from './ports/language-model/language-model.port.ts';
import { ReplayLanguageModel } from './ports/language-model/replay-language-model.adapter.ts';
import { OBJECT_STORE } from './ports/object-store/index.ts';

const config: AppConfig = {
  port: 0,
  databaseUrl: 'postgres://unused',
  databaseUrlDirect: 'postgres://unused',
  adapters: { languageModel: 'replay', speechSynthesis: 'replay', speechRecognition: 'replay' },
  objectStore: {
    endpoint: 'http://unused.test',
    linkEndpoint: 'http://unused.test',
    region: 'auto',
    accessKeyId: 'unused',
    secretAccessKey: 'unused',
    publicBucket: 'public',
    privateBucket: 'private',
    publicBaseUrl: 'http://unused.test/public',
  },
  recordingsDir: '/nonexistent',
  publicWebDir: null,
};

interface FakePool {
  query(): Promise<{ rows: unknown[] }>;
  end(): Promise<void>;
}

/** Stands in for a database that answers the health query. */
function poolWithPostgis(postgisVersion: string | null): FakePool {
  return {
    query: () =>
      Promise.resolve({ rows: [{ postgres_version: '18.1', postgis_version: postgisVersion }] }),
    end: () => Promise.resolve(),
  };
}

/** Stands in for a database that cannot be reached. */
function unreachablePool(): FakePool {
  return {
    query: () => Promise.reject(new Error('connect ECONNREFUSED')),
    end: () => Promise.resolve(),
  };
}

let app: NestExpressApplication | undefined;

/** Starts the whole API on a free port, wired as in production except for the database. */
async function startApiWith(pool: FakePool): Promise<string> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(config)
    .overrideProvider(DATABASE_POOL)
    .useValue(pool)
    .compile();

  app = moduleRef.createNestApplication<NestExpressApplication>();
  app.useLogger(false);
  configureApi(app, config);
  await app.listen(0, '127.0.0.1');

  const { port } = app.getHttpServer().address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('the API as a whole', () => {
  it('wires every module: the dependency graph resolves', async () => {
    await startApiWith(poolWithPostgis('3.6.1'));

    expect(app?.get(PLANNING_API, { strict: false })).toBeDefined();
    expect(app?.get(LANGUAGE_MODEL, { strict: false })).toBeInstanceOf(ReplayLanguageModel);
    expect(app?.get(OBJECT_STORE, { strict: false })).toBeDefined();
  });

  it('GET /health reports the database and the PostGIS version', async () => {
    const baseUrl = await startApiWith(poolWithPostgis('3.6.1'));

    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(healthReportSchema.parse(await response.json())).toEqual({
      status: 'ok',
      database: { reachable: true, postgresVersion: '18.1', postgisVersion: '3.6.1' },
    });
  });

  it('GET /health answers 503 with the same report when the database is unreachable', async () => {
    const baseUrl = await startApiWith(unreachablePool());

    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(503);
    expect(healthReportSchema.parse(await response.json())).toEqual({
      status: 'unavailable',
      database: { reachable: false, postgresVersion: null, postgisVersion: null },
    });
  });

  it('GET /health/live answers without touching the database', async () => {
    const pool = unreachablePool();
    let queries = 0;
    const baseUrl = await startApiWith({
      ...pool,
      query: () => {
        queries += 1;
        return pool.query();
      },
    });

    const response = await fetch(`${baseUrl}/health/live`);

    expect(response.status).toBe(200);
    expect(livenessReportSchema.parse(await response.json())).toEqual({ status: 'ok' });
    expect(queries).toBe(0);
  });

  it('keeps the health checks outside the /api prefix', async () => {
    const baseUrl = await startApiWith(poolWithPostgis('3.6.1'));

    expect((await fetch(`${baseUrl}/api/health`)).status).toBe(404);
  });
});
