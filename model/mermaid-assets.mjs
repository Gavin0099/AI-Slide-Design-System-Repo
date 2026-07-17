import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMermaidDiagram, MERMAID_VERSION } from './mermaid-contract.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function contained(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate))
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}

export function mermaidManifestPath(assetRoot = repoRoot) {
  return path.join(assetRoot, 'dist', 'mermaid-assets', 'manifest.json')
}

export function loadMermaidAsset(diagram, { assetRoot = repoRoot } = {}) {
  const expected = createMermaidDiagram(diagram?.source)
  if (JSON.stringify(diagram) !== JSON.stringify(expected))
    throw new Error('Mermaid diagram metadata does not match normalized source bytes')

  const manifestPath = mermaidManifestPath(assetRoot)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.schemaVersion !== 1 || manifest.mermaidVersion !== MERMAID_VERSION)
    throw new Error(`Mermaid manifest version mismatch at ${manifestPath}`)
  const entry = manifest.entries?.find(candidate => candidate.sourceSha256 === diagram.sourceSha256)
  if (!entry) throw new Error(`Mermaid manifest has no entry for ${diagram.sourceSha256}`)
  if (entry.asset !== diagram.asset || entry.kind !== diagram.kind || entry.source !== diagram.source)
    throw new Error(`Mermaid manifest metadata mismatch for ${diagram.sourceSha256}`)

  const absolutePath = path.resolve(assetRoot, ...diagram.asset.split('/'))
  const assetDirectory = path.join(assetRoot, 'dist', 'mermaid-assets')
  if (!contained(assetDirectory, absolutePath)) throw new Error(`Mermaid asset escapes owned directory: ${diagram.asset}`)
  const bytes = readFileSync(absolutePath)
  if (digest(bytes) !== entry.svgSha256)
    throw new Error(`Mermaid SVG digest mismatch for ${diagram.asset}`)
  const svg = bytes.toString('utf8')
  if (!/^<svg\b/u.test(svg.trim()) || /<(?:script|foreignObject|image|a)\b/iu.test(svg))
    throw new Error(`Mermaid SVG contains an unsupported element: ${diagram.asset}`)
  return { absolutePath, bytes, svg, entry, manifest }
}

export function mermaidAssetDataUri(diagram, options) {
  const { bytes } = loadMermaidAsset(diagram, options)
  return `data:image/svg+xml;base64,${bytes.toString('base64')}`
}
