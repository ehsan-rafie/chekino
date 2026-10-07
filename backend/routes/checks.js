const crypto = require('crypto');
const express = require('express');
const { body, param } = require('express-validator');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const { companyLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const { nextStage } = require('../lib/stage');

const router = express.Router();

// The body is read after the sign-in: up to 15 MB here (photos still travel
// inside the JSON), 100 KB everywhere else — see server.js
router.use(authenticate, companyLimiter, express.json({ limit: '15mb' }));

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
  c.stage, c.version, c.updated_at, c.copied_at, c.batch_id,
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

// ---- the send window (spec 5.4, 6.3) ----
// Today in Tehran, and the day after: a send date can't be later (the
// client sends its own Tehran date; a clock a little ahead is allowed)
const tehranDay = (offset = 0) => {
  const d = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};
const idsValidation = [
  body('ids').isArray({ min: 1, max: 500 }).withMessage('چکی انتخاب نشده'),
  body('ids.*').isInt({ min: 1 }).withMessage('شناسه نامعتبر است').toInt(),
];

// «کپی شد»: the photo of a cheque ready to send went to its owner's chat.
// Kept on the server so the window can be picked up from any device; the
// version is left alone, so marking doesn't stand in the way of «برگردون».
router.post('/mark-copied', idsValidation, validate, async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE checks SET copied_at = COALESCE(copied_at, now())
       WHERE company_id = $1 AND id = ANY($2::int[]) AND stage = 'ready' RETURNING id, copied_at`,
      [req.companyId, req.body.ids]
    );
    res.json({ updated: r.rows });
  } catch (err) {
    console.error('Mark copied error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// «ارسال کردم»: the cheques ready to send go onto the board — sent today
// (Tehran) through the chosen channel, waiting for their Sayad status. Only
// ready ones move; others are reported as skipped (asking twice is
// harmless: the second time they are already sent). One bulk_ops row keeps
// what they were, for «برگردون».
router.post('/mark-sent', [
  ...idsValidation,
  body('channel').isString().withMessage('کانال را انتخاب کن').trim().isLength({ min: 1, max: 40 }).withMessage('کانال را انتخاب کن'),
  body('sent_on').isISO8601({ strict: true }).withMessage('تاریخ ارسال نامعتبر است')
    .bail().custom((v) => String(v).slice(0, 10) <= tehranDay(1)).withMessage('تاریخ ارسال از فردا جلوتر است'),
], validate, async (req, res) => {
  const { ids, channel } = req.body;
  const sentOn = String(req.body.sent_on).slice(0, 10);
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const rows = (await db.query(
      `SELECT id, version, stage, send_date::text AS send_date, channels, copied_at, status_history
       FROM checks WHERE company_id = $1 AND id = ANY($2::int[]) ORDER BY id FOR UPDATE`,
      [req.companyId, ids]
    )).rows;
    const ready = rows.filter((r) => r.stage === 'ready');
    const skipped = ids.filter((id) => !ready.some((r) => r.id === id)).map((id) => {
      const r = rows.find((x) => x.id === id);
      return { id, reason: !r ? 'not_found' : r.stage === 'sent' ? 'already_sent' : 'not_ready' };
    });
    if (!ready.length) {
      await db.query('ROLLBACK');
      return res.json({ op_id: null, updated: [], skipped });
    }
    const at = new Date().toISOString();
    const after = {};
    for (const r of ready) {
      const channels = Array.isArray(r.channels) ? [...r.channels] : [];
      if (!channels.includes(channel)) channels.push(channel);
      const history = [...(r.status_history || []), { event: 'sent', channel, at }];
      const u = await db.query(
        `UPDATE checks SET stage = 'sent', send_date = $1, channels = $2::jsonb, status = 'pending',
                status_history = $3::jsonb, copied_at = NULL, version = version + 1, updated_at = now()
         WHERE id = $4 RETURNING version`,
        [sentOn, JSON.stringify(channels), JSON.stringify(history), r.id]
      );
      after[r.id] = u.rows[0].version;
    }
    const op = await db.query(
      `INSERT INTO bulk_ops (company_id, kind, request, before, after_versions)
       VALUES ($1, 'mark_sent', $2::jsonb, $3::jsonb, $4::jsonb) RETURNING id`,
      [req.companyId, JSON.stringify({ ids: ready.map((r) => r.id), channel, sent_on: sentOn }),
        JSON.stringify(ready.map((r) => ({ id: r.id, version: r.version, stage: r.stage, send_date: r.send_date, channels: r.channels, copied_at: r.copied_at }))),
        JSON.stringify(after)]
    );
    await db.query('COMMIT');
    const updated = await pool.query(`SELECT ${SELECT_FIELDS} ${JOIN_CLAUSE} WHERE c.id = ANY($1::int[]) ORDER BY c.id`, [ready.map((r) => r.id)]);
    res.json({ op_id: op.rows[0].id, updated: updated.rows, skipped });
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('Mark sent error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  } finally {
    db.release();
  }
});

// One cheque in full, with the list of its files (not their bytes: each is
// GET /api/images/:id) — the PDF attachments included, which the list leaves
// out of image_id
router.get('/:id', idParamValidation, validate, async (req, res) => {
  try {
    const found = await pool.query(
      `SELECT ${SELECT_FIELDS} ${JOIN_CLAUSE} WHERE c.id = $1 AND c.company_id = $2`,
      [req.params.id, req.companyId]
    );
    if (found.rows.length === 0) return res.status(404).json({ error: 'چک یافت نشد' });
    const images = await pool.query(
      `SELECT id, kind, mime, position, byte_size FROM check_images
       WHERE check_id = $1 AND company_id = $2 ORDER BY position, created_at`,
      [req.params.id, req.companyId]
    );
    res.json({ ...found.rows[0], images: images.rows });
  } catch (err) {
    console.error('Get check error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// The stage after a change (lib/stage.js) folded into what gets written: the
// stage itself, the columns that go with it, and the history — a status
// change and any events (owner or beneficiary of a sent cheque changed)
// added to it, never taken from it (H4)
function stageWrites(current, after, opts) {
  const st = nextStage(current, after, opts);
  if (st.error) return st;
  const now = new Date().toISOString();
  const base = current.status_history || [];
  let history = base;
  const status = st.set.status || after.status || current.status;
  if (status !== current.status) {
    history = [...history, { to: status, reason: (status === after.status && after.status_reason) || '', at: now }];
  }
  if (st.events.length) history = [...history, ...st.events.map((e) => ({ ...e, at: now }))];
  return { stage: st.stage, set: st.set, status, history, historyChanged: history !== base };
}

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
    // wipe it (H4) — and the stage follows the change (lib/stage.js). PUT
    // stays for dashboards opened before PATCH; new code uses PATCH below.
    const sw = stageWrites(current, {
      ...current,
      status: status || current.status, status_reason: status_reason || '',
      owner_id: owner_id ? Number(owner_id) : current.owner_id,
      beneficiary_id: beneficiary_id ? Number(beneficiary_id) : current.beneficiary_id,
    }, {});
    if (sw.error) return res.status(400).json(sw.error);
    const nextHistory = sw.history;
    const nextStatus = sw.status;

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
           stage = $17,
           copied_at = CASE WHEN $18::boolean THEN NULL ELSE copied_at END,
           version = version + 1,
           updated_at = now()
         WHERE id = $15 AND company_id = $16`,
        [
          serial || null, sayad_id || null, amount || null, due_date || null, send_date || null, spend_date || null,
          owner_id || null, party_id || null, beneficiary_id || null, notes || null, receipt_image || null,
          channels ? JSON.stringify(channels) : null, nextStatus, JSON.stringify(nextHistory),
          id, req.companyId, sw.stage, 'copied_at' in sw.set,
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
    // The stage follows the change (lib/stage.js): a waiting cheque given
    // both its people becomes ready; a sent one keeps them — taking it back
    // off the board is a separate, deliberate step (a bulk edit's unsend),
    // not a cleared field; only a sent cheque has a Sayad status.
    const after = { ...current, status: has('status') ? b.status : current.status, status_reason: b.status_reason || '' };
    // (ids compared as numbers: «5» sent as text is the same person, not a change)
    if (has('owner_id')) after.owner_id = b.owner_id === null ? null : Number(b.owner_id);
    if (has('beneficiary_id')) after.beneficiary_id = b.beneficiary_id === null ? null : Number(b.beneficiary_id);
    const sw = stageWrites(current, after, {});
    if (sw.error) {
      await db.query('ROLLBACK');
      return res.status(400).json(sw.error);
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
    if (sw.stage !== current.stage) set('stage', sw.stage);
    if (sw.status !== current.status) set('status', sw.status);
    if (sw.historyChanged) set('status_history', JSON.stringify(sw.history), '::jsonb');
    if ('copied_at' in sw.set) set('copied_at', null);
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
