import deck from '../decks/ai-governance/deck.mjs'
import { SLIDE_TYPES, validateDeck } from '../model/slide-model.mjs'

const errors = validateDeck(deck)
const usedTypes = new Set(deck.slides.map(slide => slide.type))

for (const type of usedTypes) {
  if (!SLIDE_TYPES.includes(type))
    errors.push(`Unsupported layout: ${type}`)
}

if (deck.slides[0]?.type !== 'cover')
  errors.push('The first slide must use the cover layout')

if (!deck.slides.some(slide => slide.type === 'key-message'))
  errors.push('The deck must contain at least one key-message slide')

if (errors.length > 0) {
  console.error(errors.map(error => `- ${error}`).join('\n'))
  process.exit(1)
}

console.log(`Slide lint passed: ${deck.slides.length} slides, ${usedTypes.size} semantic layouts`)
