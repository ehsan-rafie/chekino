// node --test "test/*.test.js"   (from backend/)
const test = require('node:test');
const assert = require('node:assert');
const { nextStage } = require('../lib/stage');

const row = (o) => ({ stage: 'ready', status: 'pending', owner_id: 4, beneficiary_id: 9, ...o });

test('a cheque keeps its owner and beneficiary: clearing either is refused (no «منتظر ذینفع»)', () => {
  for (const k of ['owner_id', 'beneficiary_id']) {
    assert.strictEqual(nextStage(row(), row({ [k]: null })).error.code, 'people_required', k);
    assert.strictEqual(nextStage(row({ stage: 'sent' }), row({ stage: 'sent', [k]: null })).error.code, 'people_required', k);
  }
  assert.strictEqual(nextStage(row(), row({ beneficiary_id: undefined })).error.code, 'people_required', 'undefined counts as empty');
});

test('ready with a different beneficiary: still ready, but the photo must be copied again', () => {
  const r = nextStage(row(), row({ beneficiary_id: 10 }));
  assert.strictEqual(r.stage, 'ready');
  assert.deepStrictEqual(r.set, { copied_at: null });
});

test('ready, nothing about the people changed: the «copied» mark stays', () => {
  const r = nextStage(row(), row());
  assert.strictEqual(r.stage, 'ready');
  assert.deepStrictEqual(r.set, {});
});

test('an old waiting one given both its people: ready, the «copied» mark goes', () => {
  const r = nextStage(row({ stage: 'waiting', beneficiary_id: null }), row());
  assert.strictEqual(r.stage, 'ready');
  assert.deepStrictEqual(r.set, { copied_at: null });
});

test('a status other than pending, before the cheque is sent: refused', () => {
  assert.strictEqual(nextStage(row(), row({ status: 'done' })).error.code, 'not_sent');
});

const sent = row({ stage: 'sent', status: 'done' });

test('sent, a status change: stays sent, nothing else', () => {
  assert.deepStrictEqual(nextStage(sent, { ...sent, status: 'problem' }), { stage: 'sent', set: {}, events: [] });
});

test('sent, beneficiary corrected: stays sent, the change is in the history', () => {
  const r = nextStage(sent, { ...sent, beneficiary_id: 10 });
  assert.strictEqual(r.stage, 'sent');
  assert.deepStrictEqual(r.set, {});
  assert.deepStrictEqual(r.events, [{ event: 'beneficiary_changed', from_person: 9, to_person: 10 }]);
});

test('sent, owner corrected: stays sent, in the history', () => {
  const r = nextStage(sent, { ...sent, owner_id: 5 });
  assert.strictEqual(r.stage, 'sent');
  assert.deepStrictEqual(r.events, [{ event: 'owner_changed', from_person: 4, to_person: 5 }]);
});
