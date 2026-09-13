import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { realpathSync, statSync } from 'node:fs';

const ANCHORS = [
  "You've hit your usage limit", 'Usage limit reached', 'usage limit',
  'out of credits', 'purchase more credits', 'try again at',
  'Approaching rate limits', 'Heads up, you have less than',
];

let binary = null;
try {
  const which = spawnSync('sh', ['-c', 'command -v codex'], { encoding: 'utf8' }).stdout.trim();
  const real = which && realpathSync(which);
  if (real && statSync(real).isFile() && statSync(real).size > 1_000_000) binary = real;
} catch {}
const skip = binary ? false : 'codex binary not on PATH';

test('every wording anchor the Codex profile relies on is still in the installed Codex', { skip }, () => {
  const args = ['-a', '-o', '-F', ...ANCHORS.flatMap((a) => ['-e', a]), binary];
  const found = spawnSync('grep', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const present = new Set(found.stdout.split('\n'));
  const missing = ANCHORS.filter((a) => !present.has(a));
  assert.deepEqual(missing, [], `wording no longer found in ${binary}`);
});
