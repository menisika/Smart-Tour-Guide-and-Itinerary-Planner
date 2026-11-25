// Ad-hoc query against the city database: node src/sql.ts "SELECT kind, count(*) FROM place GROUP BY 1"
import { openDb, rows } from './lib.ts';

const sql = process.argv[2];
if (!sql) {
  console.error('usage: node src/sql.ts "<SQL>"');
  process.exit(1);
}
const con = await openDb({ readOnly: true });
for (const r of await rows(con, sql)) console.log(JSON.stringify(r));
