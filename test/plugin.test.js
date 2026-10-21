import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { apply, inject } from '../index.js';

test('registers a loadable skill with local reference resources', () => {
  const registrations = [];
  apply({ skills: { register: (skill) => registrations.push(skill) }, on() {} });
  assert.deepEqual(inject, ['skills']);
  assert.equal(registrations.length, 1);
  const skill = registrations[0];
  assert.equal(skill.name, 'windows-shell-syntax');
  assert.deepEqual(skill.invocation, { modelInvocable: true, userInvocable: true });
  assert.ok(existsSync(skill.path));
  assert.equal(skill.resourceBase.kind, 'directory');
  assert.ok(existsSync(join(skill.resourceBase.path, 'references', 'examples.md')));
  assert.ok(skill.content.length > 0 && skill.content.length < 7500);
  const entry = readFileSync(skill.path, 'utf8');
  assert.equal(skill.content, entry.split(/---\r?\n/).slice(2).join('---\n').trim());
});
