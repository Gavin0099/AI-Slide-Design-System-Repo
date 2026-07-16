import assert from 'node:assert/strict'
import { renderDeck } from './render-slidev.mjs'

const deck = {
  title: 'Renderer test',
  description: 'Three semantic slides must remain three Slidev pages.',
  slides: [
    { type: 'cover', eyebrow: 'TEST', title: '封面', subtitle: '副標題' },
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
      left: { title: '左側', items: ['一'] },
      right: { title: '右側', items: ['二'] },
    },
    {
      type: 'problem-solution',
      title: '問題解法',
      problem: { title: '問題', items: ['一'] },
      solution: { title: '解法', items: ['二'] },
    },
    {
      type: 'process',
      eyebrow: 'PROCESS',
      title: '流程',
      steps: [
        { title: '第一步', detail: '定義' },
        { title: '第二步', detail: '驗證' },
      ],
    },
    {
      type: 'architecture',
      eyebrow: 'ARCHITECTURE',
      title: '架構',
      layers: [
        { title: '上層', detail: '決策' },
        { title: '下層', detail: '輸出' },
      ],
    },
  ],
}

const rendered = renderDeck(deck)
const horizontalRules = rendered.match(/^---$/gm) ?? []

assert.equal(horizontalRules.length, deck.slides.length * 2)
assert.doesNotMatch(rendered, /\n\n---\n\n---\n/)
assert.equal((rendered.match(/^layout:/gm) ?? []).length, deck.slides.length)

console.log('Slidev renderer regression passed: semantic slides map one-to-one to page frontmatters')
