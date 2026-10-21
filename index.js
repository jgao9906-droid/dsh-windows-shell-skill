import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const rules = readFileSync(new URL('./shell-rules.md', import.meta.url), 'utf8').trim();
if (!rules) throw new Error('Bundled shell-rules.md is empty');
const rulesVersion = createHash('sha256').update(rules).digest('hex');
const sourceKind = 'windows-shell-rules';

function isCurrentRules(message) {
  return message?.source?.kind === sourceKind && message.source.version === rulesVersion;
}

function hasVisibleRules(agent) {
  // Check actual visible history, rather than a process-local once flag:
  // a resumed session keeps its rules, while compaction can require reinjection.
  const nodes = agent.session.surface.nodes;
  for (let index = nodes.length - 1; index >= 0; index--) {
    const event = agent.session.eventAt(nodes[index]);
    if (event?.type === 'user/message' && isCurrentRules(event.data)) return true;
  }
  return false;
}

const directory = new URL('./skills/windows-shell-syntax/', import.meta.url);
const entry = new URL('SKILL.md', directory);
// This package owns a fixed header with two JSON-quoted YAML scalars.
// Fail visibly on unsupported metadata instead of silently registering bad instructions.
const document = readFileSync(entry, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const match = /^---\nname: ("[^\n]+")\ndescription: ("[^\n]+")\n---\n([\s\S]+)$/.exec(document);
if (!match) throw new Error('Invalid bundled SKILL.md: expected name and description as JSON-quoted strings');
const skillName = JSON.parse(match[1]);
const description = JSON.parse(match[2]);
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skillName) || !description.trim() || !match[3].trim()) {
  throw new Error('Invalid bundled skill name, description or body');
}

export const name = 'windows-shell-skill';
export const inject = ['skills'];

export function apply(ctx) {
  ctx.skills.register({
    name: skillName,
    description,
    content: match[3].trim(),
    source: 'bundled',
    path: fileURLToPath(entry),
    resourceBase: { kind: 'directory', path: fileURLToPath(directory) },
    invocation: { modelInvocable: true, userInvocable: true },
  });

  ctx.on('agent/pre-step', async ({ agent, signal }, next) => {
    const decision = await next();
    if (decision.kind === 'reject') return decision;
    signal.throwIfAborted();
    if (decision.messages.some(isCurrentRules) || hasVisibleRules(agent)) return decision;
    // DSH UserMessage wire shape: stable id, user role, producer source, blocks.
    const reminder = Object.freeze({
      id: randomUUID(),
      role: 'user',
      source: Object.freeze({ kind: sourceKind, form: 'instructions', version: rulesVersion }),
      content: Object.freeze([Object.freeze({ type: 'text', text: rules })]),
    });
    return { ...decision, messages: [...decision.messages, reminder] };
  });
}
