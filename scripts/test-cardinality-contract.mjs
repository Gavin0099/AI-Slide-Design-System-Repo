import assert from 'node:assert/strict'
import realDeck from '../decks/ai-governance/deck.mjs'
import { validateDeck } from '../model/slide-model.mjs'
import { createEditablePresentation } from './render-pptx.mjs'
import { renderDeck } from './render-slidev.mjs'

const contracts = [
  { slide: 2, path: 'left.items', get: model => model.slides[2].left.items },
  { slide: 2, path: 'right.items', get: model => model.slides[2].right.items },
  { slide: 3, path: 'problem.items', get: model => model.slides[3].problem.items },
  { slide: 3, path: 'solution.items', get: model => model.slides[3].solution.items },
  { slide: 4, path: 'steps', get: model => model.slides[4].steps },
  { slide: 5, path: 'layers', get: model => model.slides[5].layers },
  { slide: 6, path: 'sources', get: model => model.slides[6].sources },
  { slide: 7, path: 'metrics', get: model => model.slides[7].metrics },
  { slide: 8, path: 'reasons', get: model => model.slides[8].reasons },
  { slide: 9, path: 'actions', get: model => model.slides[9].actions },
]

function assertCardinalityFailure(model, contract) {
  const errors = validateDeck(model)
  assert.equal(errors.length, 1)
  assert.match(errors[0], new RegExp(`slides\\[${contract.slide}\\]\\.${contract.path.replace('.', '\\.')}`))
  assert.match(errors[0], /must contain exactly 3/)
}

for (const contract of contracts) {
  assert.equal(contract.get(realDeck).length, 3, `${contract.path} must exercise all reviewed slots`)

  const underfilled = structuredClone(realDeck)
  contract.get(underfilled).pop()
  assertCardinalityFailure(underfilled, contract)

  const overfilled = structuredClone(realDeck)
  const values = contract.get(overfilled)
  values.push(structuredClone(values[0]))
  assertCardinalityFailure(overfilled, contract)
}

const rendererMutation = structuredClone(realDeck)
rendererMutation.slides[6].sources.pop()
assert.throws(() => renderDeck(rendererMutation), /must contain exactly 3 items/)
assert.throws(() => createEditablePresentation(rendererMutation), /must contain exactly 3 items/)

console.log('Cardinality contract regression passed: 10 array fields reject 20 underfilled/overfilled mutations before either renderer runs')
