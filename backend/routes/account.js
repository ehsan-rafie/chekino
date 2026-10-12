const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const { companyLimiter } = require('../middleware/rateLimit');

// The company signed in, its plan and how much of it is used (H3): what the
// account menu shows («۲۷ از ۱۰۰۰ چک»). Read only.
const router = express.Router();
router.use(authenticate, companyLimiter);

router.get('/', async (req, res) => {
  try {
    const r = (await pool.query(
      `SELECT c.name, p.name AS plan_name, p.max_checks, p.max_people,
              c.subscription_ends_at::text AS subscription_ends_at,
              ((now() AT TIME ZONE 'Asia/Tehran')::date)::text AS today,
              (SELECT COUNT(*) FROM checks WHERE company_id = c.id)::int AS checks,
              (SELECT COUNT(*) FROM people WHERE company_id = c.id)::int AS people
       FROM companies c LEFT JOIN plans p ON p.id = c.plan_id
       WHERE c.id = $1`,
      [req.companyId]
    )).rows[0];
    if (!r) return res.status(404).json({ error: 'حساب پیدا نشد' });
    res.json(r);
  } catch (err) {
    console.error('Account error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// Everything the company has here, in one file (spec 9.10: the customer's
// data is theirs to take): its people, and its cheques with their history
// and the list of their files (each one is GET /api/images/:id; the bytes
// stay out — a hundred photos would make the file unwieldy). Read only.
router.get('/export', async (req, res) => {
  try {
    const company = (await pool.query('SELECT name FROM companies WHERE id = $1', [req.companyId])).rows[0];
    if (!company) return res.status(404).json({ error: 'حساب پیدا نشد' });
    const people = (await pool.query(
      'SELECT id, full_name, national_id, phone, role, created_at FROM people WHERE company_id = $1 ORDER BY id',
      [req.companyId]
    )).rows;
    const cheques = (await pool.query(
      `SELECT c.id, c.serial, c.sayad_id, c.amount, c.due_date::text AS due_date, c.send_date::text AS send_date,
              c.spend_date::text AS spend_date, c.stage, c.status, c.status_history, c.channels, c.notes,
              c.owner_id, o.full_name AS owner_name, c.party_id, p.full_name AS party_name,
              c.beneficiary_id, b.full_name AS beneficiary_name, b.national_id AS beneficiary_national_id,
              c.created_at, c.updated_at,
              COALESCE((SELECT json_agg(json_build_object('id', i.id, 'kind', i.kind, 'mime', i.mime, 'bytes', i.byte_size)
                                        ORDER BY i.position, i.created_at)
                        FROM check_images i WHERE i.check_id = c.id), '[]'::json) AS files
       FROM checks c
       LEFT JOIN people o ON o.id = c.owner_id
       LEFT JOIN people p ON p.id = c.party_id
       LEFT JOIN people b ON b.id = c.beneficiary_id
       WHERE c.company_id = $1 ORDER BY c.id`,
      [req.companyId]
    )).rows;
    const day = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="chekino-export-${day}.json"`);
    res.json({ exported_at: new Date().toISOString(), company: company.name, people, cheques });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

module.exports = router;
