#!/usr/bin/env node
/**
 * Composes labeled before/after comparison images from two screenshot dirs.
 *
 * Usage: node scripts/design-audit/compose.mjs \
 *          --before .design-audit/before \
 *          --after  .design-audit/after \
 *          --out    .design-audit/compare
 *
 * For every screenshot name present in both dirs, renders a side-by-side
 * BEFORE | AFTER board (via headless Chromium) and writes it to --out.
 */
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

function arg(flag) {
  const i = process.argv.indexOf(flag)
  if (i === -1 || !process.argv[i + 1]) {
    console.error(
      'Usage: node scripts/design-audit/compose.mjs --before <dir> --after <dir> --out <dir>'
    )
    process.exit(1)
  }
  return path.resolve(process.argv[i + 1])
}

const beforeDir = arg('--before')
const afterDir = arg('--after')
const outDir = arg('--out')

const COLUMN_WIDTH = 720

// Inlined as data URIs: pages created via setContent cannot load file:// images.
function dataUri(file) {
  return `data:image/png;base64,${readFileSync(file).toString('base64')}`
}

function boardHtml(title, beforePath, afterPath) {
  return `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${COLUMN_WIDTH * 2 + 72}px;
    background: #15151a;
    font-family: Arial, Helvetica, sans-serif;
    color: #ebe7dc;
    padding: 24px;
  }
  h1 { font-size: 20px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 16px; }
  .cols { display: flex; gap: 24px; align-items: flex-start; }
  figure { width: ${COLUMN_WIDTH}px; }
  figcaption {
    display: inline-block;
    margin-bottom: 8px;
    padding: 4px 12px;
    font-size: 13px;
    font-weight: bold;
    letter-spacing: 0.12em;
  }
  .before figcaption { background: #6b6b6b; color: #fff; }
  .after figcaption { background: #d32331; color: #fff; }
  img { width: 100%; display: block; border: 1px solid #3a3a40; }
</style>
</head>
<body>
  <h1>Design audit — ${title}</h1>
  <div class="cols">
    <figure class="before"><figcaption>BEFORE</figcaption><img src="${dataUri(beforePath)}"></figure>
    <figure class="after"><figcaption>AFTER</figcaption><img src="${dataUri(afterPath)}"></figure>
  </div>
</body>
</html>`
}

async function main() {
  mkdirSync(outDir, { recursive: true })

  const beforeFiles = new Set(readdirSync(beforeDir).filter((f) => f.endsWith('.png')))
  const pairs = readdirSync(afterDir).filter((f) => f.endsWith('.png') && beforeFiles.has(f))

  if (pairs.length === 0) {
    console.error('No matching screenshot pairs found.')
    process.exit(1)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: COLUMN_WIDTH * 2 + 72, height: 900 },
    deviceScaleFactor: 1,
  })

  for (const file of pairs) {
    const title = file.replace('.png', '').replace(/-/g, ' · ')
    await page.setContent(
      boardHtml(title, path.join(beforeDir, file), path.join(afterDir, file)),
      { waitUntil: 'networkidle' }
    )
    const out = path.join(outDir, file.replace('.png', '-before-after.png'))
    await page.screenshot({ path: out, fullPage: true })
    console.log(`composed ${out}`)
  }

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
