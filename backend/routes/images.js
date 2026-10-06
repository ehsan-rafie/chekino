const express = require('express');
const { param } = require('express-validator');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const { companyLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');

// A cheque's photo (or PDF), on its own: the cheque list only names it.
// Only with a valid token, and only the company's own — anything else is a
// 404, never a hint that the id exists. Ids are random UUIDs and a photo is
// never changed in place (a new photo is a new row), so it can be cached
// for good; private, because it is personal data.
const router = express.Router();
router.use(authenticate, companyLimiter);

router.get('/:id', [param('id').isUUID().withMessage('شناسه نامعتبر است')], validate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT mime, bytes FROM check_images WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'تصویر یافت نشد' });
    const { mime, bytes } = result.rows[0];
    res.set({
      'Content-Type': mime,
      'Content-Length': bytes.length,
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    });
    res.end(bytes);
  } catch (err) {
    console.error('Get image error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

module.exports = router;
