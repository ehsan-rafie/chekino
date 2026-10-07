const express = require('express');
const { body, param, query } = require('express-validator');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const { companyLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const { draftShapeError, rowForCommit, headerProblems, UUID } = require('../lib/batch');
const { peopleResolver, PeopleLimitError } = require('../lib/people');

// A bulk add (spec 6.3): a draft autosaved here as it's typed, so a power
// cut or a closed browser loses nothing, and committed row by row into
// cheques — «waiting» for their owner or beneficiary, or «ready» to send.
const router = express.Router();
// Drafts run to a few hundred rows: 1 MB, read after the sign-in (server.js)
router.use(authenticate, companyLimiter, express.json({ limit: '1mb' }));

const idParam = [param('id').isInt().withMessage('شناسه نامعتبر است').toInt()];
const notFound = (res) => res.status(404).json({ error: 'دسته پیدا نشد', code: 'not_found' });
const conflict = (res, b) => res.status(409).json({ error: 'این دسته همین حالا جای دیگری تغییر کرد', code: 'version_conflict', version: b.version, draft: b.draft });

// ---- open one ----
router.post('/', [body('kind').isIn(['photo', 'manual']).withMessage('نوع دسته نامعتبر است')], validate, async (req, res) => {
  try {
    const r = await pool.query(
      `INSERT INTO check_batches (company_id, kind, draft) VALUES ($1, $2, '{"header":{},"rows":[]}'::jsonb)
       RETURNING id, kind, state, version, draft, created_at, updated_at`,
      [req.companyId, req.body.kind]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('Create batch error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ---- the open ones, for the «ادامه» bar ----
router.get('/', [query('state').optional().isIn(['open', 'committed', 'discarded'])], validate, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, kind, state, version, created_at, updated_at,
              draft #>> '{header,party,name}' AS party_name,
              COALESCE(jsonb_array_length(draft -> 'rows'), 0)::int AS rows_count
       FROM check_batches WHERE company_id = $1 AND state = $2
       ORDER BY updated_at DESC LIMIT 50`,
      [req.companyId, req.query.state || 'open']
    );
    res.json(r.rows);
  } catch (err) {
    console.error('List batches error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

router.get('/:id', idParam, validate, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, kind, state, version, draft, created_at, updated_at FROM check_batches WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    );
    if (!r.rows.length) return notFound(res);
    res.json(r.rows[0]);
  } catch (err) {
    console.error('Get batch error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ---- autosave: the whole draft, if nobody saved it meanwhile ----
router.patch('/:id', idParam, [body('version').isInt({ min: 1 }).withMessage('version الزامی است').toInt()], validate, async (req, res) => {
  const shape = draftShapeError(req.body.draft);
  if (shape) return res.status(400).json({ error: shape, code: 'invalid_draft' });
  try {
    const r = await pool.query(
      `UPDATE check_batches SET draft = $1::jsonb, version = version + 1, updated_at = now()
       WHERE id = $2 AND company_id = $3 AND state = 'open' AND version = $4
       RETURNING version, updated_at`,
      [JSON.stringify(req.body.draft), req.params.id, req.companyId, req.body.version]
    );
    if (r.rows.length) return res.json(r.rows[0]);
    const cur = await pool.query('SELECT state, version, draft FROM check_batches WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
    if (!cur.rows.length) return notFound(res);
    if (cur.rows[0].state !== 'open') return res.status(409).json({ error: 'این دسته دیگر باز نیست', code: 'batch_closed', state: cur.rows[0].state });
    return conflict(res, cur.rows[0]);
  } catch (err) {
    console.error('Save batch error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  }
});

// ---- let it go: its unattached photos go with it ----
router.delete('/:id', idParam, validate, async (req, res) => {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const r = await db.query(
      `UPDATE check_batches SET state = 'discarded', updated_at = now()
       WHERE id = $1 AND company_id = $2 AND state = 'open' RETURNING id`,
      [req.params.id, req.companyId]
    );
    if (!r.rows.length) {
      await db.query('ROLLBACK');
      const cur = await pool.query('SELECT state FROM check_batches WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
      if (!cur.rows.length) return notFound(res);
      return res.status(409).json({ error: 'این دسته دیگر باز نیست', code: 'batch_closed', state: cur.rows[0].state });
    }
    await db.query('DELETE FROM check_images WHERE batch_id = $1 AND company_id = $2 AND check_id IS NULL', [req.params.id, req.companyId]);
    await db.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('Discard batch error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  } finally {
    db.release();
  }
});

// ---- commit: the chosen complete rows become cheques ----
// All in one transaction, the company's row locked so two commits can't both
// fit under the plan's limit (H3). Each row has its own savepoint: one that
// fails (its sayad id already taken, its photo gone) is reported and stays
// in the draft; the others go in. Asking twice is harmless — a row whose ref
// is already a cheque counts as made (the client may retry after a lost
// answer). The rows made are kept in bulk_ops, so «برگردون» can put them back.
router.post('/:id/commit', idParam, [
  body('draft_version').isInt({ min: 1 }).withMessage('draft_version الزامی است').toInt(),
  body('refs').isArray({ min: 1, max: 300 }).withMessage('ردیفی برای ثبت انتخاب نشده'),
  body('refs.*').matches(UUID).withMessage('شناسه‌ی ردیف نامعتبر است'),
], validate, async (req, res) => {
  const db = await pool.connect();
  const fail = async (status, payload) => { await db.query('ROLLBACK').catch(() => {}); return res.status(status).json(payload); };
  try {
    await db.query('BEGIN');
    const plan = (await db.query(
      `SELECT p.max_checks, p.max_people FROM companies c LEFT JOIN plans p ON p.id = c.plan_id WHERE c.id = $1 FOR UPDATE OF c`,
      [req.companyId]
    )).rows[0] || {};
    const batch = (await db.query(
      'SELECT id, state, version, draft FROM check_batches WHERE id = $1 AND company_id = $2 FOR UPDATE',
      [req.params.id, req.companyId]
    )).rows[0];
    if (!batch) return fail(404, { error: 'دسته پیدا نشد', code: 'not_found' });
    if (batch.state !== 'open') return fail(409, { error: 'این دسته دیگر باز نیست', code: 'batch_closed', state: batch.state });
    if (batch.version !== req.body.draft_version) {
      return fail(409, { error: 'این دسته همین حالا جای دیگری تغییر کرد', code: 'version_conflict', version: batch.version });
    }
    const draft = batch.draft || {};
    const header = draft.header || {};
    const lacking = headerProblems(header);
    if (lacking.length) return fail(400, { error: `${lacking.join(' و ')} لازم است`, code: 'header_incomplete', missing: lacking });

    const wanted = new Set(req.body.refs);
    const rows = (draft.rows || []).filter((r) => wanted.has(r.ref));
    const skipped = [];
    const candidates = [];
    for (const r of rows) {
      const c = rowForCommit(r);
      if (c.missing) skipped.push({ ref: r.ref, missing: c.missing });
      else candidates.push({ src: r, row: c.row });
    }
    // nothing complete to make: nothing is written (no person added either)
    const nothing = () => fail(200, { created: [], failed: [], skipped_incomplete: skipped, batch_state: 'open', batch_version: batch.version, op_id: null });
    if (!candidates.length) return nothing();
    // a row already made (a retried commit) doesn't count against the plan
    const already = new Map((await db.query(
      'SELECT id, client_ref FROM checks WHERE company_id = $1 AND client_ref = ANY($2::uuid[])',
      [req.companyId, candidates.map((c) => c.src.ref)]
    )).rows.map((x) => [x.client_ref, x.id]));
    const fresh = candidates.filter((c) => !already.has(c.src.ref)).length;
    if (plan.max_checks !== null && plan.max_checks !== undefined) {
      const count = Number((await db.query('SELECT COUNT(*) AS n FROM checks WHERE company_id = $1', [req.companyId])).rows[0].n);
      const remaining = Math.max(0, Number(plan.max_checks) - count);
      if (fresh > remaining) {
        return fail(403, { error: `پلن شما ${remaining} چک دیگر جا دارد ولی ${fresh} ردیف برای ثبت انتخاب شده`, code: 'plan_limit', remaining });
      }
    }

    const people = await peopleResolver(db, req.companyId, { maxPeople: plan.max_people });
    const party = await people.resolve(header.party, 'party');
    if (party.error || !party.id) return fail(400, { error: party.error ? party.error.error : 'طرف حساب لازم است', code: party.error ? party.error.code : 'header_incomplete' });
    const benef = header.beneficiary && (header.beneficiary.id || String(header.beneficiary.name || '').trim())
      ? await people.resolve(header.beneficiary, 'benef') : { id: null };
    if (benef.error) return fail(400, { error: benef.error.error, code: benef.error.code });

    const created = [];
    const failed = [];
    const madeRows = [];
    // a failed row goes back to its savepoint, and so do the people it added
    let mark = 0;
    const undoRow = async () => { await db.query('ROLLBACK TO SAVEPOINT r'); people.forget(mark); };
    for (const { src, row } of candidates) {
      if (already.has(src.ref)) {
        const id = already.get(src.ref);
        const st = (await db.query('SELECT stage FROM checks WHERE id = $1', [id])).rows[0];
        created.push({ ref: src.ref, id, stage: st.stage, again: true });
        continue;
      }
      mark = people.mark();
      await db.query('SAVEPOINT r');
      try {
        const owner = src.owner && (src.owner.id || String(src.owner.name || '').trim()) ? await people.resolve(src.owner, 'owner') : { id: null };
        if (owner.error) {
          await undoRow();
          failed.push({ ref: src.ref, code: owner.error.code, error: owner.error.error });
          continue;
        }
        const stage = owner.id && benef.id ? 'ready' : 'waiting';
        const ins = await db.query(
          `INSERT INTO checks (company_id, serial, sayad_id, amount, due_date, spend_date, owner_id, party_id, beneficiary_id,
                               channels, status, status_history, stage, client_ref, batch_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '[]'::jsonb, 'pending', '[]'::jsonb, $10, $11, $12)
           RETURNING id`,
          [req.companyId, row.serial, row.sayad_id, row.amount, row.due_date, header.spend_date,
            owner.id, party.id, benef.id, stage, src.ref, batch.id]
        );
        const id = ins.rows[0].id;
        if (src.image_id) {
          const att = await db.query(
            `UPDATE check_images SET check_id = $1, batch_id = $2
             WHERE id::text = $3 AND company_id = $4 AND check_id IS NULL AND (batch_id = $2 OR batch_id IS NULL)`,
            [id, batch.id, String(src.image_id), req.companyId]
          );
          if (att.rowCount === 0) {
            await undoRow();
            failed.push({ ref: src.ref, code: 'image_missing', error: 'عکس این ردیف پیدا نشد؛ دوباره بگذارش' });
            continue;
          }
        }
        await db.query('RELEASE SAVEPOINT r');
        created.push({ ref: src.ref, id, stage });
        madeRows.push({ ...src, id, owner_id: owner.id });
      } catch (e) {
        await undoRow();
        if (e instanceof PeopleLimitError) throw e;
        if (e.code === '23505' && e.constraint === 'uq_checks_company_sayad') {
          const ex = (await db.query('SELECT id, serial FROM checks WHERE company_id = $1 AND sayad_id = $2', [req.companyId, row.sayad_id])).rows[0];
          failed.push({ ref: src.ref, code: 'duplicate_sayad', error: ex ? `این شناسه قبلاً ثبت شده — چک ${ex.serial}` : 'این شناسه صیادی قبلاً ثبت شده', existing_id: ex ? ex.id : null });
          continue;
        }
        throw e;
      }
    }

    // every row failed: nothing is written — the people added on the way go
    // too (a person and their cheque go in together or not at all, H14)
    if (!created.length) {
      await db.query('ROLLBACK');
      return res.json({ created: [], failed, skipped_incomplete: skipped, batch_state: 'open', batch_version: batch.version, op_id: null });
    }
    // What was made leaves the draft; with nothing left, the batch is done
    const madeRefs = new Set(created.map((c) => c.ref));
    const left = (draft.rows || []).filter((r) => !madeRefs.has(r.ref));
    const state = left.length ? 'open' : 'committed';
    const upd = await db.query(
      `UPDATE check_batches SET draft = $1::jsonb, state = $2, version = version + 1, updated_at = now()
       WHERE id = $3 RETURNING version`,
      [JSON.stringify({ ...draft, rows: left }), state, batch.id]
    );
    let opId = null;
    if (madeRows.length) {
      const op = await db.query(
        `INSERT INTO bulk_ops (company_id, kind, request, before, after_versions)
         VALUES ($1, 'batch_commit', $2::jsonb, '[]'::jsonb, $3::jsonb) RETURNING id`,
        [req.companyId, JSON.stringify({ batch_id: batch.id, party_name: header.party.name || null, rows: madeRows }),
          JSON.stringify(Object.fromEntries(madeRows.map((r) => [r.id, 1])))]
      );
      opId = op.rows[0].id;
    }
    await db.query('COMMIT');
    res.json({ created, failed, skipped_incomplete: skipped, batch_state: state, batch_version: upd.rows[0].version, op_id: opId });
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    if (err instanceof PeopleLimitError) return res.status(403).json({ error: err.message, code: err.code });
    console.error('Commit batch error:', err);
    res.status(500).json({ error: 'خطای سرور' });
  } finally {
    db.release();
  }
});

module.exports = router;
