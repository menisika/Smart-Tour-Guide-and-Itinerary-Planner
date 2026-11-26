import type { Pool } from 'pg';

/**
 * A stand-in for the `pg` pool that keeps a log of what was sent to it, for
 * tests that must run without a database. It answers every statement with no
 * rows, or with the error a test planted.
 *
 * What a real database does with the same statements is checked by
 * `apps/api/integration`.
 */
export interface RecordingPool {
  readonly pool: Pool;
  /** Every statement in the order it was sent, prefixed by the connection it went through. */
  readonly log: string[];
  /** Connections handed out and not yet returned. */
  readonly checkedOut: () => number;
  /** Makes the next statement containing `fragment` fail with `error`. */
  readonly failOn: (fragment: string, error: Error) => void;
}

export function recordingPool(): RecordingPool {
  const log: string[] = [];
  const failures: { fragment: string; error: Error }[] = [];
  let connections = 0;
  let checkedOut = 0;

  const answer = (connection: string, text: string) => {
    log.push(`${connection}: ${text}`);
    const planted = failures.findIndex((failure) => text.includes(failure.fragment));
    if (planted !== -1) {
      const [failure] = failures.splice(planted, 1);
      if (failure !== undefined) return Promise.reject(failure.error);
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };

  const pool = {
    connect: () => {
      connections += 1;
      checkedOut += 1;
      const connection = `connection ${connections}`;
      return Promise.resolve({
        query: (text: string) => answer(connection, text),
        release: () => {
          checkedOut -= 1;
        },
      });
    },
    query: (text: string) => answer('pool', text),
    end: () => Promise.resolve(),
  };

  return {
    pool: pool as unknown as Pool,
    log,
    checkedOut: () => checkedOut,
    failOn: (fragment, error) => {
      failures.push({ fragment, error });
    },
  };
}
