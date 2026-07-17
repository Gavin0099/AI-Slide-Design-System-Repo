import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import { parseSectionedMarkdown, projectSectionedMarkdown, sourceVisibleStrings } from '../model/sectioned-markdown.mjs'
import { loadMermaidAsset } from '../model/mermaid-assets.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function decodeXml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
}

function fidelityText(values) {
  return values.join('').replaceAll('•', '').replace(/\s+/gu, '')
}

export async function assertPptxSourceText(markdown, pptxPath, { sourceName = 'source.md', assetRoot = repoRoot } = {}) {
  const source = parseSectionedMarkdown(markdown, { sourceName })
  const archive = await JSZip.loadAsync(await readFile(pptxPath))
  const slideEntries = Object.keys(archive.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/u.test(name))
    .sort((left, right) => Number(left.match(/\d+/u)[0]) - Number(right.match(/\d+/u)[0]))
  if (slideEntries.length !== source.sections.length)
    throw new Error(`PPTX source fidelity requires ${source.sections.length} slides; received ${slideEntries.length}`)

  for (const [index, entry] of slideEntries.entries()) {
    const xml = await archive.file(entry).async('string')
    const actual = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/gu)].map(match => decodeXml(match[1]))
    const expected = sourceVisibleStrings(source.sections[index])
    if (fidelityText(actual) !== fidelityText(expected))
      throw new Error(`PPTX slide ${index + 1} does not exactly preserve audience-visible source text`)
  }

  const deck = projectSectionedMarkdown(markdown, { sourceName })
  const expectedSvgDigests = new Set(deck.slides.flatMap(slide => slide.blocks ?? [])
    .filter(block => block.kind === 'mermaid')
    .map(block => loadMermaidAsset(block.diagram, { assetRoot }).entry.svgSha256))
  if (expectedSvgDigests.size > 0) {
    const svgEntries = Object.keys(archive.files).filter(name => /^ppt\/media\/.*\.svg$/u.test(name))
    const embeddedSvgDigests = new Set(await Promise.all(svgEntries.map(async name =>
      createHash('sha256').update(await archive.file(name).async('nodebuffer')).digest('hex'),
    )))
    for (const expected of expectedSvgDigests) {
      if (!embeddedSvgDigests.has(expected))
        throw new Error(`PPTX does not embed the manifest-bound Mermaid SVG ${expected}`)
    }
  }
}

function option(name) {
  const index = process.argv.indexOf(name)
  if (index < 0 || !process.argv[index + 1]) throw new Error(`${name} requires a path`)
  return path.resolve(process.argv[index + 1])
}

async function main() {
  const sourcePath = option('--source')
  const pptxPath = option('--pptx')
  await assertPptxSourceText(await readFile(sourcePath, 'utf8'), pptxPath, { sourceName: sourcePath })
  console.log('PPTX source text fidelity passed: every slide preserves the exact audience-visible Markdown text')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
