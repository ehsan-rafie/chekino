const express = require('express');
const { body, param } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const requireAdmin = require('../middleware/requireAdmin');
const { loginLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');

const router = express.Router();

// Compared against when the admin username doesn't exist, so a missing user
// and a wrong password take the same time — the unknown-username path would
// otherwise return before any bcrypt work and leak, by timing, whether an
// admin username is valid. Mirrors the company login in routes/auth.js.
const DUMMY_HASH = bcrypt.hashSync('chekino-invalid-admin-placeholder', 10);

function signAdminToken(admin) {
  return jwt.sign(
    { role: 'admin', admin_id: admin.id, username: admin.username },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: '12h' }
  );
}

const idParamValidation = [param('id').isInt().withMessage('شناسه نامعتبر است')];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('username الزامی است').isLength({ max: 100 }),
  body('password').isString().notEmpty().withMessage('password الزامی است').isLength({ max: 200 }),
];

router.post('/login', loginLimiter, loginValidation, validate, async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT id, username, password_hash FROM admin_users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      await bcrypt.compare(password, DUMMY_HASH);   // keep both paths equally slow
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    const admin = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    const token = signAdminToken(admin);
    res.json({ token });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.use(requireAdmin);

const accountValidation = [
  body('current_password').isString().notEmpty().withMessage('رمز عبور فعلی برای تأیید هویت الزامی است'),
  body('new_username').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('new_password').optional({ values: 'falsy' }).isString().isLength({ min: 4 }).withMessage('رمز عبور جدید باید حداقل ۴ کاراکتر باشد'),
];

router.put('/account', accountValidation, validate, async (req, res) => {
  try {
    const { current_password, new_username, new_password } = req.body;

    if (!new_username && !new_password) {
      return res.status(400).json({ error: 'حداقل یکی از یوزرنیم یا رمز عبور جدید را وارد کنید' });
    }

    const existing = await pool.query('SELECT id, username, password_hash FROM admin_users WHERE id = $1', [req.admin.admin_id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'حساب ادمین یافت نشد' });
    }
    const admin = existing.rows[0];

    const passwordMatch = await bcrypt.compare(current_password, admin.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'رمز عبور فعلی اشتباه است' });
    }

    const newUsername = new_username ? new_username.trim() : null;
    const newPasswordHash = new_password ? await bcrypt.hash(new_password, 10) : null;

    const updated = await pool.query(
      `UPDATE admin_users SET
         username = COALESCE($1, username),
         password_hash = COALESCE($2, password_hash)
       WHERE id = $3
       RETURNING id, username`,
      [newUsername, newPasswordHash, admin.id]
    );

    const token = signAdminToken(updated.rows[0]);
    res.json({ message: 'اطلاعات حساب با موفقیت به‌روزرسانی شد', token, username: updated.rows[0].username });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'این نام کاربری قبلاً استفاده شده است' });
    }
    console.error('Admin update account error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

const COMPANY_SELECT = `
  SELECT c.id, c.name, c.username, c.status, c.plan_id, c.permissions, c.created_at,
         p.name AS plan_name, p.max_people, p.max_checks, p.features AS plan_features,
         (SELECT COUNT(*) FROM people WHERE people.company_id = c.id) AS people_count,
         (SELECT COUNT(*) FROM checks WHERE checks.company_id = c.id) AS checks_count
  FROM companies c
  LEFT JOIN plans p ON p.id = c.plan_id
`;

router.get('/companies', async (req, res) => {
  try {
    const result = await pool.query(`${COMPANY_SELECT} ORDER BY c.id DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin list companies error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

const createCompanyValidation = [
  body('name').trim().notEmpty().withMessage('name الزامی است').isLength({ max: 200 }),
  body('username').trim().notEmpty().withMessage('username الزامی است').isLength({ max: 100 }),
  body('password').isString().notEmpty().withMessage('password الزامی است').isLength({ max: 200 }),
  body('plan_id').optional({ values: 'falsy' }).isInt().withMessage('plan_id نامعتبر است'),
];

router.post('/companies', createCompanyValidation, validate, async (req, res) => {
  try {
    const { name, username, password, plan_id } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO companies (name, username, password_hash, plan_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name, username, passwordHash, plan_id || null]
    );

    const created = await pool.query(`${COMPANY_SELECT} WHERE c.id = $1`, [result.rows[0].id]);
    res.status(201).json(created.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'این نام کاربری قبلاً استفاده شده است' });
    }
    console.error('Admin create company error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

const updateCompanyValidation = [
  body('name').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('plan_id').optional({ values: 'falsy' }).isInt().withMessage('plan_id نامعتبر است'),
  body('permissions').optional().isObject().withMessage('permissions باید یک شیء باشد'),
];

router.put('/companies/:id', idParamValidation, updateCompanyValidation, validate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, plan_id, permissions } = req.body;

    const existing = await pool.query('SELECT id FROM companies WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'شرکت یافت نشد' });
    }

    await pool.query(
      `UPDATE companies SET
         name = COALESCE($1, name),
         plan_id = COALESCE($2, plan_id),
         permissions = COALESCE($3::jsonb, permissions)
       WHERE id = $4`,
      [name || null, plan_id || null, permissions ? JSON.stringify(permissions) : null, id]
    );

    const updated = await pool.query(`${COMPANY_SELECT} WHERE c.id = $1`, [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Admin update company error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

const companyPasswordValidation = [
  body('password').isString().notEmpty().withMessage('رمز عبور جدید الزامی است و باید حداقل ۴ کاراکتر باشد')
    .isLength({ min: 4 }).withMessage('رمز عبور جدید الزامی است و باید حداقل ۴ کاراکتر باشد'),
];

router.put('/companies/:id/password', idParamValidation, companyPasswordValidation, validate, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const existing = await pool.query('SELECT id FROM companies WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'شرکت یافت نشد' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE companies SET password_hash = $1 WHERE id = $2', [passwordHash, id]);

    res.json({ message: 'رمز عبور با موفقیت تغییر کرد' });
  } catch (err) {
    console.error('Admin change password error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

const companyStatusValidation = [
  body('status').isIn(['active', 'inactive']).withMessage("status باید 'active' یا 'inactive' باشد"),
];

router.patch('/companies/:id/status', idParamValidation, companyStatusValidation, validate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      'UPDATE companies SET status = $1 WHERE id = $2 RETURNING id',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'شرکت یافت نشد' });
    }

    const updated = await pool.query(`${COMPANY_SELECT} WHERE c.id = $1`, [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Admin toggle status error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.delete('/companies/:id', idParamValidation, validate, async (req, res) => {
  try {
    const { id } = req.params;
    const confirm = req.body && req.body.confirm === true;

    const existing = await pool.query('SELECT id FROM companies WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'شرکت یافت نشد' });
    }

    const counts = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM people WHERE company_id = $1) AS people_count,
         (SELECT COUNT(*) FROM checks WHERE company_id = $1) AS checks_count`,
      [id]
    );
    const { people_count, checks_count } = counts.rows[0];
    const hasData = Number(people_count) > 0 || Number(checks_count) > 0;

    if (hasData && !confirm) {
      return res.status(409).json({
        error: `این شرکت ${people_count} شخص و ${checks_count} چک ثبت‌شده دارد. برای حذف قطعی، دوباره با تأیید (confirm) درخواست بده.`,
        people_count: Number(people_count),
        checks_count: Number(checks_count),
        requires_confirm: true,
      });
    }

    await pool.query('DELETE FROM companies WHERE id = $1', [id]);
    res.json({ message: 'شرکت با موفقیت حذف شد' });
  } catch (err) {
    console.error('Admin delete company error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/plans', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM plans ORDER BY price ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Admin list plans error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

const createPlanValidation = [
  body('name').trim().notEmpty().withMessage('name الزامی است').isLength({ max: 200 }),
  body('max_people').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('max_people نامعتبر است'),
  body('max_checks').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('max_checks نامعتبر است'),
  body('features').optional().isObject().withMessage('features باید یک شیء باشد'),
  body('price').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('price نامعتبر است'),
];

router.post('/plans', createPlanValidation, validate, async (req, res) => {
  try {
    const { name, max_people, max_checks, features, price } = req.body;

    const result = await pool.query(
      `INSERT INTO plans (name, max_people, max_checks, features, price)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING *`,
      [name, max_people ?? null, max_checks ?? null, JSON.stringify(features || {}), price || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'پلنی با این نام قبلاً وجود دارد' });
    }
    console.error('Admin create plan error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

const updatePlanValidation = [
  body('name').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('max_people').optional({ nullable: true }).isInt({ min: 0 }).withMessage('max_people نامعتبر است'),
  body('max_checks').optional({ nullable: true }).isInt({ min: 0 }).withMessage('max_checks نامعتبر است'),
  body('features').optional().isObject().withMessage('features باید یک شیء باشد'),
  body('price').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('price نامعتبر است'),
];

router.put('/plans/:id', idParamValidation, updatePlanValidation, validate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, max_people, max_checks, features, price } = req.body;

    const existing = await pool.query('SELECT id FROM plans WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'پلن یافت نشد' });
    }

    const result = await pool.query(
      `UPDATE plans SET
         name = COALESCE($1, name),
         max_people = $2,
         max_checks = $3,
         features = COALESCE($4::jsonb, features),
         price = COALESCE($5, price)
       WHERE id = $6
       RETURNING *`,
      [
        name || null,
        max_people === undefined ? null : max_people,
        max_checks === undefined ? null : max_checks,
        features ? JSON.stringify(features) : null,
        price === undefined ? null : price,
        id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'پلنی با این نام قبلاً وجود دارد' });
    }
    console.error('Admin update plan error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.delete('/plans/:id', idParamValidation, validate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM plans WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'پلن یافت نشد' });
    }

    await pool.query('DELETE FROM plans WHERE id = $1', [id]);
    res.json({ message: 'پلن با موفقیت حذف شد' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'این پلن به یک یا چند شرکت اختصاص داده شده و قابل حذف نیست' });
    }
    console.error('Admin delete plan error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

module.exports = router;
