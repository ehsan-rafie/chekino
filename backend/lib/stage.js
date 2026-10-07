// Where a cheque is in the hand-off (spec 6.2). Only the server decides it,
// here; the database's constraints (migration 007) back the same rules.
//
//   waiting  added in bulk, its owner or its beneficiary still unknown
//   ready    both known: its photo can go to the owner
//   sent     on the board: sent to the owner (every cheque the single form
//            adds starts here); only now does it have a Sayad status
//
// Moves between them, with what goes along:
//   waiting → ready     owner and beneficiary both filled        copied_at cleared
//   ready   → waiting   one of them cleared                      copied_at cleared
//   ready   → sent      «ارسال کردم» (mark-sent) only — not here
//   sent    → ready     owner or beneficiary changed with `resend`
//   sent    → waiting   owner or beneficiary cleared with `unsend`
//   sent, changed without either: stays sent — a correction of the data
// A change of owner or beneficiary on a sent cheque is written to its
// history as an event (owner_changed, beneficiary_changed, unsent); a status
// is the Sayad outcome and only a sent cheque has one other than pending.

const STAGES = ['waiting', 'ready', 'sent'];

// What a cheque's stage is after a change. `before` and `after` are its
// rows (owner_id, beneficiary_id, stage, status, …); opts: { resend, unsend }.
// Returns { stage, set, events, error }:
//   set     further columns to write ({ copied_at: null, status: 'pending', … })
//   events  history events to add ({ event, from_person, to_person })
//   error   { code, error } when the change isn't allowed (nothing to write)
function nextStage(before, after, opts = {}) {
  const has = (r, k) => r[k] !== null && r[k] !== undefined;
  const both = has(after, 'owner_id') && has(after, 'beneficiary_id');
  const set = {};
  const events = [];
  const changed = (k) => (before[k] ?? null) !== (after[k] ?? null);
  const personEvents = () => {
    if (changed('owner_id')) events.push({ event: 'owner_changed', from_person: before.owner_id ?? null, to_person: after.owner_id ?? null });
    if (changed('beneficiary_id')) events.push({ event: 'beneficiary_changed', from_person: before.beneficiary_id ?? null, to_person: after.beneficiary_id ?? null });
  };

  if (before.stage !== 'sent') {
    if ((after.status || 'pending') !== 'pending') {
      return { error: { code: 'not_sent', error: 'وضعیت ثبت فقط برای چکِ ارسال‌شده معنی دارد' } };
    }
    const stage = both ? 'ready' : 'waiting';
    if (stage !== before.stage || changed('owner_id') || changed('beneficiary_id')) set.copied_at = null;
    return { stage, set, events };
  }

  // sent
  if (!both) {
    if (!opts.unsend) {
      return { error: { code: 'unsend_required', error: 'صاحب چک یا ذینفعِ چکِ ارسال‌شده را نمی‌شود خالی کرد' } };
    }
    personEvents();
    events.push({ event: 'unsent' });
    return { stage: 'waiting', set: { status: 'pending', send_date: null, copied_at: null }, events };
  }
  const personChanged = changed('owner_id') || changed('beneficiary_id');
  if (personChanged) personEvents();
  if (personChanged && opts.resend) {
    return { stage: 'ready', set: { status: 'pending', copied_at: null }, events };
  }
  return { stage: 'sent', set, events };
}

module.exports = { STAGES, nextStage };
