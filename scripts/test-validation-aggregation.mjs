import assert from 'node:assert/strict'
import realDeck from '../decks/ai-governance/deck.mjs'
import { defineDeck, validateDeck } from '../model/slide-model.mjs'
import { createEditablePresentation } from './render-pptx.mjs'
import { renderDeck } from './render-slidev.mjs'

const invalidDeck = {
  title: 'bad\n---',
  slides: [
    {
      type: 'cover',
      title: '',
      titleBreakAfter: 'prefix',
      eyebrow: '',
      subtitle: 'x'.repeat(37),
    },
    {
      type: 'evidence',
      title: 'Evidence',
      eyebrow: '',
      claim: '',
      status: 'approved',
      sources: ['bad\nsource', 'safe'],
    },
    {
      type: 'metrics',
      title: 'Metrics',
      eyebrow: '',
      metrics: [
        { label: '', value: '1', detail: 'safe' },
        { label: 'safe', value: '', detail: 'safe' },
        { label: 'safe', value: '2', detail: 'bad\ndetail' },
      ],
    },
    {
      type: 'unknown-layout',
      title: '',
      titleBreakAfter: 'prefix',
      unrelated: 'must not create schema-cascade errors',
    },
  ],
}

const expectedErrors = [
  'deck.title must not contain line breaks',
  'slides[0].title must be a non-empty string',
  'slides[0].eyebrow must be a non-empty string',
  'slides[0].subtitle exceeds 36 characters',
  'slides[1].eyebrow must be a non-empty string',
  'slides[1].claim must be a non-empty string',
  'slides[1].status must be one of verified, detected, unproven',
  'slides[1].sources must contain exactly 3 items',
  'slides[1].sources[0] must not contain line breaks',
  'slides[2].eyebrow must be a non-empty string',
  'slides[2].metrics[0].label must be a non-empty string',
  'slides[2].metrics[1].value must be a non-empty string',
  'slides[2].metrics[2].detail must not contain line breaks',
  'slides[3].type must be one of cover, key-message, comparison, problem-solution, process, architecture, evidence, metrics, decision, closing',
  'slides[3].title must be a non-empty string',
]

assert.deepEqual(validateDeck(realDeck), [])
assert.deepEqual(validateDeck(invalidDeck), expectedErrors)
assert.equal(new Set(validateDeck(invalidDeck)).size, expectedErrors.length, 'independent errors must not be duplicated')
assert.deepEqual(validateDeck({ title: '', slides: null }), [
  'deck.title must be a non-empty string',
  'deck.slides must contain at least one slide',
])

function assertJoinedFailure(action) {
  assert.throws(action, (error) => {
    assert.equal(error.message, expectedErrors.join('\n'))
    return true
  })
}

assertJoinedFailure(() => defineDeck(invalidDeck))
assertJoinedFailure(() => renderDeck(invalidDeck))
assertJoinedFailure(() => createEditablePresentation(invalidDeck))

console.log('Validation aggregation regression passed: 15 deterministic independent errors returned together and both renderers fail closed')
