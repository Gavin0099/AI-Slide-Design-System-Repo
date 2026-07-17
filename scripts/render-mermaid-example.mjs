import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parseContentMarkdown } from '../model/content-markdown.mjs'
import { buildMermaidAssets } from './build-mermaid-assets.mjs'
import { renderDeckToPptx } from './render-pptx.mjs'
import { renderDeck } from './render-slidev.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(repoRoot, 'examples', 'mermaid-contract.md')
const outputDirectory = path.join(repoRoot, 'dist', 'sandbox')
const pptxPath = path.join(outputDirectory, 'mermaid-contract-demo.pptx')
const slidevPath = path.join(outputDirectory, 'mermaid-contract-demo.md')

async function main() {
  const source = await readFile(sourcePath, 'utf8')
  const deck = parseContentMarkdown(source, { sourceName: path.relative(repoRoot, sourcePath) })
  await buildMermaidAssets(deck, { assetRoot: repoRoot })
  await mkdir(outputDirectory, { recursive: true })
  await renderDeckToPptx(deck, pptxPath, { assetRoot: repoRoot })
  let themePath = path.relative(path.dirname(slidevPath), path.join(repoRoot, 'theme')).replaceAll('\\', '/')
  if (!themePath.startsWith('.')) themePath = `./${themePath}`
  await writeFile(slidevPath, renderDeck(deck, { themePath, assetRoot: repoRoot }), 'utf8')
  console.log(`Rendered ${deck.slides.length} Mermaid contract slides to ${path.relative(repoRoot, pptxPath)}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
