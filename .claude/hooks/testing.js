/**
 * testing.js — PostToolUse Write|Edit|MultiEdit hook
 *
 * Two modes depending on the file being written:
 *
 *  TEST FILE  (*.test.ts / *.spec.ts / …)
 *    → enforces naming conventions, forbidden patterns (.only, .skip without
 *      reason, hardcoded data), and empty test bodies.
 *
 *  SOURCE FILE  (everything else that is code)
 *    → checks that a corresponding test file exists alongside it, and that
 *      the source file doesn't contain test logic leaked in.
 *
 * Rules source: .claude/rules/testing.md
 * Exit 0 → clean
 * Exit 2 → violations found (missing test file or forbidden test patterns)
 */

import {
  loadRules,
  readInput,
  getWrittenFile,
  matchPatterns,
  printHeader,
  pass,
  report,
  PROJECT_ROOT,
} from './utils/rule-loader.js'
import { extname, basename, dirname, join } from 'path'
import { existsSync } from 'fs'

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

// Patterns that mark a file as a test file
const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/

// Source file patterns that should always have a paired test file
const NEEDS_TEST_RE = /\.(service|util|utils|helper|helpers|lib|store|hook|hooks)\.(ts|tsx|js|jsx)$/

const rules = loadRules('testing')
const input = await readInput()

const written = getWrittenFile(input)
if (!written) pass('No writable file detected — skipping test check.')

const { filePath, content } = written

if (!CODE_EXTENSIONS.has(extname(filePath))) {
  pass(`Not a code file — skipping test check.`)
}

printHeader('🧪 Testing', filePath)

const isTestFile = TEST_FILE_RE.test(filePath)

// ─── TEST FILE checks ─────────────────────────────────────────────────────

if (isTestFile) {
  /** @type {import('./utils/rule-loader.js').Violation[]} */
  const violations = []

  // § Forbidden Patterns
  const forbidSection = rules.sections['Forbidden Patterns']
  if (forbidSection) {
    const found = matchPatterns(content, forbidSection, 'Forbidden Patterns', rules.filePath)

    // Severity mapping
    const severityMap = {
      test_only: 'CRITICAL',
      describe_only: 'CRITICAL',
      it_only: 'CRITICAL',
      test_only_call: 'CRITICAL',
      skip_without_reason: 'HIGH',
      xtest_without_reason: 'HIGH',
      xit_without_reason: 'HIGH',
      hardcoded_url: 'HIGH',
      hardcoded_user_id: 'HIGH',
      hardcoded_email: 'MEDIUM',
      sleep_in_test: 'MEDIUM',
      no_assertions: 'HIGH',
    }
    for (const v of found) v.severity = severityMap[v.pattern] ?? 'MEDIUM'
    violations.push(...found)
  }

  // § Naming Conventions — describe/it block format
  const namingSection = rules.sections['Naming Conventions']
  if (namingSection) {
    const lines = content.split('\n')

    // describe blocks must name the module/function under test (non-empty string arg)
    lines.forEach((line, i) => {
      const trimmed = line.trimStart()
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return

      // it/test blocks must start with a verb
      const itMatch = trimmed.match(/^\s*(?:it|test)\s*\(\s*['"`]([^'"`]{1,})/)
      if (itMatch) {
        const desc = itMatch[1].toLowerCase().trimStart()
        const VERBS = ['should', 'returns', 'return', 'throws', 'throw', 'renders', 'render',
          'calls', 'call', 'creates', 'create', 'updates', 'update', 'deletes', 'delete',
          'handles', 'handle', 'emits', 'emit', 'fires', 'fire', 'shows', 'show',
          'hides', 'hide', 'navigates', 'navigate', 'sets', 'set', 'gets', 'get',
          'fetches', 'fetch', 'sends', 'send', 'receives', 'receive', 'validates', 'validate',
        ]
        const startsWithVerb = VERBS.some((v) => desc.startsWith(v))
        if (!startsWithVerb) {
          violations.push({
            pattern: 'it_format',
            section: 'Naming Conventions',
            ruleFile: rules.filePath,
            line: i + 1,
            lineContent: line.trimEnd(),
            severity: 'LOW',
          })
        }
      }

      // describe blocks must not be empty strings
      const describeMatch = trimmed.match(/^\s*describe\s*\(\s*['"`]\s*['"`]/)
      if (describeMatch) {
        violations.push({
          pattern: 'describe_format',
          section: 'Naming Conventions',
          ruleFile: rules.filePath,
          line: i + 1,
          lineContent: line.trimEnd(),
          severity: 'MEDIUM',
        })
      }
    })
  }

  // § File suffix — warn if the test file itself uses wrong naming
  const fileSuffix = rules.sections['Naming Conventions']?.keyValues?.['file_suffix']
    ?? rules.sections['Naming Conventions']?.keyValues?.['no_test_prefix']
  const base = basename(filePath)
  if (base.startsWith('test_') || base.startsWith('Test')) {
    violations.push({
      pattern: 'no_test_prefix',
      section: 'Naming Conventions',
      ruleFile: rules.filePath,
      line: 1,
      lineContent: `File name "${base}" uses test_ prefix. Use suffix instead: foo.test.ts`,
      severity: 'MEDIUM',
    })
  }

  // Deduplicate
  const seen = new Set()
  const unique = violations.filter((v) => {
    const key = `${v.pattern}:${v.line}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const criticalCount = unique.filter((v) => v.severity === 'CRITICAL').length
  const highCount = unique.filter((v) => v.severity === 'HIGH').length

  report(
    unique,
    `Test file violations in ${filePath}`,
    criticalCount > 0 || highCount > 0 ? 2 : 0,
  )
}

// ─── SOURCE FILE checks ───────────────────────────────────────────────────

/** @type {import('./utils/rule-loader.js').Violation[]} */
const violations = []

// § Source File Checks — no test logic leaked into source
const srcSection = rules.sections['Source File Checks']
if (srcSection) {
  const testLogicPattern = srcSection.keyValues['no_test_logic_in_source']
  if (typeof testLogicPattern === 'string') {
    try {
      const re = new RegExp(testLogicPattern, 'i')
      content.split('\n').forEach((line, i) => {
        if (re.test(line) && !line.trimStart().startsWith('//')) {
          violations.push({
            pattern: 'no_test_logic_in_source',
            section: 'Source File Checks',
            ruleFile: rules.filePath,
            line: i + 1,
            lineContent: line.trimEnd(),
            severity: 'HIGH',
          })
        }
      })
    } catch { /* skip bad regex */ }
  }
}

// Check for missing paired test file (only for service/util/hook files)
if (NEEDS_TEST_RE.test(filePath)) {
  const dir = dirname(filePath)
  const base = basename(filePath)
  const stem = base.replace(/\.(ts|tsx|js|jsx|mjs)$/, '')

  const testCandidates = [
    join(dir, `${stem}.test.ts`),
    join(dir, `${stem}.test.tsx`),
    join(dir, `${stem}.spec.ts`),
    join(dir, `${stem}.spec.tsx`),
    // common __tests__ subfolder
    join(dir, '__tests__', `${stem}.test.ts`),
    join(dir, '__tests__', `${stem}.spec.ts`),
  ]

  const hasTestFile = testCandidates.some(existsSync)

  if (!hasTestFile) {
    // § Coverage Requirements for context
    const covSection = rules.sections['Coverage Requirements']
    const minCoverage = covSection?.keyValues?.['min service layer coverage']
      ?? covSection?.keyValues?.['min overall coverage']
      ?? 80

    violations.push({
      pattern: 'missing_test_file',
      section: 'Coverage Requirements',
      ruleFile: rules.filePath,
      line: 1,
      lineContent: `No test file found for "${base}". Required coverage: ${minCoverage}%.\n   Expected one of:\n   ${testCandidates.slice(0, 3).map(p => `• ${p}`).join('\n   ')}`,
      severity: 'HIGH',
    })
  }
}

// Coverage reminder for new service/API files
const covSection = rules.sections['Coverage Requirements']
const reqSection = rules.sections['Required Test Types']
if (covSection && violations.length === 0 && NEEDS_TEST_RE.test(filePath)) {
  const overall = covSection.keyValues['min overall coverage'] ?? 80
  const serviceMin = covSection.keyValues['min service layer coverage'] ?? 85
  console.log(`ℹ️   Coverage targets for this file:`)
  console.log(`    Overall: ${overall}%  |  Service layer: ${serviceMin}%`)
  if (reqSection) {
    const types = reqSection.bullets.map((b) => b.split(':')[0].trim()).join(', ')
    console.log(`    Required test types: ${types}`)
  }
  console.log()
}

const seen2 = new Set()
const unique2 = violations.filter((v) => {
  const key = `${v.pattern}:${v.line}`
  if (seen2.has(key)) return false
  seen2.add(key)
  return true
})

const highCount2 = unique2.filter((v) => ['CRITICAL', 'HIGH'].includes(v.severity ?? '')).length

report(
  unique2,
  `Testing violations in ${filePath}`,
  highCount2 > 0 ? 2 : 0,
)
