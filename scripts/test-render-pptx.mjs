import assert from 'node:assert/strict'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import deck from '../decks/ai-governance/deck.mjs'
import { createEditablePresentation, renderDeckToPptx } from './render-pptx.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const runtimeRoot = path.join(repoRoot, 'artifacts', 'runtime', 'pptx')
const outputPath = path.join(runtimeRoot, 'semantic-model-test.pptx')

function decodeXml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
}

function semanticText(value) {
  return value.replace(/\s+/g, '')
}

function visibleStrings(slide) {
  const common = [slide.title]
  if (slide.eyebrow) common.push(slide.eyebrow)
  if (slide.subtitle) common.push(slide.subtitle)
  if (slide.evidence) common.push(slide.evidence)
  if (slide.claim) common.push(slide.claim)
  if (slide.owner) common.push(slide.owner)
  if (slide.nextAction) common.push(slide.nextAction)
  if (slide.summary) common.push(slide.summary)
  if (slide.left) common.push(slide.left.title, ...slide.left.items)
  if (slide.right) common.push(slide.right.title, ...slide.right.items)
  if (slide.problem) common.push(slide.problem.title, ...slide.problem.items)
  if (slide.solution) common.push(slide.solution.title, ...slide.solution.items)
  if (slide.steps) common.push(...slide.steps.flatMap(item => [item.title, item.detail]))
  if (slide.layers) common.push(...slide.layers.flatMap(item => [item.title, item.detail]))
  if (slide.sources) common.push(...slide.sources)
  if (slide.metrics) common.push(...slide.metrics.flatMap(item => [item.label, item.value, item.detail]))
  if (slide.decision) common.push(slide.decision)
  if (slide.reasons) common.push(...slide.reasons)
  if (slide.actions) common.push(...slide.actions)
  return common
}

await rm(runtimeRoot, { recursive: true, force: true })
await mkdir(runtimeRoot, { recursive: true })
await renderDeckToPptx(deck, outputPath)

const archive = await JSZip.loadAsync(await readFile(outputPath))
const slideEntries = Object.keys(archive.files)
  .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
  .sort((left, right) => Number(left.match(/\d+/)[0]) - Number(right.match(/\d+/)[0]))
const noteEntries = Object.keys(archive.files).filter(name => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name))
const mediaEntries = Object.keys(archive.files).filter(name => name.startsWith('ppt/media/') && !name.endsWith('/'))
const embeddedFontEntries = Object.keys(archive.files).filter(name => name.startsWith('ppt/fonts/') && !name.endsWith('/'))

assert.equal(slideEntries.length, deck.slides.length, 'PPTX slide count must match the Semantic Model')
assert.equal(noteEntries.length, deck.slides.length, 'Every semantic slide must retain its renderer provenance note')
assert.equal(mediaEntries.length, 0, 'Editable renderer must not flatten slides into images')
assert.equal(embeddedFontEntries.length, 0, 'Renderer contract must expose that the PPTX references, but does not embed, Noto Sans TC')

const report = []
for (const [index, entry] of slideEntries.entries()) {
  const xml = await archive.file(entry).async('string')
  const text = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(match => decodeXml(match[1])).join('\n')
  const shapeCount = (xml.match(/<p:sp>/g) ?? []).length
  const pictureCount = (xml.match(/<p:pic>/g) ?? []).length

  assert.ok(shapeCount >= 5, `Slide ${index + 1} must contain editable native shapes/text boxes`)
  assert.equal(pictureCount, 0, `Slide ${index + 1} must not contain flattened picture objects`)
  for (const expected of visibleStrings(deck.slides[index]))
    assert.ok(semanticText(text).includes(semanticText(expected)), `Slide ${index + 1} is missing editable text: ${expected}`)

  report.push({
    slide: index + 1,
    layout: deck.slides[index].type,
    editableShapeCount: shapeCount,
    pictureCount,
  })
}

const theme = await archive.file('ppt/theme/theme1.xml').async('string')
assert.match(theme, /Noto Sans TC/, 'PPTX theme must declare the governed Chinese font family')

const invalidDeck = structuredClone(deck)
invalidDeck.slides[0].title = '這是一個刻意超過二十二個中文字限制而且不應該通過的投影片標題'
assert.throws(() => createEditablePresentation(invalidDeck), /exceeds 22 characters/)

await writeFile(path.join(runtimeRoot, 'editability-report.json'), `${JSON.stringify({
  deck: 'ai-governance',
  slideCount: slideEntries.length,
  nativeEditable: true,
  flattenedPictures: mediaEntries.length,
  themeFont: 'Noto Sans TC',
  fontEmbedded: false,
  slides: report,
}, null, 2)}\n`)

console.log('Editable PPTX renderer tests passed: 10 semantic slides, native text/shapes, no flattened slide images')
