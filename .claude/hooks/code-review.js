/**
 * code-review.js — PostToolUse Write|Edit|MultiEdit hook
 *
 * Checks written/edited files against code quality rules in .claude/rules/code-review.md.
 * Checks thresholds (function length, file length, nesting depth),
 * naming conventions, and forbidden patterns.
 *
 * Rules source: .claude/rules/code-review.md
 * Exit 0 → clean
 * Exit 2 → violations found (HIGH severity)
 */

import { loadRules, readInput, getWrittenFile, matchPatterns, printHeader, pass, report } from './utils/rule-loader.js'
import { extname } from 'path'

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

const rules = loadRules('code-review')
const input = await readInput()

const written = getWrittenFile(input)
if (!written) pass('No writable file detected — skipping code review.')

const { filePath, content } = written

if (!CODE_EXTENSIONS.has(extname(filePath))) {
  pass(`Not a code file — skipping code review.`)
}

printHeader('🔍 Code Review', filePath)

/** @type {import('./utils/rule-loader.js').Violation[]} */
const violations = []

// ─── Load thresholds from rules ───────────────────────────────────────────

const threshSection = rules.sections['Thresholds'] ?? { keyValues: {} }
const kv = threshSection.keyValues

const MAX_FILE_LINES     = num(kv['max file lines'],    800)
const MAX_FN_LINES       = num(kv['max function lines'], 50)
const MAX_NESTING        = num(kv['max nesting depth'],  4)
const MAX_PARAMS         = num(kv['max parameters'],     5)
const MAX_BLANK_LINES    = num(kv['max consecutive blank lines'], 3)

// ─── Threshold: File length ───────────────────────────────────────────────

const lines = content.split('\n')
if (lines.length > MAX_FILE_LINES) {
  violations.push({
    pattern: 'max file lines',
    section: 'Thresholds',
    ruleFile: rules.filePath,
    line: lines.length,
    lineContent: `File has ${lines.length} lines (max: ${MAX_FILE_LINES}). Split into smaller modules.`,
    severity: 'HIGH',
  })
}

// ─── Threshold: Nesting depth ─────────────────────────────────────────────

let maxNestFound = 0
let maxNestLine = 0

lines.forEach((line, i) => {
  // Count leading 2-space indent groups as nesting level
  const leadingSpaces = line.length - line.trimStart().length
  const depth = Math.floor(leadingSpaces / 2)
  if (depth > maxNestFound) {
    maxNestFound = depth
    maxNestLine = i + 1
  }
})

if (maxNestFound > MAX_NESTING) {
  violations.push({
    pattern: 'max nesting depth',
    section: 'Thresholds',
    ruleFile: rules.filePath,
    line: maxNestLine,
    lineContent: `Nesting depth ${maxNestFound} exceeds max ${MAX_NESTING}. Extract nested blocks to functions.`,
    severity: 'MEDIUM',
  })
}

// ─── Threshold: Function length (heuristic) ───────────────────────────────

estimateFunctionLengths(lines, MAX_FN_LINES).forEach(({ name, startLine, length }) => {
  violations.push({
    pattern: 'max function lines',
    section: 'Thresholds',
    ruleFile: rules.filePath,
    line: startLine,
    lineContent: `Function \`${name}\` is ${length} lines (max: ${MAX_FN_LINES}). Break into smaller functions.`,
    severity: 'MEDIUM',
  })
})

// ─── Threshold: Excessive blank lines ────────────────────────────────────

let blankRun = 0
lines.forEach((line, i) => {
  if (line.trim() === '') {
    blankRun++
    if (blankRun > MAX_BLANK_LINES) {
      violations.push({
        pattern: 'max consecutive blank lines',
        section: 'Thresholds',
        ruleFile: rules.filePath,
        line: i + 1,
        lineContent: `${blankRun} consecutive blank lines (max: ${MAX_BLANK_LINES}).`,
        severity: 'LOW',
      })
      blankRun = 0 // reset to avoid reporting every extra blank
    }
  } else {
    blankRun = 0
  }
})

// ─── Forbidden Patterns ───────────────────────────────────────────────────

const forbidSection = rules.sections['Forbidden Patterns']
if (forbidSection) {
  // Skip magic_number in test files — test fixtures legitimately contain numbers
  const isTest = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath)
  const skipKeys = isTest ? ['magic_number'] : []

  const found = matchPatterns(content, forbidSection, 'Forbidden Patterns', rules.filePath, skipKeys)

  // Filter false positives for console_log: allow in non-src files and logger wrappers
  const filtered = found.filter((v) => {
    const line = lines[v.line - 1] ?? ''
    // Skip commented-out lines
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return false
    // Allow console.log in seed/script files
    if (['console_log', 'console_debug', 'console_info_prod'].includes(v.pattern)) {
      if (/\/(seed|script|scripts|cli|bin)\//.test(filePath)) return false
      if (/server\.ts$/.test(filePath)) return false // server startup logs OK
    }
    return true
  })

  const severityMap = {
    debugger_stmt: 'CRITICAL',
    empty_catch: 'HIGH',
    console_log: 'MEDIUM',
    console_debug: 'MEDIUM',
    console_info_prod: 'LOW',
    magic_number: 'LOW',
    nested_ternary: 'MEDIUM',
    no_explicit_any_cast: 'HIGH',
    alert_call: 'HIGH',
    infinite_loop: 'CRITICAL',
    todo_fixme: 'LOW',
  }

  for (const v of filtered) {
    v.severity = severityMap[v.pattern] ?? 'MEDIUM'
  }
  violations.push(...filtered)
}

// ─── Naming Conventions (heuristic) ──────────────────────────────────────

const namingSection = rules.sections['Naming Conventions']
if (namingSection) {
  lines.forEach((line, i) => {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return

    // Class must be PascalCase
    const classMatch = trimmed.match(/^(?:export\s+)?(?:abstract\s+)?class\s+([a-z]\w*)/)
    if (classMatch) {
      violations.push({
        pattern: 'classes_PascalCase',
        section: 'Naming Conventions',
        ruleFile: rules.filePath,
        line: i + 1,
        lineContent: line.trimEnd(),
        severity: 'MEDIUM',
      })
    }

    // Function must be camelCase (catches PascalCase function names that aren't React components)
    const fnMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+([A-Z][a-z]\w*)(?!\s*:)\s*\(/)
    if (fnMatch && !/^[A-Z][a-zA-Z]+(?:Component|Page|Layout|Provider|Context|Hook)$/.test(fnMatch[1])) {
      violations.push({
        pattern: 'functions_camelCase',
        section: 'Naming Conventions',
        ruleFile: rules.filePath,
        line: i + 1,
        lineContent: line.trimEnd(),
        severity: 'LOW',
      })
    }

    // Excessive parameter count (heuristic: count commas in function signatures)
    const paramMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+\w+\(([^)]{60,})\)/)
    if (paramMatch) {
      const commas = (paramMatch[1].match(/,/g) ?? []).length
      if (commas >= MAX_PARAMS) {
        violations.push({
          pattern: 'max parameters',
          section: 'Thresholds',
          ruleFile: rules.filePath,
          line: i + 1,
          lineContent: `${commas + 1} parameters (max: ${MAX_PARAMS}). Use an options object instead.`,
          severity: 'MEDIUM',
        })
      }
    }
  })
}

// ─── Complexity Signals (informational only) ──────────────────────────────

const signalSection = rules.sections['Complexity Signals']
if (signalSection) {
  const signalViolations = matchPatterns(content, signalSection, 'Complexity Signals', rules.filePath)
  for (const v of signalViolations) {
    v.severity = 'LOW'
  }
  violations.push(...signalViolations)
}

// ─── Deduplicate ──────────────────────────────────────────────────────────

const seen = new Set()
const unique = violations.filter((v) => {
  const key = `${v.pattern}:${v.line}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

// ─── Report ───────────────────────────────────────────────────────────────

const highCount = unique.filter((v) => ['CRITICAL', 'HIGH'].includes(v.severity ?? '')).length

report(
  unique,
  `Code review violations in ${filePath}`,
  highCount > 0 ? 2 : 0,
)

// ─── Helpers ──────────────────────────────────────────────────────────────

function num(val, fallback) {
  return typeof val === 'number' ? val : fallback
}

/**
 * Heuristic function-length estimator.
 * Finds function/method declarations and counts their body lines.
 */
function estimateFunctionLengths(lines, maxLines) {
  const violations = []
  let braceDepth = 0
  let inFunction = false
  let fnStart = 0
  let fnName = ''

  const FN_HEADER = /(?:(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\()/

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (!inFunction) {
      const m = line.match(FN_HEADER)
      if (m && line.includes('{')) {
        inFunction = true
        fnStart = i
        fnName = m[1] ?? m[2] ?? 'anonymous'
        braceDepth = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length
        continue
      }
    }

    if (inFunction) {
      braceDepth += (line.match(/\{/g) ?? []).length
      braceDepth -= (line.match(/\}/g) ?? []).length

      if (braceDepth <= 0) {
        const length = i - fnStart + 1
        if (length > maxLines) {
          violations.push({ name: fnName, startLine: fnStart + 1, length })
        }
        inFunction = false
        braceDepth = 0
      }
    }
  }

  return violations
}
