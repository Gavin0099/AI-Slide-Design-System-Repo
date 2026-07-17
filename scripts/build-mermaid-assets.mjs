import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import deck from '../decks/ai-governance/deck.mjs'
import {
  MERMAID_RENDER_CONFIG,
  MERMAID_ROLE_STYLES,
  MERMAID_VERSION,
  createMermaidDiagram,
  validateMermaidDiagram,
} from '../model/mermaid-contract.mjs'
import { mermaidManifestPath } from '../model/mermaid-assets.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mermaidBundle = path.join(repoRoot, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js')

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

async function exists(candidate) {
  try {
    await stat(candidate)
    return true
  }
  catch {
    return false
  }
}

async function findBrowser() {
  const candidates = [
    process.env.SLIDEV_BROWSER_PATH,
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  for (const candidate of candidates) if (await exists(candidate)) return candidate
  throw new Error('No Chrome-compatible browser found. Set SLIDEV_BROWSER_PATH to build Mermaid SVG assets.')
}

export function collectMermaidDiagrams(deckToBuild) {
  const diagrams = []
  for (const slide of deckToBuild?.slides ?? []) {
    if (slide?.diagram) diagrams.push(slide.diagram)
    for (const block of slide?.blocks ?? []) if (block?.kind === 'mermaid') diagrams.push(block.diagram)
  }
  const unique = new Map()
  diagrams.forEach((diagram, index) => {
    const errors = []
    validateMermaidDiagram(diagram, `diagrams[${index}]`, errors)
    if (errors.length > 0) throw new Error(errors.join('\n'))
    unique.set(diagram.sourceSha256, createMermaidDiagram(diagram.source))
  })
  return [...unique.values()].sort((left, right) => left.sourceSha256.localeCompare(right.sourceSha256))
}

async function renderSvg(page, diagram) {
  return page.evaluate(async ({ source, sourceSha256, config, roleStyles }) => {
    globalThis.mermaid.initialize({
      ...config,
      deterministicIDSeed: sourceSha256,
      startOnLoad: false,
    })
    await globalThis.mermaid.parse(source)
    const result = await globalThis.mermaid.render(`m-${sourceSha256.slice(0, 16)}`, source)
    const host = document.createElement('div')
    host.style.position = 'absolute'
    host.style.left = '-100000px'
    host.innerHTML = result.svg
    document.body.append(host)
    const svg = host.querySelector('svg')
    for (const [role, roleStyle] of Object.entries(roleStyles)) {
      for (const holder of svg.querySelectorAll(`.${role}`)) {
        const shapes = holder.matches('rect, path, polygon, ellipse, circle')
          ? [holder]
          : [...holder.querySelectorAll(':scope > rect, :scope > path, :scope > polygon, :scope > ellipse, :scope > circle')]
        for (const shape of shapes) {
          shape.style.setProperty('fill', roleStyle.fill)
          shape.style.setProperty('stroke', roleStyle.stroke)
          shape.style.setProperty('stroke-width', roleStyle.strokeWidth)
          if (roleStyle.fillOpacity) shape.style.setProperty('fill-opacity', roleStyle.fillOpacity)
          if (roleStyle.dasharray) shape.style.setProperty('stroke-dasharray', roleStyle.dasharray)
        }
        for (const label of holder.querySelectorAll('text, tspan'))
          label.style.setProperty('fill', roleStyle.text)
      }
    }
    const properties = [
      'fill', 'fill-opacity', 'stroke', 'stroke-opacity', 'stroke-width',
      'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity',
      'font-family', 'font-size', 'font-style', 'font-weight',
      'text-anchor', 'dominant-baseline', 'marker-start', 'marker-mid', 'marker-end',
    ]
    for (const element of svg.querySelectorAll('*')) {
      const computed = getComputedStyle(element)
      for (const property of properties) {
        const value = computed.getPropertyValue(property)
        if (value) element.style.setProperty(property, value)
      }
    }
    for (const outer of svg.querySelectorAll('tspan.text-outer-tspan')) {
      const inner = [...outer.querySelectorAll(':scope > tspan.text-inner-tspan')]
      if (inner.length === 1) outer.textContent = inner[0].textContent ?? ''
      if (inner.length > 1) {
        inner.forEach((element, index) => {
          if (index > 0 && /^\s/u.test(element.textContent ?? '')) {
            element.textContent = (element.textContent ?? '').trimStart()
            inner[index - 1].textContent = `${inner[index - 1].textContent ?? ''} `
          }
        })
      }
    }
    for (const textElement of svg.querySelectorAll('text, tspan'))
      textElement.style.setProperty('font-family', 'sans-serif')
    for (const connector of svg.querySelectorAll('path[marker-end], line[marker-end], polyline[marker-end]')) {
      const length = connector.getTotalLength?.()
      if (!Number.isFinite(length) || length <= 0) continue
      const tip = connector.getPointAtLength(length)
      const prior = connector.getPointAtLength(Math.max(0, length - 7))
      const angle = Math.atan2(tip.y - prior.y, tip.x - prior.x)
      const baseX = tip.x - Math.cos(angle) * 7
      const baseY = tip.y - Math.sin(angle) * 7
      const wingX = Math.sin(angle) * 3.8
      const wingY = -Math.cos(angle) * 3.8
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
      polygon.setAttribute('points', `${tip.x},${tip.y} ${baseX + wingX},${baseY + wingY} ${baseX - wingX},${baseY - wingY}`)
      const stroke = getComputedStyle(connector).stroke || 'rgb(77, 87, 200)'
      polygon.setAttribute('fill', stroke)
      polygon.setAttribute('stroke', stroke)
      polygon.setAttribute('stroke-width', '0.5')
      connector.parentNode.insertBefore(polygon, connector.nextSibling)
      connector.removeAttribute('marker-end')
      connector.style.removeProperty('marker-end')
    }
    svg.querySelectorAll('style').forEach(element => element.remove())
    const serialized = svg.outerHTML
    host.remove()
    return serialized
  }, {
    source: diagram.source,
    sourceSha256: diagram.sourceSha256,
    config: MERMAID_RENDER_CONFIG,
    roleStyles: MERMAID_ROLE_STYLES,
  })
}

function assertSafeSvg(svg, diagram) {
  if (!/^<svg\b/u.test(svg.trim())) throw new Error(`Mermaid did not return SVG for ${diagram.sourceSha256}`)
  const unsupported = svg.match(/<(?:script|foreignObject|image|a)\b/giu)
  if (unsupported)
    throw new Error(`Mermaid emitted unsupported SVG elements for ${diagram.sourceSha256}: ${[...new Set(unsupported)].join(', ')}`)
}

function canonicalManifest(entries) {
  return `${JSON.stringify({
    schemaVersion: 1,
    mermaidVersion: MERMAID_VERSION,
    rendererConfigSha256: sha256(JSON.stringify({ config: MERMAID_RENDER_CONFIG, roleStyles: MERMAID_ROLE_STYLES })),
    entries,
  }, null, 2)}\n`
}

async function priorManifest(manifestPath) {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'))
  }
  catch {
    return undefined
  }
}

export async function buildMermaidAssets(deckToBuild, { assetRoot = repoRoot, checkOnly = false } = {}) {
  const directory = path.join(assetRoot, 'dist', 'mermaid-assets')
  const manifestPath = mermaidManifestPath(assetRoot)
  const previous = await priorManifest(manifestPath)
  const union = new Map()
  for (const entry of previous?.entries ?? []) {
    if (typeof entry.source !== 'string')
      throw new Error(`Mermaid manifest entry ${entry.sourceSha256 ?? 'unknown'} is missing normalized source`)
    const diagram = createMermaidDiagram(entry.source)
    union.set(diagram.sourceSha256, diagram)
  }
  for (const diagram of collectMermaidDiagrams(deckToBuild)) union.set(diagram.sourceSha256, diagram)
  const diagrams = [...union.values()].sort((left, right) => left.sourceSha256.localeCompare(right.sourceSha256))
  const rendered = []
  let browser

  if (diagrams.length > 0) {
    const browserPath = await findBrowser()
    browser = await chromium.launch({
      executablePath: browserPath,
      headless: true,
      args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run'],
    })
    const page = await browser.newPage()
    await page.addScriptTag({ path: mermaidBundle })
    try {
      for (const diagram of diagrams) {
        const svg = await renderSvg(page, diagram)
        assertSafeSvg(svg, diagram)
        rendered.push({
          diagram,
          svg,
          entry: {
            sourceSha256: diagram.sourceSha256,
            kind: diagram.kind,
            asset: diagram.asset,
            source: diagram.source,
            svgSha256: sha256(svg),
          },
        })
      }
    }
    finally {
      await browser.close()
    }
  }

  const expectedManifest = canonicalManifest(rendered.map(item => item.entry))
  if (checkOnly) {
    const currentManifest = await readFile(manifestPath, 'utf8').catch(() => '')
    if (currentManifest.replaceAll('\r\n', '\n') !== expectedManifest)
      throw new Error('Mermaid manifest is stale. Run npm run mermaid:build.')
    for (const item of rendered) {
      const current = await readFile(path.resolve(assetRoot, ...item.diagram.asset.split('/')), 'utf8').catch(() => '')
      if (current !== item.svg) throw new Error(`Mermaid SVG is stale: ${item.diagram.asset}`)
    }
    return { diagrams, manifestPath, entries: rendered.map(item => item.entry) }
  }

  await mkdir(directory, { recursive: true })
  const desired = new Set(rendered.map(item => item.diagram.asset))
  for (const entry of previous?.entries ?? []) {
    if (typeof entry.asset === 'string' && entry.asset.startsWith('dist/mermaid-assets/') && !desired.has(entry.asset))
      await rm(path.resolve(assetRoot, ...entry.asset.split('/')), { force: true })
  }
  for (const item of rendered)
    await writeFile(path.resolve(assetRoot, ...item.diagram.asset.split('/')), item.svg, 'utf8')
  await writeFile(manifestPath, expectedManifest, 'utf8')
  return { diagrams, manifestPath, entries: rendered.map(item => item.entry) }
}

function option(name, fallback) {
  const index = process.argv.indexOf(name)
  if (index < 0) return fallback
  if (!process.argv[index + 1]) throw new Error(`${name} requires a path`)
  return path.resolve(process.argv[index + 1])
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildMermaidAssets(deck, {
    assetRoot: option('--asset-root', repoRoot),
    checkOnly: process.argv.includes('--check'),
  }).then(result => {
    console.log(`Mermaid assets ${process.argv.includes('--check') ? 'verified' : 'built'}: ${result.entries.length} fixed SVG files`)
  }).catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
