const { Pool, types } = require('pg');

// DATE columns (due_date, send_date, spend_date) come back as the plain
// "YYYY-MM-DD" they are. By default pg turns a DATE into a JS Date at
// midnight in the *process's* time zone, which JSON then writes in UTC: on
// a server running in Asia/Tehran every date would reach the dashboard a
// day early, and an edit would save that earlier day back.
types.setTypeParser(1082, (v) => v);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
