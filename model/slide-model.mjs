export const SLIDE_TYPES = Object.freeze([
  'cover',
  'key-message',
  'comparison',
  'problem-solution',
  'process',
  'architecture',
  'evidence',
  'metrics',
  'decision',
  'closing',
])

export const EVIDENCE_STATUSES = Object.freeze(['verified', 'detected', 'unproven'])

const LIMITS = Object.freeze({
  title: 22,
  subtitle: 36,
  slotItems: 3,
  item: 32,
})

function text(value, path, maxLength) {
  if (typeof value !== 'string' || value.trim() === '')
    throw new Error(`${path} must be a non-empty string`)
  if (/[\r\n]/u.test(value))
    throw new Error(`${path} must not contain line breaks`)
  if ([...value.trim()].length > maxLength)
    throw new Error(`${path} exceeds ${maxLength} characters`)
}

function titleBreakIntent(slide, path) {
  if (slide.titleBreakAfter === undefined) return
  text(slide.titleBreakAfter, `${path}.titleBreakAfter`, LIMITS.title)
  if (slide.titleBreakAfter !== slide.titleBreakAfter.trim())
    throw new Error(`${path}.titleBreakAfter must not start or end with whitespace`)
  if (!slide.title.startsWith(slide.titleBreakAfter) || slide.title === slide.titleBreakAfter)
    throw new Error(`${path}.titleBreakAfter must be a proper prefix of ${path}.title`)
}

function list(value, path) {
  if (!Array.isArray(value) || value.length !== LIMITS.slotItems)
    throw new Error(`${path} must contain exactly ${LIMITS.slotItems} items`)
  value.forEach((item, index) => text(item, `${path}[${index}]`, LIMITS.item))
}

function structuredList(value, path, itemName) {
  if (!Array.isArray(value) || value.length !== LIMITS.slotItems)
    throw new Error(`${path} must contain exactly ${LIMITS.slotItems} ${itemName}s`)
  value.forEach((item, index) => {
    text(item?.title, `${path}[${index}].title`, LIMITS.item)
    text(item?.detail, `${path}[${index}].detail`, LIMITS.subtitle)
  })
}

function metricList(value, path) {
  if (!Array.isArray(value) || value.length !== LIMITS.slotItems)
    throw new Error(`${path} must contain exactly ${LIMITS.slotItems} metrics`)
  value.forEach((metric, index) => {
    text(metric?.label, `${path}[${index}].label`, LIMITS.item)
    text(metric?.value, `${path}[${index}].value`, 16)
    text(metric?.detail, `${path}[${index}].detail`, LIMITS.subtitle)
  })
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
      titleBreakIntent(slide, path)

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

      if (slide.type === 'problem-solution') {
        text(slide.problem?.title, `${path}.problem.title`, LIMITS.item)
        text(slide.solution?.title, `${path}.solution.title`, LIMITS.item)
        list(slide.problem?.items, `${path}.problem.items`)
        list(slide.solution?.items, `${path}.solution.items`)
      }

      if (slide.type === 'process') {
        text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item)
        structuredList(slide.steps, `${path}.steps`, 'step')
      }

      if (slide.type === 'architecture') {
        text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item)
        structuredList(slide.layers, `${path}.layers`, 'layer')
      }

      if (slide.type === 'evidence') {
        text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item)
        text(slide.claim, `${path}.claim`, 72)
        if (!EVIDENCE_STATUSES.includes(slide.status))
          throw new Error(`${path}.status must be one of ${EVIDENCE_STATUSES.join(', ')}`)
        list(slide.sources, `${path}.sources`)
      }

      if (slide.type === 'metrics') {
        text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item)
        metricList(slide.metrics, `${path}.metrics`)
      }

      if (slide.type === 'decision') {
        text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item)
        text(slide.decision, `${path}.decision`, 72)
        list(slide.reasons, `${path}.reasons`)
        text(slide.owner, `${path}.owner`, LIMITS.item)
        text(slide.nextAction, `${path}.nextAction`, 72)
      }

      if (slide.type === 'closing') {
        text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item)
        text(slide.summary, `${path}.summary`, 72)
        list(slide.actions, `${path}.actions`)
        text(slide.nextAction, `${path}.nextAction`, 72)
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
