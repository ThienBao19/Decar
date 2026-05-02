/**
 * rule-loader.js
 * Parses .claude/rules/*.md into structured rule objects used by all hooks.
 *
 * Markdown grammar understood:
 *   ## Section Title       → named section
 *   - key: value           → keyValues entry (numeric if parseable, else string)
 *   - plain bullet         → bullets array entry
 *   > blockquote           → ignored (documentation only)
 *   # H1 title             → sets rules.title
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, extname, relative, basename } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** Absolute path to .claude/rules/ */
const RULES_DIR = join(__dirname, '..', '..', 'rules')

/** Absolute path to project root (two levels above .claude/) */
export const PROJECT_ROOT = join(__dirname, '..', '..', '..')

// ─── Markdown parser ───────────────────────────────────────────────────────

/**
 * Parse a markdown string into a structured rules object.
 * @param {string} content Raw markdown text
 * @param {string} filePath Absolute path (for error messages)
 * @returns {Rules}
 */
function parseMarkdown(content, filePath) {
  const lines = content.split('\n')
  /** @type {Rules} */
  const rules = {
    title: basename(filePath, '.md'),
    filePath,
    sections: {},
  }

  let currentSection = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // H1 → title
    const h1 = line.match(/^#\s+(.+)$/)
    if (h1 && !line.startsWith('##')) {
      rules.title = h1[1].trim()
      continue
    }

    // H2 → new section
    const h2 = line.match(/^##\s+(.+)$/)
    if (h2) {
      currentSection = h2[1].trim()
      rules.sections[currentSection] = {
        title: currentSection,
        bullets: [],
        keyValues: {},
        raw: [],
      }
      continue
    }

    if (!currentSection) continue

    const section = rules.sections[currentSection]
    section.raw.push(line)

    // Skip blockquotes and blank lines
    if (line.startsWith('>') || line.trim() === '') continue

    // Bullet: `- key: value` or `- plain text`
    const bulletMatch = line.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      const rest = bulletMatch[1].trim()
      // Try key: value split on FIRST colon
      const colonIdx = rest.indexOf(':')
      if (colonIdx > 0) {
        const key = rest.slice(0, colonIdx).trim()
        const rawVal = rest.slice(colonIdx + 1).trim()
        // Strip inline comments (— description after the regex)
        const valueStr = rawVal.split(/\s+—\s+/)[0].trim()
        // Try numeric parse
        const num = Number(valueStr)
        section.keyValues[key] = Number.isFinite(num) && valueStr !== '' ? num : valueStr
      }
      // Always add to bullets (human-readable reference for hook output)
      section.bullets.push(rest)
      continue
    }

    // Indented sub-bullet (4-space or tab)
    const subBullet = line.match(/^(?:  {2,}|\t)\s*[-*]\s+(.+)$/)
    if (subBullet) {
      section.bullets.push(subBullet[1].trim())
    }
  }

  return rules
}

/**
 * Load and parse a rules file by name.
 * @param {string} ruleName  e.g. 'security' → reads security.md
 * @returns {Rules}
 */
export function loadRules(ruleName) {
  const filePath = join(RULES_DIR, `${ruleName}.md`)
  if (!existsSync(filePath)) {
    throw new Error(`[rule-loader] Rules file not found: ${filePath}`)
  }
  const content = readFileSync(filePath, 'utf-8')
  return parseMarkdown(content, filePath)
}

// ─── Stdin helper ──────────────────────────────────────────────────────────

/**
 * Read and parse the JSON hook payload from stdin.
 * Returns {} if stdin is empty or not valid JSON (e.g., during direct testing).
 * @returns {Promise<HookInput>}
 */
export async function readInput() {
  return new Promise((resolve) => {
    const chunks = []
    process.stdin.on('data', (chunk) => chunks.push(chunk))
    process.stdin.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8').trim()
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        resolve({})
      }
    })
    // Resolve immediately if stdin is a TTY (interactive test run)
    if (process.stdin.isTTY) resolve({})
  })
}

// ─── File content extractor ────────────────────────────────────────────────

/**
 * Extract written file path and content from a PreToolUse / PostToolUse input.
 * Handles Write, Edit, and MultiEdit tool shapes.
 *
 * @param {HookInput} input
 * @returns {{ filePath: string, content: string } | null}
 */
export function getWrittenFile(input) {
  const ti = input.tool_input
  if (!ti) return null

  const filePath = ti.file_path
  if (!filePath) return null

  // Write: content is directly available
  if (ti.content !== undefined) {
    return { filePath, content: ti.content }
  }

  // Edit / MultiEdit: read file from disk (already written by PostToolUse)
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8')
      return { filePath, content }
    } catch {
      return null
    }
  }

  return null
}

// ─── Pattern matcher ───────────────────────────────────────────────────────

/**
 * Run all regex patterns from a rules section against text.
 * Skips patterns whose keys are not valid regex strings.
 *
 * @param {string} text              Content to scan
 * @param {Section} section          Parsed section with keyValues
 * @param {string} sectionName       Human-readable section name (for output)
 * @param {string} ruleFilePath      Path to the .md file (for output)
 * @param {string[]} [skipKeys]      Pattern keys to skip
 * @returns {Violation[]}
 */
export function matchPatterns(text, section, sectionName, ruleFilePath, skipKeys = []) {
  const violations = []
  const lines = text.split('\n')

  for (const [key, rawPattern] of Object.entries(section.keyValues)) {
    if (skipKeys.includes(key)) continue
    if (typeof rawPattern !== 'string') continue

    let regex
    try {
      regex = new RegExp(rawPattern, 'i')
    } catch {
      // Skip malformed regex patterns in the .md file
      continue
    }

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum]
      if (regex.test(line)) {
        violations.push({
          pattern: key,
          section: sectionName,
          ruleFile: ruleFilePath,
          line: lineNum + 1,
          lineContent: line.trimEnd(),
        })
      }
    }
  }

  return violations
}

// ─── Output formatters ─────────────────────────────────────────────────────

const SEVERITY_ICONS = {
  CRITICAL: '🚨',
  HIGH: '🔴',
  MEDIUM: '🟡',
  LOW: '🟢',
  INFO: '🔵',
}

/**
 * Format a single violation for stdout.
 * Always shows which .md section and rule name triggered it.
 */
export function formatViolation(v, severity = 'HIGH') {
  const icon = SEVERITY_ICONS[severity] ?? '⚠️'
  const relativeRule = relative(PROJECT_ROOT, v.ruleFile)
  return [
    `${icon} [${severity}] Pattern \`${v.pattern}\` (§ ${v.section} in ${relativeRule})`,
    `   Line ${v.line}: ${v.lineContent.slice(0, 120)}`,
  ].join('\n')
}

/**
 * Print a hook header banner.
 */
export function printHeader(hookName, filePath) {
  const rel = filePath ? relative(PROJECT_ROOT, filePath) : ''
  console.log(`\n🪝  ${hookName}${rel ? ` — ${rel}` : ''}`)
  console.log('─'.repeat(60))
}

/**
 * Print a clean pass message and exit 0.
 */
export function pass(message = 'All checks passed.') {
  console.log(`✅  ${message}\n`)
  process.exit(0)
}

/**
 * Print violations and exit with the given code.
 * @param {Violation[]} violations
 * @param {string} summary         One-line summary shown first
 * @param {number} [code=2]        Exit code (2 = block, 0 = warn-only)
 */
export function report(violations, summary, code = 2) {
  if (violations.length === 0) {
    pass()
    return
  }
  console.log(`\n${code === 2 ? '🛑' : '⚠️'}  ${summary}`)
  console.log(`   Found ${violations.length} violation(s):\n`)
  for (const v of violations) {
    console.log(formatViolation(v, v.severity ?? 'HIGH'))
    console.log()
  }
  if (code === 2) {
    console.log('💡  Fix the violations above before proceeding.')
    console.log(`   Rule definitions: .claude/rules/\n`)
  }
  process.exit(code)
}

// ─── File walker ───────────────────────────────────────────────────────────

/**
 * Recursively walk a directory and yield file paths matching given extensions.
 * Respects skip_dirs and max_file_size_kb from a rules section if provided.
 *
 * @param {string} dir
 * @param {string[]} extensions   e.g. ['.ts', '.js']
 * @param {string[]} skipDirs     directory names to skip
 * @param {number}   maxKb        skip files larger than this
 * @returns {string[]}
 */
export function walkFiles(dir, extensions, skipDirs = [], maxKb = 500) {
  const results = []
  if (!existsSync(dir)) return results

  for (const entry of readdirSync(dir)) {
    if (skipDirs.includes(entry)) continue
    const fullPath = join(dir, entry)
    let stat
    try { stat = statSync(fullPath) } catch { continue }

    if (stat.isDirectory()) {
      results.push(...walkFiles(fullPath, extensions, skipDirs, maxKb))
    } else if (extensions.includes(extname(entry))) {
      if (stat.size / 1024 <= maxKb) {
        results.push(fullPath)
      }
    }
  }
  return results
}

// ─── JSDoc types (comments only, no runtime cost) ──────────────────────────
/**
 * @typedef {{ title: string, bullets: string[], keyValues: Record<string, string|number>, raw: string[] }} Section
 * @typedef {{ title: string, filePath: string, sections: Record<string, Section> }} Rules
 * @typedef {{ tool_name?: string, tool_input?: Record<string,unknown>, tool_response?: unknown, transcript_path?: string, session_id?: string, stop_hook_active?: boolean }} HookInput
 * @typedef {{ pattern: string, section: string, ruleFile: string, line: number, lineContent: string, severity?: string }} Violation
 */
