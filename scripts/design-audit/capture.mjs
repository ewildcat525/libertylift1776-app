#!/usr/bin/env node
/**
 * Captures full-page screenshots of key routes for the design audit.
 *
 * Usage: node scripts/design-audit/capture.mjs --out .design-audit/before
 *
 * Starts a Next.js dev server with placeholder Supabase credentials
 * (no real backend is needed to render the public pages), screenshots
 * each route at desktop and mobile widths, then shuts the server down.
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const outDir = (() => {
  const i = process.argv.indexOf('--out')
  if (i === -1 || !process.argv[i + 1]) {
    console.error('Usage: node scripts/design-audit/capture.mjs --out <dir>')
    process.exit(1)
  }
  return path.resolve(process.argv[i + 1])
})()

const PORT = Number(process.env.AUDIT_PORT || 4319)
const BASE_URL = `http://localhost:${PORT}`

const ROUTES = [
  { path: '/', name: 'landing' },
  { path: '/login', name: 'login' },
  { path: '/signup', name: 'signup' },
]

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

async function waitForServer(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`Server at ${url} did not become ready in time`)
}

async function main() {
  mkdirSync(outDir, { recursive: true })

  const server = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
    cwd: path.resolve(import.meta.dirname, '../..'),
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true, // own process group, so we can kill next's whole tree
  })
  server.stdout.on('data', (d) => process.stdout.write(`[next] ${d}`))
  server.stderr.on('data', (d) => process.stderr.write(`[next] ${d}`))

  try {
    await waitForServer(BASE_URL)

    const browser = await chromium.launch()
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: 'reduce',
        deviceScaleFactor: 1,
      })
      // Placeholder Supabase calls would hang or error; cut them off fast.
      await context.route(/supabase\.co/, (route) => route.abort())

      for (const route of ROUTES) {
        const page = await context.newPage()
        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'load' })
        await page.waitForLoadState('networkidle').catch(() => {})
        await page.waitForTimeout(1200)
        const file = path.join(outDir, `${route.name}-${viewport.name}.png`)
        await page.screenshot({ path: file, fullPage: true })
        console.log(`captured ${file}`)
        await page.close()
      }
      await context.close()
    }
    await browser.close()
  } finally {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      server.kill('SIGTERM')
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
