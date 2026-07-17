import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { parseSectionedMarkdown, assertSectionCoverage, assertSourceTextCoverage } from '../model/sectioned-markdown.mjs'

function option(name) {
  const index = process.argv.indexOf(name)
  if (index < 0 || !process.argv[index + 1]) throw new Error(`${name} requires a path`)
  return path.resolve(process.argv[index + 1])
}

async function main() {
  const sourcePath = option('--source')
  const deckPath = option('--deck')
  const source = parseSectionedMarkdown(await readFile(sourcePath, 'utf8'), { sourceName: sourcePath })
  const imported = await import(`${pathToFileURL(deckPath).href}?coverage=${Date.now()}`)
  const deck = imported.default
  assertSectionCoverage(source, deck)
  if (process.argv.includes('--verbatim')) assertSourceTextCoverage(source, deck)
  console.log(`Section coverage passed: ${source.sections.length} Markdown sections map one-to-one to ${deck.slides.length} semantic slides`)
  if (process.argv.includes('--verbatim')) console.log('Source text coverage passed: every audience-visible source string is preserved exactly')
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
