import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import deck from '../decks/ai-governance/deck.mjs'
import { parseContentMarkdown, renderDeckModule } from '../model/content-markdown.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contentPath = path.join(repoRoot, 'decks', 'ai-governance', 'content.md')
const deckPath = path.join(repoRoot, 'decks', 'ai-governance', 'deck.mjs')
const source = await readFile(contentPath, 'utf8')

function normalizeLineEndings(value) {
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
}

const parsed = parseContentMarkdown(source)
assert.deepEqual(parsed, deck, 'content.md must project exactly to the generated Semantic Model module')
assert.equal(parsed.slides[0].titleBreakAfter, '讓 AI 在受控設計空間')
assert.equal(
  renderDeckModule(parsed),
  normalizeLineEndings(await readFile(deckPath, 'utf8')),
  'deck.mjs must be a deterministic projection of content.md',
)

assert.throws(
  () => parseContentMarkdown(source.replace('## cover', '## unknown-layout')),
  /layout must be one of/,
)
assert.throws(
  () => parseContentMarkdown(source.replace(/\n### subtitle\n從自由排版，轉向可重現的語意版型/, '')),
  /missing required field subtitle/,
)
assert.throws(
  () => parseContentMarkdown(source.replace('- 定義訊息 :: 每頁只保留一個核心觀點', '- 定義訊息沒有分隔符')),
  /must use title :: detail/,
)
assert.throws(
  () => parseContentMarkdown(source.replace('### subtitle\n從自由排版，轉向可重現的語意版型', '### subtitle\n從自由排版，轉向可重現的語意版型\n\n### subtitle\n重複')),
  /duplicates field subtitle/,
)
assert.throws(
  () => parseContentMarkdown(source.replace('讓 AI 在受控設計空間中生成', '這是一個刻意超過二十二個中文字限制而且不應該通過的投影片標題')),
  /exceeds 22 characters/,
)
assert.throws(
  () => parseContentMarkdown(source.replace('讓 AI 在受控設計空間\n### subtitle', '不是標題前綴\n### subtitle')),
  /titleBreakAfter must be a proper prefix/,
)

const withoutOptionalTitleBreak = source.replace(/\n### titleBreakAfter\n讓 AI 在受控設計空間/, '')
assert.equal(parseContentMarkdown(withoutOptionalTitleBreak).slides[0].titleBreakAfter, undefined)

console.log('Content Markdown tests passed: deterministic projection plus layout, field, structure, and model failure paths')
