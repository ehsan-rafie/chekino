const pool = require('../db');

// What the admin did (migration_009): one row an action, after it succeeded.
// Writing it never stands in the way of the action itself — without the
// table (before the migration) or on any error, nothing is written.
//   action: company.create | company.update | company.password |
//           company.status | company.delete | company.subscription |
//           plan.create | plan.update | plan.delete | admin.account |
//           admin.login | admin.login_failed
async function adminLog(req, action, { companyId = null, companyName = null, details = {}, username } = {}) {
  try {
    const who = username || (req.admin && req.admin.username) || '';
    await pool.query(
      'INSERT INTO admin_log (admin_username, action, company_id, company_name, details, ip) VALUES ($1, $2, $3, $4, $5::jsonb, $6)',
      [who, action, companyId, companyName, JSON.stringify(details || {}), req.ip || null]
    );
  } catch (err) {
    // (no table yet, or the database busy: the action stands)
  }
}

// a company's name, for the log (it outlives the company)
async function companyName(id) {
  try { return ((await pool.query('SELECT name FROM companies WHERE id = $1', [id])).rows[0] || {}).name || null; } catch (e) { return null; }
}

module.exports = { adminLog, companyName };
