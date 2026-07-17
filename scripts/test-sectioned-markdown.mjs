import assert from 'node:assert/strict'
import { parseSectionedMarkdown, validateSectionCoverage } from '../model/sectioned-markdown.mjs'

const sourceMarkdown = `---
marp: true
---

# 測試簡報
### 封面副標

## 2 ｜ 第一頁
### 第一頁副標
- 內容 A

\`\`\`
## 程式碼裡的標題不是分頁
\`\`\`

## 3 ｜ 第二頁
### 第二頁副標
- 內容 B

## 3 ｜ 重複編號仍是另一頁
### 第三頁副標
- 內容 C
`

const parsed = parseSectionedMarkdown(sourceMarkdown, { sourceName: 'fixture.md' })
assert.equal(parsed.title, '測試簡報')
assert.equal(parsed.sections.length, 4, '# cover plus every ## heading must map to one source section')
assert.deepEqual(
  parsed.sections.map(section => section.sourceSection),
  ['h1:1', 'h2:1', 'h2:2', 'h2:3'],
)
assert.deepEqual(
  parsed.sections.map(section => section.heading),
  ['測試簡報', '2 ｜ 第一頁', '3 ｜ 第二頁', '3 ｜ 重複編號仍是另一頁'],
)
assert.match(parsed.sections[1].lines.join('\n'), /程式碼裡的標題不是分頁/)

const coveredDeck = {
  slides: parsed.sections.map(section => ({
    sourceSection: section.sourceSection,
    sourceHeading: section.heading,
  })),
}
assert.deepEqual(validateSectionCoverage(parsed, coveredDeck), [])

const mergedDeck = structuredClone(coveredDeck)
mergedDeck.slides.splice(2, 1)
assert.match(validateSectionCoverage(parsed, mergedDeck).join('\n'), /requires 4 slides; received 3/)
assert.match(validateSectionCoverage(parsed, mergedDeck).join('\n'), /missing source section h2:2/)

const splitDeck = structuredClone(coveredDeck)
splitDeck.slides.push({ sourceSection: 'h2:4', sourceHeading: '自行拆分' })
assert.match(validateSectionCoverage(parsed, splitDeck).join('\n'), /requires 4 slides; received 5/)
assert.match(validateSectionCoverage(parsed, splitDeck).join('\n'), /not present in the source: h2:4/)

const reorderedDeck = structuredClone(coveredDeck)
;[reorderedDeck.slides[1], reorderedDeck.slides[2]] = [reorderedDeck.slides[2], reorderedDeck.slides[1]]
assert.match(validateSectionCoverage(parsed, reorderedDeck).join('\n'), /slides\[1\]\.sourceSection must be h2:1/)

const duplicatedDeck = structuredClone(coveredDeck)
duplicatedDeck.slides[2] = structuredClone(duplicatedDeck.slides[1])
assert.match(validateSectionCoverage(parsed, duplicatedDeck).join('\n'), /duplicates h2:1/)
assert.match(validateSectionCoverage(parsed, duplicatedDeck).join('\n'), /missing source section h2:2/)

assert.throws(
  () => parseSectionedMarkdown('## 2 ｜ 沒有封面\n內容', { sourceName: 'missing-title.md' }),
  /appears before the deck title/,
)
assert.throws(
  () => parseSectionedMarkdown('# 只有封面', { sourceName: 'missing-slide.md' }),
  /at least one ## slide heading is required/,
)

console.log('Sectioned Markdown tests passed: H1 cover plus every H2 maps one-to-one, with merge, split, reorder, and duplicate regressions')
