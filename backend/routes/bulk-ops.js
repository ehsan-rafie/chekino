const express = require('express');
const { param, query } = require('express-validator');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const { companyLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');

// «برگردون» (spec 6.3): every bulk change is kept for a day with what it
// changed, and can be put back — as long as none of its cheques has changed
// since (their versions are what the change left them at).
const router = express.Router();
router.use(authenticate, companyLimiter);

const UNDO_HOURS = 24;

// The recent ones, for «آخرین تغییرات گروهی»
router.get('/', [query('limit').optional().isInt({ min: 1, max: 50 }).toInt()], validate, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT o.id, o.kind, o.created_at, o.undone_at,
              o.request ->> 'party_name' AS party_name, o.request ->> 'label' AS label,
              (SELECT count(*) FROM jsonb_object_keys(o.after_versions))::int AS count,
              (o.undone_at IS NULL AND o.created_at > now() - make_interval(hours => $3)
               AND NOT EXISTS (
                 SELECT 1 FROM jsonb_each_text(o.after_versions) v
                 LEFT JOIN checks c ON c.id = v.key::int AND c.company_id = o.company_id
                 WHERE c.id IS NULL OR c.version <> v.value::int
               )) AS undoable
       FROM bulk_ops o WHERE o.company_id = $1
       ORDER BY o.created_at DESC LIMIT $2`,
      [req.companyId, req.query.limit || 10, UNDO_HOURS]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('List bulk ops error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.post('/:id/undo', [param('id').isInt().toInt()], validate, async (req, res) => {
  const db = await pool.connect();
  const fail = async (status, payload) => { await db.query('ROLLBACK').catch(() => {}); return res.status(status).json(payload); };
  try {
    await db.query('BEGIN');
    const op = (await db.query(
      `SELECT *, created_at > now() - make_interval(hours => $3) AS fresh
       FROM bulk_ops WHERE id = $1 AND company_id = $2 FOR UPDATE`,
      [req.params.id, req.companyId, UNDO_HOURS]
    )).rows[0];
    if (!op) return fail(404, { error: 'این تغییر پیدا نشد', code: 'not_found' });
    if (op.undone_at) return fail(409, { error: 'این تغییر قبلاً برگردانده شده', code: 'already_undone' });
    if (!op.fresh) return fail(409, { error: `فقط تا ${UNDO_HOURS} ساعت بعد از هر تغییر می‌شود برگرداندش`, code: 'too_old' });

    // Each cheque must be as the change left it: anything done to it since
    // would be lost by putting it back
    const ids = Object.keys(op.after_versions).map(Number);
    const now = (await db.query(
      'SELECT id, version FROM checks WHERE company_id = $1 AND id = ANY($2::int[]) FOR UPDATE',
      [req.companyId, ids]
    )).rows;
    const changed = ids.filter((id) => {
      const c = now.find((x) => x.id === id);
      return !c || c.version !== Number(op.after_versions[id]);
    });
    if (changed.length) {
      return fail(409, { error: 'بعضی از این چک‌ها بعد از این تغییر دوباره تغییر کرده‌اند؛ برگرداندن، آن تغییرها را از بین می‌برد', code: 'changed', changed });
    }

    if (op.kind === 'batch_commit') {
      // The photos first: deleting a cheque would delete them (cascade); they
      // go back to the batch, unattached, as they were before the commit
      const batchId = op.request.batch_id;
      await db.query(
        'UPDATE check_images SET check_id = NULL, batch_id = $1 WHERE company_id = $2 AND check_id = ANY($3::int[])',
        [batchId, req.companyId, ids]
      );
      await db.query('DELETE FROM checks WHERE company_id = $1 AND id = ANY($2::int[])', [req.companyId, ids]);
      // …and the rows back into the batch's draft, which opens again
      const batch = (await db.query('SELECT draft FROM check_batches WHERE id = $1 AND company_id = $2 FOR UPDATE', [batchId, req.companyId])).rows[0];
      let version = null;
      if (batch) {
        const draft = batch.draft || {};
        const rows = draft.rows || [];
        const refs = new Set(rows.map((r) => r.ref));
        const back = (op.request.rows || [])
          .filter((r) => !refs.has(r.ref))
          .map(({ id, owner_id, ...row }) => row);
        const merged = [...rows, ...back].sort((a, b) => (a.position || 0) - (b.position || 0));
        version = (await db.query(
          `UPDATE check_batches SET draft = $1::jsonb, state = 'open', version = version + 1, updated_at = now()
           WHERE id = $2 RETURNING version`,
          [JSON.stringify({ ...draft, rows: merged }), batchId]
        )).rows[0].version;
      }
      await db.query('UPDATE bulk_ops SET undone_at = now() WHERE id = $1', [op.id]);
      await db.query('COMMIT');
      return res.json({ ok: true, kind: op.kind, restored: ids.length, batch_id: batchId, batch_version: version });
    }
    if (op.kind === 'mark_sent') {
      // Back to «آماده‌ی ارسال» as they were: off the board, their send date,
      // channels and «copied» mark as before. The history keeps the send and
      // gains the undo — it is only ever added to.
      const at = new Date().toISOString();
      for (const b of op.before) {
        await db.query(
          `UPDATE checks SET stage = $1, send_date = $2, channels = $3::jsonb, copied_at = $4,
                  status_history = COALESCE(status_history, '[]'::jsonb) || $5::jsonb,
                  version = version + 1, updated_at = now()
           WHERE id = $6 AND company_id = $7`,
          [b.stage, b.send_date, JSON.stringify(b.channels || []), b.copied_at,
            JSON.stringify([{ event: 'undo', op_id: op.id, at }]), b.id, req.companyId]
        );
      }
      await db.query('UPDATE bulk_ops SET undone_at = now() WHERE id = $1', [op.id]);
      await db.query('COMMIT');
      return res.json({ ok: true, kind: op.kind, restored: op.before.length });
    }
    if (op.kind === 'bulk_update') {
      // Each cheque's people, party, spend date, stage and status as they
      // were. The history keeps the edit and gains the undo; a status put
      // back is written as a change of its own, so the last status change
      // still says what the status is.
      const at = new Date().toISOString();
      const cur = (await db.query(
        'SELECT id, status FROM checks WHERE company_id = $1 AND id = ANY($2::int[])',
        [req.companyId, ids]
      )).rows;
      for (const b of op.before) {
        const now = cur.find((x) => x.id === b.id);
        const events = [];
        if (now && now.status !== b.status) events.push({ to: b.status, reason: '', at });
        events.push({ event: 'undo', op_id: op.id, at });
        await db.query(
          `UPDATE checks SET stage = $1, status = $2, owner_id = $3, beneficiary_id = $4, party_id = $5,
                  spend_date = $6, send_date = $7, copied_at = $8,
                  status_history = COALESCE(status_history, '[]'::jsonb) || $9::jsonb,
                  version = version + 1, updated_at = now()
           WHERE id = $10 AND company_id = $11`,
          [b.stage, b.status, b.owner_id, b.beneficiary_id, b.party_id, b.spend_date, b.send_date, b.copied_at,
            JSON.stringify(events), b.id, req.companyId]
        );
      }
      await db.query('UPDATE bulk_ops SET undone_at = now() WHERE id = $1', [op.id]);
      await db.query('COMMIT');
      return res.json({ ok: true, kind: op.kind, restored: op.before.length });
    }
    return fail(400, { error: 'برگرداندن این نوع تغییر هنوز ممکن نیست', code: 'not_supported' });
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('Undo bulk op error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  } finally {
    db.release();
  }
});

module.exports = router;
