import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../index.js';

function setup() {
  let handler;
  apply({ skills: { register() {} }, on(event, callback) {
    assert.equal(event, 'agent/pre-step');
    handler = callback;
  } });
  return handler;
}
function agentWith(events = [], visible = events.map((_, index) => index)) {
  return { session: { surface: { nodes: visible }, eventAt: seq => events[seq] } };
}
const signal = () => new AbortController().signal;

test('first admitted step gets concise instructions without mutating the decision', async () => {
  const handler = setup();
  const original = Object.freeze({ kind: 'enter', messages: Object.freeze([]), startsRequestSeries: true });
  let calls = 0;
  const result = await handler({ agent: agentWith(), signal: signal() }, async () => { calls++; return original; });
  assert.equal(calls, 1);
  assert.equal(original.messages.length, 0);
  assert.equal(result.startsRequestSeries, true);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(message.role, 'user');
  assert.ok(message.id);
  assert.equal(message.source.kind, 'windows-shell-rules');
  assert.equal(message.source.form, 'instructions');
  assert.ok(Object.isFrozen(message));
  assert.ok(message.content[0].text.length < 2000);
});

test('pending instructions are not duplicated', async () => {
  const handler = setup();
  const payload = { agent: agentWith(), signal: signal() };
  const first = await handler(payload, async () => ({ kind: 'enter', messages: [] }));
  assert.equal(await handler(payload, async () => first), first);
});

test('visible history prevents duplicates, including after plugin reload', async () => {
  const first = await setup()({ agent: agentWith(), signal: signal() }, async () => ({ kind: 'enter', messages: [] }));
  const agent = agentWith([{ type: 'user/message', data: first.messages[0] }]);
  const decision = { kind: 'enter', messages: [] };
  assert.equal(await setup()({ agent, signal: signal() }, async () => decision), decision);
});

test('compaction and a different session each get their own reminder', async () => {
  const handler = setup();
  const first = await handler({ agent: agentWith(), signal: signal() }, async () => ({ kind: 'enter', messages: [] }));
  const compacted = agentWith([{ type: 'user/message', data: first.messages[0] }], []);
  for (const agent of [compacted, agentWith()]) {
    const result = await handler({ agent, signal: signal() }, async () => ({ kind: 'enter', messages: [] }));
    assert.equal(result.messages.length, 1);
    assert.notEqual(result.messages[0].id, first.messages[0].id);
  }
});

test('outdated rules and user-authored lookalike text do not suppress injection', async () => {
  const handler = setup();
  const oldMessage = { source: { kind: 'windows-shell-rules', version: 'outdated' } };
  const userMessage = { source: { kind: 'user' }, content: [{ type: 'text', text: '<windows-shell-rules>' }] };
  for (const data of [oldMessage, userMessage]) {
    const result = await handler({ agent: agentWith([{ type: 'user/message', data }]), signal: signal() }, async () => ({ kind: 'enter', messages: [] }));
    assert.equal(result.messages.length, 1);
  }
});

test('downstream rejection is preserved and cancellation is respected', async () => {
  const handler = setup();
  const controller = new AbortController();
  controller.abort(new Error('cancelled'));
  const payload = { agent: agentWith(), signal: controller.signal };
  const rejected = { kind: 'reject' };
  assert.equal(await handler(payload, async () => rejected), rejected);
  await assert.rejects(handler(payload, async () => ({ kind: 'enter', messages: [] })), /cancelled/);
});
