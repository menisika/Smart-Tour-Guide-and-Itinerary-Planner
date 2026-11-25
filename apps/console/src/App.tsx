import { type HealthReport, healthReportSchema } from '@promenade/contracts';
import { defaultLocale, translate } from '@promenade/i18n';
import { useEffect, useState } from 'react';

type ApiState =
  | { readonly kind: 'checking' }
  | { readonly kind: 'answered'; readonly report: HealthReport }
  | { readonly kind: 'unreachable' };

/** Asks the API once how it is; the answer is validated against the shared contract. */
async function fetchHealth(signal: AbortSignal): Promise<ApiState> {
  try {
    const response = await fetch('/health', { signal });
    return { kind: 'answered', report: healthReportSchema.parse(await response.json()) };
  } catch {
    return { kind: 'unreachable' };
  }
}

/**
 * PLACEHOLDER: the shell of the console. It proves the path from this
 * application to the API through the shared contracts; the tables, the
 * Dossier editor and the queues of the Curator come later.
 */
export function App() {
  const [api, setApi] = useState<ApiState>({ kind: 'checking' });

  useEffect(() => {
    const controller = new AbortController();
    void fetchHealth(controller.signal).then((state) => {
      if (!controller.signal.aborted) setApi(state);
    });
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main>
      <h1>{translate(defaultLocale, 'console.title')}</h1>
      <p>{translate(defaultLocale, 'skeleton.notice')}</p>
      <ApiStatus api={api} />
    </main>
  );
}

function ApiStatus({ api }: { readonly api: ApiState }) {
  if (api.kind === 'checking') {
    return <p role="status">{translate(defaultLocale, 'console.api.checking')}</p>;
  }
  if (api.kind === 'unreachable' || api.report.status !== 'ok') {
    return <p role="alert">{translate(defaultLocale, 'console.api.unavailable')}</p>;
  }

  const { postgresVersion, postgisVersion } = api.report.database;
  return (
    <p role="status">
      {translate(defaultLocale, 'console.api.ok')} Postgres {postgresVersion}, PostGIS{' '}
      {postgisVersion}.
    </p>
  );
}
