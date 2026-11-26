import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { packageRoot, repositoryRoot, violationsRoot } from './repository.ts';

/**
 * Runs the real rule set of `.dependency-cruiser.cjs` — the one `pnpm lint`
 * uses — over a tree of deliberately wrong imports, and checks that each rule
 * fires where it must and stays silent where the import is legitimate.
 */

interface Violation {
  readonly rule: string;
  readonly from: string;
  readonly to: string;
}

interface CruiseOutcome {
  /** Exit code of the check as `pnpm lint:boundaries` runs it. */
  readonly exitCode: number | null;
  /** What that run printed. */
  readonly report: string;
  readonly violations: readonly Violation[];
}

interface DependencyCruiserReport {
  readonly summary: {
    readonly violations: readonly {
      readonly rule: { readonly name: string };
      readonly from: string;
      readonly to: string;
    }[];
  };
}

function depcruise(outputType: 'err' | 'json') {
  const result = spawnSync(
    join(packageRoot, 'node_modules/.bin/depcruise'),
    [
      '--config',
      join(repositoryRoot, '.dependency-cruiser.cjs'),
      '--output-type',
      outputType,
      'apps',
      'packages',
    ],
    { cwd: violationsRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  return result;
}

function cruiseViolationsFixture(): CruiseOutcome {
  // Once as the lint script runs it — the exit code is what fails a build —
  // and once as JSON, to read which import broke which rule.
  const asLint = depcruise('err');
  const report = JSON.parse(depcruise('json').stdout) as DependencyCruiserReport;

  return {
    exitCode: asLint.status,
    report: asLint.stdout + asLint.stderr,
    violations: report.summary.violations.map((violation) => ({
      rule: violation.rule.name,
      from: violation.from,
      to: violation.to,
    })),
  };
}

describe('import boundaries fail on a deliberate violation', () => {
  let outcome: CruiseOutcome;

  beforeAll(() => {
    outcome = cruiseViolationsFixture();
  });

  const reported = (rule: string, from: string, to: string): boolean =>
    outcome.violations.some(
      (violation) => violation.rule === rule && violation.from === from && violation.to === to,
    );

  const reportedFrom = (from: string): readonly string[] =>
    outcome.violations
      .filter((violation) => violation.from === from)
      .map((violation) => violation.rule);

  it('makes the check exit with an error and name the broken rules', () => {
    expect(outcome.exitCode).not.toBe(0);
    expect(outcome.report).toContain('error verifier-not-to-planner');
    expect(outcome.report).toContain('error api-module-internals');
  });

  describe('the verifier may not import the planner (ADR-0006)', () => {
    it('catches a relative import', () => {
      expect(
        reported(
          'verifier-not-to-planner',
          'packages/verifier/src/imports-planner-directly.ts',
          'packages/planner/src/index.ts',
        ),
      ).toBe(true);
    });

    it('catches an import by package name', () => {
      expect(
        reported(
          'verifier-not-to-planner',
          'packages/verifier/src/imports-planner-by-name.ts',
          '@promenade/planner',
        ),
      ).toBe(true);
    });

    it('catches the planner reached through another package', () => {
      expect(
        reported(
          'verifier-not-to-planner',
          'packages/verifier/src/imports-planner-through-routing.ts',
          'packages/planner/src/index.ts',
        ),
      ).toBe(true);
      expect(
        reported(
          'verifier-only-on-contracts',
          'packages/verifier/src/imports-planner-through-routing.ts',
          'packages/routing/src/index.ts',
        ),
      ).toBe(true);
    });

    it('accepts an import of the shared contracts', () => {
      expect(reportedFrom('packages/verifier/src/allowed.ts')).toEqual([]);
    });
  });

  describe("a module of the API may not import another module's internals (ADR-0003)", () => {
    it('catches a module that reaches into another module', () => {
      expect(
        reported(
          'api-module-internals',
          'apps/api/src/modules/planning/internal/reaches-into-places.ts',
          'apps/api/src/modules/places/internal/places.repository.ts',
        ),
      ).toBe(true);
    });

    it('catches platform code that reaches into a module', () => {
      const rules = reportedFrom('apps/api/src/platform/reaches-into-module.ts');

      expect(rules).toContain('api-module-internals-from-outside');
      expect(rules).toContain('api-platform-not-to-modules');
    });

    it('accepts the use of a module through its index', () => {
      expect(
        reportedFrom('apps/api/src/modules/planning/internal/uses-places-through-index.ts'),
      ).toEqual([]);
      expect(reportedFrom('apps/api/src/app.ts')).toEqual([]);
    });

    it("accepts a module's use of its own internals", () => {
      expect(reportedFrom('apps/api/src/modules/places/internal/places.facade.ts')).toEqual([]);
      expect(reportedFrom('apps/api/src/modules/places/index.ts')).toEqual([]);
    });
  });

  describe('the test-only generators stay out of shipped code (ADR-0006)', () => {
    it('catches a source file that imports them', () => {
      expect(
        reported(
          'testing-entry-only-from-tests',
          'packages/planner/src/ships-the-generator.ts',
          'packages/contracts/src/testing/index.ts',
        ),
      ).toBe(true);
    });

    it('accepts a test that imports them', () => {
      expect(reportedFrom('packages/planner/src/uses-the-generator.test.ts')).toEqual([]);
    });
  });

  describe('a module reaches the database through the platform only (ADR-0003)', () => {
    it('catches a module that takes the pool', () => {
      expect(
        reported(
          'api-modules-database-through-index',
          'apps/api/src/modules/planning/internal/takes-the-pool.ts',
          'apps/api/src/platform/database/pool.ts',
        ),
      ).toBe(true);
    });

    it('catches a module that imports the database driver', () => {
      expect(
        reportedFrom('apps/api/src/modules/planning/internal/imports-the-driver.ts'),
      ).toContain('api-modules-not-to-pg');
    });

    it("accepts the use of the database layer's index", () => {
      expect(
        reportedFrom('apps/api/src/modules/planning/internal/uses-the-database-index.ts'),
      ).toEqual([]);
    });
  });

  describe('files go through the ObjectStore port only (ADR-0010)', () => {
    const knowledge = 'apps/api/src/modules/knowledge/internal';

    it('catches a module that talks to the S3 client', () => {
      expect(reportedFrom(`${knowledge}/uses-the-s3-client.ts`)).toContain(
        'api-s3-client-only-in-object-store',
      );
    });

    it('catches a module that takes the adapter instead of the port', () => {
      expect(
        reported(
          'api-object-store-through-index',
          `${knowledge}/takes-the-adapter.ts`,
          'apps/api/src/ports/object-store/s3-object-store.adapter.ts',
        ),
      ).toBe(true);
    });

    it('catches a module that writes a file to the disk', () => {
      expect(reportedFrom(`${knowledge}/writes-a-file.ts`)).toContain(
        'api-modules-not-to-filesystem',
      );
    });

    it('accepts the port, and the S3 client inside the adapter', () => {
      expect(reportedFrom(`${knowledge}/uses-the-port.ts`)).toEqual([]);
      expect(
        reportedFrom('apps/api/src/ports/object-store/s3-object-store.adapter.ts'),
      ).not.toContain('api-s3-client-only-in-object-store');
    });
  });

  it('catches a shared package that imports an application (ADR-0005)', () => {
    expect(
      reported(
        'packages-not-to-apps',
        'packages/contracts/src/reaches-into-app.ts',
        'apps/api/src/app.ts',
      ),
    ).toBe(true);
  });
});
