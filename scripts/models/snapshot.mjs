// pnpm models:snapshot — renders every studio model from each camera preset so a
// model change can be reviewed visually. Needs the web app running:
//   SNAPSHOT_BASE_URL=http://localhost:3000 pnpm models:snapshot
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

import { REGISTRY_FILE, REPO_ROOT } from './lib.mjs'

// Playwright is a dependency of the web app, not the repo root
const require = createRequire(path.join(REPO_ROOT, 'apps', 'web', 'package.json'))
const { chromium } = require('@playwright/test')

const BASE_URL = process.env.SNAPSHOT_BASE_URL ?? 'http://localhost:3000'
const OUT_DIR = path.join(REPO_ROOT, 'artifacts', 'model-snapshots')
const VIEWS = ['front34', 'side', 'rear34', 'front']

async function main() {
  const registry = JSON.parse(await readFile(REGISTRY_FILE, 'utf8'))
  const ids = Object.keys(registry.models).filter((id) => registry.models[id].studio)
  const only = process.argv[2]
  const targets = only ? ids.filter((id) => id === only) : ids
  if (!targets.length) throw new Error(only ? `No studio model "${only}"` : 'No studio models in the registry')

  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const rows = []
  try {
    for (const id of targets) {
      await mkdir(path.join(OUT_DIR, id), { recursive: true })
      for (const view of VIEWS) {
        await page.goto(`${BASE_URL}/studio/${id}?snapshot=1&view=${view}`)
        // Poll on a timer: rAF-based polling stalls while the page renders heavily
        await page.waitForFunction(() => window.__studioReady === true, null, { timeout: 180_000, polling: 1000 })
        const file = path.join(OUT_DIR, id, `${view}.png`)
        await page.screenshot({ path: file, timeout: 120_000 })
        rows.push({ id, view, src: `${id}/${view}.png` })
        console.log(`shot   ${id} ${view}`)
      }
    }
  } finally {
    await browser.close()
  }

  const cells = rows.map((r) => `<figure><img src="${r.src}" loading="lazy"><figcaption>${r.id} · ${r.view}</figcaption></figure>`)
  await writeFile(
    path.join(OUT_DIR, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Model snapshots</title>
<style>body{background:#111;color:#aaa;font:13px system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px}img{width:100%;border-radius:8px}</style>
<main>${cells.join('')}</main>`,
  )
  console.log(`\n${rows.length} snapshots -> ${path.relative(REPO_ROOT, OUT_DIR)}/index.html`)
}

await main()