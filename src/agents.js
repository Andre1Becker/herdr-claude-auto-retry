
const CLAUDE_LIMIT_PATTERNS = [
  /(?:hit|exceeded|reached).*(?:your|the)\s*(?:[\w-]+\s+){0,3}limit/i,
  /\d+-hour limit/i,
  /session limit/i,
  /weekly limit/i,
  /limit reached/i,
  /usage limit/i,
  /out of.*usage/i,
  /rate limit/i,
];

const CLAUDE_RESET_PATTERNS = [
  /resets?\s+(?:at\s+)?(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i,
  /resets?\s+in[:\s]\s*\d/i,
  /try again in \d+\s*(?:hours?|minutes?|h|m)/i,
];

const CODEX_LIMIT_PATTERNS = [
  /you'?ve hit your usage limit/i,
  /you'?ve reached your usage limit/i,
  /usage limit reached/i,
  /out of credits/i,
];

const CODEX_RESET_PATTERNS = [
  ...CLAUDE_RESET_PATTERNS,
  /try again (?:at|on)\s+\w/i,
];

export const CLAUDE = {
  id: 'claude',
  match: /claude/i,
  outputLine: /^\s*[⏺⎿]/u,
  agentLine: /^\s*⏺/u,
  nonOutputLine: /^\s*[⏺⎿❯>]/u,
  promptLine: /^\s*[❯>]/u,
  inputPrompt: /^\s*❯\s?/u,
  chromeLine: /^\s*✻/u,
  limitPatterns: CLAUDE_LIMIT_PATTERNS,
  resetPatterns: CLAUDE_RESET_PATTERNS,
  resetRequired: true,
  notALimit: /\bfast[- ](?:mode|limit)\b|\bspend limit\b/i,
};

export const CODEX = {
  id: 'codex',
  match: /codex/i,
  outputLine: /^\s*[•■]/u,
  agentLine: /^\s*[•■]/u,
  nonOutputLine: /^\s*[•■›▌>]/u,
  promptLine: /^\s*[›▌>]/u,
  inputPrompt: /^\s*[›▌]\s?/u,
  chromeLine: /^\s*⚠/u,
  limitPatterns: CODEX_LIMIT_PATTERNS,
  resetPatterns: CODEX_RESET_PATTERNS,
  resetRequired: false,
  notALimit: /\bapproaching rate limits\b|\bhide future rate limit reminders\b|\bspend limit\b/i,
};

export const PROFILES = [CLAUDE, CODEX];

export function profileForAgent(agent) {
  if (typeof agent !== 'string' || !agent) return null;
  return PROFILES.find((p) => p.match.test(agent)) || null;
}

export function profileFor(pane) {
  return pane ? profileForAgent(pane.agent) : null;
}

export function isSupportedAgent(pane) {
  return profileFor(pane) != null;
}
