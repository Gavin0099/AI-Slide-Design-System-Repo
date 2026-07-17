import { defineDeck } from './slide-model.mjs'
import { createMermaidDiagram } from './mermaid-contract.mjs'

function fail(sourceName, message) {
  throw new Error(`${sourceName}: ${message}`)
}

function normalize(markdown, sourceName) {
  if (typeof markdown !== 'string' || markdown.trim() === '') fail(sourceName, 'file must not be empty')
  return markdown.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n')
}

function sourceSection(level, ordinal) {
  return `h${level}:${ordinal}`
}

function cleanHeading(value) {
  return value.replace(/\s*<!--.*?-->\s*/gu, '').trim()
}

function cleanInline(value) {
  return value
    .replace(/<!--.*?-->/gu, '')
    .replace(/<\/?small>/giu, '')
    .replace(/\*\*/gu, '')
    .replace(/__/gu, '')
    .replace(/`/gu, '')
    .trim()
}

export function parseSectionedMarkdown(markdown, { sourceName = 'source.md' } = {}) {
  const lines = normalize(markdown, sourceName)
  const sections = []
  let inFence = false
  let fenceMarker
  let active
  let h1Count = 0
  let h2Count = 0

  lines.forEach((line, index) => {
    const fence = line.match(/^\s*(```+|~~~+)/)
    if (fence) {
      const marker = fence[1][0]
      if (!inFence) {
        inFence = true
        fenceMarker = marker
      }
      else if (marker === fenceMarker) {
        inFence = false
        fenceMarker = undefined
      }
      if (active) active.lines.push(line)
      return
    }

    if (!inFence) {
      const h1 = line.match(/^#\s+(.+?)\s*$/)
      if (h1) {
        h1Count += 1
        if (h1Count > 1) fail(sourceName, `multiple level-one headings are not allowed; found another at line ${index + 1}`)
        if (sections.length > 0) fail(sourceName, `level-one heading must precede every level-two slide heading`)
        active = {
          sourceSection: sourceSection(1, 1),
          level: 1,
          heading: cleanHeading(h1[1]),
          lineNumber: index + 1,
          lines: [],
        }
        sections.push(active)
        return
      }

      const h2 = line.match(/^##\s+(.+?)\s*$/)
      if (h2) {
        if (h1Count === 0) fail(sourceName, `level-two slide heading appears before the deck title at line ${index + 1}`)
        h2Count += 1
        active = {
          sourceSection: sourceSection(2, h2Count),
          level: 2,
          heading: cleanHeading(h2[1]),
          lineNumber: index + 1,
          lines: [],
        }
        sections.push(active)
        return
      }
    }

    if (active) active.lines.push(line)
  })

  if (h1Count === 0) fail(sourceName, 'one # deck title is required')
  if (h2Count === 0) fail(sourceName, 'at least one ## slide heading is required')

  return {
    title: sections[0].heading,
    sections,
  }
}

export function sourceBlocksForSection(section) {
  const blocks = []
  let inComment = false
  let inFence = false
  let fenceMarker
  let fenceLanguage
  let fenceLines = []

  for (const rawLine of section?.lines ?? []) {
    const trimmed = rawLine.trim()
    if (inComment) {
      if (trimmed.includes('-->')) inComment = false
      continue
    }
    if (trimmed.startsWith('<!--')) {
      if (!trimmed.includes('-->')) inComment = true
      continue
    }
    const fence = trimmed.match(/^(```+|~~~+)\s*([A-Za-z0-9_-]*)\s*$/u)
    if (fence) {
      const marker = fence[1][0]
      if (!inFence) {
        inFence = true
        fenceMarker = marker
        fenceLanguage = fence[2].toLowerCase()
        fenceLines = []
      }
      else if (marker === fenceMarker) {
        if (fenceLanguage === 'mermaid')
          blocks.push({ kind: 'mermaid', diagram: createMermaidDiagram(fenceLines.join('\n')) })
        inFence = false
        fenceMarker = undefined
        fenceLanguage = undefined
        fenceLines = []
      }
      continue
    }
    if (!trimmed || trimmed === '---') continue
    if (inFence) {
      if (fenceLanguage === 'mermaid') fenceLines.push(rawLine)
      else blocks.push({ kind: 'code', text: rawLine })
      continue
    }

    const subtitle = trimmed.match(/^###\s+(.+?)\s*$/u)
    if (subtitle) {
      const text = cleanInline(subtitle[1])
      if (text) blocks.push({ kind: 'subtitle', text })
      continue
    }

    if (/^\|.*\|$/u.test(trimmed)) {
      const cells = trimmed.slice(1, -1).split('|').map(cleanInline)
      if (cells.every(cell => /^:?-{3,}:?$/u.test(cell))) continue
      if (cells.some(Boolean)) blocks.push({ kind: 'table-row', cells })
      continue
    }

    const numbered = trimmed.match(/^(\d+[.)])\s+(.+)$/u)
    if (numbered) {
      const text = cleanInline(numbered[2])
      if (text) blocks.push({ kind: 'numbered', text: `${numbered[1]} ${text}` })
      continue
    }

    const bullet = trimmed.match(/^[-+*]\s+(.+)$/u)
    if (bullet) {
      const text = cleanInline(bullet[1])
      if (text) blocks.push({ kind: 'bullet', text })
      continue
    }

    const quote = trimmed.match(/^>\s*(.+)$/u)
    if (quote) {
      const text = cleanInline(quote[1])
      if (text) blocks.push({ kind: trimmed.includes('<small>') ? 'small' : 'quote', text })
      continue
    }

    const text = cleanInline(trimmed)
    if (text) blocks.push({ kind: trimmed.includes('<small>') ? 'small' : 'paragraph', text })
  }
  if (inFence) throw new Error(`source section ${section?.sourceSection ?? 'unknown'} has an unclosed code fence`)
  return blocks
}

export function sourceVisibleStrings(section) {
  return [
    section.heading,
    ...sourceBlocksForSection(section).flatMap(block => {
      if (block.kind === 'table-row') return block.cells
      if (block.kind === 'mermaid') return []
      return [block.text]
    }),
  ]
}

function sourceVariant(section, blocks) {
  if (section.level === 1) return 'cover'
  if (blocks.some(block => block.kind === 'mermaid')) return 'diagram'
  if (blocks.some(block => block.kind === 'table-row')) return 'table'
  if (blocks.some(block => block.kind === 'code')) return 'code'
  const characters = blocks.reduce((total, block) =>
    total + (block.kind === 'table-row' ? block.cells.join('').length : block.kind === 'mermaid' ? 0 : block.text.length), 0)
  if (characters > 460 || blocks.length > 12) return 'dense'
  const listItems = blocks.filter(block => block.kind === 'bullet' || block.kind === 'numbered').length
  if (listItems >= 3) return 'list'
  if (blocks.length <= 4) return 'statement'
  return 'narrative'
}

export function projectSectionedMarkdown(markdown, { sourceName = 'source.md' } = {}) {
  const source = parseSectionedMarkdown(markdown, { sourceName })
  const slides = source.sections.map(section => {
    const blocks = sourceBlocksForSection(section)
    return {
      type: 'source',
      sourceSection: section.sourceSection,
      sourceHeading: section.heading,
      title: section.heading,
      variant: sourceVariant(section, blocks),
      blocks,
    }
  })
  const firstSubtitle = slides[0].blocks.find(block => block.kind === 'subtitle')?.text
  return defineDeck({
    title: source.title,
    description: firstSubtitle ?? `${source.title} source-faithful presentation`,
    slides,
  })
}

export function validateSectionCoverage(source, deck) {
  const errors = []
  const expected = source?.sections ?? []
  const actual = Array.isArray(deck?.slides) ? deck.slides : []

  if (actual.length !== expected.length)
    errors.push(`section coverage requires ${expected.length} slides; received ${actual.length}`)

  const actualIds = actual.map(slide => slide?.sourceSection)
  const seen = new Set()
  actualIds.forEach((id, index) => {
    if (typeof id !== 'string' || id.trim() === '') {
      errors.push(`slides[${index}].sourceSection is required for section coverage`)
      return
    }
    if (seen.has(id)) errors.push(`slides[${index}].sourceSection duplicates ${id}`)
    seen.add(id)
  })

  expected.forEach((section, index) => {
    const slide = actual[index]
    if (!actualIds.includes(section.sourceSection))
      errors.push(`missing source section ${section.sourceSection}: ${section.heading}`)
    if (!slide) return
    if (slide.sourceSection !== section.sourceSection)
      errors.push(`slides[${index}].sourceSection must be ${section.sourceSection}; received ${slide.sourceSection ?? 'missing'}`)
    if (slide.sourceHeading !== section.heading)
      errors.push(`slides[${index}].sourceHeading must match ${section.heading}`)
  })

  actualIds.forEach((id, index) => {
    if (typeof id === 'string' && !expected.some(section => section.sourceSection === id))
      errors.push(`slides[${index}].sourceSection is not present in the source: ${id}`)
  })

  return errors
}

export function assertSectionCoverage(source, deck) {
  const errors = validateSectionCoverage(source, deck)
  if (errors.length > 0) throw new Error(errors.join('\n'))
}

export function validateSourceTextCoverage(source, deck) {
  const errors = []
  const expected = source?.sections ?? []
  const actual = Array.isArray(deck?.slides) ? deck.slides : []
  expected.forEach((section, index) => {
    const slide = actual[index]
    if (!slide) return
    if (slide.type !== 'source')
      errors.push(`slides[${index}].type must be source for verbatim source rendering`)
    if (slide.title !== section.heading)
      errors.push(`slides[${index}].title must exactly match source heading ${section.heading}`)
    const expectedBlocks = sourceBlocksForSection(section)
    if (JSON.stringify(slide.blocks) !== JSON.stringify(expectedBlocks))
      errors.push(`slides[${index}].blocks must exactly preserve all audience-visible source text`)
  })
  return errors
}

export function assertSourceTextCoverage(source, deck) {
  const errors = [...validateSectionCoverage(source, deck), ...validateSourceTextCoverage(source, deck)]
  if (errors.length > 0) throw new Error(errors.join('\n'))
}
