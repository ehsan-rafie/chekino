const express = require('express');
const { body, param } = require('express-validator');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const { companyLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const nid = require('../lib/nid');

const router = express.Router();

router.use(authenticate, companyLimiter);

const idParamValidation = [param('id').isInt().withMessage('شناسه نامعتبر است')];

// Which tab of the people panel a person was filed under. Only a fallback for
// someone no cheque references yet — the roles a person actually plays are
// read off the cheques themselves. See migration_005_people_role.sql.
const ROLES = ['owner', 'party', 'benef'];
const roleOrNull = (role) => (ROLES.includes(role) ? role : null);

// A national id is checked by its check digit (lib/nid.js — the very file the
// dashboard's form uses): a 10-digit کد ملی or an 11-digit شناسه ملی. A wrong
// one would go out to the cheque's owner and fail at registration in Sayad.
const nationalIdValidator = () => body('national_id').optional({ values: 'falsy' }).isString().isLength({ max: 30 }).withMessage('national_id نامعتبر است')
  .bail().custom((v) => {
    const r = nid.check(v);
    if (!r.ok) throw new Error(r.error);
    return true;
  });

const personBodyValidation = [
  body('full_name').trim().notEmpty().withMessage('full_name الزامی است').isLength({ max: 200 }),
  nationalIdValidator(),
  body('phone').optional({ values: 'falsy' }).isString().isLength({ max: 30 }).withMessage('phone نامعتبر است'),
  body('role').optional({ values: 'falsy' }).isIn(ROLES).withMessage('role نامعتبر است'),
];

const personBodyValidationOptional = [
  body('full_name').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  nationalIdValidator(),
  body('phone').optional({ values: 'falsy' }).isString().isLength({ max: 30 }).withMessage('phone نامعتبر است'),
  body('role').optional({ values: 'falsy' }).isIn(ROLES).withMessage('role نامعتبر است'),
];

// One person per national id, per company: a beneficiary paid by several
// parties is still one record. Asked for a second, the route answers 409 and
// sends back the person on file, so the client can use that one instead
// (migration_006 backs this with a unique index).
const digitsOnly = (v) => String(v || '').replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^0-9]/g, '');
async function personWithNid(companyId, nid, exceptId) {
  const clean = digitsOnly(nid);
  if (!clean) return null;
  const result = await pool.query(
    'SELECT id, full_name, national_id, phone, role, created_at FROM people WHERE company_id = $1 AND national_id = $2 AND ($3::int IS NULL OR id <> $3) LIMIT 1',
    [companyId, clean, exceptId || null]
  );
  return result.rows[0] || null;
}
const nidTaken = (res, person) => res.status(409).json({ error: `این کد ملی قبلاً برای «${person.full_name}» ثبت شده`, person });

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, national_id, phone, role, created_at FROM people WHERE company_id = $1 ORDER BY id DESC',
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
    const { full_name, national_id, phone, role } = req.body;

    const holder = await personWithNid(req.companyId, national_id);
    if (holder) return nidTaken(res, holder);

    // the plan's limit, counted with the company held (H3)
    const db = await pool.connect();
    let created;
    try {
      await db.query('BEGIN');
      const plan = (await db.query(
        `SELECT p.max_people, (SELECT COUNT(*) FROM people WHERE company_id = $1) AS current_count
         FROM companies c LEFT JOIN plans p ON p.id = c.plan_id
         WHERE c.id = $1 FOR UPDATE OF c`,
        [req.companyId]
      )).rows[0];
      if (plan.max_people !== null && Number(plan.current_count) >= Number(plan.max_people)) {
        await db.query('ROLLBACK');
        return res.status(403).json({
          error: `سقف تعداد اشخاص طبق پلن شما (${Number(plan.max_people).toLocaleString('fa-IR')} نفر) پر شده است. برای افزودن شخص تازه، یکی را حذف کنید یا پلن را ارتقا دهید.`,
          code: 'plan_people_limit',
        });
      }
      created = (await db.query(
        'INSERT INTO people (company_id, full_name, national_id, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, national_id, phone, role, created_at',
        [req.companyId, full_name, digitsOnly(national_id) || null, phone || null, roleOrNull(role)]
      )).rows[0];
      await db.query('COMMIT');
    } catch (e) {
      await db.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      db.release();
    }
    res.status(201).json(created);
  } catch (err) {
    if (err.code === '23505') {                       // lost a race to the unique index
      const holder = await personWithNid(req.companyId, req.body.national_id).catch(() => null);
      if (holder) return nidTaken(res, holder);
    }
    console.error('Create person error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.put('/:id', idParamValidation, personBodyValidationOptional, validate, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, national_id, phone, role } = req.body;

    const existing = await pool.query(
      'SELECT id FROM people WHERE id = $1 AND company_id = $2',
      [id, req.companyId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'شخص یافت نشد' });
    }

    const holder = await personWithNid(req.companyId, national_id, Number(id));
    if (holder) return nidTaken(res, holder);

    const result = await pool.query(
      'UPDATE people SET full_name = COALESCE($1, full_name), national_id = COALESCE($2, national_id), phone = COALESCE($3, phone), role = COALESCE($4, role) WHERE id = $5 AND company_id = $6 RETURNING id, full_name, national_id, phone, role, created_at',
      [full_name || null, digitsOnly(national_id) || null, phone || null, roleOrNull(role), id, req.companyId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const holder = await personWithNid(req.companyId, req.body.national_id, Number(req.params.id)).catch(() => null);
      if (holder) return nidTaken(res, holder);
    }
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

// Two records of one person (spec 9.6: «رضائی» and «رضایی», with and without
// a half-space): the cheques of :id move to `into`, and :id goes, in one
// transaction. A national id on the one that goes stays on the one that
// stays; two different national ids are two people — refused. The cheques
// moved get a new version (an edit open on one is told it changed). Never
// automatic: the page asks first.
router.post('/:id/merge', idParamValidation, [
  body('into').isInt({ min: 1 }).withMessage('شخص مقصد نامعتبر است').toInt(),
], validate, async (req, res) => {
  const id = Number(req.params.id);
  const into = req.body.into;
  if (id === into) return res.status(400).json({ error: 'یک شخص با خودش یکی نمی‌شود' });
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const rows = (await db.query(
      'SELECT id, full_name, national_id FROM people WHERE company_id = $1 AND id = ANY($2::int[]) FOR UPDATE',
      [req.companyId, [id, into]]
    )).rows;
    const drop = rows.find((r) => r.id === id);
    const keep = rows.find((r) => r.id === into);
    if (!drop || !keep) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'شخص یافت نشد' });
    }
    if (drop.national_id && keep.national_id && drop.national_id !== keep.national_id) {
      await db.query('ROLLBACK');
      return res.status(409).json({ error: 'کد ملی این دو فرق دارد؛ دو نفرند و یکی نمی‌شوند', code: 'different_nid' });
    }
    const moved = (await db.query(
      `UPDATE checks SET
         owner_id = CASE WHEN owner_id = $1 THEN $2 ELSE owner_id END,
         party_id = CASE WHEN party_id = $1 THEN $2 ELSE party_id END,
         beneficiary_id = CASE WHEN beneficiary_id = $1 THEN $2 ELSE beneficiary_id END,
         version = version + 1, updated_at = now()
       WHERE company_id = $3 AND (owner_id = $1 OR party_id = $1 OR beneficiary_id = $1)
       RETURNING id`,
      [id, into, req.companyId]
    )).rows.length;
    await db.query('DELETE FROM people WHERE id = $1 AND company_id = $2', [id, req.companyId]);
    // (after the delete: the national id is unique per company)
    if (drop.national_id && !keep.national_id) {
      await db.query('UPDATE people SET national_id = $1 WHERE id = $2 AND company_id = $3', [drop.national_id, into, req.companyId]);
    }
    await db.query('COMMIT');
    res.json({ kept: into, moved });
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('Merge people error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  } finally {
    db.release();
  }
});

module.exports = router;
