import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';

import rule from './no-floating-point.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
});

ruleTester.run('no-floating-point', rule, {
  valid: [
    'const budgetSeconds = 3 * 60 * 60;',
    'const mask = 0xff; const big = 1_000_000; const id = 10n;',
    'const half = Math.trunc(total / 2);',
    'const up = Math.ceil(total / step); const down = Math.floor(total / step); const near = Math.round(total / step);',
    'const best = Math.max(a, Math.min(b, c)); const distance = Math.abs(a - b);',
    'const hash = Math.imul(seed, 31) >>> 0;',
    'const rest = total % step;',
    'const limit = Number.MAX_SAFE_INTEGER;',
    // A local binding named like a global is not the global.
    'function f(Math) { return Math.sin(1); }',
    'const text = "0.5 is only text here";',
  ],
  invalid: [
    { code: 'const weight = 0.5;', errors: [{ messageId: 'floatLiteral' }] },
    { code: 'const weight = 1.0;', errors: [{ messageId: 'floatLiteral' }] },
    { code: 'const tiny = 1e-3;', errors: [{ messageId: 'floatLiteral' }] },
    { code: 'const thousand = 1e3;', errors: [{ messageId: 'floatLiteral' }] },
    { code: 'const huge = 9007199254740993;', errors: [{ messageId: 'unsafeInteger' }] },

    { code: 'const y = Math.sin(x);', errors: [{ messageId: 'transcendental' }] },
    { code: 'const y = Math.sqrt(x);', errors: [{ messageId: 'transcendental' }] },
    { code: 'const y = Math.pow(x, 2);', errors: [{ messageId: 'transcendental' }] },
    { code: 'const y = Math.atan2(a, b);', errors: [{ messageId: 'transcendental' }] },
    { code: 'const y = Math.log(x);', errors: [{ messageId: 'transcendental' }] },
    { code: "const y = Math['exp'](x);", errors: [{ messageId: 'transcendental' }] },

    { code: 'const r = Math.random();', errors: [{ messageId: 'mathMember' }] },
    { code: 'const pi = Math.PI;', errors: [{ messageId: 'mathMember' }] },
    { code: 'const f = Math.fround(x);', errors: [{ messageId: 'mathMember' }] },

    // Ways of reaching `Math` that would hide which function is used.
    { code: 'const y = Math[name](x);', errors: [{ messageId: 'mathReference' }] },
    { code: 'const { sin } = Math;', errors: [{ messageId: 'mathReference' }] },
    { code: 'const M = Math;', errors: [{ messageId: 'mathReference' }] },

    { code: 'const share = part / total;', errors: [{ messageId: 'division' }] },
    { code: 'const y = Math.abs(a / b);', errors: [{ messageId: 'division' }] },
    { code: 'const y = Math.trunc(1, a / b);', errors: [{ messageId: 'division' }] },
    { code: 'let x = 10; x /= 4;', errors: [{ messageId: 'divisionAssignment' }] },

    { code: 'const square = x ** 2;', errors: [{ messageId: 'exponent' }] },
    { code: 'let x = 2; x **= 3;', errors: [{ messageId: 'exponent' }] },

    { code: 'const y = parseFloat(text);', errors: [{ messageId: 'floatGlobal' }] },
    { code: 'const y = Number.parseFloat(text);', errors: [{ messageId: 'floatGlobal' }] },
    { code: 'const e = Number.EPSILON;', errors: [{ messageId: 'floatGlobal' }] },
    { code: 'const buffer = new Float64Array(8);', errors: [{ messageId: 'floatGlobal' }] },
  ],
});
