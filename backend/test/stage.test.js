// node --test "test/*.test.js"   (from backend/)
const test = require('node:test');
const assert = require('node:assert');
const { nextStage } = require('../lib/stage');

const row = (o) => ({ stage: 'waiting', status: 'pending', owner_id: null, beneficiary_id: null, ...o });

test('waiting → ready once owner and beneficiary are both there; the «copied» mark goes', () => {
  const r = nextStage(row({ owner_id: 4 }), row({ owner_id: 4, beneficiary_id: 9 }));
  assert.strictEqual(r.stage, 'ready');
  assert.deepStrictEqual(r.set, { copied_at: null });
  assert.deepStrictEqual(r.events, []);
});

test('waiting stays waiting with only one of them', () => {
  assert.strictEqual(nextStage(row(), row({ beneficiary_id: 9 })).stage, 'waiting');
});

test('ready → waiting when one is cleared', () => {
  const r = nextStage(row({ stage: 'ready', owner_id: 4, beneficiary_id: 9 }), row({ owner_id: null, beneficiary_id: 9 }));
  assert.strictEqual(r.stage, 'waiting');
  assert.deepStrictEqual(r.set, { copied_at: null });
});

test('ready with a different beneficiary: still ready, but the photo must be copied again', () => {
  const r = nextStage(row({ stage: 'ready', owner_id: 4, beneficiary_id: 9 }), row({ owner_id: 4, beneficiary_id: 10 }));
  assert.strictEqual(r.stage, 'ready');
  assert.deepStrictEqual(r.set, { copied_at: null });
});

test('ready, nothing about the people changed: the «copied» mark stays', () => {
  const r = nextStage(row({ stage: 'ready', owner_id: 4, beneficiary_id: 9 }), row({ owner_id: 4, beneficiary_id: 9 }));
  assert.strictEqual(r.stage, 'ready');
  assert.deepStrictEqual(r.set, {});
});

test('a status other than pending, before the cheque is sent: refused', () => {
  const r = nextStage(row({ owner_id: 4, beneficiary_id: 9, stage: 'ready' }), row({ owner_id: 4, beneficiary_id: 9, status: 'done' }));
  assert.strictEqual(r.error.code, 'not_sent');
});

const sent = row({ stage: 'sent', status: 'done', owner_id: 4, beneficiary_id: 9 });

test('sent, a status change: stays sent, nothing else', () => {
  const r = nextStage(sent, { ...sent, status: 'problem' });
  assert.deepStrictEqual(r, { stage: 'sent', set: {}, events: [] });
});

test('sent, beneficiary corrected without resend: stays sent, the change is in the history', () => {
  const r = nextStage(sent, { ...sent, beneficiary_id: 10 });
  assert.strictEqual(r.stage, 'sent');
  assert.deepStrictEqual(r.set, {});
  assert.deepStrictEqual(r.events, [{ event: 'beneficiary_changed', from_person: 9, to_person: 10 }]);
});

test('sent, owner changed with resend: back to ready, status pending', () => {
  const r = nextStage(sent, { ...sent, owner_id: 5 }, { resend: true });
  assert.strictEqual(r.stage, 'ready');
  assert.deepStrictEqual(r.set, { status: 'pending', copied_at: null });
  assert.deepStrictEqual(r.events, [{ event: 'owner_changed', from_person: 4, to_person: 5 }]);
});

test('sent, resend asked but nobody changed: stays sent', () => {
  assert.strictEqual(nextStage(sent, { ...sent }, { resend: true }).stage, 'sent');
});

test('sent, beneficiary cleared without unsend: refused', () => {
  const r = nextStage(sent, { ...sent, beneficiary_id: null });
  assert.strictEqual(r.error.code, 'unsend_required');
});

test('sent, beneficiary cleared with unsend: off the board, back to waiting', () => {
  const r = nextStage(sent, { ...sent, beneficiary_id: null }, { unsend: true });
  assert.strictEqual(r.stage, 'waiting');
  assert.deepStrictEqual(r.set, { status: 'pending', send_date: null, copied_at: null });
  assert.deepStrictEqual(r.events, [{ event: 'beneficiary_changed', from_person: 9, to_person: null }, { event: 'unsent' }]);
});

test('undefined and null count the same', () => {
  const r = nextStage({ stage: 'waiting', owner_id: 4 }, { stage: 'waiting', owner_id: 4, beneficiary_id: undefined });
  assert.strictEqual(r.stage, 'waiting');
  assert.deepStrictEqual(r.set, {});
});
