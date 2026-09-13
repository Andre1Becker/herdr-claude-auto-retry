import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyLimit, findRateLimitMessage, isRateLimited, limitInLatestBlock, latestOutputBlock } from '../src/patterns.js';
import { parseResetTime, calculateWaitMs } from '../src/time-parser.js';
import { CLAUDE, CODEX } from '../src/agents.js';
import { codexLimitScreen, codexCreditsScreen, limitScreen } from './fixtures/screens.js';

test('the Codex limit banner arms a wait', () => {
  assert.equal(classifyLimit(codexLimitScreen(5), [], [], CODEX), 'reset');
  assert.ok(isRateLimited(codexLimitScreen(5), [], CODEX));
});

test('the ■ banner is read as the newest output block', () => {
  const block = latestOutputBlock(codexLimitScreen(5), CODEX);
  assert.ok(block.includes("You've hit your usage limit"));
  assert.ok(limitInLatestBlock(codexLimitScreen(5), [], CODEX));
});

test('the reported message is the banner line, reset time included', () => {
  const msg = findRateLimitMessage(codexLimitScreen(5), CODEX);
  assert.match(msg, /try again at Sep 14th, 2026 1:38 AM/);
});

test('Codex wording without any reset time still arms a wait (resetRequired: false)', () => {
  assert.equal(classifyLimit(codexCreditsScreen(), [], [], CODEX), 'reset');
});

test('a "less than N% of your 5h limit left" heads-up is not a stop', () => {
  const screen = [
    '• Explored',
    '  └ Read src/main.rs',
    '',
    '⚠ Heads up, you have less than 10% of your 5h limit left. Run /status for a breakdown.',
    '',
    '›',
  ].join('\n');
  assert.equal(classifyLimit(screen, [], [], CODEX), null);
});

test('the "Approaching rate limits" model-switch prompt is not a stop', () => {
  const screen = [
    '• Explored',
    '  └ Read src/main.rs',
    '',
    '  Approaching rate limits',
    '  Switch to gpt-5.6-luna for lower credit usage?',
    '',
    '› 1. Switch to gpt-5.6-luna',
    '  3. Keep current model (never show again)  Hide future rate limit reminders about switching models.',
  ].join('\n');
  assert.equal(classifyLimit(screen, [], [], CODEX), null);
});

test('the Claude profile is unchanged by the Codex work', () => {
  assert.equal(classifyLimit(limitScreen(3), [], [], CLAUDE), 'reset');
  assert.equal(classifyLimit(limitScreen(3)), 'reset');
});

test('a Codex screen read with the Claude profile does not arm a wait', () => {
  assert.equal(classifyLimit(codexLimitScreen(5), [], [], CLAUDE), null);
});

test('Codex absolute reset times are parsed, not left to the 5h fallback', () => {
  const parsed = parseResetTime("■ You've hit your usage limit. … or try again at Sep 14th, 2026 1:38 AM.");
  assert.ok(parsed, 'expected a parse result');
  const now = new Date('2026-09-13T20:00:00Z');
  const waitMs = calculateWaitMs(parsed, 60, 5, now);
  assert.ok(waitMs > 0);
  const target = new Date(now.getTime() + waitMs - 60_000);
  const wall = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(target);
  assert.equal(wall, 'Sep 14, 1:38 AM');
});

test('a Codex banner whose reset time already passed still waits a sane amount', () => {
  const parsed = parseResetTime('try again at Sep 14th, 2026 1:38 AM');
  const waitMs = calculateWaitMs(parsed, 60, 5, new Date('2026-09-20T12:00:00Z'));
  assert.ok(waitMs >= 0 && waitMs <= 6 * 3600 * 1000, `unexpected wait: ${waitMs}`);
});

test('the Codex composer line is read back for verification', async () => {
  const { readInputLine, classifyTypedInput } = await import('../src/recovery.js');
  const screen = [
    "■ You've hit your usage limit.",
    '',
    '› Continue where you left off.',
  ].join('\n');
  assert.equal(readInputLine(screen, CODEX), 'Continue where you left off.');
  assert.equal(classifyTypedInput(screen, 'Continue where you left off.', CODEX), 'intact');
  // The Claude composer glyph must not read a Codex prompt, and vice versa.
  assert.equal(readInputLine(screen, CLAUDE), null);
});

test('a vim-eaten first character is still detected on a Codex prompt', async () => {
  const { classifyTypedInput } = await import('../src/recovery.js');
  const screen = ['› ontinue where you left off.'].join('\n');
  assert.equal(classifyTypedInput(screen, 'Continue where you left off.', CODEX), 'eaten');
});
