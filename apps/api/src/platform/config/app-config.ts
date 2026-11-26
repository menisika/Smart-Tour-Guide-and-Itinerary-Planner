import { fileURLToPath } from 'node:url';

import { z } from 'zod';

/**
 * Adapters that exist for the model and speech ports. Only `replay` exists so
 * far; the cloud adapters of ADR-0004 and ADR-0014 are added to this list when
 * they are written.
 */
const adapterSchema = z.enum(['replay']);

export type AdapterName = z.infer<typeof adapterSchema>;

/**
 * The adapter settings have no default on purpose: a deployment that forgot to
 * choose must fail at start-up rather than quietly replay recordings.
 */
const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_DIRECT: z.string().min(1).optional(),
  LANGUAGE_MODEL_ADAPTER: adapterSchema,
  SPEECH_SYNTHESIS_ADAPTER: adapterSchema,
  SPEECH_RECOGNITION_ADAPTER: adapterSchema,
  OBJECT_STORE_ENDPOINT: z.url(),
  OBJECT_STORE_LINK_ENDPOINT: z.url().optional(),
  OBJECT_STORE_REGION: z.string().min(1).default('auto'),
  OBJECT_STORE_ACCESS_KEY_ID: z.string().min(1),
  OBJECT_STORE_SECRET_ACCESS_KEY: z.string().min(1),
  OBJECT_STORE_PUBLIC_BUCKET: z.string().min(1),
  OBJECT_STORE_PRIVATE_BUCKET: z.string().min(1),
  OBJECT_STORE_PUBLIC_BASE_URL: z.url(),
  RECORDINGS_DIR: z.string().min(1).optional(),
  PUBLIC_WEB_DIR: z.string().min(1).optional(),
});

export interface AppConfig {
  readonly port: number;
  /** Connection for the API. In the cloud this is the pooler (ADR-0010, point 9). */
  readonly databaseUrl: string;
  /** Direct connection, for migrations, the worker and batch jobs. */
  readonly databaseUrlDirect: string;
  readonly adapters: {
    readonly languageModel: AdapterName;
    readonly speechSynthesis: AdapterName;
    readonly speechRecognition: AdapterName;
  };
  /** The S3-compatible store behind the `ObjectStore` port (ADR-0010, point 3). */
  readonly objectStore: {
    /** Where the API reaches the store. */
    readonly endpoint: string;
    /** The address of the store as devices see it; signed links are made for it. */
    readonly linkEndpoint: string;
    readonly region: string;
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly publicBucket: string;
    readonly privateBucket: string;
    /** The address under which the public bucket is served, without a trailing slash. */
    readonly publicBaseUrl: string;
  };
  /** Where the replay adapters find recorded responses. */
  readonly recordingsDir: string;
  /** The exported public web (`client/` and `server/`), or `null` when it is not mounted. */
  readonly publicWebDir: string | null;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

export class InvalidConfigurationError extends Error {
  constructor(problems: readonly string[]) {
    super(`Invalid configuration:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
    this.name = 'InvalidConfigurationError';
  }
}

/** `recordings/` next to `src/` and `dist/`, wherever the package is installed. */
const defaultRecordingsDir = fileURLToPath(new URL('../../../recordings', import.meta.url));

export function loadAppConfig(environment: NodeJS.ProcessEnv): AppConfig {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    throw new InvalidConfigurationError(
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }

  const values = parsed.data;
  return {
    port: values.PORT,
    databaseUrl: values.DATABASE_URL,
    databaseUrlDirect: values.DATABASE_URL_DIRECT ?? values.DATABASE_URL,
    adapters: {
      languageModel: values.LANGUAGE_MODEL_ADAPTER,
      speechSynthesis: values.SPEECH_SYNTHESIS_ADAPTER,
      speechRecognition: values.SPEECH_RECOGNITION_ADAPTER,
    },
    objectStore: {
      endpoint: values.OBJECT_STORE_ENDPOINT,
      linkEndpoint: values.OBJECT_STORE_LINK_ENDPOINT ?? values.OBJECT_STORE_ENDPOINT,
      region: values.OBJECT_STORE_REGION,
      accessKeyId: values.OBJECT_STORE_ACCESS_KEY_ID,
      secretAccessKey: values.OBJECT_STORE_SECRET_ACCESS_KEY,
      publicBucket: values.OBJECT_STORE_PUBLIC_BUCKET,
      privateBucket: values.OBJECT_STORE_PRIVATE_BUCKET,
      publicBaseUrl: values.OBJECT_STORE_PUBLIC_BASE_URL.replace(/\/+$/, ''),
    },
    recordingsDir: values.RECORDINGS_DIR ?? defaultRecordingsDir,
    publicWebDir: values.PUBLIC_WEB_DIR ?? null,
  };
}
