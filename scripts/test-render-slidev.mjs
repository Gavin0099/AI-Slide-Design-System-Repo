import assert from 'node:assert/strict'
import realDeck from '../decks/ai-governance/deck.mjs'
import { renderDeck } from './render-slidev.mjs'

const fixtureDeck = {
  title: 'Renderer test',
  description: 'Three semantic slides must remain three Slidev pages.',
  slides: [
    { type: 'cover', eyebrow: 'TEST', title: '封面標題', titleBreakAfter: '封面', subtitle: '副標題' },
    {
      type: 'key-message',
      eyebrow: 'TEST',
      title: '主訊息',
      subtitle: '副訊息',
      visual: 'verification-gap',
      evidence: '測試證據',
    },
    {
      type: 'comparison',
      title: '比較',
      accent: 'governance',
      left: { title: '左側', items: ['一', '二', '三'] },
      right: { title: '右側', items: ['一', '二', '三'] },
    },
    {
      type: 'problem-solution',
      title: '問題解法',
      problem: { title: '問題', items: ['一', '二', '三'] },
      solution: { title: '解法', items: ['一', '二', '三'] },
    },
    {
      type: 'process',
      eyebrow: 'PROCESS',
      title: '流程',
      steps: [
        { title: '第一步', detail: '定義' },
        { title: '第二步', detail: '驗證' },
        { title: '第三步', detail: '交付' },
      ],
    },
    {
      type: 'architecture',
      eyebrow: 'ARCHITECTURE',
      title: '架構',
      layers: [
        { title: '上層', detail: '決策' },
        { title: '下層', detail: '輸出' },
        { title: '治理層', detail: '驗證' },
      ],
    },
    {
      type: 'evidence', eyebrow: 'EVIDENCE', title: '證據', claim: '已驗證', status: 'verified', sources: ['模型', '截圖', '審查'],
    },
    {
      type: 'metrics', eyebrow: 'METRICS', title: '指標', metrics: [
        { label: '版型', value: '10', detail: '受控' },
        { label: '差異', value: '0%', detail: '一致' },
        { label: '審查', value: 'PASS', detail: '核准' },
      ],
    },
    {
      type: 'decision', eyebrow: 'DECISION', title: '決策', decision: '通過後加入。', reasons: ['可驗證', '可重現', '可審查'], owner: 'Owner', nextAction: '繼續。',
    },
    {
      type: 'closing', eyebrow: 'CLOSING', title: '收束', summary: '完成。', actions: ['交付', '驗證', '審查'], nextAction: '下一階段。',
    },
  ],
}

function assertOneToOneStructure(deck, label) {
  const rendered = renderDeck(deck)
  const horizontalRules = rendered.match(/^---$/gm) ?? []

  assert.equal(horizontalRules.length, deck.slides.length * 2, `${label} frontmatter delimiter count drifted`)
  assert.doesNotMatch(rendered, /\n\n---\n\n---\n/, `${label} rendered an empty Slidev page`)
  assert.equal((rendered.match(/^layout:/gm) ?? []).length, deck.slides.length, `${label} layout count drifted`)
  return rendered
}

const rendered = assertOneToOneStructure(fixtureDeck, 'fixture deck')
assert.match(rendered, /# 封面<br>標題/, 'Slidev renderer must consume explicit title break intent')
const sourceMappedFixture = structuredClone(fixtureDeck)
sourceMappedFixture.slides.forEach((slide, index) => {
  slide.sourceSection = index === 0 ? 'h1:1' : `h2:${index}`
  slide.sourceHeading = `來源段落 ${index + 1}`
})
assert.equal(renderDeck(sourceMappedFixture), rendered, 'Source coverage metadata must not change Slidev output')
assertOneToOneStructure(realDeck, 'decks/ai-governance/deck.mjs')
for (const layout of ['evidence', 'metrics', 'decision', 'closing'])
  assert.match(rendered, new RegExp(`layout: "${layout}"`))

console.log('Slidev renderer regression passed: fixture and real semantic decks map one-to-one to page frontmatters')
