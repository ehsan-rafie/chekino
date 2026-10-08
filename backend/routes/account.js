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

module.exports = router;
