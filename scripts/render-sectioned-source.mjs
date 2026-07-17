import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { projectSectionedMarkdown, parseSectionedMarkdown, assertSourceTextCoverage } from '../model/sectioned-markdown.mjs'
import { renderDeck } from './render-slidev.mjs'
import { renderDeckToPptx } from './render-pptx.mjs'
import { assertPptxSourceText } from './check-pptx-source-text.mjs'
import { buildMermaidAssets } from './build-mermaid-assets.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function option(name, { required = false } = {}) {
  const index = process.argv.indexOf(name)
  if (index >= 0 && process.argv[index + 1]) return path.resolve(process.argv[index + 1])
  if (required) throw new Error(`${name} requires a path`)
  return undefined
}

async function main() {
  const sourcePath = option('--source', { required: true })
  const outputPath = option('--output', { required: true })
  const slidevPath = option('--slidev')
  const markdown = await readFile(sourcePath, 'utf8')
  const source = parseSectionedMarkdown(markdown, { sourceName: sourcePath })
  const deck = projectSectionedMarkdown(markdown, { sourceName: sourcePath })
  assertSourceTextCoverage(source, deck)
  await buildMermaidAssets(deck, { assetRoot: repoRoot })
  await renderDeckToPptx(deck, outputPath)
  await assertPptxSourceText(markdown, outputPath, { sourceName: sourcePath })
  if (slidevPath) {
    const themePath = path.relative(path.dirname(slidevPath), path.join(repoRoot, 'theme')).replaceAll('\\', '/')
    await writeFile(slidevPath, renderDeck(deck, { themePath }), 'utf8')
    console.log(`Rendered source-faithful Slidev Markdown to ${slidevPath}`)
  }
  console.log(`Rendered ${deck.slides.length} source-faithful editable slides to ${outputPath}`)
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
