export const SLIDE_TYPES = Object.freeze([
  'cover',
  'key-message',
  'comparison',
])

const LIMITS = Object.freeze({
  title: 22,
  subtitle: 36,
  listItems: 3,
  item: 32,
})

function text(value, path, maxLength) {
  if (typeof value !== 'string' || value.trim() === '')
    throw new Error(`${path} must be a non-empty string`)
  if ([...value.trim()].length > maxLength)
    throw new Error(`${path} exceeds ${maxLength} characters`)
}

function list(value, path) {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error(`${path} must contain at least one item`)
  if (value.length > LIMITS.listItems)
    throw new Error(`${path} exceeds ${LIMITS.listItems} items`)
  value.forEach((item, index) => text(item, `${path}[${index}]`, LIMITS.item))
}

export function validateDeck(deck) {
  const errors = []

  try {
    text(deck?.title, 'deck.title', LIMITS.title)
    if (!Array.isArray(deck?.slides) || deck.slides.length === 0)
      throw new Error('deck.slides must contain at least one slide')

    deck.slides.forEach((slide, index) => {
      const path = `slides[${index}]`
      if (!SLIDE_TYPES.includes(slide.type))
        throw new Error(`${path}.type must be one of ${SLIDE_TYPES.join(', ')}`)

      text(slide.title, `${path}.title`, LIMITS.title)

      if (slide.type === 'cover') {
        text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item)
        text(slide.subtitle, `${path}.subtitle`, LIMITS.subtitle)
      }

      if (slide.type === 'key-message') {
        text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item)
        text(slide.subtitle, `${path}.subtitle`, LIMITS.subtitle)
        text(slide.evidence, `${path}.evidence`, 72)
        if (slide.visual !== 'verification-gap')
          throw new Error(`${path}.visual must be verification-gap in Phase A`)
      }

      if (slide.type === 'comparison') {
        text(slide.left?.title, `${path}.left.title`, LIMITS.item)
        text(slide.right?.title, `${path}.right.title`, LIMITS.item)
        list(slide.left?.items, `${path}.left.items`)
        list(slide.right?.items, `${path}.right.items`)
      }
    })
  }
  catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return errors
}

export function defineDeck(deck) {
  const errors = validateDeck(deck)
  if (errors.length > 0)
    throw new Error(errors.join('\n'))
  return Object.freeze(deck)
}
