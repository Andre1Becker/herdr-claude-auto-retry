import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileFor, profileForAgent, isSupportedAgent, CLAUDE, CODEX } from '../src/agents.js';

test('panes are matched to a profile by their herdr agent string', () => {
  assert.equal(profileFor({ agent: 'claude' }), CLAUDE);
  assert.equal(profileFor({ agent: 'Claude Code' }), CLAUDE);
  assert.equal(profileFor({ agent: 'codex' }), CODEX);
  assert.equal(profileFor({ agent: 'Codex CLI' }), CODEX);
});

test('an unknown or missing agent has no profile', () => {
  assert.equal(profileFor({ agent: 'aider' }), null);
  assert.equal(profileFor({ agent: '' }), null);
  assert.equal(profileFor({}), null);
  assert.equal(profileFor(null), null);
  assert.equal(profileForAgent(undefined), null);
});

test('isSupportedAgent covers every profile, not just Claude', () => {
  assert.ok(isSupportedAgent({ agent: 'claude' }));
  assert.ok(isSupportedAgent({ agent: 'codex' }));
  assert.ok(!isSupportedAgent({ agent: 'aider' }));
  assert.ok(!isSupportedAgent(null));
});

test('every profile carries the screen grammar the detectors need', () => {
  for (const profile of [CLAUDE, CODEX]) {
    for (const key of ['id', 'match', 'outputLine', 'agentLine', 'nonOutputLine', 'promptLine', 'inputPrompt', 'limitPatterns', 'resetPatterns']) {
      assert.ok(profile[key] != null, `${profile.id} is missing ${key}`);
    }
    assert.equal(typeof profile.resetRequired, 'boolean');
  }
});

test('Claude requires a reset time next to the limit; Codex does not', () => {
  assert.equal(CLAUDE.resetRequired, true);
  assert.equal(CODEX.resetRequired, false);
});
