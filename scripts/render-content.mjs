import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parseContentMarkdown, renderDeckModule } from '../model/content-markdown.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaultInput = path.join(repoRoot, 'decks', 'ai-governance', 'content.md')
const defaultOutput = path.join(repoRoot, 'decks', 'ai-governance', 'deck.mjs')

function option(name, fallback) {
  const index = process.argv.indexOf(name)
  if (index < 0) return fallback
  if (!process.argv[index + 1]) throw new Error(`${name} requires a path`)
  return path.resolve(process.argv[index + 1])
}

function moduleImport(outputPath) {
  const modelPath = path.join(repoRoot, 'model', 'slide-model.mjs')
  let relative = path.relative(path.dirname(outputPath), modelPath).replaceAll('\\', '/')
  if (!relative.startsWith('.')) relative = `./${relative}`
  return relative
}

function normalizeLineEndings(value) {
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
}

async function main() {
  const checkOnly = process.argv.includes('--check')
  const inputPath = option('--input', defaultInput)
  const outputPath = option('--output', defaultOutput)
  const source = await readFile(inputPath, 'utf8')
  const deck = parseContentMarkdown(source, { sourceName: path.relative(repoRoot, inputPath) })
  const rendered = renderDeckModule(deck, { modelImport: moduleImport(outputPath) })

  if (checkOnly) {
    let current = ''
    try {
      current = await readFile(outputPath, 'utf8')
    }
    catch {
      console.error(`Generated Semantic Model module is missing: ${path.relative(repoRoot, outputPath)}`)
      process.exit(1)
    }
    if (normalizeLineEndings(current) !== rendered) {
      console.error(`Generated Semantic Model module is stale. Run npm run content:build.`)
      process.exit(1)
    }
    console.log(`Content check passed: ${path.relative(repoRoot, inputPath)} -> ${path.relative(repoRoot, outputPath)}`)
    return
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, rendered, 'utf8')
  console.log(`Rendered ${deck.slides.length} semantic slides from ${path.relative(repoRoot, inputPath)} to ${path.relative(repoRoot, outputPath)}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
