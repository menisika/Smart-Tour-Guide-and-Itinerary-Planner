/**
 * Commit messages: Conventional Commits, short, with a scope from a closed list.
 * The rules and their reasons are in CONTRIBUTING.md; `.husky/commit-msg` runs
 * this on every commit.
 *
 * @type {import('@commitlint/types').UserConfig}
 */
export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        // The owner's rule: a commit is the owner's alone. No co-author line and
        // no line naming the tool that wrote the change.
        'no-attribution': ({ raw }) => [
          !/^co-authored-by:|generated with \[?claude/im.test(raw),
          'the message may not carry a Co-Authored-By line or a tool attribution',
        ],
      },
    },
  ],
  rules: {
    'no-attribution': [2, 'always'],

    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'refactor', 'test', 'chore', 'ci', 'build', 'perf', 'revert'],
    ],

    // The scope says which part of the repository changed. `repo` is for what
    // belongs to no single part; `deps` for dependency updates.
    'scope-empty': [2, 'never'],
    'scope-enum': [
      2,
      'always',
      [
        'api',
        'mobile',
        'console',
        'contracts',
        'planner',
        'verifier',
        'routing',
        'triggers',
        'i18n',
        'tools',
        'infra',
        'docker',
        'ci',
        'docs',
        'design',
        'spikes',
        'deps',
        'repo',
      ],
    ],

    // Short on purpose: the header says what changed, the optional body says
    // why, and neither retells the diff.
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
    'body-max-length': [2, 'always', 600],
    'footer-max-line-length': [2, 'always', 100],
  },
};
