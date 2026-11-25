import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { repositoryRoot } from './repository.ts';

interface Manifest {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
}

function declaredDependencies(packagePath: string): readonly string[] {
  const manifest = JSON.parse(
    readFileSync(join(repositoryRoot, packagePath, 'package.json'), 'utf8'),
  ) as Manifest;

  return [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ];
}

/**
 * pnpm links into a package only what its `package.json` declares, so an
 * undeclared workspace package cannot even be resolved. These tests keep the
 * declarations themselves honest.
 */
describe('package manifests keep the dependency rules', () => {
  it('the verifier does not declare the planner, in any kind of dependency', () => {
    expect(declaredDependencies('packages/verifier')).not.toContain('@promenade/planner');
  });

  it('the verifier declares no workspace package other than contracts', () => {
    const workspaceDependencies = declaredDependencies('packages/verifier').filter((name) =>
      name.startsWith('@promenade/'),
    );

    expect(workspaceDependencies).toEqual(['@promenade/contracts']);
  });

  it.each(['contracts', 'i18n', 'planner', 'routing', 'triggers', 'verifier'])(
    'the shared package %s declares no application',
    (name) => {
      const applications = ['@promenade/api', '@promenade/console', '@promenade/mobile'];

      for (const application of applications) {
        expect(declaredDependencies(`packages/${name}`)).not.toContain(application);
      }
    },
  );
});
