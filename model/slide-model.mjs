import { validateMermaidDiagram } from './mermaid-contract.mjs'

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
  'mermaid',
  'source',
])

export const EVIDENCE_STATUSES = Object.freeze(['verified', 'detected', 'unproven'])
export const COMPARISON_ACCENTS = Object.freeze(['governance'])
export const SOURCE_VARIANTS = Object.freeze(['cover', 'statement', 'narrative', 'list', 'table', 'code', 'diagram', 'dense'])
export const SOURCE_BLOCK_KINDS = Object.freeze(['subtitle', 'paragraph', 'bullet', 'numbered', 'quote', 'code', 'small', 'table-row', 'mermaid'])

const LIMITS = Object.freeze({
  title: 22,
  description: 120,
  subtitle: 36,
  sourceSection: 32,
  sourceHeading: 96,
  slotItems: 3,
  item: 32,
  sourceBlocks: 48,
  sourceBlockText: 1200,
  sourceTableCells: 8,
})

function text(value, path, maxLength) {
  if (typeof value !== 'string' || value.trim() === '')
    throw new Error(`${path} must be a non-empty string`)
  if (/[\r\n]/u.test(value))
    throw new Error(`${path} must not contain line breaks`)
  if ([...value.trim()].length > maxLength)
    throw new Error(`${path} exceeds ${maxLength} characters`)
}

function capture(errors, check) {
  try {
    check()
    return true
  }
  catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
    return false
  }
}

function titleBreakIntent(slide, path, errors, titleIsValid) {
  if (slide?.titleBreakAfter === undefined) return
  const breakIsValid = capture(errors, () => text(slide.titleBreakAfter, `${path}.titleBreakAfter`, LIMITS.title))
  if (!breakIsValid) return
  if (slide.titleBreakAfter !== slide.titleBreakAfter.trim()) {
    errors.push(`${path}.titleBreakAfter must not start or end with whitespace`)
    return
  }
  if (!titleIsValid) return
  if (!slide.title.startsWith(slide.titleBreakAfter) || slide.title === slide.titleBreakAfter)
    errors.push(`${path}.titleBreakAfter must be a proper prefix of ${path}.title`)
}

function list(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must contain exactly ${LIMITS.slotItems} items`)
    return
  }
  if (value.length !== LIMITS.slotItems)
    errors.push(`${path} must contain exactly ${LIMITS.slotItems} items`)
  value.forEach((item, index) => capture(errors, () => text(item, `${path}[${index}]`, LIMITS.item)))
}

function structuredList(value, path, itemName, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must contain exactly ${LIMITS.slotItems} ${itemName}s`)
    return
  }
  if (value.length !== LIMITS.slotItems)
    errors.push(`${path} must contain exactly ${LIMITS.slotItems} ${itemName}s`)
  value.forEach((item, index) => {
    capture(errors, () => text(item?.title, `${path}[${index}].title`, LIMITS.item))
    capture(errors, () => text(item?.detail, `${path}[${index}].detail`, LIMITS.subtitle))
  })
}

function metricList(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must contain exactly ${LIMITS.slotItems} metrics`)
    return
  }
  if (value.length !== LIMITS.slotItems)
    errors.push(`${path} must contain exactly ${LIMITS.slotItems} metrics`)
  value.forEach((metric, index) => {
    capture(errors, () => text(metric?.label, `${path}[${index}].label`, LIMITS.item))
    capture(errors, () => text(metric?.value, `${path}[${index}].value`, 16))
    capture(errors, () => text(metric?.detail, `${path}[${index}].detail`, LIMITS.subtitle))
  })
}

function sourceBlockList(value, path, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path} must contain at least one source block`)
    return
  }
  if (value.length > LIMITS.sourceBlocks)
    errors.push(`${path} exceeds ${LIMITS.sourceBlocks} source blocks`)
  value.forEach((block, index) => {
    const blockPath = `${path}[${index}]`
    const kindIsValid = capture(errors, () => {
      if (!SOURCE_BLOCK_KINDS.includes(block?.kind))
        throw new Error(`${blockPath}.kind must be one of ${SOURCE_BLOCK_KINDS.join(', ')}`)
    })
    if (!kindIsValid) return
    if (block.kind === 'table-row') {
      if (!Array.isArray(block.cells) || block.cells.length === 0 || block.cells.length > LIMITS.sourceTableCells) {
        errors.push(`${blockPath}.cells must contain 1-${LIMITS.sourceTableCells} cells`)
        return
      }
      block.cells.forEach((cell, cellIndex) =>
        capture(errors, () => text(cell, `${blockPath}.cells[${cellIndex}]`, LIMITS.sourceBlockText)),
      )
      return
    }
    if (block.kind === 'mermaid') {
      validateMermaidDiagram(block.diagram, `${blockPath}.diagram`, errors)
      return
    }
    capture(errors, () => text(block?.text, `${blockPath}.text`, LIMITS.sourceBlockText))
  })
}

export function validateDeck(deck) {
  const errors = []

  capture(errors, () => text(deck?.title, 'deck.title', LIMITS.title))
  capture(errors, () => text(deck?.description, 'deck.description', LIMITS.description))
  if (!Array.isArray(deck?.slides) || deck.slides.length === 0) {
    errors.push('deck.slides must contain at least one slide')
    return errors
  }

  deck.slides.forEach((slide, index) => {
    const path = `slides[${index}]`
    if (slide?.sourceSection !== undefined)
      capture(errors, () => text(slide.sourceSection, `${path}.sourceSection`, LIMITS.sourceSection))
    if (slide?.sourceHeading !== undefined)
      capture(errors, () => text(slide.sourceHeading, `${path}.sourceHeading`, LIMITS.sourceHeading))
    const typeIsValid = capture(errors, () => {
      if (!SLIDE_TYPES.includes(slide?.type))
        throw new Error(`${path}.type must be one of ${SLIDE_TYPES.join(', ')}`)
    })
    const titleLimit = slide?.type === 'source'
      ? LIMITS.sourceHeading
      : slide?.type === 'mermaid'
        ? 56
        : LIMITS.title
    const titleIsValid = capture(errors, () => text(slide?.title, `${path}.title`, titleLimit))
    titleBreakIntent(slide, path, errors, titleIsValid)

    if (!typeIsValid) return

    if (slide.type === 'cover') {
      capture(errors, () => text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item))
      capture(errors, () => text(slide.subtitle, `${path}.subtitle`, LIMITS.subtitle))
    }

    if (slide.type === 'key-message') {
      capture(errors, () => text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item))
      capture(errors, () => text(slide.subtitle, `${path}.subtitle`, LIMITS.subtitle))
      capture(errors, () => text(slide.evidence, `${path}.evidence`, 72))
      if (slide.visual !== 'verification-gap')
        errors.push(`${path}.visual must be verification-gap in Phase A`)
    }

    if (slide.type === 'comparison') {
      const accentIsValid = capture(errors, () => text(slide.accent, `${path}.accent`, LIMITS.item))
      if (accentIsValid && !COMPARISON_ACCENTS.includes(slide.accent))
        errors.push(`${path}.accent must be one of ${COMPARISON_ACCENTS.join(', ')}`)
      capture(errors, () => text(slide.left?.title, `${path}.left.title`, LIMITS.item))
      capture(errors, () => text(slide.right?.title, `${path}.right.title`, LIMITS.item))
      list(slide.left?.items, `${path}.left.items`, errors)
      list(slide.right?.items, `${path}.right.items`, errors)
    }

    if (slide.type === 'problem-solution') {
      capture(errors, () => text(slide.problem?.title, `${path}.problem.title`, LIMITS.item))
      capture(errors, () => text(slide.solution?.title, `${path}.solution.title`, LIMITS.item))
      list(slide.problem?.items, `${path}.problem.items`, errors)
      list(slide.solution?.items, `${path}.solution.items`, errors)
    }

    if (slide.type === 'process') {
      capture(errors, () => text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item))
      structuredList(slide.steps, `${path}.steps`, 'step', errors)
    }

    if (slide.type === 'architecture') {
      capture(errors, () => text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item))
      structuredList(slide.layers, `${path}.layers`, 'layer', errors)
    }

    if (slide.type === 'evidence') {
      capture(errors, () => text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item))
      capture(errors, () => text(slide.claim, `${path}.claim`, 72))
      if (!EVIDENCE_STATUSES.includes(slide.status))
        errors.push(`${path}.status must be one of ${EVIDENCE_STATUSES.join(', ')}`)
      list(slide.sources, `${path}.sources`, errors)
    }

    if (slide.type === 'metrics') {
      capture(errors, () => text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item))
      metricList(slide.metrics, `${path}.metrics`, errors)
    }

    if (slide.type === 'decision') {
      capture(errors, () => text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item))
      capture(errors, () => text(slide.decision, `${path}.decision`, 72))
      list(slide.reasons, `${path}.reasons`, errors)
      capture(errors, () => text(slide.owner, `${path}.owner`, LIMITS.item))
      capture(errors, () => text(slide.nextAction, `${path}.nextAction`, 72))
    }

    if (slide.type === 'closing') {
      capture(errors, () => text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item))
      capture(errors, () => text(slide.summary, `${path}.summary`, 72))
      list(slide.actions, `${path}.actions`, errors)
      capture(errors, () => text(slide.nextAction, `${path}.nextAction`, 72))
    }

    if (slide.type === 'mermaid') {
      capture(errors, () => text(slide.eyebrow, `${path}.eyebrow`, LIMITS.item))
      if (slide.subtitle !== undefined)
        capture(errors, () => text(slide.subtitle, `${path}.subtitle`, 120))
      validateMermaidDiagram(slide.diagram, `${path}.diagram`, errors)
      if (slide.caption !== undefined)
        capture(errors, () => text(slide.caption, `${path}.caption`, 96))
    }

    if (slide.type === 'source') {
      capture(errors, () => text(slide.sourceSection, `${path}.sourceSection`, LIMITS.sourceSection))
      capture(errors, () => text(slide.sourceHeading, `${path}.sourceHeading`, LIMITS.sourceHeading))
      if (!SOURCE_VARIANTS.includes(slide.variant))
        errors.push(`${path}.variant must be one of ${SOURCE_VARIANTS.join(', ')}`)
      sourceBlockList(slide.blocks, `${path}.blocks`, errors)
    }
  })

  return errors
}

export function defineDeck(deck) {
  const errors = validateDeck(deck)
  if (errors.length > 0)
    throw new Error(errors.join('\n'))
  return Object.freeze(deck)
}
