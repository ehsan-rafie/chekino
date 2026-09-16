const express = require('express');
const { body, param } = require('express-validator');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

const idParamValidation = [param('id').isInt().withMessage('شناسه نامعتبر است')];

const personBodyValidation = [
  body('full_name').trim().notEmpty().withMessage('full_name الزامی است').isLength({ max: 200 }),
  body('national_id').optional({ values: 'falsy' }).isString().isLength({ max: 30 }).withMessage('national_id نامعتبر است'),
  body('phone').optional({ values: 'falsy' }).isString().isLength({ max: 30 }).withMessage('phone نامعتبر است'),
];

const personBodyValidationOptional = [
  body('full_name').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('national_id').optional({ values: 'falsy' }).isString().isLength({ max: 30 }).withMessage('national_id نامعتبر است'),
  body('phone').optional({ values: 'falsy' }).isString().isLength({ max: 30 }).withMessage('phone نامعتبر است'),
];

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, national_id, phone, created_at FROM people WHERE company_id = $1 ORDER BY id DESC',
      [req.companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List people error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/', personBodyValidation, validate, async (req, res) => {
  try {
    const { full_name, national_id, phone } = req.body;

    const planCheck = await pool.query(
      `SELECT p.max_people, (SELECT COUNT(*) FROM people WHERE company_id = $1) AS current_count
       FROM companies c LEFT JOIN plans p ON p.id = c.plan_id
       WHERE c.id = $1`,
      [req.companyId]
    );
    const { max_people, current_count } = planCheck.rows[0];
    if (max_people !== null && Number(current_count) >= Number(max_people)) {
      return res.status(403).json({
        error: `سقف تعداد اشخاص طبق پلن شما (${max_people} نفر) پر شده است. برای افزودن شخص جدید، یکی را حذف کنید یا پلن خود را ارتقا دهید.`,
      });
    }

    const result = await pool.query(
      'INSERT INTO people (company_id, full_name, national_id, phone) VALUES ($1, $2, $3, $4) RETURNING id, full_name, national_id, phone, created_at',
      [req.companyId, full_name, national_id || null, phone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create person error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.put('/:id', idParamValidation, personBodyValidationOptional, validate, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, national_id, phone } = req.body;

    const existing = await pool.query(
      'SELECT id FROM people WHERE id = $1 AND company_id = $2',
      [id, req.companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'شخص یافت نشد' });
    }

    const result = await pool.query(
      'UPDATE people SET full_name = COALESCE($1, full_name), national_id = COALESCE($2, national_id), phone = COALESCE($3, phone) WHERE id = $4 AND company_id = $5 RETURNING id, full_name, national_id, phone, created_at',
      [full_name || null, national_id || null, phone || null, id, req.companyId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update person error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.delete('/:id', idParamValidation, validate, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id FROM people WHERE id = $1 AND company_id = $2',
      [id, req.companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'شخص یافت نشد' });
    }

    const linkedChecks = await pool.query(
      'SELECT id FROM checks WHERE (owner_id = $1 OR party_id = $1 OR beneficiary_id = $1) LIMIT 1',
      [id]
    );

    if (linkedChecks.rows.length > 0) {
      return res.status(409).json({ error: 'این شخص دارای چک ثبت‌شده است و قابل حذف نیست' });
    }

    await pool.query('DELETE FROM people WHERE id = $1 AND company_id = $2', [id, req.companyId]);
    res.json({ message: 'شخص با موفقیت حذف شد' });
  } catch (err) {
    console.error('Delete person error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

module.exports = router;
