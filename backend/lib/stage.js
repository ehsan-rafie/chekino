// Where a cheque is in the hand-off (spec 6.2). Only the server decides it,
// here; the database's constraints (migration 007) back the same rules.
//
//   ready    added in bulk, not yet sent: its photo can go to the owner
//   sent     on the board: sent to the owner (every cheque the single form
//            adds starts here); only now does it have a Sayad status
//
// A cheque always has its owner and its beneficiary: it is added with both
// (the owner's call, 2026-10-12 — there is no «منتظر ذینفع» any more; the
// database still allows the old 'waiting' stage, which nothing makes now).
//
// Moves between them, with what goes along:
//   ready → sent     «ارسال کردم» (mark-sent) only — not here
//   ready, owner or beneficiary changed: stays ready     copied_at cleared
//   sent, changed: stays sent — a correction of the data
// A change of owner or beneficiary on a sent cheque is written to its
// history as an event (owner_changed, beneficiary_changed); a status is
// the Sayad outcome and only a sent cheque has one other than pending.

const STAGES = ['ready', 'sent'];

// What a cheque's stage is after a change. `before` and `after` are its
// rows (owner_id, beneficiary_id, stage, status, …).
// Returns { stage, set, events, error }:
//   set     further columns to write ({ copied_at: null, … })
//   events  history events to add ({ event, from_person, to_person })
//   error   { code, error } when the change isn't allowed (nothing to write)
function nextStage(before, after) {
  const has = (r, k) => r[k] !== null && r[k] !== undefined;
  if (!has(after, 'owner_id') || !has(after, 'beneficiary_id')) {
    return { error: { code: 'people_required', error: 'صاحب چک و ذینفع را نمی‌شود خالی کرد' } };
  }
  const set = {};
  const events = [];
  const changed = (k) => (before[k] ?? null) !== (after[k] ?? null);

  if (before.stage !== 'sent') {
    if ((after.status || 'pending') !== 'pending') {
      return { error: { code: 'not_sent', error: 'وضعیت ثبت فقط برای چکِ ارسال‌شده معنی دارد' } };
    }
    // (an old waiting one given both its people is ready too)
    if (before.stage !== 'ready' || changed('owner_id') || changed('beneficiary_id')) set.copied_at = null;
    return { stage: 'ready', set, events };
  }

  // sent
  if (changed('owner_id')) events.push({ event: 'owner_changed', from_person: before.owner_id ?? null, to_person: after.owner_id ?? null });
  if (changed('beneficiary_id')) events.push({ event: 'beneficiary_changed', from_person: before.beneficiary_id ?? null, to_person: after.beneficiary_id ?? null });
  return { stage: 'sent', set, events };
}

module.exports = { STAGES, nextStage };
