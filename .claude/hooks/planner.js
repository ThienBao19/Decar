/**
 * planner.js — PreToolUse Write hook
 *
 * Fires before every Write tool call. Checks whether the file being written
 * meets any complexity triggers defined in .claude/rules/planner.md.
 * If triggered, prints the planning checklist and exits 2 (blocks the write).
 *
 * Rules source: .claude/rules/planner.md
 * Exit 0 → write proceeds normally
 * Exit 2 → write is blocked; Claude must plan first
 */

import { loadRules, readInput, printHeader, pass } from './utils/rule-loader.js'
import { relative } from 'path'
import { existsSync } from 'fs'

const rules = loadRules('planner')
const input = await readInput()

const { tool_input } = input
if (!tool_input) pass('No tool input — skipping planner check.')

const filePath = tool_input.file_path ?? ''
const content = typeof tool_input.content === 'string' ? tool_input.content : ''

printHeader('📋 Planner', filePath)

// ─── Allowed skip conditions ──────────────────────────────────────────────

const skipSection = rules.sections['Allowed Skip Conditions'] ?? { keyValues: {} }

for (const [, pattern] of Object.entries(skipSection.keyValues)) {
  if (typeof pattern === 'string') {
    try {
      if (new RegExp(pattern, 'i').test(filePath)) {
        pass(`Skip condition matched for ${relative(process.cwd(), filePath)} — no planning needed.`)
      }
    } catch { /* invalid regex in .md — skip */ }
  }
}

// ─── Load trigger definitions ─────────────────────────────────────────────

const triggerSection = rules.sections['Complexity Triggers'] ?? { keyValues: {}, bullets: [] }
const kv = triggerSection.keyValues

const NEW_FILE_MIN_LINES = typeof kv['new file min lines'] === 'number' ? kv['new file min lines'] : 50
const TOUCHED_THRESHOLD  = typeof kv['touched files threshold'] === 'number' ? kv['touched files threshold'] : 3

// ─── Evaluate triggers ────────────────────────────────────────────────────

/** @type {{ trigger: string, reason: string, section: string }[]} */
const triggered = []
const lineCount = content.split('\n').length

// Trigger 1: New large file
if (!existsSync(filePath) && lineCount > NEW_FILE_MIN_LINES) {
  triggered.push({
    trigger: 'new file min lines',
    reason: `New file has ${lineCount} lines (threshold: ${NEW_FILE_MIN_LINES}) — complexity warrants a plan.`,
    section: 'Complexity Triggers',
  })
}

// Triggers 2+: pattern-based (api_route_pattern, schema_change_pattern, etc.)
const patternTriggers = [
  'api_route_pattern',
  'schema_change_pattern',
  'auth_change_pattern',
  'payment_change_pattern',
  'new_service_pattern',
  'db_query_pattern',
]

for (const key of patternTriggers) {
  const rawPattern = kv[key]
  if (typeof rawPattern !== 'string') continue
  let regex
  try { regex = new RegExp(rawPattern, 'i') } catch { continue }

  if (regex.test(content)) {
    const label = key.replace(/_pattern$/, '').replace(/_/g, ' ')
    triggered.push({
      trigger: key,
      reason: `Content matches ${label} trigger — this change warrants a plan.`,
      section: 'Complexity Triggers',
    })
    break // One pattern trigger is enough; avoid duplicates
  }
}

// ─── Pass if no triggers ──────────────────────────────────────────────────

if (triggered.length === 0) {
  pass(`No complexity triggers met — write can proceed.`)
}

// ─── Build planning output ────────────────────────────────────────────────

const relPath = relative(process.cwd(), filePath)
const ruleFile = `.claude/rules/planner.md`

console.log(`🛑  Planning required before writing \`${relPath}\``)
console.log()

console.log('📌  Triggers fired:')
for (const t of triggered) {
  console.log(`   • [${t.trigger}] (§ ${t.section} in ${ruleFile})`)
  console.log(`     ${t.reason}`)
}
console.log()

// Print checklist from planner.md § Planning Checklist
const checklistSection = rules.sections['Planning Checklist']
if (checklistSection) {
  console.log('✅  Required planning checklist (§ Planning Checklist in .claude/rules/planner.md):')
  console.log()
  for (const bullet of checklistSection.bullets) {
    // Strip key: description format — show full bullet
    const label = bullet.includes(':') ? bullet.split(':').slice(1).join(':').trim() : bullet
    console.log(`   - [ ] ${label}`)
  }
  console.log()
}

// Print output format hints from planner.md
const fmtSection = rules.sections['Output Format']
if (fmtSection) {
  console.log('📐  Expected plan format (§ Output Format in .claude/rules/planner.md):')
  for (const bullet of fmtSection.bullets) {
    console.log(`   ${bullet}`)
  }
  console.log()
}

console.log('💡  Write a plan first, then re-attempt the file write.')
console.log(`   Full rules: .claude/rules/planner.md\n`)

process.exit(2)
