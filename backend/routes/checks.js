const crypto = require('crypto');
const express = require('express');
const { body, param } = require('express-validator');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

// What a cheque looks like to the dashboard: everything but its photos. A
// photo is fetched on its own from /api/images/:id when the cheque is
// opened; the list only names the first one and says how many there are.
// (With photos inline, 43 cheques with two photos already weighed 1.1 MB,
// and every new photo made each visit to the board heavier.) Owner and
// beneficiary are LEFT JOINs: a cheque waiting for them (migration 007)
// must not drop out of the list.
const SELECT_FIELDS = `
  c.id, c.company_id, c.serial, c.sayad_id, c.amount, c.due_date, c.send_date, c.spend_date,
  c.status, c.status_history, c.channels, c.notes, c.created_at,
  c.stage, c.version, c.updated_at,
  c.owner_id, o.full_name AS owner_name,
  c.party_id, p.full_name AS party_name,
  c.beneficiary_id, b.full_name AS beneficiary_name, b.national_id AS beneficiary_national_id,
  img.image_id, img.image_mime, COALESCE(img.image_count, 0)::int AS image_count
`;

const JOIN_CLAUSE = `
  FROM checks c
  LEFT JOIN people o ON o.id = c.owner_id
  JOIN people p ON p.id = c.party_id
  LEFT JOIN people b ON b.id = c.beneficiary_id
  LEFT JOIN LATERAL (
    SELECT (array_agg(i.id ORDER BY i.position, i.created_at))[1] AS image_id,
           (array_agg(i.mime ORDER BY i.position, i.created_at))[1] AS image_mime,
           count(*) AS image_count
    FROM check_images i
    WHERE i.check_id = c.id AND i.kind = 'cheque'
  ) img ON true
`;

// The cheque's photo goes to check_images. Until the dashboard reads photos
// only from there, checks.receipt_image keeps a copy too (migration 007:
// that is what lets rollback_007 lose nothing); both are written in the
// same transaction. One photo per cheque for now — the form sends one.
const DATA_URL_RE = /^data:([^;,]+);base64,(.+)$/s;
async function saveChequeImage(db, companyId, checkId, dataUrl) {
  const m = DATA_URL_RE.exec(dataUrl || '');
  if (!m) return;
  const type = m[1].toLowerCase();
  const mime = type === 'image/jpg' ? 'image/jpeg' : type;
  const bytes = Buffer.from(m[2], 'base64');
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  await db.query(
    "DELETE FROM check_images WHERE check_id = $1 AND company_id = $2 AND kind = 'cheque'",
    [checkId, companyId]
  );
  await db.query(
    `INSERT INTO check_images (company_id, check_id, kind, mime, bytes, byte_size, sha256)
     VALUES ($1, $2, 'cheque', $3, $4, $5, $6)`,
    [companyId, checkId, mime, bytes, bytes.length, sha256]
  );
}

// Since migration 007 only the sayad id is unique: a 6-digit serial repeats
// across banks.
const DUPLICATE_SAYAD = 'چکی با این شناسه صیادی قبلاً برای این شرکت ثبت شده است';

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

// ?stage=sent (the default, what the board shows) | waiting | ready | all
const STAGES = ['sent', 'waiting', 'ready', 'all'];
router.get('/', async (req, res) => {
  try {
    const stage = STAGES.includes(req.query.stage) ? req.query.stage : 'sent';
    const result = await pool.query(
      `SELECT ${SELECT_FIELDS} ${JOIN_CLAUSE}
       WHERE c.company_id = $1 AND ($2 = 'all' OR c.stage = $2)
       ORDER BY c.id DESC`,
      [req.companyId, stage]
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

    // The cheque and its photo go in together, or not at all
    const db = await pool.connect();
    let newId;
    try {
      await db.query('BEGIN');
      // No send date given: today in Tehran — the database runs in UTC, where
      // CURRENT_DATE is still yesterday until 03:30 Tehran time
      const result = await db.query(
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
      newId = result.rows[0].id;
      if (receipt_image) await saveChequeImage(db, req.companyId, newId, receipt_image);
      await db.query('COMMIT');
    } catch (e) {
      await db.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      db.release();
    }

    const created = await pool.query(`SELECT ${SELECT_FIELDS} ${JOIN_CLAUSE} WHERE c.id = $1`, [newId]);
    res.status(201).json(created.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: DUPLICATE_SAYAD });
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

    // The history is only ever added to — going back to «منتظر ثبت» used to
    // wipe it (H4). PUT stays for dashboards opened before PATCH; new code
    // uses PATCH below.
    let nextHistory = current.status_history || [];
    let nextStatus = current.status;
    if (status && status !== current.status) {
      nextStatus = status;
      nextHistory = [...nextHistory, { to: status, reason: status_reason || '', at: new Date().toISOString() }];
    }

    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      await db.query(
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
           status_history = $14::jsonb,
           version = version + 1,
           updated_at = now()
         WHERE id = $15 AND company_id = $16`,
        [
          serial || null, sayad_id || null, amount || null, due_date || null, send_date || null, spend_date || null,
          owner_id || null, party_id || null, beneficiary_id || null, notes || null, receipt_image || null,
          channels ? JSON.stringify(channels) : null, nextStatus, JSON.stringify(nextHistory),
          id, req.companyId,
        ]
      );
      if (receipt_image) await saveChequeImage(db, req.companyId, Number(id), receipt_image);
      await db.query('COMMIT');
    } catch (e) {
      await db.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      db.release();
    }

    const updated = await pool.query(`SELECT ${SELECT_FIELDS} ${JOIN_CLAUSE} WHERE c.id = $1`, [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: DUPLICATE_SAYAD });
    }
    console.error('Update check error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ---- PATCH: change what is sent, clear what is sent as null ----
// A field left out is left alone; a field sent as null is cleared (C2: the
// old PUT couldn't clear anything). Only the optional fields clear: notes,
// spend date, the photo, and — for a cheque not yet sent — owner and
// beneficiary. `version` must be the one the edit started from: if the
// cheque changed since (another tab, another person), nothing is written
// and the answer is 409 version_conflict with the current version (N4). A
// status change is added to the history, never wiping it (H4); every change
// is a new version.
const patchValidation = [
  body('version').isInt({ min: 1 }).withMessage('version الزامی است').toInt(),
  body('serial').optional().trim().notEmpty().withMessage('سریال را نمی‌شود خالی کرد').isLength({ max: 50 }),
  body('sayad_id').optional().isString().withMessage('شناسه صیادی را نمی‌شود خالی کرد').isLength({ max: 50 }),
  body('amount').optional().isFloat({ min: 0 }).withMessage('amount باید عدد مثبت باشد'),
  body('due_date').optional().isISO8601().withMessage('due_date نامعتبر است'),
  body('send_date').optional().isISO8601().withMessage('send_date نامعتبر است'),
  body('spend_date').optional({ values: 'null' }).isISO8601().withMessage('spend_date نامعتبر است'),
  body('owner_id').optional({ values: 'null' }).isInt().withMessage('owner_id نامعتبر است'),
  body('party_id').optional().isInt().withMessage('طرف حساب را نمی‌شود خالی کرد'),
  body('beneficiary_id').optional({ values: 'null' }).isInt().withMessage('beneficiary_id نامعتبر است'),
  body('notes').optional({ values: 'null' }).isString().isLength({ max: 2000 }),
  receiptImageValidator('receipt_image'),
  body('channels').optional().isArray().withMessage('channels باید آرایه باشد'),
  body('status').optional().isIn(STATUS_VALUES).withMessage('status نامعتبر است'),
  body('status_reason').optional({ values: 'null' }).isString().isLength({ max: 500 }),
];

router.patch('/:id', idParamValidation, patchValidation, validate, async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body;
  const has = (k) => Object.prototype.hasOwnProperty.call(b, k);
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const found = await db.query('SELECT * FROM checks WHERE id = $1 AND company_id = $2 FOR UPDATE', [id, req.companyId]);
    if (found.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'چک یافت نشد' });
    }
    const current = found.rows[0];
    if (current.version !== b.version) {
      await db.query('ROLLBACK');
      return res.status(409).json({
        error: 'این چک همین حالا جای دیگری تغییر کرد',
        code: 'version_conflict',
        version: current.version,
      });
    }
    // A sent cheque keeps its owner and beneficiary: taking it back off the
    // board is a separate, deliberate step (unsend), not a cleared field.
    if (current.stage === 'sent' && ((has('owner_id') && b.owner_id === null) || (has('beneficiary_id') && b.beneficiary_id === null))) {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: 'صاحب چک یا ذینفعِ چکِ ارسال‌شده را نمی‌شود خالی کرد', code: 'unsend_required' });
    }
    const ids = ['owner_id', 'party_id', 'beneficiary_id'].filter((k) => has(k) && b[k] !== null).map((k) => b[k]);
    if (!(await ensureOwnedPeople(req.companyId, ids))) {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: 'owner_id، party_id یا beneficiary_id متعلق به این شرکت نیستند یا وجود ندارند' });
    }

    const sets = [];
    const vals = [];
    const set = (col, v, cast = '') => { vals.push(v); sets.push(`${col} = $${vals.length}${cast}`); };
    if (has('serial')) set('serial', b.serial);
    if (has('sayad_id')) set('sayad_id', b.sayad_id);
    if (has('amount')) set('amount', b.amount);
    if (has('due_date')) set('due_date', b.due_date);
    if (has('send_date')) set('send_date', b.send_date);
    if (has('spend_date')) set('spend_date', b.spend_date || null);
    if (has('owner_id')) set('owner_id', b.owner_id);
    if (has('party_id')) set('party_id', b.party_id);
    if (has('beneficiary_id')) set('beneficiary_id', b.beneficiary_id);
    if (has('notes')) set('notes', b.notes || null);
    if (has('channels')) set('channels', JSON.stringify(b.channels), '::jsonb');
    if (has('status') && b.status !== current.status) {
      const history = [...(current.status_history || []), { to: b.status, reason: b.status_reason || '', at: new Date().toISOString() }];
      set('status', b.status);
      set('status_history', JSON.stringify(history), '::jsonb');
    }
    const photo = has('receipt_image') ? b.receipt_image : undefined;   // null: remove; a data URL: replace
    if (photo === null) set('receipt_image', null);
    else if (photo) set('receipt_image', photo);

    if (sets.length) {
      vals.push(id, req.companyId);
      await db.query(
        `UPDATE checks SET ${sets.join(', ')}, version = version + 1, updated_at = now()
         WHERE id = $${vals.length - 1} AND company_id = $${vals.length}`,
        vals
      );
      if (photo === null) {
        await db.query("DELETE FROM check_images WHERE check_id = $1 AND company_id = $2 AND kind = 'cheque'", [id, req.companyId]);
      } else if (photo) {
        await saveChequeImage(db, req.companyId, id, photo);
      }
    }
    await db.query('COMMIT');
    const updated = await pool.query(`SELECT ${SELECT_FIELDS} ${JOIN_CLAUSE} WHERE c.id = $1`, [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ error: DUPLICATE_SAYAD });
    if (err.code === '23514') return res.status(400).json({ error: 'این تغییر با مرحله‌ی چک نمی‌خواند' });
    console.error('Patch check error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  } finally {
    db.release();
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
