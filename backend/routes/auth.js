const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { loginLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');

const router = express.Router();

// A bcrypt hash of a value nothing can match, compared against whenever the
// username doesn't exist. Without it the two failure paths take visibly
// different amounts of time — a miss returns immediately, a wrong password
// pays for a real bcrypt comparison — and that gap is enough to enumerate
// which usernames are registered. Both paths now do the same work.
const DUMMY_HASH = bcrypt.hashSync('chekino-invalid-user-placeholder', 10);

const loginValidation = [
  body('username').trim().notEmpty().withMessage('username الزامی است').isLength({ max: 100 }),
  body('password').isString().notEmpty().withMessage('password الزامی است').isLength({ max: 200 }),
];

router.post('/login', loginLimiter, loginValidation, validate, async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT id, name, password_hash, status FROM companies WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      await bcrypt.compare(password, DUMMY_HASH);   // keep both paths equally slow
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    const company = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, company.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    // Checked after the password, so a wrong password on a disabled account
    // can't be told apart from a wrong password on an active one.
    if (company.status !== 'active') {
      return res.status(403).json({ error: 'حساب کاربری غیرفعال است' });
    }

    const token = jwt.sign(
      { company_id: company.id, name: company.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

module.exports = router;
