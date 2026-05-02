/**
 * coding-style.js — PostToolUse Write|Edit|MultiEdit hook
 *
 * Checks written/edited files against style rules in .claude/rules/coding-style.md.
 * Reports violations with exact section + rule references so devs know where to update the rule.
 *
 * Rules source: .claude/rules/coding-style.md
 * Exit 0 → no violations (or non-code file)
 * Exit 2 → violations found; Claude must fix before proceeding
 */

import { loadRules, readInput, getWrittenFile, matchPatterns, printHeader, pass, report } from './utils/rule-loader.js'
import { extname } from 'path'

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

const rules = loadRules('coding-style')
const input = await readInput()

const written = getWrittenFile(input)
if (!written) pass('No writable file detected — skipping style check.')

const { filePath, content } = written

// Only lint code files
if (!CODE_EXTENSIONS.has(extname(filePath))) {
  pass(`Not a code file (${extname(filePath)}) — skipping style check.`)
}

printHeader('🎨 Coding Style', filePath)

/** @type {import('./utils/rule-loader.js').Violation[]} */
const violations = []

// ─── Section: Forbidden ───────────────────────────────────────────────────

const forbiddenSection = rules.sections['Forbidden']
if (forbiddenSection) {
  const found = matchPatterns(content, forbiddenSection, 'Forbidden', rules.filePath)
  // Classify severity
  for (const v of found) {
    v.severity = criticalForbidden(v.pattern) ? 'HIGH' : 'MEDIUM'
  }
  violations.push(...found)
}

// ─── Section: Immutability Rules ─────────────────────────────────────────

const mutSection = rules.sections['Immutability Rules']
if (mutSection) {
  const lines = content.split('\n')
  const found = matchPatterns(content, mutSection, 'Immutability Rules', rules.filePath)

  // Filter false positives: skip comment lines and lines inside test files
  const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath)
  const filtered = found.filter((v) => {
    const line = lines[v.line - 1] ?? ''
    // Skip if the line is a comment
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return false
    // In test files, allow push/pop/splice (test setup data)
    if (isTestFile && ['no_array_push', 'no_array_pop', 'no_array_splice'].includes(v.pattern)) return false
    return true
  })

  for (const v of filtered) v.severity = 'HIGH'
  violations.push(...filtered)
}

// ─── Section: Formatting (static checks) ─────────────────────────────────

const fmtSection = rules.sections['Formatting']
if (fmtSection) {
  const lines = content.split('\n')
  const fmtKv = fmtSection.keyValues

  // Tab indentation check (should use spaces)
  lines.forEach((line, i) => {
    if (line.startsWith('\t')) {
      violations.push({
        pattern: 'indent',
        section: 'Formatting',
        ruleFile: rules.filePath,
        line: i + 1,
        lineContent: line.trimEnd(),
        severity: 'MEDIUM',
      })
    }
  })

  // Max line length check
  const maxLen = typeof fmtKv['max_line_length'] === 'number' ? fmtKv['max_line_length']
    : typeof fmtKv['max line length'] === 'number' ? fmtKv['max line length'] : 100
  lines.forEach((line, i) => {
    if (line.length > maxLen) {
      violations.push({
        pattern: 'max_line_length',
        section: 'Formatting',
        ruleFile: rules.filePath,
        line: i + 1,
        lineContent: `${line.slice(0, 80)}… (length: ${line.length})`,
        severity: 'LOW',
      })
    }
  })

  // Double-quoted strings check (should use single quotes)
  // Only flag top-level double quotes, not inside template literals or JSX
  lines.forEach((line, i) => {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return
    // Match double-quoted string literals not already inside single-quoted or template
    if (/"[^"]{1,}"/.test(line) && !/'[^']*"[^']*'/.test(line) && !line.includes('`')) {
      // Exclude import statements pointing to paths (often need double quotes in some configs)
      if (!trimmed.startsWith('import ') && !trimmed.startsWith('from ')) {
        violations.push({
          pattern: 'quotes',
          section: 'Formatting',
          ruleFile: rules.filePath,
          line: i + 1,
          lineContent: line.trimEnd(),
          severity: 'LOW',
        })
      }
    }
  })
}

// ─── Section: Import Order ────────────────────────────────────────────────

const importSection = rules.sections['Import Order']
if (importSection) {
  const importLines = []
  content.split('\n').forEach((line, i) => {
    if (/^import\s/.test(line)) {
      importLines.push({ line: i + 1, content: line })
    }
  })

  // Check for require() in ESM files
  const requireKv = importSection.keyValues['no_require_in_esm']
  if (typeof requireKv === 'string') {
    try {
      const re = new RegExp(requireKv)
      content.split('\n').forEach((line, i) => {
        if (re.test(line) && !line.trimStart().startsWith('//')) {
          violations.push({
            pattern: 'no_require_in_esm',
            section: 'Import Order',
            ruleFile: rules.filePath,
            line: i + 1,
            lineContent: line.trimEnd(),
            severity: 'HIGH',
          })
        }
      })
    } catch { /* skip */ }
  }

  // Basic import order: external before @/ before ./
  let seenInternal = false
  let seenRelative = false
  for (const imp of importLines) {
    const isExternal = /from\s+['"][^.@][^'"]*['"]/.test(imp.content)
    const isInternal = /from\s+['"]@\//.test(imp.content)
    const isRelative = /from\s+['"]\./.test(imp.content)

    if (isRelative) seenRelative = true
    if (isInternal) seenInternal = true

    if (isExternal && (seenInternal || seenRelative)) {
      violations.push({
        pattern: 'external_before_internal',
        section: 'Import Order',
        ruleFile: rules.filePath,
        line: imp.line,
        lineContent: imp.content.trimEnd(),
        severity: 'LOW',
      })
    }
    if (isInternal && seenRelative) {
      violations.push({
        pattern: 'internal_before_relative',
        section: 'Import Order',
        ruleFile: rules.filePath,
        line: imp.line,
        lineContent: imp.content.trimEnd(),
        severity: 'LOW',
      })
    }
  }
}

// ─── Deduplicate (same line + pattern) ───────────────────────────────────

const seen = new Set()
const unique = violations.filter((v) => {
  const key = `${v.pattern}:${v.line}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

// ─── Report ───────────────────────────────────────────────────────────────

const criticalCount = unique.filter((v) => v.severity === 'HIGH').length

report(
  unique,
  `Coding style violations in ${filePath}`,
  criticalCount > 0 ? 2 : 0,  // Only block on HIGH violations
)

/** Returns true if the pattern name is a HIGH-severity style violation */
function criticalForbidden(pattern) {
  return ['var_keyword', 'eval_call', 'with_statement', 'any_type', 'ts_ignore', 'loose_equality', 'strict_inequality_violation'].includes(pattern)
}
