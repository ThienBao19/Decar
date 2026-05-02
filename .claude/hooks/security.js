/**
 * security.js — Stop hook
 *
 * Fires when Claude finishes a turn (Stop event). Reads the session transcript
 * to find every file written or edited during the turn, then scans each file
 * for secrets and forbidden patterns defined in .claude/rules/security.md.
 *
 * Strategy (in priority order):
 *   1. Parse transcript_path (JSONL) → collect file paths from Write/Edit calls
 *   2. Scan those files on disk
 *   3. If no transcript available, scan all code files touched recently
 *
 * Rules source: .claude/rules/security.md
 * Exit 0 → clean (Claude stops normally)
 * Exit 2 → CRITICAL/HIGH violations found (Claude is asked to fix before stopping)
 */

import {
  loadRules,
  readInput,
  matchPatterns,
  walkFiles,
  PROJECT_ROOT,
  printHeader,
  pass,
  formatViolation,
} from './utils/rule-loader.js'
import { readFileSync, existsSync } from 'fs'
import { extname, relative, basename } from 'path'

const rules = loadRules('security')
const input = await readInput()

// Guard: if Claude Code sets stop_hook_active to prevent re-entry, exit clean
if (input.stop_hook_active === true && !input.transcript_path) {
  process.exit(0)
}

printHeader('🔒 Security Scan')

// ─── Build list of files to scan ─────────────────────────────────────────

/** @type {string[]} */
let filesToScan = []

// Path 1: parse transcript for written file paths
const transcriptPath = input.transcript_path
if (transcriptPath && existsSync(transcriptPath)) {
  filesToScan = extractFilesFromTranscript(transcriptPath)
}

// Path 2: fallback — walk the whole project (respecting skip rules)
if (filesToScan.length === 0) {
  const scanSection = rules.sections['Scan Targets'] ?? { keyValues: {} }
  const skipDirsRaw = scanSection.keyValues['skip_dirs'] ?? 'node_modules,.next,dist,.turbo,coverage,.git'
  const skipDirs = String(skipDirsRaw).split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
  const extRaw = scanSection.keyValues['extensions'] ?? '.ts,.tsx,.js,.jsx,.mjs,.cjs,.json,.yaml,.yml,.env,.sh'
  const extensions = String(extRaw).split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
  const maxKb = typeof scanSection.keyValues['max_file_size_kb'] === 'number'
    ? scanSection.keyValues['max_file_size_kb'] : 500

  filesToScan = walkFiles(PROJECT_ROOT, extensions, skipDirs, maxKb)
}

if (filesToScan.length === 0) {
  pass('No files to scan.')
}

console.log(`   Scanning ${filesToScan.length} file(s)…\n`)

// ─── Build regex sets from rules ──────────────────────────────────────────

const forbidSection = rules.sections['Forbidden Patterns'] ?? { keyValues: {} }
const exceptSection = rules.sections['Allowed Exceptions'] ?? { keyValues: {} }
const severSection  = rules.sections['Severity Levels']   ?? { keyValues: {} }

// Compile forbidden patterns → Map<name, RegExp>
/** @type {Map<string, RegExp>} */
const forbiddenRegexes = new Map()
for (const [name, rawPattern] of Object.entries(forbidSection.keyValues)) {
  if (typeof rawPattern !== 'string') continue
  try {
    forbiddenRegexes.set(name, new RegExp(rawPattern, 'i'))
  } catch { /* skip invalid regex */ }
}

// Compile exception patterns (any match on same line disqualifies the hit)
/** @type {RegExp[]} */
const exceptionRegexes = []
for (const [, rawPattern] of Object.entries(exceptSection.keyValues)) {
  if (typeof rawPattern !== 'string') continue
  try { exceptionRegexes.push(new RegExp(rawPattern, 'i')) } catch { /* skip */ }
}

// Build severity lookup  name → 'CRITICAL' | 'HIGH' | 'LOW'
/** @type {Map<string, string>} */
const severityMap = new Map()
for (const [tier, names] of Object.entries(severSection.keyValues)) {
  if (typeof names !== 'string') continue
  for (const name of names.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)) {
    severityMap.set(name, tier.toUpperCase())
  }
}

// ─── Scan each file ───────────────────────────────────────────────────────

/** @type {{ filePath: string, violations: import('./utils/rule-loader.js').Violation[] }[]} */
const results = []

for (const filePath of filesToScan) {
  // Skip exception files (e.g. .env.example)
  if (exceptionRegexes.some((re) => re.test(filePath))) continue

  let content
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch { continue }

  const lines = content.split('\n')
  /** @type {import('./utils/rule-loader.js').Violation[]} */
  const fileViolations = []

  for (const [name, regex] of forbiddenRegexes) {
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx]
      if (!regex.test(line)) continue

      // Check if any exception pattern matches the same line
      if (exceptionRegexes.some((ex) => ex.test(line))) continue

      // Skip commented lines
      const trimmed = line.trimStart()
      if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) continue

      const severity = severityMap.get(name) ?? 'LOW'

      fileViolations.push({
        pattern: name,
        section: 'Forbidden Patterns',
        ruleFile: rules.filePath,
        line: lineIdx + 1,
        lineContent: line.trimEnd().slice(0, 120),
        severity,
      })
    }
  }

  if (fileViolations.length > 0) {
    results.push({ filePath, violations: fileViolations })
  }
}

// ─── Report ───────────────────────────────────────────────────────────────

if (results.length === 0) {
  console.log('✅  No security violations found.\n')
  process.exit(0)
}

// Separate by severity
const criticalResults = results.filter((r) => r.violations.some((v) => v.severity === 'CRITICAL'))
const highResults     = results.filter((r) => r.violations.some((v) => v.severity === 'HIGH') && !criticalResults.includes(r))
const lowResults      = results.filter((r) => !criticalResults.includes(r) && !highResults.includes(r))

const totalViolations = results.reduce((n, r) => n + r.violations.length, 0)

console.log(`🚨  Security scan found ${totalViolations} violation(s) in ${results.length} file(s).\n`)

// Print CRITICAL first
for (const { filePath, violations } of [...criticalResults, ...highResults, ...lowResults]) {
  const rel = relative(PROJECT_ROOT, filePath)
  console.log(`📄  ${rel}`)
  for (const v of violations) {
    console.log(formatViolation(v, v.severity ?? 'LOW'))
    console.log()
  }
}

// Summarise what to do
const hasCritical = criticalResults.length > 0
const hasHigh     = highResults.length > 0

if (hasCritical || hasHigh) {
  console.log('─'.repeat(60))
  console.log('🛑  ACTION REQUIRED before this session can close:\n')
  console.log('   1. Remove or rotate every CRITICAL/HIGH secret immediately.')
  console.log('   2. Replace hardcoded values with environment variable references:')
  console.log('      process.env.SECRET_NAME')
  console.log('   3. Add the variable to .env.example with a placeholder value.')
  console.log('   4. If a real secret was committed, rotate it NOW — treat it as compromised.')
  console.log()
  console.log(`   Rule definitions: .claude/rules/security.md`)
  console.log(`   § Forbidden Patterns — edit regex rules`)
  console.log(`   § Allowed Exceptions — add safe patterns\n`)
  process.exit(2)
}

// Only LOW violations — warn but let Claude stop
console.log('⚠️   Low-severity hints only — review when convenient.')
console.log(`    Rule definitions: .claude/rules/security.md\n`)
process.exit(0)

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Parse a JSONL transcript file and collect every file path that was
 * written or edited during the session.
 *
 * Each line in the transcript is a JSON message. Tool calls look like:
 * { "type": "tool_use", "name": "Write"|"Edit"|"MultiEdit", "input": { "file_path": "…" } }
 *
 * @param {string} transcriptPath
 * @returns {string[]}
 */
function extractFilesFromTranscript(transcriptPath) {
  const paths = new Set()
  const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit'])

  let raw
  try { raw = readFileSync(transcriptPath, 'utf-8') } catch { return [] }

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    try {
      const msg = JSON.parse(line)
      // Handle both flat and nested message shapes Claude Code may emit
      const entries = Array.isArray(msg.content) ? msg.content : [msg]
      for (const entry of entries) {
        if (entry.type === 'tool_use' && WRITE_TOOLS.has(entry.name)) {
          const fp = entry.input?.file_path
          if (fp && existsSync(fp)) paths.add(fp)
        }
        // Also handle tool_result wrappers
        if (entry.type === 'tool_result' && entry.tool_use_id) {
          const fp = entry.content?.[0]?.text?.match(/File: (.+)/)?.[1]
          if (fp && existsSync(fp)) paths.add(fp.trim())
        }
      }
    } catch { /* skip malformed JSON lines */ }
  }

  return [...paths]
}
