import assert from 'node:assert/strict'
import { validateDeck } from '../model/slide-model.mjs'

const validDeck = {
  title: '測試簡報',
  description: '用於 Semantic Model regression 的測試簡報。',
  slides: [{
    type: 'cover',
    eyebrow: 'TEST',
    title: '有效標題',
    subtitle: '有效副標題',
  }],
}

assert.deepEqual(validateDeck(validDeck), [])

const sourceMappedDeck = structuredClone(validDeck)
sourceMappedDeck.slides[0].sourceSection = 'h1:1'
sourceMappedDeck.slides[0].sourceHeading = '測試簡報'
assert.deepEqual(validateDeck(sourceMappedDeck), [])

const injectedSourceHeading = structuredClone(sourceMappedDeck)
injectedSourceHeading.slides[0].sourceHeading = 'ok\n## injected'
assert.match(validateDeck(injectedSourceHeading)[0], /sourceHeading must not contain line breaks/)

const explicitTitleBreak = structuredClone(validDeck)
explicitTitleBreak.slides[0].titleBreakAfter = '有效'
assert.deepEqual(validateDeck(explicitTitleBreak), [])

const mismatchedTitleBreak = structuredClone(validDeck)
mismatchedTitleBreak.slides[0].titleBreakAfter = '不存在'
assert.match(validateDeck(mismatchedTitleBreak)[0], /must be a proper prefix/)

const completeTitleBreak = structuredClone(validDeck)
completeTitleBreak.slides[0].titleBreakAfter = completeTitleBreak.slides[0].title
assert.match(validateDeck(completeTitleBreak)[0], /must be a proper prefix/)

const injectedTitleBreak = structuredClone(validDeck)
injectedTitleBreak.slides[0].titleBreakAfter = '有效\n---'
assert.match(validateDeck(injectedTitleBreak)[0], /must not contain line breaks/)

const paddedTitleBreak = structuredClone(validDeck)
paddedTitleBreak.slides[0].titleBreakAfter = '有效 '
assert.match(validateDeck(paddedTitleBreak)[0], /must not start or end with whitespace/)

const injectedTitle = structuredClone(validDeck)
injectedTitle.slides[0].title = 'ok\n---\nlayout: cover'
assert.match(validateDeck(injectedTitle)[0], /must not contain line breaks/)

const injectedListItem = structuredClone(validDeck)
injectedListItem.slides = [{
  type: 'comparison',
  title: '安全邊界',
  accent: 'governance',
  left: { title: '左側', items: ['ok\r\n---', 'safe', 'safe'] },
  right: { title: '右側', items: ['safe', 'safe', 'safe'] },
}]
assert.match(validateDeck(injectedListItem)[0], /left\.items\[0\] must not contain line breaks/)

const overlongTitle = structuredClone(validDeck)
overlongTitle.slides[0].title = '這是一個刻意超過二十二個中文字限制而且不應該通過的投影片標題'
assert.match(validateDeck(overlongTitle)[0], /exceeds 22 characters/)

const tooManyItems = {
  title: '測試簡報',
  description: '用於陣列上限 regression 的測試簡報。',
  slides: [{
    type: 'comparison',
    title: '比較',
    accent: 'governance',
    left: { title: '左側', items: ['一', '二', '三', '四'] },
    right: { title: '右側', items: ['一', '二', '三'] },
  }],
}
assert.match(validateDeck(tooManyItems)[0], /must contain exactly 3 items/)

const validExpandedDeck = {
  title: '擴充版型測試',
  description: '用於擴充版型 regression 的測試簡報。',
  slides: [
    {
      type: 'problem-solution',
      title: '問題與解法',
      problem: { title: '問題', items: ['一', '二', '三'] },
      solution: { title: '解法', items: ['一', '二', '三'] },
    },
    {
      type: 'process',
      eyebrow: 'PROCESS',
      title: '流程',
      steps: [
        { title: '第一步', detail: '定義內容' },
        { title: '第二步', detail: '驗證內容' },
        { title: '第三步', detail: '審查內容' },
      ],
    },
    {
      type: 'architecture',
      eyebrow: 'ARCHITECTURE',
      title: '架構',
      layers: [
        { title: '上層', detail: '負責決策' },
        { title: '下層', detail: '負責輸出' },
        { title: '治理層', detail: '負責驗證' },
      ],
    },
    {
      type: 'evidence',
      eyebrow: 'EVIDENCE',
      title: '證據',
      claim: '測試已通過可重現的檢查。',
      status: 'verified',
      sources: ['模型測試', '視覺基準', '人工審查'],
    },
    {
      type: 'metrics',
      eyebrow: 'METRICS',
      title: '指標',
      metrics: [
        { label: '版型', value: '10', detail: '受控 allowlist' },
        { label: '差異', value: '0.000%', detail: '同環境像素比較' },
        { label: '審查', value: 'PASS', detail: '人工核准' },
      ],
    },
    {
      type: 'decision',
      eyebrow: 'DECISION',
      title: '決策',
      decision: '只有通過 review gate 的版型才能加入 allowlist。',
      reasons: ['限制視覺漂移', '保存審查證據', '維持雙 renderer 一致'],
      owner: 'Maintainer',
      nextAction: '建立下一個受控 renderer。',
    },
    {
      type: 'closing',
      eyebrow: 'CLOSING',
      title: '收束',
      summary: '語意與視覺責任已被清楚分離。',
      actions: ['正式簡報套用', '規劃 PPTX', '保存審查證據'],
      nextAction: '從相同模型輸出 editable PPTX。',
    },
  ],
}
assert.deepEqual(validateDeck(validExpandedDeck), [])

const tooManySteps = structuredClone(validExpandedDeck)
tooManySteps.slides[1].steps.push(
  { title: '第四步', detail: '不應通過' },
)
assert.match(validateDeck(tooManySteps)[0], /must contain exactly 3 steps/)

const missingLayerDetail = structuredClone(validExpandedDeck)
delete missingLayerDetail.slides[2].layers[1].detail
assert.match(validateDeck(missingLayerDetail)[0], /layers\[1\]\.detail must be a non-empty string/)

const invalidEvidenceStatus = structuredClone(validExpandedDeck)
invalidEvidenceStatus.slides[3].status = 'approved'
assert.match(validateDeck(invalidEvidenceStatus)[0], /status must be one of verified, detected, unproven/)

const tooManyMetrics = structuredClone(validExpandedDeck)
tooManyMetrics.slides[4].metrics.push(
  { label: '第四', value: '4', detail: '不應通過' },
)
assert.match(validateDeck(tooManyMetrics)[0], /must contain exactly 3 metrics/)

const missingDecisionAction = structuredClone(validExpandedDeck)
delete missingDecisionAction.slides[5].nextAction
assert.match(validateDeck(missingDecisionAction)[0], /nextAction must be a non-empty string/)

console.log('Semantic model tests passed: ten layouts, boundary, and failure-path cases')
