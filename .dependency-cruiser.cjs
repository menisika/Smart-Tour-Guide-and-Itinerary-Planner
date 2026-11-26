/**
 * Import boundaries of the repository, checked by `pnpm lint:boundaries`.
 *
 * Every rule names the decision it enforces. The rules are exercised against
 * deliberately wrong code in `tools/architecture-tests`.
 *
 * A path is matched twice where a package could be imported by its name: as a
 * resolved file (`packages/planner/...`) and as an unresolved specifier
 * (`@promenade/planner`), so that a rule keeps working when resolution fails.
 */

const API_MODULES = '^apps/api/src/modules/';
const API_MODULE_INDEX = '^apps/api/src/modules/[^/]+/index\\.ts$';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ── ADR-0006, point 7 ────────────────────────────────────────────────
    {
      name: 'verifier-not-to-planner',
      comment:
        'The verifier shares no code with the planner, neither directly nor through another package (ADR-0006, point 7).',
      severity: 'error',
      from: { path: '^packages/verifier/' },
      to: { path: ['^packages/planner/', '^@promenade/planner($|/)'], reachable: true },
    },
    {
      name: 'verifier-only-on-contracts',
      comment:
        'The verifier depends only on the shared description of the constraints in `contracts` (ADR-0006, point 7).',
      severity: 'error',
      from: { path: '^packages/verifier/src/', pathNot: '\\.test\\.ts$' },
      to: {
        path: ['^packages/', '^apps/', '^@promenade/'],
        pathNot: ['^packages/verifier/', '^packages/contracts/', '^@promenade/contracts($|/)'],
      },
    },

    {
      name: 'testing-entry-only-from-tests',
      comment:
        'The generators of `@promenade/contracts/testing` are for tests and tools: they need fast-check and are not built into `dist`, so shipped code cannot load them (ADR-0006, point 7).',
      severity: 'error',
      from: {
        path: '^(apps|packages)/',
        pathNot: ['\\.test\\.tsx?$', '^packages/contracts/src/testing/'],
      },
      to: { path: ['^packages/contracts/src/testing/', '^@promenade/contracts/testing($|/)'] },
    },

    // ── ADR-0003, point 5 ────────────────────────────────────────────────
    {
      name: 'api-module-internals',
      comment:
        'A module of the API is used only through its public interface, `modules/<name>/index.ts`; its other files are internal (ADR-0003, point 5).',
      severity: 'error',
      from: { path: `${API_MODULES}([^/]+)/` },
      to: {
        path: API_MODULES,
        pathNot: [`${API_MODULES}$1/`, API_MODULE_INDEX],
      },
    },
    {
      name: 'api-module-internals-from-outside',
      comment:
        'Code outside the modules — entry points, the platform layer — also reaches a module only through `modules/<name>/index.ts` (ADR-0003, point 5).',
      severity: 'error',
      from: { path: '^apps/api/src/', pathNot: API_MODULES },
      to: { path: API_MODULES, pathNot: API_MODULE_INDEX },
    },
    {
      name: 'api-platform-not-to-modules',
      comment:
        'The platform layer and the ports serve the modules and know none of them (ADR-0003, point 5).',
      severity: 'error',
      from: { path: '^apps/api/src/(platform|ports)/' },
      to: { path: API_MODULES },
    },

    {
      name: 'api-modules-database-through-index',
      comment:
        'A module reaches the database through `platform/database/index.ts` only — the `sql` tag, `Database` and `UnitOfWork` — and never holds the pool, so that every statement it sends can be read and checked against its own schema (ADR-0003, point 5).',
      severity: 'error',
      from: { path: API_MODULES },
      to: {
        path: '^apps/api/src/platform/database/',
        pathNot: '^apps/api/src/platform/database/index\\.ts$',
      },
    },
    {
      name: 'api-modules-not-to-pg',
      comment:
        'A module does not talk to the database driver itself: a statement sent past `platform/database` escapes the check of schema ownership (ADR-0003, point 5).',
      severity: 'error',
      from: { path: API_MODULES },
      to: { path: ['(^|/)node_modules/pg/', '^pg($|/)'] },
    },

    // ── ADR-0010, points 3 and 5 ─────────────────────────────────────────
    {
      name: 'api-s3-client-only-in-object-store',
      comment:
        'Every file the system writes or serves goes through the `ObjectStore` port; only its adapter in `ports/object-store` talks to the S3 client (ADR-0010, point 3).',
      severity: 'error',
      from: { path: '^apps/api/', pathNot: '^apps/api/src/ports/object-store/' },
      to: { path: ['(^|/)node_modules/@aws-sdk/', '^@aws-sdk/'] },
    },
    {
      name: 'api-object-store-through-index',
      comment:
        'The object store is used through `ports/object-store/index.ts` — the port and its module — never through the adapter. Tests may also take the doubles of `ports/object-store/testing` (ADR-0010, point 3).',
      severity: 'error',
      from: {
        path: '^apps/api/src/',
        pathNot: ['^apps/api/src/ports/object-store/', '\\.test\\.ts$'],
      },
      to: {
        path: '^apps/api/src/ports/object-store/',
        pathNot: '^apps/api/src/ports/object-store/index\\.ts$',
      },
    },
    {
      name: 'api-modules-not-to-filesystem',
      comment:
        'A module or a batch job keeps no file on the disk of the container, which is gone with the instance: what it writes goes through the `ObjectStore` port (ADR-0010, points 3 and 5).',
      severity: 'error',
      from: { path: '^apps/api/src/(modules|jobs)/', pathNot: '\\.test\\.ts$' },
      to: { dependencyTypes: ['core'], path: '^(node:)?fs(/promises)?$' },
    },

    // ── ADR-0005, point 2 ────────────────────────────────────────────────
    {
      name: 'packages-not-to-apps',
      comment: 'Shared packages are used by applications, never the reverse (ADR-0005, point 2).',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'apps-not-to-other-apps',
      comment:
        'Applications share code through packages only; the console shares no screens with the product (ADR-0007).',
      severity: 'error',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/', pathNot: '^apps/$1/' },
    },

    // ── Hygiene ──────────────────────────────────────────────────────────
    {
      name: 'no-circular',
      comment: 'A cycle of imports makes the order of initialisation an accident.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      comment:
        'An import that cannot be resolved cannot be checked by the rules above. Is the dependency declared in the package.json of this package?',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],

  options: {
    doNotFollow: { path: ['node_modules'] },
    exclude: {
      path: [
        '(^|/)node_modules/',
        '(^|/)dist/',
        '(^|/)\\.expo/',
        '^tools/architecture-tests/fixtures/',
      ],
    },
    // Read imports as they are written, including type-only ones: a type
    // imported from the planner is also shared code.
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      // Resolve workspace packages to their sources, as the type checker does.
      conditionNames: ['@promenade/source', 'import', 'require', 'node', 'default', 'types'],
      exportsFields: ['exports'],
      mainFields: ['module', 'main', 'types', 'typings'],
      extensions: ['.ts', '.tsx', '.d.ts', '.js', '.mjs', '.cjs', '.jsx', '.json'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
