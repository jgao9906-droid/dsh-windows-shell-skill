import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as plugin from '../index.js';

const modules = process.env.DSH_MODULES;
test('real DSH event bus, session persistence, resume and plugin disposal', { skip: !modules }, async () => {
  const load = name => import(pathToFileURL(join(modules, name, 'lib/index.js')));
  const { Context } = await load('cordis');
  const { SkillRegistry } = await load('dsh-skill');
  const { Session } = await load('dsh-session');
  const ctx = new Context();
  const registry = ctx.plugin(SkillRegistry);
  await registry;
  let fork;
  try {
    fork = ctx.plugin(plugin);
    await fork;
    assert.ok(await ctx.skills.get('windows-shell-syntax'));
    const session = Session.create('windows-shell-integration');
    const payload = { agent: { session }, signal: new AbortController().signal };
    const dispatch = (decision = { kind: 'enter', messages: [] }) => ctx.waterfall('agent/pre-step', payload, async () => decision);
    const first = await dispatch();
    assert.equal(first.messages.length, 1);
    const rulesEvent = session.append('user/message', first.messages[0], { surfaceOp: 'append' });
    assert.equal((await dispatch()).messages.length, 0);
    const seed = session.snapshotEvents();
    const resumed = Session.create('windows-shell-integration', seed);
    payload.agent = { session: resumed };
    assert.equal((await dispatch()).messages.length, 0);
    resumed.append('user/message', {
      id: 'integration-compaction-summary', role: 'user',
      source: { kind: 'integration-summary' },
      content: [{ type: 'text', text: 'Compacted history without the original rules.' }],
    }, {
      surfaceOp: { op: 'replace', startSeq: rulesEvent.seq, endSeq: rulesEvent.seq },
      sourceEventSeqs: [rulesEvent.seq],
    });
    assert.equal((await dispatch()).messages.length, 1);
    await fork.dispose();
    assert.equal(await ctx.skills.get('windows-shell-syntax'), undefined);
    payload.agent = { session: Session.create('new-session-after-uninstall') };
    assert.equal((await dispatch()).messages.length, 0);
  } finally {
    await fork?.dispose();
    await registry.dispose();
  }
});
