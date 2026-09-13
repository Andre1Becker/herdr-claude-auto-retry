// A real rate-limited pane: the error is the newest output; everything below is chrome.
export function limitScreen(counter) {
  return [
    '⏺ Bash(git push origin main)',
    '  ⎿  main -> main',
    '',
    "⏺ You've hit your session limit · resets 8:50pm (Asia/Omsk)",
    '',
    `✻ Cooking… (${counter}m 14s · ↓ 8.1k tokens)`,
    '─────────────────────────────────────────',
    '❯',
    '─────────────────────────────────────────',
    `  proj git:(main) | Opus 5 (1M context) | ctx: ${counter}%`,
    `  5h: 30% (resets in ${counter}m) | 7d: 29% (resets in 5d8h)`,
    '  -- INSERT -- ⏵⏵ bypass permissions on (shift+tab to cycle)',
  ].join('\n');
}

// A real rate-limited Codex pane: the limit lands as an ■ line that carries its
// own reset time, and the model-switch prompt opens underneath it.
export function codexLimitScreen(counter) {
  return [
    '• Ran cargo test --workspace',
    '  └ 42 passed, 0 failed',
    '',
    `⚠ Heads up, you have less than ${counter}% of your 5h limit left. Run /status for a breakdown.`,
    '',
    '• Explored',
    '  └ Read src/main.rs, Cargo.toml',
    '',
    "■ You've hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again at Sep 14th, 2026 1:38 AM.",
    '',
    '',
    '  Approaching rate limits',
    '  Switch to gpt-5.6-luna for lower credit usage?',
    '',
    '› 1. Switch to gpt-5.6-luna                 Fast and affordable agentic coding model.',
    '  2. Keep current model',
    '  3. Keep current model (never show again)  Hide future rate limit reminders about switching models.',
    '',
    '  Press enter to confirm or esc to go back',
  ].join('\n');
}

// The other Codex limit wording: no reset time anywhere on the screen.
export function codexCreditsScreen() {
  return [
    '• Explored',
    '  └ Read src/main.rs',
    '',
    "■ You've hit your usage limit. Visit https://chatgpt.com/codex/settings/usage to purchase more credits",
    '',
    '›',
  ].join('\n');
}
