/**
 * @fileoverview Keeps floating-point arithmetic out of the packages whose
 * results must be identical on every JavaScript engine (ADR-0006, point 2).
 *
 * What it reports:
 *  - a numeric literal that is not a safe integer, or is written with a
 *    decimal point or an exponent;
 *  - any use of `Math` other than a short list of functions that map integers
 *    to integers — so `Math.sin`, `Math.pow`, `Math.sqrt`, `Math.random`,
 *    `Math.PI`, `Math[name]` and `const { floor } = Math` are all reported;
 *  - `**` and `**=`, which engines may approximate exactly as `Math.pow`;
 *  - a division that is not directly rounded: `a / b` must be the argument of
 *    `Math.trunc`, `Math.floor`, `Math.ceil` or `Math.round`; `/=` is reported
 *    always;
 *  - `parseFloat`, `Number.parseFloat`, the floating-point constants of
 *    `Number`, and the `Float*Array` types.
 *
 * What it cannot see: a float that arrives from outside as a value. Inputs of
 * these packages are integers by contract.
 */

/** Functions of `Math` that return an integer for integer arguments. */
const INTEGER_SAFE_MATH = new Set([
  'abs',
  'ceil',
  'clz32',
  'floor',
  'imul',
  'max',
  'min',
  'round',
  'sign',
  'trunc',
]);

/** Functions of `Math` that turn the quotient of a division into an integer. */
const ROUNDING_MATH = new Set(['ceil', 'floor', 'round', 'trunc']);

/** Functions whose results ECMAScript allows an engine to approximate. */
const TRANSCENDENTAL_MATH = new Set([
  'acos',
  'acosh',
  'asin',
  'asinh',
  'atan',
  'atan2',
  'atanh',
  'cbrt',
  'cos',
  'cosh',
  'exp',
  'expm1',
  'hypot',
  'log',
  'log10',
  'log1p',
  'log2',
  'pow',
  'sin',
  'sinh',
  'sqrt',
  'tan',
  'tanh',
]);

const FLOAT_GLOBALS = new Set(['parseFloat', 'Float16Array', 'Float32Array', 'Float64Array']);

const FLOAT_NUMBER_MEMBERS = new Set(['parseFloat', 'EPSILON', 'MAX_VALUE', 'MIN_VALUE']);

/**
 * The name of a member access when it is known statically: `Math.floor` and
 * `Math['floor']` give `floor`; `Math[name]` gives `null`.
 *
 * @param {import('estree').MemberExpression} node
 * @returns {string | null}
 */
function staticMemberName(node) {
  if (!node.computed && node.property.type === 'Identifier') return node.property.name;
  if (
    node.computed &&
    node.property.type === 'Literal' &&
    typeof node.property.value === 'string'
  ) {
    return node.property.value;
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'forbid floating-point arithmetic in packages whose results must be identical on every engine',
    },
    schema: [],
    messages: {
      floatLiteral:
        'Floating-point literal {{raw}}. This package uses integers only: seconds, fixed-point scores (ADR-0006).',
      unsafeInteger:
        'The literal {{raw}} is not a safe integer and cannot be represented exactly (ADR-0006).',
      transcendental:
        'Math.{{name}} may give different results on different JavaScript engines and is forbidden here (ADR-0006).',
      mathMember:
        'Math.{{name}} is not on the integer-safe list (abs, ceil, clz32, floor, imul, max, min, round, sign, trunc) (ADR-0006).',
      mathReference:
        '`Math` may only be used as `Math.<function>` with a function of the integer-safe list, so that every use can be checked (ADR-0006).',
      exponent:
        'The `{{operator}}` operator may be approximated by the engine, like Math.pow; multiply instead (ADR-0006).',
      division:
        'Division gives a floating-point number. Round it at once: Math.trunc(a / b), Math.floor(a / b), Math.ceil(a / b) or Math.round(a / b) (ADR-0006).',
      divisionAssignment:
        '`/=` gives a floating-point number. Write `x = Math.trunc(x / y)` with the rounding you mean (ADR-0006).',
      floatGlobal: '`{{name}}` works with floating-point numbers and is forbidden here (ADR-0006).',
    },
  },

  create(context) {
    const { sourceCode } = context;

    /**
     * True when `node` refers to the global of that name and not to a local
     * binding that shadows it.
     *
     * @param {import('estree').Identifier} node
     */
    function isGlobalReference(node) {
      const scope = sourceCode.getScope(node);
      const reference = scope.references.find((candidate) => candidate.identifier === node);
      if (!reference) return false;
      return reference.resolved === null || reference.resolved.defs.length === 0;
    }

    /**
     * True for `Math.trunc(<node>)` and its three siblings.
     *
     * @param {import('estree').Node & import('eslint').Rule.NodeParentExtension} node
     */
    function isDirectlyRounded(node) {
      const { parent } = node;
      if (parent.type !== 'CallExpression' || parent.arguments[0] !== node) return false;
      const { callee } = parent;
      if (callee.type !== 'MemberExpression') return false;
      if (callee.object.type !== 'Identifier' || callee.object.name !== 'Math') return false;
      const name = staticMemberName(callee);
      return name !== null && ROUNDING_MATH.has(name);
    }

    return {
      Literal(node) {
        if (typeof node.value !== 'number') return;
        const raw = node.raw ?? String(node.value);
        const isRadixLiteral = /^0[xXbBoO]/.test(raw);

        if (!Number.isInteger(node.value) || (!isRadixLiteral && /[.eE]/.test(raw))) {
          context.report({ node, messageId: 'floatLiteral', data: { raw } });
        } else if (!Number.isSafeInteger(node.value)) {
          context.report({ node, messageId: 'unsafeInteger', data: { raw } });
        }
      },

      Identifier(node) {
        if (node.name === 'Math') {
          if (!isGlobalReference(node)) return;

          const { parent } = node;
          if (parent.type !== 'MemberExpression' || parent.object !== node) {
            context.report({ node, messageId: 'mathReference' });
            return;
          }

          const name = staticMemberName(parent);
          if (name === null) {
            context.report({ node: parent, messageId: 'mathReference' });
          } else if (TRANSCENDENTAL_MATH.has(name)) {
            context.report({ node: parent, messageId: 'transcendental', data: { name } });
          } else if (!INTEGER_SAFE_MATH.has(name)) {
            context.report({ node: parent, messageId: 'mathMember', data: { name } });
          }
          return;
        }

        if (FLOAT_GLOBALS.has(node.name) && isGlobalReference(node)) {
          context.report({ node, messageId: 'floatGlobal', data: { name: node.name } });
          return;
        }

        if (node.name === 'Number' && isGlobalReference(node)) {
          const { parent } = node;
          if (parent.type !== 'MemberExpression' || parent.object !== node) return;
          const name = staticMemberName(parent);
          if (name !== null && FLOAT_NUMBER_MEMBERS.has(name)) {
            context.report({
              node: parent,
              messageId: 'floatGlobal',
              data: { name: `Number.${name}` },
            });
          }
        }
      },

      BinaryExpression(node) {
        if (node.operator === '**') {
          context.report({ node, messageId: 'exponent', data: { operator: '**' } });
        } else if (node.operator === '/' && !isDirectlyRounded(node)) {
          context.report({ node, messageId: 'division' });
        }
      },

      AssignmentExpression(node) {
        if (node.operator === '**=') {
          context.report({ node, messageId: 'exponent', data: { operator: '**=' } });
        } else if (node.operator === '/=') {
          context.report({ node, messageId: 'divisionAssignment' });
        }
      },
    };
  },
};

export default rule;
