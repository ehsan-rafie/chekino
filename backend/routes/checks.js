const express = require('express');
const { body, param } = require('express-validator');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

const SELECT_FIELDS = `
  c.id, c.company_id, c.serial, c.sayad_id, c.amount, c.due_date, c.send_date, c.spend_date,
  c.status, c.status_history, c.channels, c.notes, c.receipt_image, c.created_at,
  c.owner_id, o.full_name AS owner_name,
  c.party_id, p.full_name AS party_name,
  c.beneficiary_id, b.full_name AS beneficiary_name, b.national_id AS beneficiary_national_id
`;

const JOIN_CLAUSE = `
  FROM checks c
  JOIN people o ON o.id = c.owner_id
  JOIN people p ON p.id = c.party_id
  JOIN people b ON b.id = c.beneficiary_id
`;

async function ensureOwnedPeople(companyId, ids) {
  const uniqueIds = [...new Set(ids.filter((x) => x !== undefined && x !== null))];
  if (uniqueIds.length === 0) return true;
  const result = await pool.query(
    'SELECT id FROM people WHERE company_id = $1 AND id = ANY($2::int[])',
    [companyId, uniqueIds]
  );
  return result.rows.length === uniqueIds.length;
}

const idParamValidation = [param('id').isInt().withMessage('شناسه نامعتبر است')];

// The receipt is stored as a base64 data URL and rendered back in an <img> /
// object on the dashboard. The frontend only ever sends a photo or a PDF, so
// require exactly that shape and cap the size — this keeps the column from
// being used to stash arbitrary large blobs or non-image URIs (the express
// body limit alone would allow ~15MB of anything here).
const RECEIPT_MAX = 14 * 1024 * 1024; // chars of base64 (~10MB binary)
const RECEIPT_RE = /^data:(image\/(png|jpe?g|webp|gif)|application\/pdf);base64,[A-Za-z0-9+/=]+$/;
const receiptImageValidator = (name) =>
  body(name).optional({ values: 'falsy' }).isString()
    .bail().isLength({ max: RECEIPT_MAX }).withMessage('حجم تصویر رسید بیش از حد مجاز است')
    .bail().matches(RECEIPT_RE).withMessage('فرمت تصویر رسید نامعتبر است (فقط عکس یا PDF)');

const STATUS_VALUES = ['pending', 'done', 'problem'];

const createValidation = [
  body('serial').trim().notEmpty().withMessage('serial الزامی است').isLength({ max: 50 }),
  body('sayad_id').optional({ values: 'falsy' }).isString().isLength({ max: 50 }),
  body('amount').notEmpty().withMessage('amount الزامی است').isFloat({ min: 0 }).withMessage('amount باید عدد مثبت باشد'),
  body('due_date').notEmpty().withMessage('due_date الزامی است').isISO8601().withMessage('due_date نامعتبر است'),
  body('send_date').optional({ values: 'falsy' }).isISO8601().withMessage('send_date نامعتبر است'),
  body('spend_date').optional({ values: 'falsy' }).isISO8601().withMessage('spend_date نامعتبر است'),
  body('owner_id').notEmpty().withMessage('owner_id الزامی است').isInt().withMessage('owner_id نامعتبر است'),
  body('party_id').notEmpty().withMessage('party_id الزامی است').isInt().withMessage('party_id نامعتبر است'),
  body('beneficiary_id').notEmpty().withMessage('beneficiary_id الزامی است').isInt().withMessage('beneficiary_id نامعتبر است'),
  body('notes').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }),
  receiptImageValidator('receipt_image'),
  body('channels').optional().isArray().withMessage('channels باید آرایه باشد'),
  body('status').optional({ values: 'falsy' }).isIn(STATUS_VALUES).withMessage('status نامعتبر است'),
];

const updateValidation = [
  body('serial').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  body('sayad_id').optional({ values: 'falsy' }).isString().isLength({ max: 50 }),
  body('amount').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('amount باید عدد مثبت باشد'),
  body('due_date').optional({ values: 'falsy' }).isISO8601().withMessage('due_date نامعتبر است'),
  body('send_date').optional({ values: 'falsy' }).isISO8601().withMessage('send_date نامعتبر است'),
  body('spend_date').optional({ values: 'falsy' }).isISO8601().withMessage('spend_date نامعتبر است'),
  body('owner_id').optional({ values: 'falsy' }).isInt().withMessage('owner_id نامعتبر است'),
  body('party_id').optional({ values: 'falsy' }).isInt().withMessage('party_id نامعتبر است'),
  body('beneficiary_id').optional({ values: 'falsy' }).isInt().withMessage('beneficiary_id نامعتبر است'),
  body('notes').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }),
  receiptImageValidator('receipt_image'),
  body('channels').optional().isArray().withMessage('channels باید آرایه باشد'),
  body('status').optional({ values: 'falsy' }).isIn(STATUS_VALUES).withMessage('status نامعتبر است'),
  body('status_reason').optional({ values: 'falsy' }).isString().isLength({ max: 500 }),
];

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${SELECT_FIELDS} ${JOIN_CLAUSE} WHERE c.company_id = $1 ORDER BY c.id DESC`,
      [req.companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List checks error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/', createValidation, validate, async (req, res) => {
  try {
    const {
      serial, sayad_id, amount, due_date, send_date, spend_date,
      owner_id, party_id, beneficiary_id, notes, receipt_image, channels, status,
    } = req.body;

    const peopleOk = await ensureOwnedPeople(req.companyId, [owner_id, party_id, beneficiary_id]);
    if (!peopleOk) {
      return res.status(400).json({ error: 'owner_id، party_id یا beneficiary_id متعلق به این شرکت نیستند یا وجود ندارند' });
    }

    const planCheck = await pool.query(
      `SELECT p.max_checks, (SELECT COUNT(*) FROM checks WHERE company_id = $1) AS current_count
       FROM companies c LEFT JOIN plans p ON p.id = c.plan_id
       WHERE c.id = $1`,
      [req.companyId]
    );
    const { max_checks, current_count } = planCheck.rows[0];
    if (max_checks !== null && Number(current_count) >= Number(max_checks)) {
      return res.status(403).json({
        error: `سقف تعداد چک‌ها طبق پلن شما (${max_checks} چک) پر شده است. برای ثبت چک جدید، یکی را حذف کنید یا پلن خود را ارتقا دهید.`,
      });
    }

    const initialStatus = status || 'pending';
    const initialHistory = initialStatus === 'pending' ? [] : [{ to: initialStatus, reason: '', at: new Date().toISOString() }];

    // No send date given: today in Tehran — the database runs in UTC, where
    // CURRENT_DATE is still yesterday until 03:30 Tehran time
    const result = await pool.query(
      `INSERT INTO checks (
         company_id, serial, sayad_id, amount, due_date, send_date, spend_date,
         owner_id, party_id, beneficiary_id, notes, receipt_image, channels, status, status_history
       ) VALUES (
         $1, $2, $3, $4, $5, COALESCE($6, (now() AT TIME ZONE 'Asia/Tehran')::date), $7,
         $8, $9, $10, $11, $12, COALESCE($13, '[]'::jsonb), $14, $15::jsonb
       ) RETURNING id`,
      [
        req.companyId, serial, sayad_id || null, amount, due_date, send_date || null, spend_date || null,
        owner_id, party_id, beneficiary_id, notes || null, receipt_image || null,
        channels ? JSON.stringify(channels) : null, initialStatus, JSON.stringify(initialHistory),
      ]
    );

    const created = await pool.query(`SELECT ${SELECT_FIELDS} ${JOIN_CLAUSE} WHERE c.id = $1`, [result.rows[0].id]);
    res.status(201).json(created.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'چکی با این شماره سریال یا شناسه صیادی قبلاً برای این شرکت ثبت شده است' });
    }
    console.error('Create check error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.put('/:id', idParamValidation, updateValidation, validate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      serial, sayad_id, amount, due_date, send_date, spend_date,
      owner_id, party_id, beneficiary_id, notes, receipt_image, channels,
      status, status_reason,
    } = req.body;

    const existing = await pool.query(
      'SELECT * FROM checks WHERE id = $1 AND company_id = $2',
      [id, req.companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'چک یافت نشد' });
    }
    const current = existing.rows[0];

    const peopleOk = await ensureOwnedPeople(req.companyId, [owner_id, party_id, beneficiary_id]);
    if (!peopleOk) {
      return res.status(400).json({ error: 'owner_id، party_id یا beneficiary_id متعلق به این شرکت نیستند یا وجود ندارند' });
    }

    let nextHistory = current.status_history || [];
    let nextStatus = current.status;
    if (status && status !== current.status) {
      nextStatus = status;
      if (status === 'pending') {
        nextHistory = [];
      } else {
        nextHistory = [...nextHistory, { to: status, reason: status_reason || '', at: new Date().toISOString() }];
      }
    }

    const result = await pool.query(
      `UPDATE checks SET
         serial = COALESCE($1, serial),
         sayad_id = COALESCE($2, sayad_id),
         amount = COALESCE($3, amount),
         due_date = COALESCE($4, due_date),
         send_date = COALESCE($5, send_date),
         spend_date = COALESCE($6, spend_date),
         owner_id = COALESCE($7, owner_id),
         party_id = COALESCE($8, party_id),
         beneficiary_id = COALESCE($9, beneficiary_id),
         notes = COALESCE($10, notes),
         receipt_image = COALESCE($11, receipt_image),
         channels = COALESCE($12, channels),
         status = $13,
         status_history = $14::jsonb
       WHERE id = $15 AND company_id = $16`,
      [
        serial || null, sayad_id || null, amount || null, due_date || null, send_date || null, spend_date || null,
        owner_id || null, party_id || null, beneficiary_id || null, notes || null, receipt_image || null,
        channels ? JSON.stringify(channels) : null, nextStatus, JSON.stringify(nextHistory),
        id, req.companyId,
      ]
    );

    const updated = await pool.query(`SELECT ${SELECT_FIELDS} ${JOIN_CLAUSE} WHERE c.id = $1`, [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'چکی با این شماره سریال یا شناسه صیادی قبلاً برای این شرکت ثبت شده است' });
    }
    console.error('Update check error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.delete('/:id', idParamValidation, validate, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      'SELECT id FROM checks WHERE id = $1 AND company_id = $2',
      [id, req.companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'چک یافت نشد' });
    }

    await pool.query('DELETE FROM checks WHERE id = $1 AND company_id = $2', [id, req.companyId]);
    res.json({ message: 'چک با موفقیت حذف شد' });
  } catch (err) {
    console.error('Delete check error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

module.exports = router;
