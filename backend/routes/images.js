const crypto = require('crypto');
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
//
// Photos arrive here on their own too (spec 6.3): a bulk add uploads each
// cheque it cut from a scan while the rows are being typed (X-Batch-Id),
// and the commit attaches it to its cheque. The body is the file itself,
// not JSON: up to 3 MB, its first bytes must say what its type says.
const router = express.Router();
router.use(authenticate, companyLimiter);

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const SIGNATURE = {
  'image/jpeg': (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.length > 8 && b.readUInt32BE(0) === 0x89504e47,
  'image/webp': (b) => b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP',
  'application/pdf': (b) => b.length > 4 && b.toString('latin1', 0, 4) === '%PDF',
};
const rawFile = express.raw({ type: TYPES, limit: '3mb' });
const rawThumb = express.raw({ type: 'image/jpeg', limit: '200kb' });
const mimeOf = (req) => String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
const idParam = [param('id').isUUID().withMessage('شناسه نامعتبر است')];

router.post('/', rawFile, async (req, res) => {
  const mime = mimeOf(req);
  if (!TYPES.includes(mime)) return res.status(415).json({ error: 'این نوع فایل پذیرفته نمی‌شود', code: 'bad_type' });
  const bytes = req.body;
  if (!Buffer.isBuffer(bytes) || !bytes.length) return res.status(400).json({ error: 'فایلی نرسید', code: 'empty' });
  if (!SIGNATURE[mime](bytes)) return res.status(400).json({ error: 'فایل با نوعی که گفته شده نمی‌خواند', code: 'bad_signature' });
  const kind = req.headers['x-kind'] === 'receipt' ? 'receipt' : 'cheque';
  const batchId = req.headers['x-batch-id'] ? Number(req.headers['x-batch-id']) : null;
  const checkId = req.headers['x-check-id'] ? Number(req.headers['x-check-id']) : null;
  if ((batchId !== null && !Number.isInteger(batchId)) || (checkId !== null && !Number.isInteger(checkId))) {
    return res.status(400).json({ error: 'شناسه نامعتبر است', code: 'bad_id' });
  }
  // a PDF is a receipt or the single form's attachment, never a bulk add's cheque
  if (mime === 'application/pdf' && batchId !== null) return res.status(415).json({ error: 'برای افزودن گروهی فقط عکس', code: 'bad_type' });
  try {
    if (batchId !== null) {
      const b = (await pool.query('SELECT state FROM check_batches WHERE id = $1 AND company_id = $2', [batchId, req.companyId])).rows[0];
      if (!b) return res.status(404).json({ error: 'دسته پیدا نشد', code: 'not_found' });
      if (b.state !== 'open') return res.status(409).json({ error: 'این دسته دیگر باز نیست', code: 'batch_closed' });
    }
    if (checkId !== null) {
      const c = (await pool.query('SELECT 1 FROM checks WHERE id = $1 AND company_id = $2', [checkId, req.companyId])).rows[0];
      if (!c) return res.status(404).json({ error: 'چک یافت نشد', code: 'not_found' });
    }
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const r = await pool.query(
      `INSERT INTO check_images (company_id, check_id, batch_id, kind, mime, bytes, byte_size, sha256)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [req.companyId, checkId, batchId, kind, mime, bytes, bytes.length, sha256]
    );
    res.status(201).json({ id: r.rows[0].id });
  } catch (err) {
    console.error('Upload image error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// Its small copy (a JPEG of a few dozen KB), for lists and rows
router.put('/:id/thumb', idParam, validate, rawThumb, async (req, res) => {
  const bytes = req.body;
  if (mimeOf(req) !== 'image/jpeg' || !Buffer.isBuffer(bytes) || !SIGNATURE['image/jpeg'](bytes)) {
    return res.status(400).json({ error: 'عکس کوچک باید JPEG باشد', code: 'bad_type' });
  }
  try {
    const r = await pool.query('UPDATE check_images SET thumb = $1 WHERE id = $2 AND company_id = $3', [bytes, req.params.id, req.companyId]);
    if (!r.rowCount) return res.status(404).json({ error: 'تصویر یافت نشد' });
    res.status(204).end();
  } catch (err) {
    console.error('Thumb image error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

const sendImage = (res, mime, bytes) => {
  res.set({
    'Content-Type': mime,
    'Content-Length': bytes.length,
    'Cache-Control': 'private, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
  });
  res.end(bytes);
};

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT mime, bytes FROM check_images WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'تصویر یافت نشد' });
    sendImage(res, result.rows[0].mime, result.rows[0].bytes);
  } catch (err) {
    console.error('Get image error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// The small copy, or the photo itself when it has none
router.get('/:id/thumb', idParam, validate, async (req, res) => {
  try {
    const r = (await pool.query(
      'SELECT mime, thumb IS NOT NULL AS has_thumb, COALESCE(thumb, bytes) AS bytes FROM check_images WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    )).rows[0];
    if (!r) return res.status(404).json({ error: 'تصویر یافت نشد' });
    sendImage(res, r.has_thumb ? 'image/jpeg' : r.mime, r.bytes);
  } catch (err) {
    console.error('Get thumb error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// Only a photo no cheque has yet (a row of an open batch, not saved): a
// saved cheque's photo is changed through that cheque
router.delete('/:id', idParam, validate, async (req, res) => {
  try {
    const r = (await pool.query('SELECT check_id FROM check_images WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId])).rows[0];
    if (!r) return res.status(404).json({ error: 'تصویر یافت نشد' });
    if (r.check_id !== null) return res.status(409).json({ error: 'عکس چکِ ثبت‌شده از ویرایش همان چک عوض می‌شود', code: 'attached' });
    await pool.query('DELETE FROM check_images WHERE id = $1 AND company_id = $2 AND check_id IS NULL', [req.params.id, req.companyId]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete image error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// Photos nobody will attach any more: of a batch that was saved or thrown
// away, or of none at all and a week old. Run once at start and daily.
async function sweepLooseImages() {
  const r = await pool.query(
    `DELETE FROM check_images i
     WHERE i.check_id IS NULL AND (
       (i.batch_id IS NOT NULL AND EXISTS (SELECT 1 FROM check_batches b WHERE b.id = i.batch_id AND b.state IN ('committed', 'discarded')))
       OR (i.batch_id IS NULL AND i.created_at < now() - interval '7 days'))`
  );
  return r.rowCount;
}

module.exports = router;
module.exports.sweepLooseImages = sweepLooseImages;
