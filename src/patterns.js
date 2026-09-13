import { CLAUDE } from './agents.js';

const CSI_REGEX = /\x1b\[[\x20-\x3f]*[\x40-\x7e]/g;
const OSC_REGEX = /\x1b\][\s\S]*?(?:\x07|\x1b\\)/g;
const DCS_REGEX = /\x1bP[\s\S]*?(?:\x07|\x1b\\)/g;
const OTHER_ESC_REGEX = /\x1b[_X^][\s\S]*?(?:\x07|\x1b\\)/g;

export function stripAnsi(text) {
  return String(text)
    .replace(OSC_REGEX, '')
    .replace(DCS_REGEX, '')
    .replace(OTHER_ESC_REGEX, '')
    .replace(CSI_REGEX, '');
}

const USAGE_WARNING = /\b\d{1,3}%\s+of your\b/i;

const TRANSIENT_PATTERNS = [
  /temporarily limiting requests/i,
  /\brate limited\b/i,
  /\boverloaded\b/i,
  /api error:?\s*(?:5\d\d|429)\b/i,
  /internal server error/i,
  /server[-\s]side issue/i,
  /api error:?\s*connection\b/i,
  /unable to connect to api/i,
  /experiencing high load/i,
];

const WINDOW = 6;

const TABLE_ROW_SEPARATORS = /[│┃|]/g;
const TABLE_ROW_START = /^\s*[│┃|]/;

function isTableRow(line) {
  if (!TABLE_ROW_START.test(line)) return false;
  return (line.match(TABLE_ROW_SEPARATORS) || []).length >= 3;
}

const THINKING_LINE = /^\s*\S{0,2}\s*\w+\s+for\s+\d+m?\s?\d*s\b/i;

function profileOf(profile) {
  return profile || CLAUDE;
}

function outputBlockBounds(lines, profile) {
  const { outputLine, nonOutputLine, chromeLine } = profileOf(profile);
  let start = -1;
  for (let k = lines.length - 1; k >= 0; k--) {
    if (chromeLine && chromeLine.test(lines[k])) continue;
    if (outputLine.test(lines[k])) { start = k; break; }
  }
  if (start < 0) return null;
  let end = start;
  for (let k = start + 1; k < lines.length; k++) {
    const ln = lines[k];
    if (ln.trim() === '' || nonOutputLine.test(ln) || THINKING_LINE.test(ln)) break;
    end = k;
  }
  return { start, end };
}

export function agentErrorBlock(text, profile) {
  const p = profileOf(profile);
  const block = latestOutputBlock(text, p);
  if (block == null) return null;
  const first = block.split('\n')[0];
  if (!p.agentLine.test(first)) return null;
  return TRANSIENT_PATTERNS.some((pat) => pat.test(first)) ? block : null;
}

function toLines(text) {
  return Array.isArray(text) ? text : stripAnsi(text).split('\n');
}

export function latestOutputBlock(text, profile) {
  const lines = toLines(text);
  const bounds = outputBlockBounds(lines, profile);
  return bounds ? lines.slice(bounds.start, bounds.end + 1).join('\n') : null;
}

function detectionRegion(lines, profile) {
  const { promptLine, chromeLine } = profileOf(profile);
  const bounds = outputBlockBounds(lines, profile);
  return lines
    .slice(bounds ? bounds.start : 0)
    .filter((l) => !promptLine.test(l) && !(chromeLine && chromeLine.test(l)));
}

function compile(customPatterns) {
  return (customPatterns || [])
    .map((p) => {
      if (p instanceof RegExp) return p;
      if (typeof p !== 'string') return null;
      try {
        return new RegExp(p, 'i');
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function hasNearbyMatch(lines, idx, patterns) {
  const start = Math.max(0, idx - WINDOW);
  const end = Math.min(lines.length, idx + WINDOW + 1);
  for (let j = start; j < end; j++) {
    if (isTableRow(lines[j])) continue;
    if (patterns.some((p) => p.test(lines[j]))) return true;
  }
  return false;
}

function isLimitLine(line, profile) {
  if (USAGE_WARNING.test(line) || profile.notALimit.test(line)) return false;
  if (isTableRow(line)) return false;
  return profile.limitPatterns.some((p) => p.test(line));
}

function limitedIn(lines, customPatterns, profile) {
  const p = profileOf(profile);
  const custom = compile(customPatterns);
  if (custom.length > 0 && custom.some((pat) => pat.test(lines.join('\n')))) return true;
  for (let i = 0; i < lines.length; i++) {
    if (!isLimitLine(lines[i], p)) continue;
    if (!p.resetRequired || hasNearbyMatch(lines, i, p.resetPatterns)) return true;
  }
  return false;
}

export function isRateLimited(text, customPatterns = [], profile) {
  return limitedIn(detectionRegion(toLines(text), profile), customPatterns, profile);
}

export function limitInLatestBlock(text, customPatterns = [], profile) {
  const lines = toLines(text);
  const bounds = outputBlockBounds(lines, profile);
  return bounds != null && limitedIn(lines.slice(bounds.start, bounds.end + 1), customPatterns, profile);
}

export function classifyLimit(text, customPatterns = [], customTransientPatterns = [], profile) {
  const p = profileOf(profile);
  const region = detectionRegion(toLines(text), p);
  if (limitedIn(region, customPatterns, p)) return 'reset';
  const blob = region.filter((l) => !isTableRow(l) && !p.notALimit.test(l)).join('\n');
  const transient = TRANSIENT_PATTERNS.concat(compile(customTransientPatterns));
  return transient.some((pat) => pat.test(blob)) ? 'transient' : null;
}

export function findRateLimitMessage(text, profile) {
  const p = profileOf(profile);
  const lines = detectionRegion(toLines(text), p);

  let limitIdx = -1;
  let lastTransient = -1;
  const resets = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (isTableRow(ln)) continue;
    if (p.resetPatterns.some((pat) => pat.test(ln))) resets.push(i);
    if (TRANSIENT_PATTERNS.some((pat) => pat.test(ln))) lastTransient = i;
    if (isLimitLine(ln, p)) limitIdx = i;
  }

  if (limitIdx >= 0) {
    if (p.resetPatterns.some((pat) => pat.test(lines[limitIdx]))) return lines[limitIdx].trim();
    let best = -1;
    for (const j of resets) {
      if (Math.abs(j - limitIdx) > WINDOW) continue;
      if (best === -1 || Math.abs(j - limitIdx) < Math.abs(best - limitIdx)) best = j;
    }
    if (best >= 0) return lines[best].trim();
  }
  if (resets.length > 0) return lines[resets[resets.length - 1]].trim();
  if (limitIdx >= 0) return lines[limitIdx].trim();
  if (lastTransient >= 0) return lines[lastTransient].trim();
  return null;
}
