import assert from 'node:assert/strict'
import realDeck from '../decks/ai-governance/deck.mjs'
import { COMPARISON_ACCENTS, validateDeck } from '../model/slide-model.mjs'
import { createEditablePresentation } from './render-pptx.mjs'
import { renderDeck } from './render-slidev.mjs'

assert.deepEqual(COMPARISON_ACCENTS, ['governance'])
assert.deepEqual(validateDeck(realDeck), [])

const cases = [
  {
    name: 'missing deck description',
    mutate(deck) { delete deck.description },
    expected: 'deck.description must be a non-empty string',
  },
  {
    name: 'injected deck description',
    mutate(deck) { deck.description = 'safe\n---\nlayout: cover' },
    expected: 'deck.description must not contain line breaks',
  },
  {
    name: 'overlong deck description',
    mutate(deck) { deck.description = 'x'.repeat(121) },
    expected: 'deck.description exceeds 120 characters',
  },
  {
    name: 'missing comparison accent',
    mutate(deck) { delete deck.slides[2].accent },
    expected: 'slides[2].accent must be a non-empty string',
  },
  {
    name: 'injected comparison accent',
    mutate(deck) { deck.slides[2].accent = 'governance\r\n---' },
    expected: 'slides[2].accent must not contain line breaks',
  },
  {
    name: 'unsupported comparison accent',
    mutate(deck) { deck.slides[2].accent = 'danger' },
    expected: 'slides[2].accent must be one of governance',
  },
]

function assertRendererFailure(action, expected) {
  assert.throws(action, (error) => {
    assert.equal(error.message, expected)
    return true
  })
}

for (const testCase of cases) {
  const mutation = structuredClone(realDeck)
  testCase.mutate(mutation)
  assert.deepEqual(validateDeck(mutation), [testCase.expected], testCase.name)
  assertRendererFailure(() => renderDeck(mutation), testCase.expected)
  assertRendererFailure(() => createEditablePresentation(mutation), testCase.expected)
}

console.log('Model metadata regression passed: description and accent missing/injection mutations plus unsupported accent fail before both renderers')
