import assert from 'node:assert/strict'
import { validateDeck } from '../model/slide-model.mjs'

const validDeck = {
  title: '測試簡報',
  slides: [{
    type: 'cover',
    eyebrow: 'TEST',
    title: '有效標題',
    subtitle: '有效副標題',
  }],
}

assert.deepEqual(validateDeck(validDeck), [])

const overlongTitle = structuredClone(validDeck)
overlongTitle.slides[0].title = '這是一個刻意超過二十二個中文字限制而且不應該通過的投影片標題'
assert.match(validateDeck(overlongTitle)[0], /exceeds 22 characters/)

const tooManyItems = {
  title: '測試簡報',
  slides: [{
    type: 'comparison',
    title: '比較',
    left: { title: '左側', items: ['一', '二', '三', '四'] },
    right: { title: '右側', items: ['一'] },
  }],
}
assert.match(validateDeck(tooManyItems)[0], /exceeds 3 items/)

const validExpandedDeck = {
  title: '擴充版型測試',
  slides: [
    {
      type: 'problem-solution',
      title: '問題與解法',
      problem: { title: '問題', items: ['一'] },
      solution: { title: '解法', items: ['二'] },
    },
    {
      type: 'process',
      eyebrow: 'PROCESS',
      title: '流程',
      steps: [
        { title: '第一步', detail: '定義內容' },
        { title: '第二步', detail: '驗證內容' },
      ],
    },
    {
      type: 'architecture',
      eyebrow: 'ARCHITECTURE',
      title: '架構',
      layers: [
        { title: '上層', detail: '負責決策' },
        { title: '下層', detail: '負責輸出' },
      ],
    },
  ],
}
assert.deepEqual(validateDeck(validExpandedDeck), [])

const tooManySteps = structuredClone(validExpandedDeck)
tooManySteps.slides[1].steps.push(
  { title: '第三步', detail: '審查內容' },
  { title: '第四步', detail: '不應通過' },
)
assert.match(validateDeck(tooManySteps)[0], /exceeds 3 steps/)

const missingLayerDetail = structuredClone(validExpandedDeck)
delete missingLayerDetail.slides[2].layers[1].detail
assert.match(validateDeck(missingLayerDetail)[0], /layers\[1\]\.detail must be a non-empty string/)

console.log('Semantic model tests passed: six layouts, boundary, and failure-path cases')
