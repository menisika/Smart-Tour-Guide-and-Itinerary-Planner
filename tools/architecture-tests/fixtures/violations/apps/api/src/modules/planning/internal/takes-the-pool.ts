// Breaks the rule: a module that holds the pool can send statements nobody checks.
export { DATABASE_POOL } from '../../../platform/database/pool.ts';
