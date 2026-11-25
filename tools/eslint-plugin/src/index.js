import noFloatingPoint from './rules/no-floating-point.js';

/** @type {import('eslint').ESLint.Plugin} */
const plugin = {
  meta: { name: '@promenade/eslint-plugin', version: '0.0.0' },
  rules: {
    'no-floating-point': noFloatingPoint,
  },
};

export default plugin;
