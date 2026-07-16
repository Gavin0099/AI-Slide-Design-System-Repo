import { SLIDE_TYPES, validateDeck } from './slide-model.mjs'

const FIELD_KINDS = Object.freeze({
  cover: {
    eyebrow: 'scalar', title: 'scalar', subtitle: 'scalar',
  },
  'key-message': {
    eyebrow: 'scalar', title: 'scalar', subtitle: 'scalar', visual: 'scalar', evidence: 'scalar',
  },
  comparison: {
    title: 'scalar', accent: 'scalar', leftTitle: 'scalar', leftItems: 'list', rightTitle: 'scalar', rightItems: 'list',
  },
  'problem-solution': {
    title: 'scalar', problemTitle: 'scalar', problemItems: 'list', solutionTitle: 'scalar', solutionItems: 'list',
  },
  process: {
    eyebrow: 'scalar', title: 'scalar', steps: 'pairs',
  },
  architecture: {
    eyebrow: 'scalar', title: 'scalar', layers: 'pairs',
  },
  evidence: {
    eyebrow: 'scalar', title: 'scalar', claim: 'scalar', status: 'scalar', sources: 'list',
  },
  metrics: {
    eyebrow: 'scalar', title: 'scalar', metrics: 'metrics',
  },
  decision: {
    eyebrow: 'scalar', title: 'scalar', decision: 'scalar', reasons: 'list', owner: 'scalar', nextAction: 'scalar',
  },
  closing: {
    eyebrow: 'scalar', title: 'scalar', summary: 'scalar', actions: 'list', nextAction: 'scalar',
  },
})

function fail(sourceName, message) {
  throw new Error(`${sourceName}: ${message}`)
}

function parseScalar(lines, sourceName, path) {
  if (lines.some(line => /^\s*-\s+/.test(line)))
    fail(sourceName, `${path} must be plain text, not a list`)
  const value = lines.map(line => line.trim()).filter(Boolean).join(' ')
  if (!value) fail(sourceName, `${path} must not be empty`)
  return value
}

function parseList(lines, sourceName, path) {
  const content = lines.map(line => line.trim()).filter(Boolean)
  if (content.length === 0) fail(sourceName, `${path} must contain at least one bullet`)
  return content.map((line, index) => {
    const match = line.match(/^-\s+(.+)$/)
    if (!match) fail(sourceName, `${path}[${index}] must use Markdown bullet syntax: - item`)
    return match[1].trim()
  })
}

function parseStructured(lines, sourceName, path, parts) {
  return parseList(lines, sourceName, path).map((item, index) => {
    const values = item.split(/\s+::\s+/).map(value => value.trim())
    if (values.length !== parts.length || values.some(value => !value))
      fail(sourceName, `${path}[${index}] must use ${parts.join(' :: ')}`)
    return Object.fromEntries(parts.map((part, partIndex) => [part, values[partIndex]]))
  })
}

function parseField(lines, kind, sourceName, path) {
  if (kind === 'scalar') return parseScalar(lines, sourceName, path)
  if (kind === 'list') return parseList(lines, sourceName, path)
  if (kind === 'pairs') return parseStructured(lines, sourceName, path, ['title', 'detail'])
  if (kind === 'metrics') return parseStructured(lines, sourceName, path, ['label', 'value', 'detail'])
  fail(sourceName, `${path} uses unsupported parser kind ${kind}`)
}

function buildSlide(type, fields) {
  if (type === 'comparison') {
    return {
      type, title: fields.title, accent: fields.accent,
      left: { title: fields.leftTitle, items: fields.leftItems },
      right: { title: fields.rightTitle, items: fields.rightItems },
    }
  }
  if (type === 'problem-solution') {
    return {
      type, title: fields.title,
      problem: { title: fields.problemTitle, items: fields.problemItems },
      solution: { title: fields.solutionTitle, items: fields.solutionItems },
    }
  }
  return { type, ...fields }
}

function parseSlide(section, sourceName, slideIndex) {
  const schema = FIELD_KINDS[section.type]
  if (!schema)
    fail(sourceName, `slide ${slideIndex + 1} layout must be one of ${SLIDE_TYPES.join(', ')}; received ${section.type}`)

  const rawFields = new Map()
  let activeField
  for (const line of section.lines) {
    const heading = line.match(/^###\s+([A-Za-z][A-Za-z0-9]*)\s*$/)
    if (heading) {
      activeField = heading[1]
      if (rawFields.has(activeField)) fail(sourceName, `slide ${slideIndex + 1} duplicates field ${activeField}`)
      rawFields.set(activeField, [])
      continue
    }
    if (!activeField) {
      if (line.trim()) fail(sourceName, `slide ${slideIndex + 1} content must appear under a ### field heading`)
      continue
    }
    rawFields.get(activeField).push(line)
  }

  for (const field of rawFields.keys()) {
    if (!(field in schema)) fail(sourceName, `slide ${slideIndex + 1} has unknown field ${field} for ${section.type}`)
  }
  for (const field of Object.keys(schema)) {
    if (!rawFields.has(field)) fail(sourceName, `slide ${slideIndex + 1} is missing required field ${field}`)
  }

  const fields = Object.fromEntries(Object.entries(schema).map(([field, kind]) => [
    field,
    parseField(rawFields.get(field), kind, sourceName, `slides[${slideIndex}].${field}`),
  ]))
  return buildSlide(section.type, fields)
}

export function parseContentMarkdown(markdown, { sourceName = 'content.md' } = {}) {
  if (typeof markdown !== 'string' || markdown.trim() === '') fail(sourceName, 'file must not be empty')
  const lines = markdown.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n')
  if (lines.some(line => line.includes('\t'))) fail(sourceName, 'tabs are not allowed; use spaces')

  const firstSlide = lines.findIndex(line => /^##\s+/.test(line))
  if (firstSlide < 0) fail(sourceName, 'at least one ## layout section is required')
  const prelude = lines.slice(0, firstSlide).filter(line => line.trim())
  const titleMatch = prelude[0]?.match(/^#\s+(.+)$/)
  if (!titleMatch) fail(sourceName, 'first non-empty line must be # <deck title>')
  const descriptionLines = prelude.slice(1)
  if (descriptionLines.length === 0 || descriptionLines.some(line => !/^>\s+/.test(line)))
    fail(sourceName, 'deck description must follow the title as one or more > blockquote lines')
  const description = descriptionLines.map(line => line.replace(/^>\s+/, '').trim()).join(' ')

  const sections = []
  let active
  for (const line of lines.slice(firstSlide)) {
    const heading = line.match(/^##\s+([a-z][a-z-]*)\s*$/)
    if (heading) {
      active = { type: heading[1], lines: [] }
      sections.push(active)
      continue
    }
    if (!active) fail(sourceName, 'content before first slide is not allowed')
    active.lines.push(line)
  }

  const deck = {
    title: titleMatch[1].trim(),
    description,
    slides: sections.map((section, index) => parseSlide(section, sourceName, index)),
  }
  const errors = validateDeck(deck)
  if (errors.length > 0) fail(sourceName, errors.join('\n'))
  return deck
}

export function renderDeckModule(deck, { modelImport = '../../model/slide-model.mjs' } = {}) {
  const errors = validateDeck(deck)
  if (errors.length > 0) throw new Error(errors.join('\n'))
  return [
    '// Generated from content.md by npm run content:build. Do not edit by hand.',
    `import { defineDeck } from '${modelImport}'`,
    '',
    `export default defineDeck(${JSON.stringify(deck, null, 2)})`,
    '',
  ].join('\n')
}
