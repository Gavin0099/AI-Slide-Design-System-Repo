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

console.log('Semantic model tests passed: valid, boundary, and failure-path cases')
